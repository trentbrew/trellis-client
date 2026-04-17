import type { WorkflowGraph } from '~/types/database'

/**
 * useWorkflowTriggers — client composable for managing workflow triggers.
 *
 * Triggers live in the TQL graph as `workflow-trigger` entities and are
 * managed via the `/api/workflows/triggers` REST endpoints. When a trigger
 * is created or updated, we send a cached snapshot of the current workflow
 * graph so the server can execute the workflow headlessly when the trigger
 * fires (cron tick, webhook POST, entity-change match).
 */

export type TriggerKind = 'schedule' | 'webhook' | 'entity-change'

export type EntityChangeAction = 'createNode' | 'updateNode' | 'deleteNode' | 'any'

export interface WorkflowTrigger {
  id: string
  title: string
  workflowId: string
  workflowName?: string
  graph: WorkflowGraph
  kind: TriggerKind
  active: boolean
  agentId?: string

  cron?: string
  timezone?: string

  token?: string

  watchType?: string
  watchAction?: EntityChangeAction
  watchAttribute?: string

  lastFiredAt?: string
  lastRunId?: string
  fireCount?: number
  lastError?: string

  createdAt: number
  updatedAt: number
}

export interface TriggerCreateInput {
  title?: string
  workflowId: string
  workflowName?: string
  graph: WorkflowGraph
  kind: TriggerKind
  active?: boolean
  agentId?: string
  cron?: string
  timezone?: string
  token?: string
  watchType?: string
  watchAction?: EntityChangeAction
  watchAttribute?: string
}

export type TriggerPatch = Partial<Omit<WorkflowTrigger, 'id' | 'createdAt' | 'updatedAt'>> & {
  agentId?: string
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

async function api<T = unknown>(
  url: string,
  opts: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`${opts.method || 'GET'} ${url} failed (${res.status}): ${detail}`)
  }
  return (await res.json()) as T
}

// ─── Composable ──────────────────────────────────────────────────────────────

export function useWorkflowTriggers(workflowIdRef: Ref<string> | string) {
  const triggers = ref<WorkflowTrigger[]>([])
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  const workflowId = computed<string>(() =>
    typeof workflowIdRef === 'string' ? workflowIdRef : workflowIdRef.value,
  )

  async function load(): Promise<void> {
    if (!workflowId.value) {
      triggers.value = []
      return
    }
    isLoading.value = true
    lastError.value = null
    try {
      const data = await api<{ ok: boolean; triggers: WorkflowTrigger[] }>(
        `/api/workflows/triggers?workflowId=${encodeURIComponent(workflowId.value)}`,
      )
      triggers.value = data.triggers ?? []
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : String(err)
      triggers.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function create(input: TriggerCreateInput): Promise<WorkflowTrigger | null> {
    try {
      const data = await api<{ ok: boolean; trigger: WorkflowTrigger }>(
        `/api/workflows/triggers`,
        { method: 'POST', body: JSON.stringify(input) },
      )
      triggers.value = [data.trigger, ...triggers.value]
      return data.trigger
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : String(err)
      return null
    }
  }

  async function update(id: string, patch: TriggerPatch): Promise<WorkflowTrigger | null> {
    try {
      const data = await api<{ ok: boolean; trigger: WorkflowTrigger }>(
        `/api/workflows/triggers/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: JSON.stringify(patch) },
      )
      triggers.value = triggers.value.map((t) => (t.id === id ? data.trigger : t))
      return data.trigger
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : String(err)
      return null
    }
  }

  async function remove(id: string): Promise<boolean> {
    try {
      await api(`/api/workflows/triggers/${encodeURIComponent(id)}`, { method: 'DELETE' })
      triggers.value = triggers.value.filter((t) => t.id !== id)
      return true
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : String(err)
      return false
    }
  }

  /** Manually fire a trigger (useful for testing). Returns the run entity ID. */
  async function fireNow(id: string, input?: unknown): Promise<string | null> {
    try {
      const data = await api<{ ok: boolean; run: { id: string } }>(
        `/api/workflows/triggers/${encodeURIComponent(id)}/fire`,
        { method: 'POST', body: JSON.stringify({ input }) },
      )
      // Refresh to pick up updated tracking fields
      await load()
      return data.run?.id || null
    } catch (err) {
      lastError.value = err instanceof Error ? err.message : String(err)
      return null
    }
  }

  /** Build a webhook URL for a webhook trigger (absolute URL for sharing). */
  function webhookUrl(trigger: WorkflowTrigger): string | null {
    if (trigger.kind !== 'webhook' || !trigger.token) return null
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/api/workflows/webhook/${trigger.token}`
  }

  watch(
    workflowId,
    (id) => {
      if (id) load()
    },
    { immediate: true },
  )

  return {
    triggers,
    isLoading,
    lastError,
    load,
    create,
    update,
    remove,
    fireNow,
    webhookUrl,
  }
}
