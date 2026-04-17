import type { Trace } from '~/composables/useWorkflowExecution'

/**
 * useWorkflowRuns — persistent run history for workflows.
 *
 * Each run is stored as a `workflow-run` entity in the Trellis knowledge graph
 * (via the existing `tql_mutate` / `tql_query` tools). This means:
 *
 *   - Runs show up in `/graph` and the universal entity browser
 *   - They can be linked to other entities (e.g. the triggering email)
 *   - They survive browser reloads
 *
 * Large payloads (input, output, traces) are stored as JSON strings to avoid
 * the EAV store's nested-object flattening. Callers receive deserialized
 * objects.
 */

export type WorkflowRunStatus = 'running' | 'completed' | 'failed' | 'cancelled'

export interface WorkflowRun {
  id: string // e.g. 'entity:run-<workflowId>-<ts>'
  workflowId: string
  workflowName?: string
  agentId?: string
  status: WorkflowRunStatus
  startedAt: string
  completedAt?: string
  durationMs?: number
  stepCount?: number
  input?: unknown
  output?: unknown
  error?: string
  traces?: Trace[]
  /** Per-nodeId output snapshots captured during execution. */
  stepOutputs?: Record<string, unknown>
}

interface StoredWorkflowRun {
  type: 'workflow-run'
  title: string
  workflowId: string
  workflowName?: string
  agentId?: string
  status: WorkflowRunStatus
  startedAt: string
  completedAt?: string
  durationMs?: number
  stepCount?: number
  inputJson?: string
  outputJson?: string
  tracesJson?: string
  stepOutputsJson?: string
  error?: string
}

// ─── Serialization helpers ───────────────────────────────────────────────────

const MAX_TRACE_BYTES = 256 * 1024 // 256 KB cap per run

function safeStringify(value: unknown, maxBytes?: number): string | undefined {
  if (value === undefined) return undefined
  try {
    const s = JSON.stringify(value)
    if (maxBytes && s.length > maxBytes) {
      return JSON.stringify({
        __truncated: true,
        __originalBytes: s.length,
        preview: s.slice(0, maxBytes),
      })
    }
    return s
  } catch {
    return undefined
  }
}

function safeParse<T = unknown>(json: string | undefined): T | undefined {
  if (!json) return undefined
  try {
    return JSON.parse(json) as T
  } catch {
    return undefined
  }
}

function toStored(run: Omit<WorkflowRun, 'id'>): StoredWorkflowRun {
  const stored: StoredWorkflowRun = {
    type: 'workflow-run',
    title: `Run · ${run.workflowName || run.workflowId} · ${new Date(run.startedAt).toLocaleString()}`,
    workflowId: run.workflowId,
    workflowName: run.workflowName,
    agentId: run.agentId,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationMs: run.durationMs,
    stepCount: run.stepCount,
    error: run.error,
  }
  const inputJson = safeStringify(run.input, 32 * 1024)
  if (inputJson !== undefined) stored.inputJson = inputJson
  const outputJson = safeStringify(run.output, 32 * 1024)
  if (outputJson !== undefined) stored.outputJson = outputJson
  const tracesJson = safeStringify(run.traces, MAX_TRACE_BYTES)
  if (tracesJson !== undefined) stored.tracesJson = tracesJson
  const stepOutputsJson = safeStringify(run.stepOutputs, MAX_TRACE_BYTES)
  if (stepOutputsJson !== undefined) stored.stepOutputsJson = stepOutputsJson
  return stored
}

function fromStored(id: string, stored: StoredWorkflowRun | Record<string, unknown>): WorkflowRun {
  const s = stored as StoredWorkflowRun & Record<string, unknown>
  return {
    id,
    workflowId: String(s.workflowId || ''),
    workflowName: s.workflowName ? String(s.workflowName) : undefined,
    agentId: s.agentId ? String(s.agentId) : undefined,
    status: (s.status as WorkflowRunStatus) || 'completed',
    startedAt: String(s.startedAt || ''),
    completedAt: s.completedAt ? String(s.completedAt) : undefined,
    durationMs: typeof s.durationMs === 'number' ? s.durationMs : undefined,
    stepCount: typeof s.stepCount === 'number' ? s.stepCount : undefined,
    input: safeParse(s.inputJson),
    output: safeParse(s.outputJson),
    traces: safeParse<Trace[]>(s.tracesJson),
    stepOutputs: safeParse<Record<string, unknown>>(s.stepOutputsJson),
    error: s.error ? String(s.error) : undefined,
  }
}

// ─── Tool endpoint helpers ───────────────────────────────────────────────────

async function callTool<T = unknown>(name: string, args: Record<string, unknown>, agentId = 'workflow'): Promise<T> {
  const res = await fetch(`/api/workflows/tool/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ args, agentId }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`Tool ${name} request failed (${res.status}): ${detail}`)
  }
  const data = (await res.json()) as { ok: boolean; result?: T; error?: string }
  if (!data.ok) throw new Error(`Tool ${name} failed: ${data.error || 'unknown error'}`)
  return data.result as T
}

// ─── Composable ──────────────────────────────────────────────────────────────

export function useWorkflowRuns(workflowIdRef: Ref<string> | string) {
  const runs = ref<WorkflowRun[]>([])
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  const workflowId = computed<string>(() => (typeof workflowIdRef === 'string' ? workflowIdRef : workflowIdRef.value))

  /** Persist a new run entry to the graph. */
  async function record(run: Omit<WorkflowRun, 'id'>): Promise<WorkflowRun | null> {
    try {
      const timestamp = new Date(run.startedAt).getTime() || Date.now()
      const entityId = `entity:run-${run.workflowId}-${timestamp}`
      const stored = toStored(run)
      await callTool(
        'tql_mutate',
        {
          action: 'createNode',
          entityId,
          type: 'entity',
          data: stored,
        },
        run.agentId || 'workflow',
      )
      const full: WorkflowRun = { ...run, id: entityId }
      // Insert at top of the local list for instant feedback
      runs.value = [full, ...runs.value]
      return full
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : String(err)
      return null
    }
  }

  /**
   * Load the run list for the current workflow (newest first). Only queries
   * attributes guaranteed to be present on every run — attributes like `error`,
   * `inputJson`, `outputJson` are absent on happy-path runs and therefore not
   * yet in the EAV catalog, which would reject a projection on them.
   *
   * Full payload (traces, stepOutputs, etc.) is loaded on demand via `get()`.
   */
  async function load(limit = 50): Promise<void> {
    if (!workflowId.value) {
      runs.value = []
      return
    }
    isLoading.value = true
    lastError.value = null
    try {
      const eqls = `FIND entity AS ?r WHERE ?r.type = "workflow-run" AND ?r.workflowId = "${workflowId.value}" RETURN ?r, ?r.workflowId, ?r.workflowName, ?r.status, ?r.startedAt, ?r.completedAt, ?r.durationMs, ?r.stepCount, ?r.agentId ORDER BY ?r.startedAt DESC LIMIT ${limit}`
      const result = await callTool<{ rows: Record<string, unknown>[]; count: number }>('tql_query', { eqls })
      const rows = result.rows ?? []
      runs.value = rows
        .map((row) => {
          const id = String(row['?r'] || '')
          if (!id) return null
          const stored: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(row)) {
            if (k === '?r') continue
            if (k.startsWith('?r.')) stored[k.slice(3)] = v
          }
          return fromStored(id, stored)
        })
        .filter((r): r is WorkflowRun => r !== null)
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : String(err)
      runs.value = []
    } finally {
      isLoading.value = false
    }
  }

  /** Fetch a single run with full trace payload. */
  async function get(runId: string): Promise<WorkflowRun | null> {
    try {
      const result = await callTool<{ id: string; data: Record<string, unknown> | null }>('tql_load_data', {
        entityId: runId,
      })
      if (!result?.data) return null
      return fromStored(runId, result.data)
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : String(err)
      return null
    }
  }

  /** Delete a stored run. */
  async function remove(runId: string): Promise<boolean> {
    try {
      await callTool('tql_mutate', { action: 'deleteNode', entityId: runId }, 'workflow')
      runs.value = runs.value.filter((r) => r.id !== runId)
      return true
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : String(err)
      return false
    }
  }

  // Auto-load whenever the workflowId changes
  watch(
    workflowId,
    (id) => {
      if (id) load()
    },
    { immediate: true },
  )

  return {
    runs,
    isLoading,
    lastError,
    record,
    load,
    get,
    remove,
  }
}
