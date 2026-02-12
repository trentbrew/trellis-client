import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, ref } from 'vue'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUpdate = vi.fn()
const mockItems = ref<any[]>([])

vi.mock('~/composables/useCalendarItems', () => ({
  useCalendarItems: () => ({
    items: mockItems,
    update: mockUpdate,
    create: vi.fn(),
    remove: vi.fn(),
  }),
}))

vi.mock('~/composables/useDialogStack', () => ({
  useDialogStack: () => ({
    push: vi.fn(),
  }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntityRef(overrides: Partial<EntityReference> = {}): EntityReference {
  return {
    kind: 'entity',
    id: `ref-${Math.random().toString(36).slice(2, 8)}`,
    entityId: 'target-1',
    entityType: 'task',
    title: 'Target Task',
    direction: 'outgoing',
    ...overrides,
  }
}

function makeItem(overrides: Record<string, any> = {}) {
  return reactive({
    id: 'source-1',
    type: 'task',
    title: 'Source Task',
    references: [] as Reference[],
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useEntityReferences', () => {
  beforeEach(() => {
    mockUpdate.mockReset().mockResolvedValue(undefined)
    mockItems.value = []
  })

  describe('addEntityRef', () => {
    it('adds an outgoing reference to the local item', async () => {
      const item = makeItem()
      const { addEntityRef } = useEntityReferences(item)

      const ref = makeEntityRef()
      await addEntityRef(ref)

      expect(item.references).toHaveLength(1)
      expect(item.references[0]).toStrictEqual(ref)
    })

    it('prevents duplicate references to the same entity', async () => {
      const item = makeItem()
      const { addEntityRef } = useEntityReferences(item)

      const ref1 = makeEntityRef({ entityId: 'target-1' })
      const ref2 = makeEntityRef({ entityId: 'target-1', id: 'ref-different' })

      await addEntityRef(ref1)
      await addEntityRef(ref2)

      expect(item.references).toHaveLength(1)
    })

    it('allows references to different entities', async () => {
      const item = makeItem()
      const { addEntityRef } = useEntityReferences(item)

      await addEntityRef(makeEntityRef({ entityId: 'target-1' }))
      await addEntityRef(makeEntityRef({ entityId: 'target-2' }))

      expect(item.references).toHaveLength(2)
    })

    it('creates an incoming back-reference on the target entity', async () => {
      const targetEntity = {
        id: 'target-1',
        type: 'task',
        title: 'Target',
        references: [],
      }
      mockItems.value = [targetEntity]

      const item = makeItem({ id: 'source-1', title: 'Source Task' })
      const { addEntityRef } = useEntityReferences(item)

      await addEntityRef(makeEntityRef({ entityId: 'target-1' }))

      // Should have called update on the target entity with an incoming ref
      expect(mockUpdate).toHaveBeenCalledTimes(1)
      const updatedTarget = mockUpdate.mock.calls[0][0]
      expect(updatedTarget.references).toHaveLength(1)
      expect(updatedTarget.references[0].direction).toBe('incoming')
      expect(updatedTarget.references[0].entityId).toBe('source-1')
    })

    it('does not create duplicate back-references', async () => {
      const targetEntity = {
        id: 'target-1',
        type: 'task',
        title: 'Target',
        references: [
          {
            kind: 'entity',
            id: 'existing-ref',
            entityId: 'source-1',
            entityType: 'task',
            title: 'Source',
            direction: 'incoming',
          },
        ],
      }
      mockItems.value = [targetEntity]

      const item = makeItem({ id: 'source-1' })
      // Pre-populate so the duplicate check passes for the local item
      item.references = []
      const { addEntityRef } = useEntityReferences(item)

      await addEntityRef(makeEntityRef({ entityId: 'target-1' }))

      // Should NOT have called update since back-ref already exists
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('initializes references array if undefined', async () => {
      const item = makeItem()
      ;(item as any).references = undefined
      const { addEntityRef } = useEntityReferences(item)

      await addEntityRef(makeEntityRef())

      expect(Array.isArray(item.references)).toBe(true)
      expect(item.references).toHaveLength(1)
    })
  })

  describe('removeRef', () => {
    it('removes a reference from the local item by id', async () => {
      const refToRemove = makeEntityRef({ id: 'ref-remove-me' })
      const item = makeItem({ references: [refToRemove] })
      const { removeRef } = useEntityReferences(item)

      await removeRef('ref-remove-me')

      expect(item.references).toHaveLength(0)
    })

    it('does nothing if reference id not found', async () => {
      const item = makeItem({ references: [makeEntityRef({ id: 'ref-keep' })] })
      const { removeRef } = useEntityReferences(item)

      await removeRef('ref-nonexistent')

      expect(item.references).toHaveLength(1)
    })

    it('cleans up incoming back-reference on target when removing outgoing ref', async () => {
      const outgoingRef = makeEntityRef({
        id: 'ref-out',
        entityId: 'target-1',
        direction: 'outgoing',
      })

      const targetEntity = {
        id: 'target-1',
        type: 'task',
        title: 'Target',
        references: [
          {
            kind: 'entity',
            id: 'ref-back',
            entityId: 'source-1',
            entityType: 'task',
            title: 'Source',
            direction: 'incoming',
          },
        ],
      }
      mockItems.value = [targetEntity]

      const item = makeItem({ id: 'source-1', references: [outgoingRef] })
      const { removeRef } = useEntityReferences(item)

      await removeRef('ref-out')

      // Should have updated target to remove the incoming ref
      expect(mockUpdate).toHaveBeenCalledTimes(1)
      const updatedTarget = mockUpdate.mock.calls[0][0]
      expect(updatedTarget.references).toHaveLength(0)
    })

    it('does NOT clean up target when removing an incoming ref', async () => {
      const incomingRef = makeEntityRef({
        id: 'ref-in',
        entityId: 'other-1',
        direction: 'incoming',
      })

      const item = makeItem({ references: [incomingRef] })
      const { removeRef } = useEntityReferences(item)

      await removeRef('ref-in')

      // Should NOT call update on any target — incoming refs don't trigger cleanup
      expect(mockUpdate).not.toHaveBeenCalled()
      expect(item.references).toHaveLength(0)
    })

    it('handles missing references array gracefully', async () => {
      const item = makeItem()
      ;(item as any).references = undefined
      const { removeRef } = useEntityReferences(item)

      // Should not throw
      await expect(removeRef('any-id')).resolves.toBeUndefined()
    })
  })
})
