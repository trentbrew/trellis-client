/**
 * useTrellisGraph — reactive client composable for the TQL graph API.
 *
 * Provides:
 * - `query(eqls)`       — execute an EQL-S query, returns reactive ref
 * - `queryOnce(eqls)`   — one-shot query, returns raw data
 * - `projection(id)`    — execute a named projection, returns reactive ref
 * - `fetchNode(id)`     — fetch a single node by entity ID
 * - `mutate(action, payload)` — create/update/delete nodes, link/unlink
 * - Realtime SSE connection — auto-refreshes queries when any client mutates
 */

import { useSSESubscribe } from './useTrellisSSE'
import { useZoneContext } from './useZoneContext'

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
  | { action: 'unlink'; e1: string; relation: string; e2: string }

const API_BASE = '/api/graph'

function isKernelStartingError(err: unknown): boolean {
  const status = (err as { statusCode?: number; response?: { status?: number } })?.statusCode
    ?? (err as { response?: { status?: number } })?.response?.status
  if (status === 503) return true
  const message = err instanceof Error ? err.message : String(err)
  return message.includes('503') || message.includes('TQL kernel not initialized')
}

async function graphFetch<T>(
  path: string,
  opts?: { method?: string; body?: Record<string, any>; headers?: Record<string, string> },
  attempt = 0,
): Promise<T> {
  try {
    const res = await $fetch<T>(`${API_BASE}/${path}`, {
      method: (opts?.method as any) || 'GET',
      body: opts?.body,
      headers: opts?.headers,
    })
    return res as T
  } catch (err) {
    // Kernel plugin seeds after boot — brief 503 window on HMR/cold start.
    if (attempt < 4 && isKernelStartingError(err)) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
      return graphFetch<T>(path, opts, attempt + 1)
    }
    throw err
  }
}

// Version counter — bumped on every mutation so reactive queries re-fetch
const _graphVersion = ref(0)

/** Force reactive queries to re-fetch (e.g. after insertRow before SSE round-trip). */
export function bumpGraphVersion() {
  _graphVersion.value++
}

// ── SSE connection (centralized, singleton) ─────────────────────────────
let _sseInitialized = false
let _debouncedBump: ReturnType<typeof setTimeout> | null = null

function initSSE() {
  if (_sseInitialized || typeof window === 'undefined') return
  _sseInitialized = true

  // Subscribe to mutation events via centralized SSE manager
  useSSESubscribe('mutation', () => {
    // Debounce rapid-fire mutations (e.g. GCal sync upserting many events)
    // into a single _graphVersion bump so reactive queries re-fetch once.
    if (_debouncedBump) clearTimeout(_debouncedBump)
    _debouncedBump = setTimeout(() => {
      _graphVersion.value++
      _debouncedBump = null
    }, 300)
  })
}

/**
 * Core composable for interacting with the TQL graph from Vue components.
 */
export function useTrellisGraph() {
  // Start SSE listener on first use (client-only)
  initSSE()

  // Slice 1.4: resolve the current Campus zone so every mutation carries
  // an explicit X-Trellis-Zone header. Falls back gracefully when called
  // outside a route context.
  const { zoneHeaders } = useZoneContext()

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
      // Skip fetch for empty queries — avoids 400 errors from the API
      if (!eqlsValue.value || !eqlsValue.value.trim()) {
        data.value = []
        loading.value = false
        error.value = null
        return
      }

      try {
        loading.value = true
        error.value = null
        const result = await graphFetch<GraphQueryResult>('query', {
          method: 'POST',
          body: { query: eqlsValue.value },
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

    return { data, loading, error, refresh: fetchData }
  }

  /**
   * One-shot query — no reactivity, returns raw result.
   */
  async function queryOnce(eqls: string): Promise<GraphQueryResult> {
    return graphFetch<GraphQueryResult>('query', {
      method: 'POST',
      body: { query: eqls },
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
          body: { projection: idValue.value },
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
    return graphFetch<GraphNodeResult>(`node/${encodeURIComponent(entityId)}`)
  }

  /**
   * Batch fetch multiple nodes by entity IDs (single request).
   */
  async function fetchNodes(ids: string[]): Promise<Record<string, any>[]> {
    const result = await graphFetch<{ nodes: Record<string, any>[] }>('nodes', {
      method: 'POST',
      body: { ids },
    })
    return result.nodes
  }

  /**
   * Execute a mutation (create/update/delete/link).
   * Reactivity is handled by the SSE event listener bumping _graphVersion.
   *
   * Slice 1.4: each call carries X-Trellis-Zone + X-Trellis-Facility
   * derived from the current route (or a provideZoneOverride() if any
   * ancestor component set one). Pass `zoneId` to override per-call.
   */
  async function mutate(
    payload: MutatePayload,
    opts?: { zoneId?: string; captureDecision?: boolean },
  ): Promise<{ ok: boolean }> {
    const result = await graphFetch<{ ok: boolean }>('mutate', {
      method: 'POST',
      body: payload as Record<string, any>,
      headers: zoneHeaders(opts),
    })
    // NOTE: Don't bump _graphVersion here — the SSE 'mutation' event from the
    // server will bump it once, which is the authoritative notification.
    // Bumping here AND on SSE caused every reactive query to fire twice.
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
    fetchNodes,
    mutate,
    health,
    /** Expose for advanced use — manually bump to force all queries to re-fetch */
    graphVersion: readonly(_graphVersion),
  }
}
