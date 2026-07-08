import type { QueryViewRegionConfig } from '~/types/deck'
import type { QueryViewDemoPayload } from '~/lib/deck-query-view-demo'
import { getQueryViewDemoData } from '~/lib/deck-query-view-demo'
import { mapQueryRowsToQueryView } from '~/lib/deck-query-view-map'
import { toEqlQuery } from '~/lib/deck-query-eql'

/**
 * Live queryView data for a slide — TQL on mount + SSE debounced refresh.
 */
export function useDeckQueryView(
  slideEntityId: MaybeRef<string>,
  config: MaybeRef<QueryViewRegionConfig | undefined>,
  enabled: MaybeRef<boolean> = ref(true),
) {
  const { query, graphVersion } = useTrellisGraph()

  const loading = ref(false)
  const usingFallback = ref(false)
  const payload = ref<QueryViewDemoPayload | null>(null)
  const pulseRefresh = ref(false)

  const eql = computed(() => (unref(enabled) ? toEqlQuery(unref(config)) : ''))

  const { data: rows, loading: queryLoading, error: queryError } = query(eql)

  function applyPayload() {
    const id = unref(slideEntityId)
    const demo = getQueryViewDemoData(id)
    const list = (rows.value || []) as Record<string, unknown>[]
    if (queryError.value || !list.length) {
      usingFallback.value = true
      payload.value = demo
      return
    }
    usingFallback.value = false
    payload.value = mapQueryRowsToQueryView(list, demo)
  }

  watch([rows, queryError, slideEntityId, config], applyPayload, { immediate: true })
  watch(queryLoading, (v) => {
    loading.value = v
  })

  let refreshTimer: ReturnType<typeof setTimeout> | null = null
  watch(graphVersion, () => {
    if (!unref(enabled)) return
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      applyPayload()
      pulseRefresh.value = true
      setTimeout(() => {
        pulseRefresh.value = false
      }, 400)
    }, 500)
  })

  onUnmounted(() => {
    if (refreshTimer) clearTimeout(refreshTimer)
  })

  return {
    payload,
    loading,
    usingFallback,
    pulseRefresh,
  }
}
