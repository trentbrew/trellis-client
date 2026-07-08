export type CollectionHostKind = 'instant-collection' | 'ontology-browse' | 'not-found'

export type ResolveCollectionHostInput = {
  slug: string
  hasInstantDbCollection: boolean
  isBrowsableOntologyType: boolean
}

export type ResolveCollectionHostResult = {
  kind: CollectionHostKind
  path: string | null
  /** True when both InstantDB collection and browsable ontology share the slug. */
  collision: boolean
  slug: string
}

export function collectionPathForSlug(slug: string): string {
  return `/collections/${encodeURIComponent(slug.trim())}`
}

export function browsePathForOntologySlug(slug: string): string {
  return `/workspace/browse/${encodeURIComponent(slug.trim())}`
}

/**
 * Resolve which host owns a slug: InstantDB spreadsheet, ontology browse, or neither.
 * InstantDB always wins when both exist (collision flagged for sidebar + dev logs).
 */
export function resolveCollectionHost(input: ResolveCollectionHostInput): ResolveCollectionHostResult {
  const slug = input.slug.trim()
  if (!slug) {
    return { kind: 'not-found', path: null, collision: false, slug: '' }
  }

  const hasInstant = input.hasInstantDbCollection
  const hasOntology = input.isBrowsableOntologyType
  const collision = hasInstant && hasOntology

  if (hasInstant) {
    return {
      kind: 'instant-collection',
      path: collectionPathForSlug(slug),
      collision,
      slug,
    }
  }

  if (hasOntology) {
    return {
      kind: 'ontology-browse',
      path: browsePathForOntologySlug(slug),
      collision: false,
      slug,
    }
  }

  return { kind: 'not-found', path: null, collision: false, slug }
}

/** @deprecated Use resolveCollectionHost — kept for Phase 0–2 call sites. */
export function shouldRedirectCollectionSlugToBrowse(input: ResolveCollectionHostInput): boolean {
  return resolveCollectionHost(input).kind === 'ontology-browse'
}
