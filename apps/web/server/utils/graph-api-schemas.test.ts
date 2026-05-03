// @vitest-environment node

import { describe, it, expect } from 'vitest'
import {
  GraphMutateBodySchema,
  GraphNodeParamsSchema,
  GraphNodesBodySchema,
  GraphOntologyCreateBodySchema,
  GraphOntologyDeleteBodySchema,
  GraphOntologyParamsSchema,
  GraphQueryBodySchema,
  GraphSummaryQuerySchema,
} from './graph-api-schemas'

describe('graph-api-schemas', () => {
  it('normalizes summary limit with defaults and bounds', () => {
    expect(GraphSummaryQuerySchema.parse({}).limit).toBe(10)
    expect(GraphSummaryQuerySchema.parse({ limit: '25' }).limit).toBe(25)
    expect(GraphSummaryQuerySchema.parse({ limit: '0' }).limit).toBe(0)
    expect(GraphSummaryQuerySchema.parse({ limit: '101' }).limit).toBe(101)
    expect(GraphSummaryQuerySchema.parse({ limit: '-1' }).limit).toBe(10)
  })

  it('requires a non-empty node id', () => {
    expect(GraphNodeParamsSchema.parse({ entityId: ' entity:task-1 ' })).toEqual({ entityId: 'entity:task-1' })
    expect(GraphNodeParamsSchema.safeParse({ entityId: '' }).success).toBe(false)
  })

  it('requires at least one non-empty id for batch node fetches', () => {
    expect(GraphNodesBodySchema.parse({ ids: ['entity:a'] })).toEqual({ ids: ['entity:a'] })
    expect(GraphNodesBodySchema.safeParse({ ids: [] }).success).toBe(false)
    expect(GraphNodesBodySchema.safeParse({ ids: [''] }).success).toBe(false)
  })

  it('accepts either an EQL-S query or a projection id', () => {
    expect(GraphQueryBodySchema.parse({ query: ' FIND entity AS ?e ' })).toMatchObject({ query: 'FIND entity AS ?e' })
    expect(GraphQueryBodySchema.parse({ projection: 'recent-tasks' })).toMatchObject({ projection: 'recent-tasks' })
  })

  it('rejects graph query bodies without query or projection', () => {
    const result = GraphQueryBodySchema.safeParse({})

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues[0]?.path).toEqual(['query'])
  })

  it('validates graph mutation bodies by action requirements', () => {
    expect(GraphMutateBodySchema.parse({ action: 'createNode', entityId: 'entity:a', type: 'entity' })).toMatchObject({
      action: 'createNode',
      entityId: 'entity:a',
      type: 'entity',
    })
    expect(
      GraphMutateBodySchema.parse({ action: 'link', e1: 'entity:a', relation: 'relatedTo', e2: 'entity:b' }),
    ).toMatchObject({
      action: 'link',
    })
    expect(GraphMutateBodySchema.safeParse({ action: 'createNode', entityId: 'entity:a' }).success).toBe(false)
    expect(GraphMutateBodySchema.safeParse({ action: 'deleteNode' }).success).toBe(false)
    expect(GraphMutateBodySchema.safeParse({ action: 'link', e1: 'entity:a', e2: 'entity:b' }).success).toBe(false)
  })

  it('validates ontology params and create bodies', () => {
    expect(GraphOntologyParamsSchema.parse({ ontologyId: ' trellis:schema/task ' })).toEqual({
      ontologyId: 'trellis:schema/task',
    })
    expect(
      GraphOntologyCreateBodySchema.parse({
        schema: {
          '@id': 'trellis:schema/task',
          version: '1.0.0',
          fields: [{ name: 'title', valueType: 'title' }],
        },
      }).schema['@id'],
    ).toBe('trellis:schema/task')
    expect(GraphOntologyCreateBodySchema.safeParse({ schema: { version: '1.0.0', fields: [] } }).success).toBe(false)
  })

  it('defaults empty ontology delete bodies', () => {
    expect(GraphOntologyDeleteBodySchema.parse(undefined)).toEqual({})
  })
})
