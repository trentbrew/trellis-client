import { describe, it, expect } from 'vitest'
import {
  extractJsonLdRecordNodes,
  jsonLdRecordIdToEntityId,
  mapJsonLdRecordToEntityData,
  planCollectionRecordMigration,
} from '~/lib/collection-graph-migration'
import type { DatabaseSchema } from '~/types/database'

const sampleContent = JSON.stringify({
  graph: {
    nodes: [
      {
        '@id': 'trellis:collection/abc',
        '@type': 'trellis:Collection',
        name: 'Recipes',
      },
      {
        '@id': 'trellis:record/11111111-2222-3333-4444-555555555555',
        '@type': 'trellis:Record',
        'trellis:title': 'Pasta',
        'user:status': 'Open',
      },
    ],
  },
})

describe('collection-graph-migration', () => {
  it('extracts trellis:Record nodes from collection content', () => {
    const nodes = extractJsonLdRecordNodes(sampleContent)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.['@id']).toBe('trellis:record/11111111-2222-3333-4444-555555555555')
  })

  it('maps jsonLd id to stable entity id', () => {
    expect(jsonLdRecordIdToEntityId('recipes', 'trellis:record/11111111-2222-3333-4444-555555555555')).toBe(
      'entity:recipes-11111111',
    )
  })

  it('maps record fields to entity data using schema aliases', () => {
    const schema: DatabaseSchema = {
      id: 'schema-1',
      collectionId: 'col-1',
      fields: [
        { id: 'f-status', name: 'Status', type: 'select', required: false, order: 0 },
      ],
      views: [],
      createdAt: 0,
      updatedAt: 0,
    }

    const data = mapJsonLdRecordToEntityData(
      {
        '@id': 'trellis:record/1',
        '@type': 'trellis:Record',
        'trellis:title': 'Pasta',
        'user:status': 'Open',
      },
      'recipes',
      schema,
    )

    expect(data).toMatchObject({ type: 'recipes', title: 'Pasta', status: 'Open' })
  })

  it('plans migration with record count', () => {
    const plan = planCollectionRecordMigration({
      collectionId: 'col-1',
      slug: 'recipes',
      content: sampleContent,
    })
    expect(plan.records).toHaveLength(1)
    expect(plan.records[0]?.entityId).toBe('entity:recipes-11111111')
  })
})
