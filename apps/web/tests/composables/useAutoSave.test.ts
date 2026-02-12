import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, ref } from 'vue'

// ---------------------------------------------------------------------------
// Mock useCalendarItems at the module level (Nuxt auto-import)
// ---------------------------------------------------------------------------

const mockUpdate = vi.fn()

vi.mock('~/composables/useCalendarItems', () => ({
  useCalendarItems: () => ({
    items: ref([]),
    update: mockUpdate,
    create: vi.fn(),
    remove: vi.fn(),
  }),
}))

// ---------------------------------------------------------------------------
// Tests — exercise the public save() API directly
// (watchDebounced is a VueUse auto-import that calls save() internally)
// ---------------------------------------------------------------------------

describe('useAutoSave', () => {
  beforeEach(() => {
    mockUpdate.mockReset().mockResolvedValue(undefined)
  })

  it('returns idle status initially', () => {
    const item = reactive({ id: 'task-1', title: 'Test', type: 'task' })
    const { status } = useAutoSave(item, { enabled: ref(true) })
    expect(status.value).toBe('idle')
  })

  it('save() persists item and transitions to saved', async () => {
    const item = reactive({ id: 'task-1', title: 'Test', type: 'task' })
    const { save, status } = useAutoSave(item, { enabled: ref(true) })

    await save()

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-1', title: 'Test' }),
    )
    expect(status.value).toBe('saved')
  })

  it('save() does nothing when disabled', async () => {
    const item = reactive({ id: 'task-1', title: 'Test', type: 'task' })
    const { save, status } = useAutoSave(item, { enabled: ref(false) })

    await save()

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(status.value).toBe('idle')
  })

  it('save() does nothing when item has no id', async () => {
    const item = reactive({ id: '', title: 'Test', type: 'task' })
    const { save } = useAutoSave(item, { enabled: ref(true) })

    await save()

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('calls beforeSave hook before persisting', async () => {
    const beforeSave = vi.fn((i: any) => {
      i.priority = 'high'
    })
    const item = reactive({ id: 'task-1', title: 'Test', type: 'task', priority: '' })
    const { save } = useAutoSave(item, { enabled: ref(true), beforeSave })

    await save()

    expect(beforeSave).toHaveBeenCalledTimes(1)
    expect(item.priority).toBe('high')
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('transitions to error status on save failure', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('Network error'))
    const item = reactive({ id: 'task-1', title: 'Test', type: 'task' })
    const { save, status } = useAutoSave(item, { enabled: ref(true) })

    await save()

    expect(status.value).toBe('error')
  })

  it('includes all item fields in the persisted payload', async () => {
    const item = reactive({
      id: 'task-1',
      title: 'Test',
      type: 'task',
      references: [{ kind: 'entity', id: 'ref-1', entityId: 'note-1' }],
      tags: ['important'],
    })
    const { save } = useAutoSave(item, { enabled: ref(true) })

    await save()

    const payload = mockUpdate.mock.calls[0][0]
    expect(payload.references).toHaveLength(1)
    expect(payload.tags).toEqual(['important'])
  })
})
