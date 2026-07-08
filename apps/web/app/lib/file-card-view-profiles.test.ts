import { describe, expect, test } from 'vitest'
import {
  filterFileCardVisibleKeys,
  getFileBrowseDefaultVisibleKeys,
  getFileCategoryBadges,
  isFileFieldRelevantForCategory,
  resolveFileCategory,
  shouldMigrateFileCardLayout,
} from '~/lib/file-card-view-profiles'

describe('file-card-view-profiles', () => {
  test('resolveFileCategory falls back to mime classification', () => {
    expect(resolveFileCategory({ mimeType: 'image/png' })).toBe('image')
    expect(resolveFileCategory({ mimeType: 'video/mp4' })).toBe('video')
  })

  test('getFileBrowseDefaultVisibleKeys returns human-facing defaults', () => {
    const keys = new Set([
      'description',
      'tags',
      'mimeType',
      'url',
      'owner',
      'createdAt',
    ])
    expect(getFileBrowseDefaultVisibleKeys(keys)).toEqual(['description', 'tags'])
  })

  test('filterFileCardVisibleKeys drops technical keys on card face', () => {
    const visible = ['description', 'tags', 'mimeType', 'url', 'owner']
    const filtered = filterFileCardVisibleKeys(visible, { mimeType: 'image/png', fileCategory: 'image' })
    expect(filtered).toEqual(['description', 'tags'])
  })

  test('isFileFieldRelevantForCategory gates enrichment keys', () => {
    expect(isFileFieldRelevantForCategory('videoDuration', 'video')).toBe(true)
    expect(isFileFieldRelevantForCategory('videoDuration', 'image')).toBe(false)
    expect(isFileFieldRelevantForCategory('description', 'image')).toBe(true)
  })

  test('getFileCategoryBadges returns category-specific labels', () => {
    const imageBadges = getFileCategoryBadges({
      fileCategory: 'image',
      imageWidth: 1920,
      imageHeight: 1080,
      sizeBytes: 2048,
    })
    expect(imageBadges.some((b) => b.value === '1920×1080')).toBe(true)
    expect(imageBadges.some((b) => b.label === 'Size' && b.value.includes('KB'))).toBe(true)

    const videoBadges = getFileCategoryBadges({
      fileCategory: 'video',
      videoDuration: 125,
    })
    expect(videoBadges.some((b) => b.value === '2m 5s')).toBe(true)
  })

  test('shouldMigrateFileCardLayout detects noisy saved layouts', () => {
    expect(shouldMigrateFileCardLayout(['mimeType', 'url', 'owner'])).toBe(true)
    expect(shouldMigrateFileCardLayout(['description', 'tags'])).toBe(false)
  })
})
