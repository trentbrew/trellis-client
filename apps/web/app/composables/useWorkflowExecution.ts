import type { WorkflowGraph, WorkflowNodeDef } from '~/types/database'
import type {
  Node as TQLNode,
  EngineEvent,
  EngineState,
  Trace,
  LLMClient,
  ToolFn,
  Executor,
  ExecutorTable,
  ExecResult,
} from '@turtle.tech/tql/graph'
import { Graph, Engine } from '@turtle.tech/tql/graph'
import { createDefaultLLMClient } from '~/lib/llm'
import { createDefaultWorkflowTools } from '~/lib/workflow-tools'

export type { Trace } from '@turtle.tech/tql/graph'

// ─── Condition compiler ────────────────────────────────────────────────────────

/** Compile a JS expression string into a predicate. Returns `() => false` on syntax error. */
function safeCompileCondition(expr: string): (_s: EngineState) => boolean {
  try {
    return new Function('s', `try { return !!(${expr}) } catch(e) { return false }`) as (_s: EngineState) => boolean
  } catch {
    return () => false
  }
}

// ─── Per-kind node compilation ─────────────────────────────────────────────────

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
          model: (data?.model as string) || 'gemma4:e4b',
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

// ─── Graph-aware memory executors ──────────────────────────────────────────────

/** Dot-path reader, used to resolve `from: 'output.text'` against engine state. */
function pluck(obj: unknown, path: string): unknown {
  if (!path) return obj
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[key]
  }, obj)
}

/**
 * Build MemoryRead + MemoryWrite executors that branch on `node.data.source`.
 *
 * - `source === 'graph'`  → read/write the Trellis knowledge graph
 *     (via the `tql_query`, `tql_load_data`, `tql_mutate` tools)
 * - otherwise             → fall back to the engine's in-memory KV store
 *
 * For graph reads, `key` may be either an entity ID (e.g. `entity:note-foo`)
 * or an EQL-S query starting with `FIND`.
 *
 * For graph writes, `key` is an entity ID. The value resolved at the `from`
 * dot-path is coerced into an entity data object. If the entity already
 * exists it is updated (partial merge); otherwise it is created.
 */
function createGraphMemoryExecutors(tools: Record<string, ToolFn>): Pick<ExecutorTable, 'MemoryRead' | 'MemoryWrite'> {
  const isGraphMode = (node: TQLNode): boolean => (node.data as { source?: string } | undefined)?.source === 'graph'

  // Pre-resolve the tools we depend on so TypeScript knows they're non-null
  // and so we fail fast if a caller accidentally strips one of them.
  const tqlQuery = tools.tql_query
  const tqlLoadData = tools.tql_load_data
  const tqlMutate = tools.tql_mutate
  if (!tqlQuery || !tqlLoadData || !tqlMutate) {
    throw new Error('Graph-memory executors require tql_query, tql_load_data, and tql_mutate tools to be registered.')
  }

  const MemoryRead: Executor = async (node, state): Promise<ExecResult> => {
    const data = (node.data || {}) as { key?: string; source?: 'state' | 'graph' }
    const key = data.key || ''

    if (isGraphMode(node) && key) {
      try {
        let value: unknown
        if (/^\s*FIND\s/i.test(key)) {
          const r = (await tqlQuery({ eqls: key })) as { rows?: unknown[]; count?: number }
          value = r?.rows ?? []
        } else {
          const r = (await tqlLoadData({ entityId: key })) as {
            id?: string
            data?: unknown | null
          }
          value = r?.data ?? null
        }
        state.memory ||= {}
        state.memory[key] = value
        state.log?.('debug', `memory.read (graph): ${key}`)
        return { output: { ...state.output, memory: { [key]: value } }, next: 'success' }
      } catch (err) {
        state.log?.('error', `memory.read failed: ${(err as Error).message}`)
        return { output: state.output, next: 'success' }
      }
    }

    const v = state.memory?.[key]
    state.log?.('debug', `memory.read (state): ${key}`)
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

        const existing = (await tqlLoadData({ entityId: key })) as {
          id?: string
          data?: unknown | null
        }
        const action = existing?.data ? 'updateNode' : 'createNode'

        await tqlMutate({
          action,
          entityId: key,
          type: 'entity',
          data: entityData,
        })

        state.memory ||= {}
        state.memory[key] = val
        state.log?.('debug', `memory.write (graph): ${key}`, { action })
        return { output: state.output, next: 'success' }
      } catch (err) {
        state.log?.('error', `memory.write failed: ${(err as Error).message}`)
        return { output: state.output, next: 'success' }
      }
    }

    state.memory ||= {}
    state.memory[key] = val
    state.log?.('debug', `memory.write (state): ${key}`)
    return { output: state.output, next: 'success' }
  }

  return { MemoryRead, MemoryWrite }
}

// ─── Graph compiler ────────────────────────────────────────────────────────────

function compileGraph(
  wfGraph: WorkflowGraph,
  options: { llm?: LLMClient; tools?: Record<string, ToolFn>; onEvent?: (_ev: EngineEvent) => void } = {},
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
    graph.addEdge({ id: e.id, from: e.source, to: e.target, label: e.sourceHandle || e.label || 'default' })
  }

  const tools = options.tools ?? createDefaultWorkflowTools()
  const { MemoryRead, MemoryWrite } = createGraphMemoryExecutors(tools)

  const engine = new Engine(graph, {
    llm: options.llm ?? createDefaultLLMClient(),
    tools,
    executors: { MemoryRead, MemoryWrite },
    maxSteps: 50,
    perNodeMs: 60_000,
    onEvent: options.onEvent,
  })
  return { engine, startId: startDef.id }
}

/** Passthrough LLM — echoes the prompt. Useful for tests/mocks. */
export function createPassthroughLLM(): LLMClient {
  return async (req) => ({ text: req.prompt ?? '(no input)' })
}

// ─── Public types ──────────────────────────────────────────────────────────────

export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error'

export interface NodeExecutionState {
  status: 'idle' | 'running' | 'completed' | 'error'
  startedAt?: number
  completedAt?: number
  durationMs?: number
  error?: string
}

export interface StepOutput {
  output: unknown
}

// ─── Composable ────────────────────────────────────────────────────────────────

export function useWorkflowExecution() {
  const status = ref<ExecutionStatus>('idle')
  const activeNodeId = ref<string | null>(null)
  const activeEdgeId = ref<string | null>(null)
  const nodeStates = ref<Record<string, NodeExecutionState>>({})
  const traces = ref<Trace[]>([])
  const stepOutputs = ref<Record<string, StepOutput>>({})
  const finalState = ref<EngineState | null>(null)
  const error = ref<string | null>(null)
  const startedAt = ref<string | null>(null)

  const totalDurationMs = computed<number>(() => {
    if (traces.value.length === 0) return 0
    return traces.value[traces.value.length - 1]!.tEnd - traces.value[0]!.tStart
  })

  function resetState() {
    status.value = 'idle'
    activeNodeId.value = null
    activeEdgeId.value = null
    nodeStates.value = {}
    traces.value = []
    stepOutputs.value = {}
    finalState.value = null
    error.value = null
    startedAt.value = null
  }

  async function run(
    wfGraph: WorkflowGraph,
    input: unknown = {},
    options: { llm?: LLMClient; tools?: Record<string, ToolFn> } = {},
  ): Promise<EngineState | null> {
    resetState()
    startedAt.value = new Date().toISOString()
    status.value = 'running'

    function handleEvent(ev: EngineEvent) {
      switch (ev.type) {
        case 'node.start':
          activeNodeId.value = ev.nodeId ?? null
          if (ev.nodeId) {
            nodeStates.value = { ...nodeStates.value, [ev.nodeId]: { status: 'running', startedAt: ev.ts } }
          }
          break
        case 'node.end':
          if (ev.nodeId) {
            const trace = ev.data as Trace | undefined
            nodeStates.value = {
              ...nodeStates.value,
              [ev.nodeId]: {
                ...(nodeStates.value[ev.nodeId] ?? {}),
                status: 'completed',
                completedAt: ev.ts,
                durationMs: trace ? trace.tEnd - trace.tStart : undefined,
              },
            }
          }
          break
        case 'node.error':
          if (ev.nodeId) {
            nodeStates.value = {
              ...nodeStates.value,
              [ev.nodeId]: {
                ...(nodeStates.value[ev.nodeId] ?? {}),
                status: 'error',
                error: (ev.data?.error as string) ?? 'Unknown error',
              },
            }
          }
          break
        case 'edge.select':
          activeEdgeId.value = ev.edgeId ?? null
          break
        case 'run.end':
          activeNodeId.value = null
          activeEdgeId.value = null
          break
      }
    }

    try {
      const { engine, startId } = compileGraph(wfGraph, {
        llm: options.llm,
        tools: options.tools,
        onEvent: handleEvent,
      })
      let lastState: EngineState | null = null
      for await (const step of engine.run(startId, input)) {
        lastState = step.state
        traces.value = [...traces.value, step.trace]
        stepOutputs.value = { ...stepOutputs.value, [step.trace.nodeId]: { output: step.state.output } }
      }
      finalState.value = lastState
      status.value = 'completed'
      return lastState
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : String(err)
      status.value = 'error'
      return null
    }
  }

  function getNodeExecutionClass(nodeId: string): string {
    switch (nodeStates.value[nodeId]?.status) {
      case 'running':
        return 'flow-exec--running'
      case 'completed':
        return 'flow-exec--completed'
      case 'error':
        return 'flow-exec--errored'
      default:
        return ''
    }
  }

  /**
   * Hydrate the panel from a persisted run. Useful for replaying/inspecting
   * historical executions without re-running the engine.
   */
  function loadRun(run: {
    status: 'completed' | 'failed' | 'cancelled' | 'running'
    traces?: Trace[]
    stepOutputs?: Record<string, unknown>
    startedAt?: string
    error?: string
  }): void {
    resetState()
    const ts = run.traces ?? []
    const outs = run.stepOutputs ?? {}
    traces.value = [...ts]
    stepOutputs.value = {}
    nodeStates.value = {}
    for (const t of ts) {
      stepOutputs.value = { ...stepOutputs.value, [t.nodeId]: { output: outs[t.nodeId] ?? null } }
      nodeStates.value = {
        ...nodeStates.value,
        [t.nodeId]: {
          status: t.error ? 'error' : 'completed',
          startedAt: t.tStart,
          completedAt: t.tEnd,
          durationMs: t.tEnd - t.tStart,
          error: t.error,
        },
      }
    }
    startedAt.value = run.startedAt ?? null
    status.value = run.status === 'running' ? 'running' : run.status === 'failed' ? 'error' : 'completed'
    error.value = run.error ?? null
  }

  return {
    status,
    activeNodeId,
    activeEdgeId,
    nodeStates,
    traces,
    stepOutputs,
    finalState,
    error,
    startedAt,
    totalDurationMs,
    run,
    loadRun,
    resetState,
    getNodeExecutionClass,
  }
}
