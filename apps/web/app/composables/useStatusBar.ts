import type { DataMode } from '~/lib/data-adapter'

/**
 * useStatusBar — reactive composable for the global status bar.
 *
 * Aggregates system state from multiple sources into a single
 * reactive interface consumed by the StatusBar component.
 */
export function useStatusBar() {
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

    // Health
    adapterError,
    isHealthy,

    // Navigation
    currentPath,

    // Meta
    version,
  }
}
