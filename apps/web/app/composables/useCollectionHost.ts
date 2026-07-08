import {
  resolveCollectionHost,
  type ResolveCollectionHostResult,
} from '~/lib/collection-host-resolver'

/**
 * Resolve `/collections/:slug` vs `/workspace/browse/:type` for the current app.
 */
export function useCollectionHost() {
  const { currentApp, collections, collectionsLoading, getCollectionBySlug } = useInstantData()
  const { isBrowsableType, hasType } = useOntologyRegistry()

  const instantCollectionSlugs = computed(() => {
    return new Set(
      (collections.value || [])
        .filter((c) => !c.parentId)
        .map((c) => c.slug.trim().toLowerCase()),
    )
  })

  function instantDbOwnsSlug(slug: string): boolean {
    const normalized = slug.trim().toLowerCase()
    if (!normalized) return false
    return instantCollectionSlugs.value.has(normalized)
  }

  function resolveSlug(slug: string): ResolveCollectionHostResult {
    const trimmed = slug.trim()
    const appId = currentApp.value?.id
    if (!appId || !trimmed) {
      return resolveCollectionHost({
        slug: trimmed,
        hasInstantDbCollection: false,
        isBrowsableOntologyType: false,
      })
    }

    return resolveCollectionHost({
      slug: trimmed,
      hasInstantDbCollection: !!getCollectionBySlug(appId, trimmed),
      isBrowsableOntologyType: hasType(trimmed) && isBrowsableType(trimmed),
    })
  }

  return {
    collectionsLoading,
    instantCollectionSlugs,
    instantDbOwnsSlug,
    resolveSlug,
  }
}
