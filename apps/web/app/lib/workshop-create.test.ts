import { describe, expect, test } from 'vitest'
import { uniqueWorkshopSlug } from './workshop-create'

describe('uniqueWorkshopSlug', () => {
  test('slugifies deck title', () => {
    expect(uniqueWorkshopSlug('deck', 'YC S26 Pitch', [])).toBe('yc-s26-pitch')
  })

  test('dedupes when deck id exists', () => {
    expect(uniqueWorkshopSlug('deck', 'untitled', ['entity:deck-untitled'])).toBe('untitled-1')
  })
})
