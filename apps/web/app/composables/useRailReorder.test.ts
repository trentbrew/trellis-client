import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useRailReorder } from './useRailReorder'

describe('useRailReorder', () => {
  it('reorders center items and persists the new order', async () => {
    const items = ref([{ path: '/graph' }, { path: '/workspace' }, { path: '/mail' }])
    const onReorder = vi.fn()
    const { onDragStart, onDrop } = useRailReorder(items, onReorder)

    onDragStart(2, { dataTransfer: { effectAllowed: '', setData: vi.fn() } } as unknown as DragEvent)
    await onDrop(0)

    expect(onReorder).toHaveBeenCalledWith(['/mail', '/graph', '/workspace'])
  })
})
