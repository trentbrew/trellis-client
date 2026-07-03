// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { kernelNodeToBrowseRow, kernelNodeToEntityPayload } from './map-kernel-entity-rows'

describe('kernelNodeToBrowseRow', () => {
  it('maps entity:task-1 facts to KernelBrowse row with payloadJson.title', () => {
    const node = {
      '@type': 'task',
      title: 'Bridge test task',
      taskStatus: 'pending',
      startDate: '2026-07-02T10:00:00.000Z',
    }

    const row = kernelNodeToBrowseRow('entity:task-1', node)

    expect(row).toEqual({
      id: 'entity:task-1',
      type: 'KernelBrowse',
      entityType: 'task',
      title: 'Bridge test task',
      payloadJson: expect.any(String),
    })

    const payload = JSON.parse(row!.payloadJson) as Record<string, unknown>
    expect(payload.title).toBe('Bridge test task')
    expect(payload.id).toBe('task-1')
    expect(payload.type).toBe('task')
    expect(payload.startDate).toBe('2026-07-02')
    expect(payload.references).toEqual([])
  })

  it('excludes non-browse domain types', () => {
    expect(
      kernelNodeToBrowseRow('entity:zone-1', { '@type': 'zone', title: 'Lab' }),
    ).toBeNull()
  })

  it('excludes non-entity namespace ids', () => {
    expect(
      kernelNodeToBrowseRow('route:home', { '@type': 'task', title: 'Nope' }),
    ).toBeNull()
  })
})

describe('kernelNodeToEntityPayload', () => {
  it('normalizes scalar fields from duplicate EAV facts', () => {
    const payload = kernelNodeToEntityPayload('entity:note-1', {
      '@type': 'note',
      title: ['Old', 'New'],
    })
    expect(payload.title).toBe('New')
    expect(payload.id).toBe('note-1')
  })
})
