const MAX_RECENT = 8

/**
 * useRecentPages — Tracks recently-visited page IDs for the /pages route.
 *
 * Session-scoped (useState), no localStorage persistence.
 * Auto-prunes IDs whose pages no longer exist in the store.
 */
export function useRecentPages() {
  const recentIds = useState<string[]>('recentPages:ids', () => [])
  const { pages } = usePageNotes()

  // Keep the list clean: drop IDs that no longer exist in the page store
  const validIds = computed(() => {
    const pageIdSet = new Set(pages.value.map((p) => p.id))
    return recentIds.value.filter((id) => pageIdSet.has(id))
  })

  // Sync pruned list back (avoids stale entries accumulating)
  watch(validIds, (ids) => {
    if (ids.length !== recentIds.value.length) {
      recentIds.value = ids
    }
  })

  function addPage(id: string) {
    const without = recentIds.value.filter((x) => x !== id)
    recentIds.value = [id, ...without].slice(0, MAX_RECENT)
  }

  function removePage(id: string) {
    recentIds.value = recentIds.value.filter((x) => x !== id)
  }

  function clearAll() {
    recentIds.value = []
  }

  return {
    recentIds: validIds,
    addPage,
    removePage,
    clearAll,
  }
}
