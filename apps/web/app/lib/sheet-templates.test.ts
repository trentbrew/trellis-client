import { describe, expect, it } from 'vitest'
import { BROWSE_DOMAIN_TYPES } from '~/lib/entities-live/browse-domain-types'
import { getBrowseEntityTypes } from '~/config/entityRegistry'
import { resolveSheetTemplate } from '~/lib/sheet-templates'

describe('browse-domain-types', () => {
  it('excludes budget from kernel browse aggregate', () => {
    expect(BROWSE_DOMAIN_TYPES).not.toContain('budget')
  })
})

describe('entityRegistry browse visibility', () => {
  it('hides budget from browse entity types', () => {
    const types = getBrowseEntityTypes().map((t) => t.type)
    expect(types).not.toContain('budget')
  })
})

describe('sheet-templates', () => {
  it('budget template queries expense rows with formula columns', () => {
    const template = resolveSheetTemplate('budget')
    expect(template.query).toContain('expense')
    expect(template.columns.some((c) => c.kind === 'formula')).toBe(true)
  })
})
