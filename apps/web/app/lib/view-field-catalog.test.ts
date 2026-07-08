import { describe, expect, test } from 'vitest'
import {
  buildViewFieldCatalog,
  defaultVisibleKeys,
  moveViewFieldKey,
  normalizeViewFieldKeys,
  toggleViewFieldKey,
} from '~/lib/view-field-catalog'

describe('view-field-catalog', () => {
  test('returns builtins only for all mode', () => {
    const catalog = buildViewFieldCatalog('all', [
      { key: 'customField', label: 'Custom', valueType: 'rich_text' },
    ])
    expect(catalog.every((f) => f.source === 'builtin')).toBe(true)
    expect(catalog.some((f) => f.key === 'customField')).toBe(false)
  })

  test('merges ontology columns for a typed catalog', () => {
    const catalog = buildViewFieldCatalog('invoice', [
      { key: 'amount', label: 'Amount', valueType: 'number' },
      { key: 'title', label: 'Title', valueType: 'title', isTitle: true },
    ])
    expect(catalog.some((f) => f.key === 'amount' && f.source === 'ontology')).toBe(true)
    expect(catalog.some((f) => f.key === 'title')).toBe(false)
  })

  test('dedupes ontology when key matches builtin', () => {
    const catalog = buildViewFieldCatalog('task', [
      { key: 'description', label: 'Description', valueType: 'rich_text' },
      { key: 'priority', label: 'Priority', valueType: 'select' },
    ])
    const ontologyDesc = catalog.filter((f) => f.key === 'description' && f.source === 'ontology')
    const ontologyPriority = catalog.filter((f) => f.key === 'priority' && f.source === 'ontology')
    expect(ontologyDesc).toHaveLength(0)
    expect(ontologyPriority).toHaveLength(0)
    expect(catalog.filter((f) => f.key === 'description' && f.source === 'builtin')).toHaveLength(1)
  })

  test('skips files and formula ontology fields', () => {
    const catalog = buildViewFieldCatalog('note', [
      { key: 'attachments', label: 'Files', valueType: 'files' },
      { key: 'total', label: 'Total', valueType: 'formula' },
      { key: 'category', label: 'Category', valueType: 'select' },
    ])
    expect(catalog.some((f) => f.key === 'attachments')).toBe(false)
    expect(catalog.some((f) => f.key === 'total')).toBe(false)
    expect(catalog.some((f) => f.key === 'category')).toBe(true)
  })

  test('normalizeViewFieldKeys preserves order and drops unknown', () => {
    const catalog = buildViewFieldCatalog('task', [])
    const saved = ['status', 'unknown', 'priority']
    expect(normalizeViewFieldKeys(catalog, saved)).toEqual(['status', 'priority'])
  })

  test('toggleViewFieldKey removes key without reordering survivors', () => {
    const catalog = buildViewFieldCatalog('task', [])
    const ordered = ['priority', 'status', 'description', 'type']
    const withoutStatus = toggleViewFieldKey(ordered, 'status', false, catalog)
    expect(withoutStatus).toEqual(['priority', 'description', 'type'])
  })

  test('toggleViewFieldKey preserves custom order when re-showing a field', () => {
    const catalog = buildViewFieldCatalog('task', [])
    const ordered = ['priority', 'status', 'description', 'type']
    const hidden = toggleViewFieldKey(ordered, 'description', false, catalog)
    const restored = toggleViewFieldKey(hidden, 'description', true, catalog)
    expect(restored).toEqual(['priority', 'status', 'type', 'description'])
    expect(restored.indexOf('priority')).toBeLessThan(restored.indexOf('status'))
  })

  test('moveViewFieldKey reorders visible keys', () => {
    const visible = ['type', 'status', 'priority', 'description']
    expect(moveViewFieldKey(visible, 'description', -1)).toEqual(['type', 'status', 'description', 'priority'])
  })

  test('defaultVisibleKeys for file type hides technical ontology fields', () => {
    const catalog = buildViewFieldCatalog('file', [
      { key: 'mimeType', label: 'Mime Type', valueType: 'rich_text' },
      { key: 'url', label: 'Url', valueType: 'url' },
      { key: 'owner', label: 'Owner', valueType: 'people' },
    ])
    expect(defaultVisibleKeys(catalog, 'file')).toEqual(['description', 'tags'])
  })
})
