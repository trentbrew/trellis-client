import type { WorkflowGraph, WorkflowNodeDef } from '~/types/database'
import type { Node as TQLNode, EngineEvent, EngineState, Trace, LLMClient, ToolFn } from '@turtle.tech/tql/graph'
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
      graph.addNode({ id, kind: 'MemoryRead', data: { key: (data?.key as string) || '' } } as TQLNode)
      break

    case 'memory-write':
      graph.addNode({
        id,
        kind: 'MemoryWrite',
        data: { key: (data?.key as string) || '', from: (data?.from as string) || undefined },
      } as TQLNode)
      break

    case 'end':
      graph.addNode({ id, kind: 'End' } as TQLNode)
      break
  }
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

  const engine = new Engine(graph, {
    llm: options.llm ?? createDefaultLLMClient(),
    tools: options.tools ?? createDefaultWorkflowTools(),
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
  }

  async function run(
    wfGraph: WorkflowGraph,
    input: unknown = {},
    options: { llm?: LLMClient; tools?: Record<string, ToolFn> } = {},
  ): Promise<EngineState | null> {
    resetState()
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

  return {
    status,
    activeNodeId,
    activeEdgeId,
    nodeStates,
    traces,
    stepOutputs,
    finalState,
    error,
    totalDurationMs,
    run,
    resetState,
    getNodeExecutionClass,
  }
}
