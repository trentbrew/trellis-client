/**
 * useTrellisGraph — reactive client composable for the TQL graph API.
 *
 * Provides:
 * - `query(eqls)`       — execute an EQL-S query, returns reactive ref
 * - `queryOnce(eqls)`   — one-shot query, returns raw data
 * - `projection(id)`    — execute a named projection, returns reactive ref
 * - `fetchNode(id)`     — fetch a single node by entity ID
 * - `mutate(action, payload)` — create/update/delete nodes, link/unlink
 * - Automatic polling for reactivity (SSE upgrade path in Phase 3)
 */

type GraphQueryResult = {
  data: Record<string, unknown>[]
  meta?: {
    executionTime?: number
    plan?: string
    trace?: unknown[]
  }
}

type GraphNodeResult = {
  node: Record<string, any>
  links: {
    outgoing: Array<{ relation: string; target: string }>
    incoming: Array<{ relation: string; source: string }>
  }
}

type GraphHealthResult = {
  status: string
  factCount: number
  linkCount: number
}

type MutatePayload =
  | { action: 'createNode'; entityId: string; type: string; data?: Record<string, any> }
  | { action: 'updateNode'; entityId: string; type: string; data?: Record<string, any> }
  | { action: 'deleteNode'; entityId: string }
  | { action: 'link'; e1: string; relation: string; e2: string }

const API_BASE = '/api/graph'

async function graphFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await $fetch<T>(`${API_BASE}/${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  })
  return res
}

// Version counter — bumped on every mutation so reactive queries re-fetch
const _graphVersion = ref(0)

/**
 * Core composable for interacting with the TQL graph from Vue components.
 */
export function useTrellisGraph() {

  /**
   * Execute an EQL-S query with automatic reactivity.
   * Re-fetches when the graph version changes (after mutations).
   */
  function query(eqls: string | Ref<string>) {
    const data = ref<Record<string, unknown>[]>([])
    const loading = ref(true)
    const error = ref<string | null>(null)

    const eqlsValue = isRef(eqls) ? eqls : ref(eqls)

    const fetchData = async () => {
      try {
        loading.value = true
        error.value = null
        const result = await graphFetch<GraphQueryResult>('query', {
          method: 'POST',
          body: JSON.stringify({ query: eqlsValue.value }),
        })
        data.value = result.data
      } catch (err: any) {
        error.value = err.message || 'Query failed'
        console.error('[useTrellisGraph] query error:', err)
      } finally {
        loading.value = false
      }
    }

    // Watch both query string and graph version for reactivity
    watch([eqlsValue, _graphVersion], () => fetchData(), { immediate: true })

    return { data, loading, error }
  }

  /**
   * One-shot query — no reactivity, returns raw result.
   */
  async function queryOnce(eqls: string): Promise<GraphQueryResult> {
    return graphFetch<GraphQueryResult>('query', {
      method: 'POST',
      body: JSON.stringify({ query: eqls }),
    })
  }

  /**
   * Execute a named projection with automatic reactivity.
   */
  function projection(id: string | Ref<string>) {
    const data = ref<Record<string, unknown>[]>([])
    const loading = ref(true)
    const error = ref<string | null>(null)

    const idValue = isRef(id) ? id : ref(id)

    const fetchData = async () => {
      try {
        loading.value = true
        error.value = null
        const result = await graphFetch<GraphQueryResult>('query', {
          method: 'POST',
          body: JSON.stringify({ projection: idValue.value }),
        })
        data.value = result.data
      } catch (err: any) {
        error.value = err.message || 'Projection failed'
        console.error('[useTrellisGraph] projection error:', err)
      } finally {
        loading.value = false
      }
    }

    watch([idValue, _graphVersion], () => fetchData(), { immediate: true })

    return { data, loading, error }
  }

  /**
   * Fetch a single node by entity ID.
   */
  async function fetchNode(entityId: string): Promise<GraphNodeResult> {
    return graphFetch<GraphNodeResult>(`node/${entityId}`)
  }

  /**
   * Execute a mutation (create/update/delete/link).
   * Bumps the graph version so all reactive queries re-fetch.
   */
  async function mutate(payload: MutatePayload): Promise<{ ok: boolean }> {
    const result = await graphFetch<{ ok: boolean }>('mutate', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    // Bump version to trigger reactive re-fetch in all watchers
    _graphVersion.value++
    return result
  }

  /**
   * Health check.
   */
  async function health(): Promise<GraphHealthResult> {
    return graphFetch<GraphHealthResult>('health')
  }

  return {
    query,
    queryOnce,
    projection,
    fetchNode,
    mutate,
    health,
    /** Expose for advanced use — manually bump to force all queries to re-fetch */
    graphVersion: readonly(_graphVersion),
  }
}
