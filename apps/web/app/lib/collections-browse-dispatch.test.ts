import { describe, it, expect } from 'vitest'
import {
  shouldRedirectCollectionSlugToBrowse,
  browsePathForOntologySlug,
} from '~/lib/collections-browse-dispatch'

describe('collections-browse-dispatch', () => {
  it('redirects when ontology type exists and no InstantDB collection', () => {
    expect(
      shouldRedirectCollectionSlugToBrowse({
        slug: 'invoice',
        hasInstantDbCollection: false,
        isBrowsableOntologyType: true,
      }),
    ).toBe(true)
  })

  it('prefers InstantDB collection when both exist', () => {
    expect(
      shouldRedirectCollectionSlugToBrowse({
        slug: 'invoice',
        hasInstantDbCollection: true,
        isBrowsableOntologyType: true,
      }),
    ).toBe(false)
  })

  it('does not redirect unknown or non-browsable slugs', () => {
    expect(
      shouldRedirectCollectionSlugToBrowse({
        slug: 'channel',
        hasInstantDbCollection: false,
        isBrowsableOntologyType: false,
      }),
    ).toBe(false)
    expect(
      shouldRedirectCollectionSlugToBrowse({
        slug: '',
        hasInstantDbCollection: false,
        isBrowsableOntologyType: true,
      }),
    ).toBe(false)
  })

  it('builds browse path for slug', () => {
    expect(browsePathForOntologySlug('invoice')).toBe('/workspace/browse/invoice')
    expect(browsePathForOntologySlug(' my-type ')).toBe('/workspace/browse/my-type')
  })
})
