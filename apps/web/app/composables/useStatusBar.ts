import type { DataMode } from '~/lib/data-adapter'
import { useSSESubscribe } from '~/composables/useTrellisSSE'

const _linkCount = ref<number | null>(null)
const _isLinkCountLoading = ref(false)
let _graphHealthStarted = false
let _healthDebounce: ReturnType<typeof setTimeout> | null = null

async function refreshLinkCount() {
  if (!import.meta.client) return
  _isLinkCountLoading.value = true
  try {
    const health = await $fetch<{ linkCount?: number }>('/api/graph/health')
    _linkCount.value = typeof health.linkCount === 'number' ? health.linkCount : null
  } catch {
    _linkCount.value = null
  } finally {
    _isLinkCountLoading.value = false
  }
}

function scheduleLinkCountRefresh() {
  if (_healthDebounce) clearTimeout(_healthDebounce)
  _healthDebounce = setTimeout(() => {
    void refreshLinkCount()
    _healthDebounce = null
  }, 300)
}

function initGraphHealthStats() {
  if (!import.meta.client || _graphHealthStarted) return
  _graphHealthStarted = true
  void refreshLinkCount()
  useSSESubscribe('mutation', scheduleLinkCountRefresh)
}

/**
 * useStatusBar — reactive composable for the global status bar.
 *
 * Aggregates system state from multiple sources into a single
 * reactive interface consumed by the StatusBar component.
 */
export function useStatusBar() {
  initGraphHealthStats()

  const route = useRoute()
  const adapter = useAdapterStatus()
  const auth = useInstantAuth()
  const { items, loading: entitiesLoading } = useEntities()

  // ── Data Mode ──────────────────────────────────────────────────────
  const dataMode = computed<DataMode>(() => adapter.mode.value)
  const isCloud = computed(() => adapter.isCloud.value)
  const entityBackend = computed(() => adapter.entityBackend.value)
  const ontologyBackend = computed(() => adapter.ontologyBackend.value)

  // ── Auth ───────────────────────────────────────────────────────────
  const authUser = computed(() => auth.user.value)
  const isAuthenticated = computed(() => !!auth.user.value)
  const isAuthLoading = computed(() => auth.isLoading.value)
  const authLabel = computed(() => {
    if (isAuthLoading.value) return 'Authenticating…'
    if (isAuthenticated.value) return auth.user.value?.email || auth.user.value?.name || 'Signed in'
    if (dataMode.value === 'local') return 'Local (no auth)'
    return 'Not signed in'
  })

  // ── Graph Stats ────────────────────────────────────────────────────
  const entityCount = computed(() => items.value.length)
  const isEntitiesLoading = computed(() => entitiesLoading.value)
  const linkCount = computed(() => _linkCount.value)
  const isLinkCountLoading = computed(() => _isLinkCountLoading.value)

  // ── Health ─────────────────────────────────────────────────────────
  const adapterError = computed(() => adapter.lastError.value)
  const isHealthy = computed(() => adapter.isHealthy.value)

  // ── Navigation ─────────────────────────────────────────────────────
  const currentPath = computed(() => route.path)

  // ── Version ────────────────────────────────────────────────────────
  const version = 'v0.1.0'

  return {
    // Data mode
    dataMode,
    isCloud,
    entityBackend,
    ontologyBackend,

    // Auth
    authUser,
    isAuthenticated,
    isAuthLoading,
    authLabel,

    // Graph
    entityCount,
    isEntitiesLoading,
    linkCount,
    isLinkCountLoading,

    // Health
    adapterError,
    isHealthy,

    // Navigation
    currentPath,

    // Meta
    version,
  }
}
