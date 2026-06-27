import { describe, expect, it } from 'vitest'

import { createDefaultDatabaseSchema, normalizeDatabaseSchema } from '~/lib/normalizeDatabaseSchema'
import type { DatabaseView } from '~/types/database'

describe('normalizeDatabaseSchema', () => {
  it('returns a valid default-like schema when given null', () => {
    const out = normalizeDatabaseSchema(null, 'c1')
    expect(out.collectionId).toBe('c1')
    expect(Array.isArray(out.fields)).toBe(true)
    expect(Array.isArray(out.views)).toBe(true)
    expect(out.views.length).toBeGreaterThan(0)
    expect(out.views.some((v: DatabaseView) => v.isDefault)).toBe(true)
  })

  it('parses JSON string schemas', () => {
    const raw = JSON.stringify({
      id: 's1',
      collectionId: 'c1',
      fields: [{ id: 'f1', name: 'Name', type: 'text', required: false, order: 0 }],
      views: [{ id: 'v1', name: 'All', type: 'table', filters: [], sorts: [], isDefault: true }],
      createdAt: 1,
      updatedAt: 2,
    })

    const out = normalizeDatabaseSchema(raw, 'c1')
    expect(out.id).toBe('s1')
    expect(out.fields[0]?.id).toBe('f1')
    expect(out.views[0]?.id).toBe('v1')
  })

  it('forces the passed collectionId even if payload differs', () => {
    const out = normalizeDatabaseSchema(
      {
        collectionId: 'wrong',
        fields: [],
        views: [],
        createdAt: 10,
        updatedAt: 11,
      },
      'c1',
    )

    expect(out.collectionId).toBe('c1')
  })

  it('creates a default view if views are missing or empty', () => {
    const out1 = normalizeDatabaseSchema({ fields: [], createdAt: 1, updatedAt: 2 }, 'c1')
    expect(out1.views.length).toBeGreaterThan(0)
    expect(out1.views.some((v: DatabaseView) => v.isDefault)).toBe(true)

    const out2 = normalizeDatabaseSchema({ fields: [], views: [], createdAt: 1, updatedAt: 2 }, 'c1')
    expect(out2.views.length).toBeGreaterThan(0)
    expect(out2.views.some((v: DatabaseView) => v.isDefault)).toBe(true)
  })

  it('ensures at least one default view even if none are marked default', () => {
    const out = normalizeDatabaseSchema(
      {
        fields: [],
        views: [
          { id: 'v1', name: 'A', type: 'table', filters: [], sorts: [], isDefault: false },
          { id: 'v2', name: 'B', type: 'table', filters: [], sorts: [], isDefault: false },
        ],
        createdAt: 1,
        updatedAt: 2,
      },
      'c1',
    )

    expect(out.views.some((v: DatabaseView) => v.isDefault)).toBe(true)
    expect(out.views[0]?.isDefault).toBe(true)
  })

  it('normalizes field shapes and types', () => {
    const out = normalizeDatabaseSchema(
      {
        fields: [
          { id: 123, name: null, type: 'not-a-type', required: 'yes', order: 'nope' },
          { id: 'f2', name: 'Ok', type: 'number', required: true, order: 5 },
        ],
        views: [{ id: 'v1', name: 'All', type: 'table', filters: [], sorts: [], isDefault: true }],
        createdAt: 1,
        updatedAt: 2,
      },
      'c1',
    )

    expect(out.fields.length).toBe(2)
    expect(out.fields[0]?.type).toBe('text')
    expect(typeof out.fields[0]?.id).toBe('string')
    expect(typeof out.fields[0]?.name).toBe('string')
    expect(typeof out.fields[0]?.required).toBe('boolean')
    expect(typeof out.fields[0]?.order).toBe('number')

    expect(out.fields[1]?.type).toBe('number')
    expect(out.fields[1]?.required).toBe(true)
    expect(out.fields[1]?.order).toBe(5)
  })

  it('matches createDefaultDatabaseSchema output shape', () => {
    const def = createDefaultDatabaseSchema('c1')
    const out = normalizeDatabaseSchema(def, 'c1')

    expect(out.collectionId).toBe(def.collectionId)
    expect(out.views.length).toBeGreaterThan(0)
    expect(out.views.some((v: DatabaseView) => v.isDefault)).toBe(true)
  })
})
