import { describe, expect, test } from 'vitest'
import type { Entity } from '~/types/entity'
import {
  countFilesByCategory,
  fileMatchesBrowseCategory,
  parseFileCategoryParam,
  shouldStripFileCategoryParam,
} from '~/lib/file-browse-categories'

describe('file-browse-categories', () => {
  test('parseFileCategoryParam accepts valid categories and rejects unknown', () => {
    expect(parseFileCategoryParam(undefined)).toBe('all')
    expect(parseFileCategoryParam('all')).toBe('all')
    expect(parseFileCategoryParam('image')).toBe('image')
    expect(parseFileCategoryParam('video')).toBe('video')
    expect(parseFileCategoryParam('not-a-category')).toBe('all')
  })

  test('fileMatchesBrowseCategory uses stored fileCategory', () => {
    const image = { type: 'file', fileCategory: 'image', mimeType: 'video/mp4' }
    expect(fileMatchesBrowseCategory(image, 'image')).toBe(true)
    expect(fileMatchesBrowseCategory(image, 'video')).toBe(false)
    expect(fileMatchesBrowseCategory(image, 'all')).toBe(true)
  })

  test('fileMatchesBrowseCategory falls back to mime classification', () => {
    const item = { type: 'file', mimeType: 'image/png', title: 'photo.png' }
    expect(fileMatchesBrowseCategory(item, 'image')).toBe(true)
    expect(fileMatchesBrowseCategory(item, 'document')).toBe(false)
  })

  test('countFilesByCategory tallies all and per-category', () => {
    const items = [
      { id: '1', type: 'file', fileCategory: 'image' },
      { id: '2', type: 'file', mimeType: 'video/mp4' },
      { id: '3', type: 'note' },
      { id: '4', type: 'file', mimeType: 'application/pdf' },
    ] as Entity[]
    const counts = countFilesByCategory(items)
    expect(counts.all).toBe(3)
    expect(counts.image).toBe(1)
    expect(counts.video).toBe(1)
    expect(counts.document).toBe(1)
  })

  test('shouldStripFileCategoryParam when type is not file or category invalid', () => {
    expect(shouldStripFileCategoryParam('note', 'image')).toBe(true)
    expect(shouldStripFileCategoryParam('file', 'image')).toBe(false)
    expect(shouldStripFileCategoryParam('file', 'bogus')).toBe(true)
    expect(shouldStripFileCategoryParam('file', undefined)).toBe(false)
  })

  test('category filter ignored when browse type is not file', () => {
    const typeParam = 'note'
    const rawCategory = 'image'
    expect(typeParam !== 'file').toBe(true)
    expect(shouldStripFileCategoryParam(typeParam, rawCategory)).toBe(true)
  })
})
