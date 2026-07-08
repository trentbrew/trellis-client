/**
 * @deprecated Import from `~/lib/collection-host-resolver` instead.
 * Thin re-export for Phase 0–2 call sites.
 */
export {
  browsePathForOntologySlug,
  shouldRedirectCollectionSlugToBrowse,
  resolveCollectionHost,
  collectionPathForSlug,
} from '~/lib/collection-host-resolver'

export type {
  CollectionHostKind,
  ResolveCollectionHostInput,
  ResolveCollectionHostResult,
} from '~/lib/collection-host-resolver'
