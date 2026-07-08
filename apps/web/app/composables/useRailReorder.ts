/** Drag-and-drop reorder for icon-rail center items. */
export function useRailReorder(
  items: Ref<Array<{ path: string }>>,
  onReorder: (paths: string[]) => void | Promise<void>,
) {
  const dragIndex = ref<number | null>(null)
  const overIndex = ref<number | null>(null)
  const isReordering = ref(false)
  const suppressNextClick = ref(false)

  function onDragStart(index: number, e: DragEvent) {
    suppressNextClick.value = false
    dragIndex.value = index
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(index))
    }
  }

  function onDragOver(index: number) {
    overIndex.value = index
  }

  function onDragEnd() {
    dragIndex.value = null
    overIndex.value = null
  }

  async function onDrop(toIndex: number) {
    const from = dragIndex.value
    onDragEnd()
    if (from === null || from === toIndex) return

    suppressNextClick.value = true

    const paths = items.value.map((item) => item.path)
    const next = [...paths]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(toIndex, 0, moved)

    isReordering.value = true
    try {
      await onReorder(next)
    } finally {
      isReordering.value = false
    }
  }

  function suppressClickAfterDrag(e: MouseEvent) {
    if (!suppressNextClick.value) return
    e.preventDefault()
    e.stopPropagation()
    suppressNextClick.value = false
  }

  function itemDragClass(index: number) {
    return {
      'opacity-50': dragIndex.value === index,
      'ring-2 ring-primary/40 rounded-full':
        overIndex.value === index && dragIndex.value !== null && dragIndex.value !== index,
    }
  }

  return {
    dragIndex,
    overIndex,
    isReordering,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    itemDragClass,
    suppressClickAfterDrag,
  }
}
