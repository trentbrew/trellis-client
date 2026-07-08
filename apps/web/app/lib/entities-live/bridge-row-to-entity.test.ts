// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { bridgeRowToEntity } from './bridge-row-to-entity'
import type { SidecarKernelBrowseRow } from '~/lib/trellis-sidecar/schema/browse-entity'

function makeRow(overrides: Partial<SidecarKernelBrowseRow> = {}): SidecarKernelBrowseRow {
  return {
    id: 'entity:task-1',
    type: 'KernelBrowse',
    title: 'Row title',
    entityType: 'task',
    payloadJson: '{}',
    ...overrides,
  }
}

describe('bridgeRowToEntity', () => {
  it('uses payload fields when present', () => {
    const entity = bridgeRowToEntity(
      makeRow({
        payloadJson: JSON.stringify({
          id: 'task-1',
          type: 'task',
          title: 'Payload title',
          tags: ['a'],
          involved: ['person-1'],
        }),
      }),
    )

    expect(entity.id).toBe('task-1')
    expect(entity.type).toBe('task')
    expect(entity.title).toBe('Payload title')
    expect(entity.tags).toEqual(['a'])
    expect(entity.involved).toEqual(['person-1'])
    expect(entity.references).toEqual([])
  })

  it('falls back to row fields when payload omits id/type/title', () => {
    const entity = bridgeRowToEntity(
      makeRow({
        id: 'entity:note-abc',
        title: 'Row title',
        entityType: 'note',
        payloadJson: JSON.stringify({}),
      }),
    )

    expect(entity.id).toBe('note-abc')
    expect(entity.type).toBe('note')
    expect(entity.title).toBe('Row title')
    expect(entity.references).toEqual([])
  })

  it('uses payload string fields for id/type/title when present', () => {
    const entity = bridgeRowToEntity(
      makeRow({
        id: 'entity:canonical',
        title: 'Canonical title',
        entityType: 'event',
        payloadJson: JSON.stringify({
          id: 'wrong-id',
          type: 'task',
          title: 'Wrong title',
        }),
      }),
    )

    expect(entity.id).toBe('wrong-id')
    expect(entity.type).toBe('task')
    expect(entity.title).toBe('Wrong title')
  })

  it('always clears references even when payload includes them', () => {
    const entity = bridgeRowToEntity(
      makeRow({
        payloadJson: JSON.stringify({
          references: [{ id: 'entity:other', type: 'note', title: 'Other' }],
        }),
      }),
    )

    expect(entity.references).toEqual([])
  })

  it('handles invalid payloadJson gracefully', () => {
    const entity = bridgeRowToEntity(
      makeRow({
        id: 'entity:broken',
        entityType: 'file',
        title: 'Broken payload',
        payloadJson: '{not json',
      }),
    )

    expect(entity.id).toBe('broken')
    expect(entity.type).toBe('file')
    expect(entity.title).toBe('Broken payload')
    expect(entity.tags).toEqual([])
    expect(entity.involved).toEqual([])
  })
})
