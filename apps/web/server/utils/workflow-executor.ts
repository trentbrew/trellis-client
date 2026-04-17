/**
 * Server-side workflow executor.
 *
 * Headless port of `useWorkflowExecution` — runs a workflow graph without
 * any Vue/ref state, using direct LLM + tool calls (no HTTP round-trips).
 * This is the execution path used by:
 *
 *   - POST /api/workflows/execute (ad-hoc server-side runs)
 *   - Cron scheduler (future)
 *   - Webhook triggers (future)
 *   - Entity-change triggers (future)
 *
 * The output shape matches the client-side run data so persisted runs look
 * identical regardless of origin.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { Graph, Engine } from '@turtle.tech/tql/graph'
import type {
  Node as TQLNode,
  EngineState,
  Trace,
  LLMClient,
  ToolFn,
  Executor,
  ExecResult,
} from '@turtle.tech/tql/graph'

import { invokeWorkflowTool, listWorkflowTools } from './workflow-tools'
import { useTqlKernel, pushMutationLog } from '../plugins/tql'
import { emitMutation } from './tql-events'
import { useInstantAdmin } from './instant-admin'
import { dispatchNotificationEmailAsync } from './notification-email'

// ─── Types mirror of WorkflowGraph from types/database.ts ────────────────────

export type WorkflowNodeKind =
  | 'start'
  | 'agent'
  | 'tool'
  | 'router'
  | 'guard'
  | 'memory-read'
  | 'memory-write'
  | 'end'
  | 'note'

export interface WorkflowNodeDef {
  id: string
  kind: WorkflowNodeKind
  position?: { x: number; y: number }
  label?: string
  data?: Record<string, unknown>
}

export interface WorkflowEdgeDef {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  condition?: string
}

export interface WorkflowGraph {
  nodes: WorkflowNodeDef[]
  edges: WorkflowEdgeDef[]
}

export interface WorkflowRunResult {
  id: string
  workflowId: string
  workflowName?: string
  agentId?: string
  status: 'completed' | 'failed'
  startedAt: string
  completedAt: string
  durationMs: number
  stepCount: number
  input: unknown
  output: unknown
  error?: string
  traces: Trace[]
  stepOutputs: Record<string, unknown>
}

export interface ExecuteWorkflowOptions {
  workflowId: string
  workflowName?: string
  graph: WorkflowGraph
  input?: unknown
  agentId?: string
  /** If true, skip persisting the run entity. Useful for dry-runs. */
  skipPersist?: boolean
  /** Override the default agent model (default: gemma4:e4b). */
  defaultModel?: string
  /**
   * User to notify when the run completes/fails.
   * Failures always notify when set. Success notifications are gated on
   * `notifyOnSuccess` (default: false — only notify on failures).
   */
  ownerId?: string
  /** Org scope for owner notifications. */
  orgId?: string
  /** If true, also fire a `workflow_completed` notification on success. */
  notifyOnSuccess?: boolean
}

// ─── Server-side LLM client ──────────────────────────────────────────────────

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
const DEFAULT_MODEL = process.env.TRELLIS_LLM_DEFAULT_MODEL || 'gemma4:e4b'

function isGeminiModel(model: string): boolean {
  return /^gemini-/i.test(model)
}

async function callOllama(params: { model: string; system?: string; prompt: string }): Promise<string> {
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.model,
      prompt: params.prompt,
      system: params.system,
      stream: false,
    }),
  })
  if (!res.ok) throw new Error(`Ollama returned ${res.status}: ${res.statusText}`)
  const data = (await res.json()) as { response?: string; error?: string }
  if (data.error) throw new Error(`Ollama error: ${data.error}`)
  return data.response ?? ''
}

async function callGemini(params: { model: string; system?: string; prompt: string }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: params.model,
    ...(params.system ? { systemInstruction: params.system } : {}),
  })
  const result = await model.generateContent(params.prompt)
  return result.response.text()
}

function createServerLLM(defaultModel: string = DEFAULT_MODEL): LLMClient {
  return async (req) => {
    const model = req.model ?? defaultModel
    const prompt = req.prompt ?? ''
    if (model === 'passthrough') return { text: prompt }
    const text = isGeminiModel(model)
      ? await callGemini({ model, system: req.system, prompt })
      : await callOllama({ model, system: req.system, prompt })
    return { text }
  }
}

// ─── Server-side tool registry (direct, no HTTP) ─────────────────────────────

function createServerTools(workflowId: string, agentId: string): Record<string, ToolFn> {
  const tools: Record<string, ToolFn> = {}
  for (const name of listWorkflowTools()) {
    tools[name] = async (args) =>
      invokeWorkflowTool(name, (args ?? {}) as Record<string, unknown>, {
        agentId,
        workflowId,
      })
  }
  return tools
}

// ─── Graph-aware memory executors (mirror of client version) ─────────────────

function pluck(obj: unknown, path: string): unknown {
  if (!path) return obj
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

function createGraphMemoryExecutors(tools: Record<string, ToolFn>) {
  const isGraphMode = (node: TQLNode): boolean => (node.data as { source?: string } | undefined)?.source === 'graph'

  const tqlQuery = tools.tql_query
  const tqlLoadData = tools.tql_load_data
  const tqlMutate = tools.tql_mutate
  if (!tqlQuery || !tqlLoadData || !tqlMutate) {
    throw new Error('Graph-memory executors require tql_query, tql_load_data, tql_mutate.')
  }

  const MemoryRead: Executor = async (node, state): Promise<ExecResult> => {
    const data = (node.data || {}) as { key?: string; source?: 'state' | 'graph' }
    const key = data.key || ''
    if (isGraphMode(node) && key) {
      try {
        let value: unknown
        if (/^\s*FIND\s/i.test(key)) {
          const r = (await tqlQuery({ eqls: key })) as { rows?: unknown[] }
          value = r?.rows ?? []
        } else {
          const r = (await tqlLoadData({ entityId: key })) as { data?: unknown | null }
          value = r?.data ?? null
        }
        state.memory ||= {}
        state.memory[key] = value
        return { output: { ...state.output, memory: { [key]: value } }, next: 'success' }
      } catch (err) {
        state.log?.('error', `memory.read failed: ${(err as Error).message}`)
        return { output: state.output, next: 'success' }
      }
    }
    const v = state.memory?.[key]
    return { output: { ...state.output, memory: { [key]: v } }, next: 'success' }
  }

  const MemoryWrite: Executor = async (node, state): Promise<ExecResult> => {
    const data = (node.data || {}) as {
      key?: string
      from?: string
      source?: 'state' | 'graph'
      entityType?: string
    }
    const key = data.key || ''
    const from = data.from || 'output.text'
    const val = pluck(state, from)

    if (isGraphMode(node) && key) {
      try {
        const fallbackType = data.entityType || 'note'
        const entityData: Record<string, unknown> =
          val && typeof val === 'object' && !Array.isArray(val)
            ? (val as Record<string, unknown>)
            : { type: fallbackType, content: val == null ? '' : String(val) }

        const existing = (await tqlLoadData({ entityId: key })) as { data?: unknown | null }
        const action = existing?.data ? 'updateNode' : 'createNode'
        await tqlMutate({ action, entityId: key, type: 'entity', data: entityData })
        state.memory ||= {}
        state.memory[key] = val
        return { output: state.output, next: 'success' }
      } catch (err) {
        state.log?.('error', `memory.write failed: ${(err as Error).message}`)
        return { output: state.output, next: 'success' }
      }
    }

    state.memory ||= {}
    state.memory[key] = val
    return { output: state.output, next: 'success' }
  }

  return { MemoryRead, MemoryWrite }
}

// ─── Compile a workflow graph into an Engine ─────────────────────────────────

function safeCompileCondition(expr: string): (_s: EngineState) => boolean {
  try {
    return new Function('s', `try { return !!(${expr}) } catch(e) { return false }`) as (_s: EngineState) => boolean
  } catch {
    return () => false
  }
}

function addCompiledNode(graph: Graph, nodeDef: WorkflowNodeDef): void {
  const { id, kind, data } = nodeDef

  switch (kind) {
    case 'agent':
      graph.addNode({
        id,
        kind: 'Agent',
        data: {
          system: (data?.system as string) || undefined,
          prompt: (data?.prompt as string) || '{{input}}',
          model: (data?.model as string) || DEFAULT_MODEL,
          stream: Boolean(data?.stream),
        },
      } as TQLNode)
      break

    case 'tool': {
      const rawArgs = (data?.args as { key: string; value: string }[] | undefined) ?? []
      const compiledArgs: Record<string, unknown> = {}
      for (const { key, value } of rawArgs) {
        if (key) compiledArgs[key] = value
      }
      graph.addNode({
        id,
        kind: 'Tool',
        data: { name: (data?.toolName as string) || 'run_js', args: compiledArgs },
      } as TQLNode)
      break
    }

    case 'router': {
      type RouteConfig = { id: string; label: string; condition: string }
      const raw = (data?.routes as RouteConfig[] | undefined) ?? [{ id: 'default', label: 'default', condition: '' }]
      const nonDefault = raw.filter((r) => r.id !== 'default')
      const defaultRoute = raw.find((r) => r.id === 'default')
      const routes = [
        ...nonDefault.map((r) => ({
          label: r.label,
          when: r.condition ? safeCompileCondition(r.condition) : () => false,
        })),
        { label: defaultRoute?.label ?? 'default', when: () => true as boolean },
      ]
      graph.addNode({ id, kind: 'Router', data: { routes } } as TQLNode)
      break
    }

    case 'guard': {
      const mode = (data?.mode as 'allow' | 'block') ?? 'allow'
      const condStr = (data?.condition as string) ?? ''
      const condFn = condStr ? safeCompileCondition(condStr) : () => true
      const allow = mode === 'block' ? (s: EngineState) => !condFn(s) : condFn
      graph.addNode({ id, kind: 'Guard', data: { allow } } as TQLNode)
      break
    }

    case 'memory-read':
      graph.addNode({
        id,
        kind: 'MemoryRead',
        data: {
          key: (data?.key as string) || '',
          source: (data?.source as 'state' | 'graph') || 'state',
        },
      } as TQLNode)
      break

    case 'memory-write':
      graph.addNode({
        id,
        kind: 'MemoryWrite',
        data: {
          key: (data?.key as string) || '',
          from: (data?.from as string) || undefined,
          source: (data?.source as 'state' | 'graph') || 'state',
          entityType: (data?.entityType as string) || undefined,
        },
      } as TQLNode)
      break

    case 'end':
      graph.addNode({ id, kind: 'End' } as TQLNode)
      break
  }
}

function compileGraph(
  wfGraph: WorkflowGraph,
  options: { llm: LLMClient; tools: Record<string, ToolFn> },
): { engine: Engine; startId: string } {
  const graph = new Graph()
  const startDef = wfGraph.nodes.find((n) => n.kind === 'start')
  if (!startDef) throw new Error('Workflow has no Start node')

  graph.addNode({
    id: startDef.id,
    kind: 'Agent',
    data: { system: 'Passthrough.', prompt: '{{input}}', model: 'passthrough' },
  } as TQLNode)

  for (const nodeDef of wfGraph.nodes) {
    if (nodeDef.kind === 'start' || nodeDef.kind === 'note') continue
    addCompiledNode(graph, nodeDef)
  }

  const noteIds = new Set(wfGraph.nodes.filter((n) => n.kind === 'note').map((n) => n.id))
  for (const e of wfGraph.edges) {
    if (noteIds.has(e.source) || noteIds.has(e.target)) continue
    if (!wfGraph.nodes.some((n) => n.id === e.source) || !wfGraph.nodes.some((n) => n.id === e.target)) continue
    graph.addEdge({
      id: e.id,
      from: e.source,
      to: e.target,
      label: e.sourceHandle || e.label || 'default',
    })
  }

  const { MemoryRead, MemoryWrite } = createGraphMemoryExecutors(options.tools)

  const engine = new Engine(graph, {
    llm: options.llm,
    tools: options.tools,
    executors: { MemoryRead, MemoryWrite },
    maxSteps: 50,
    perNodeMs: 60_000,
  })

  return { engine, startId: startDef.id }
}

// ─── Run persistence ─────────────────────────────────────────────────────────

const MAX_JSON_BYTES = 256 * 1024

function safeStringify(value: unknown, maxBytes = MAX_JSON_BYTES): string | undefined {
  if (value === undefined) return undefined
  try {
    const s = JSON.stringify(value)
    if (s.length > maxBytes) {
      return JSON.stringify({ __truncated: true, __originalBytes: s.length, preview: s.slice(0, maxBytes) })
    }
    return s
  } catch {
    return undefined
  }
}

async function persistRun(run: WorkflowRunResult): Promise<void> {
  const kernel = useTqlKernel()
  const agentId = run.agentId || 'workflow-server'

  const stored: Record<string, unknown> = {
    type: 'workflow-run',
    title: `Run · ${run.workflowName || run.workflowId} · ${new Date(run.startedAt).toLocaleString()}`,
    workflowId: run.workflowId,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationMs: run.durationMs,
    stepCount: run.stepCount,
  }
  if (run.workflowName) stored.workflowName = run.workflowName
  if (run.agentId) stored.agentId = run.agentId
  if (run.error) stored.error = run.error
  const inputJson = safeStringify(run.input, 32 * 1024)
  if (inputJson) stored.inputJson = inputJson
  const outputJson = safeStringify(run.output, 32 * 1024)
  if (outputJson) stored.outputJson = outputJson
  const tracesJson = safeStringify(run.traces)
  if (tracesJson) stored.tracesJson = tracesJson
  const stepOutputsJson = safeStringify(run.stepOutputs)
  if (stepOutputsJson) stored.stepOutputsJson = stepOutputsJson

  await kernel.createNode(run.id, stored, 'entity', { agentId })
  pushMutationLog({ action: 'createNode', entityId: run.id, type: 'entity', data: stored })
  emitMutation({ action: 'createNode', entityId: run.id, type: 'entity', agentId, data: stored })
}

// ─── Owner notifications ─────────────────────────────────────────────────────

/**
 * Fire-and-forget notification to a workflow's owner when a run completes or
 * fails. Creates an in-app notification record (via the InstantDB admin SDK)
 * and dispatches a transactional email through the notification-email pipeline.
 *
 * Errors are swallowed so notification delivery never masks a run result.
 */
function notifyWorkflowOwner(
  run: WorkflowRunResult,
  opts: { ownerId: string; orgId?: string; notifyOnSuccess?: boolean },
): void {
  const isFailure = run.status === 'failed'
  if (!isFailure && !opts.notifyOnSuccess) return

  const db = (() => {
    try {
      return useInstantAdmin()
    } catch (err: any) {
      console.warn('[workflow-executor] InstantDB admin unavailable, skipping owner notify:', err?.message)
      return null
    }
  })()
  if (!db) return

  const type = isFailure ? 'workflow_failed' : 'workflow_completed'
  const name = run.workflowName || run.workflowId
  const title = isFailure ? `Workflow failed: ${name}` : `Workflow completed: ${name}`
  const errSnippet = run.error ? run.error.slice(0, 200) : ''
  const message = isFailure
    ? errSnippet || 'The run did not finish successfully.'
    : `Ran ${run.stepCount} step${run.stepCount === 1 ? '' : 's'} in ${(run.durationMs / 1000).toFixed(1)}s.`
  const actionUrl = `/workflows/${encodeURIComponent(run.workflowId)}/runs/${encodeURIComponent(run.id)}`
  const orgId = opts.orgId || ''

  const metadata: Record<string, unknown> = {
    workflowId: run.workflowId,
    workflowName: run.workflowName,
    runId: run.id,
    stepCount: run.stepCount,
    durationMs: run.durationMs,
  }
  if (run.error) metadata.error = run.error

  const notifId = crypto.randomUUID()
  const now = Date.now()

  // Best-effort: create notification record
  db.transact(
    db.tx.notifications[notifId].update({
      recipientId: opts.ownerId,
      orgId,
      type,
      title,
      message,
      actionUrl,
      icon: isFailure ? 'lucide:triangle-alert' : 'lucide:check-circle-2',
      variant: isFailure ? 'destructive' : 'success',
      isRead: false,
      actorId: run.agentId || 'workflow',
      actorName: 'Trellis Workflows',
      metadata,
      createdAt: now,
    }),
  )
    .then(() => {
      if (orgId) {
        db.transact(db.tx.organizations[orgId].link({ notifications: notifId })).catch(() => {
          /* non-fatal — org may not exist or may not have link schema */
        })
      }
    })
    .catch((err: any) => {
      console.warn('[workflow-executor] owner notification create failed (non-fatal):', err?.message || err)
    })

  // Dispatch email (gated on per-user prefs inside the dispatcher)
  dispatchNotificationEmailAsync({
    recipientId: opts.ownerId,
    type,
    title,
    message,
    actionUrl,
    actorName: 'Trellis Workflows',
    metadata,
  })
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Execute a workflow graph headlessly on the server. Streams internally via
 * the async iterator, collects traces + step outputs, then persists a
 * `workflow-run` entity (unless `skipPersist` is set).
 */
export async function executeWorkflow(opts: ExecuteWorkflowOptions): Promise<WorkflowRunResult> {
  const startedAt = new Date().toISOString()
  const tStart = Date.now()
  const runId = `entity:run-${opts.workflowId}-${tStart}`
  const agentId = opts.agentId || 'workflow-server'

  const traces: Trace[] = []
  const stepOutputs: Record<string, unknown> = {}
  let finalState: EngineState | null = null
  let errorMessage: string | undefined

  try {
    const llm = createServerLLM(opts.defaultModel)
    const tools = createServerTools(opts.workflowId, agentId)
    const { engine, startId } = compileGraph(opts.graph, { llm, tools })

    for await (const step of engine.run(startId, opts.input ?? {})) {
      traces.push(step.trace)
      stepOutputs[step.trace.nodeId] = step.state.output
      finalState = step.state
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err)
  }

  const completedAt = new Date().toISOString()
  const durationMs = Date.now() - tStart

  const run: WorkflowRunResult = {
    id: runId,
    workflowId: opts.workflowId,
    workflowName: opts.workflowName,
    agentId,
    status: errorMessage ? 'failed' : 'completed',
    startedAt,
    completedAt,
    durationMs,
    stepCount: traces.length,
    input: opts.input ?? {},
    output: finalState?.output ?? null,
    error: errorMessage,
    traces,
    stepOutputs,
  }

  if (!opts.skipPersist) {
    try {
      await persistRun(run)
    } catch (err) {
      // Persistence errors shouldn't mask the actual run result
      console.error('[workflow-executor] persistRun failed:', err)
    }
  }

  // Best-effort owner notification (fire-and-forget)
  if (opts.ownerId) {
    try {
      notifyWorkflowOwner(run, {
        ownerId: opts.ownerId,
        orgId: opts.orgId,
        notifyOnSuccess: opts.notifyOnSuccess,
      })
    } catch (err) {
      console.warn('[workflow-executor] notifyWorkflowOwner threw:', err)
    }
  }

  return run
}
