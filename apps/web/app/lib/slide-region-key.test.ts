import { describe, it, expect } from 'vitest'
import { makeSlideRegionKey, parseSlideRegionKey } from '~/lib/slide-region-key'

describe('slide-region-key', () => {
  it('round-trips entity ids with colons', () => {
    const key = makeSlideRegionKey('entity:slide-yc-title', 'title')
    expect(parseSlideRegionKey(key)).toEqual({
      entityId: 'entity:slide-yc-title',
      regionId: 'title',
    })
  })

  it('returns null for malformed keys', () => {
    expect(parseSlideRegionKey('no-separator')).toBeNull()
  })
})
