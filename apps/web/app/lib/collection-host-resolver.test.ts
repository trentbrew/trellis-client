import { describe, it, expect } from 'vitest'
import {
  resolveCollectionHost,
  collectionPathForSlug,
  browsePathForOntologySlug,
  shouldRedirectCollectionSlugToBrowse,
} from '~/lib/collection-host-resolver'

describe('collection-host-resolver', () => {
  it('routes InstantDB-only slugs to collections host', () => {
    const result = resolveCollectionHost({
      slug: 'crm',
      hasInstantDbCollection: true,
      isBrowsableOntologyType: false,
    })
    expect(result.kind).toBe('instant-collection')
    expect(result.path).toBe('/collections/crm')
    expect(result.collision).toBe(false)
  })

  it('routes ontology-only slugs to browse host', () => {
    const result = resolveCollectionHost({
      slug: 'invoice',
      hasInstantDbCollection: false,
      isBrowsableOntologyType: true,
    })
    expect(result.kind).toBe('ontology-browse')
    expect(result.path).toBe('/workspace/browse/invoice')
    expect(result.collision).toBe(false)
  })

  it('prefers InstantDB and flags collision when both exist', () => {
    const result = resolveCollectionHost({
      slug: 'invoice',
      hasInstantDbCollection: true,
      isBrowsableOntologyType: true,
    })
    expect(result.kind).toBe('instant-collection')
    expect(result.path).toBe('/collections/invoice')
    expect(result.collision).toBe(true)
    expect(shouldRedirectCollectionSlugToBrowse({
      slug: 'invoice',
      hasInstantDbCollection: true,
      isBrowsableOntologyType: true,
    })).toBe(false)
  })

  it('returns not-found for unknown slugs', () => {
    expect(
      resolveCollectionHost({
        slug: 'channel',
        hasInstantDbCollection: false,
        isBrowsableOntologyType: false,
      }),
    ).toEqual({ kind: 'not-found', path: null, collision: false, slug: 'channel' })
    expect(
      resolveCollectionHost({
        slug: '',
        hasInstantDbCollection: false,
        isBrowsableOntologyType: true,
      }),
    ).toEqual({ kind: 'not-found', path: null, collision: false, slug: '' })
  })

  it('builds collection and browse paths', () => {
    expect(collectionPathForSlug('my-db')).toBe('/collections/my-db')
    expect(browsePathForOntologySlug(' my-type ')).toBe('/workspace/browse/my-type')
  })
})
