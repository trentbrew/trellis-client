import { describe, expect, it } from 'vitest'
import { shouldRefetchBrowseEntitiesFromSSE } from './entity-mutation-sse'

describe('shouldRefetchBrowseEntitiesFromSSE', () => {
  it('refetches on deleteNode for entity namespace', () => {
    expect(
      shouldRefetchBrowseEntitiesFromSSE({
        action: 'deleteNode',
        entityId: 'entity:deadline-mcp-demo',
      }),
    ).toBe(true)
  })

  it('refetches createNode when type is only on the SSE envelope', () => {
    expect(
      shouldRefetchBrowseEntitiesFromSSE({
        action: 'createNode',
        entityId: 'entity:deadline-mcp-demo',
        type: 'deadline',
        data: { title: 'MCP Demo Deadline', startDate: '2026-07-10' },
      }),
    ).toBe(true)
  })

  it('refetches updateNode when patch omits type (typical MCP update)', () => {
    expect(
      shouldRefetchBrowseEntitiesFromSSE({
        action: 'updateNode',
        entityId: 'entity:deadline-mcp-demo',
        type: 'deadline',
        data: { title: 'MCP Demo Deadline (updated)' },
      }),
    ).toBe(true)
  })

  it('ignores platform mutations', () => {
    expect(
      shouldRefetchBrowseEntitiesFromSSE({
        action: 'updateNode',
        entityId: 'platform:org/demo',
        type: 'platform',
        data: { name: 'Demo' },
      }),
    ).toBe(false)
  })

  it('ignores ontology schema mutations', () => {
    expect(
      shouldRefetchBrowseEntitiesFromSSE({
        action: 'updateOntology',
        entityId: 'trellis:schema/task',
        type: 'ontology',
      }),
    ).toBe(false)
  })
})
