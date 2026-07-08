import { describe, it, expect } from 'vitest'
import {
  normalizeOntologySlug,
  validateOntologySlug,
  isReservedOntologySlug,
} from '~/lib/ontology-reserved-keys'

describe('ontology-reserved-keys', () => {
  it('normalizes labels to dash slugs', () => {
    expect(normalizeOntologySlug('My Invoice Type')).toBe('my-invoice-type')
    expect(normalizeOntologySlug('  Foo_Bar  ')).toBe('foo-bar')
  })

  it('rejects reserved system slugs', () => {
    expect(isReservedOntologySlug('task')).toBe(true)
    expect(isReservedOntologySlug('channel')).toBe(true)
    expect(validateOntologySlug('Task')).toMatch(/reserved/i)
  })

  it('accepts valid custom slugs', () => {
    expect(validateOntologySlug('invoice')).toBeNull()
    expect(isReservedOntologySlug('invoice')).toBe(false)
  })

  it('rejects invalid slug characters', () => {
    expect(validateOntologySlug('123bad')).toMatch(/lowercase/i)
    expect(validateOntologySlug('')).toMatch(/required/i)
  })
})
