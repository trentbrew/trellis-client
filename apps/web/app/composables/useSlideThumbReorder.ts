import type { SlideDefinition } from '~/types/deck'

/** Shared HTML5 DnD reorder state for vertical thumbs and horizontal filmstrip. */
export function useSlideThumbReorder(
  slides: Ref<SlideDefinition[]>,
  emit: {
    reorder: (ids: string[]) => void
    activeIndex: (index: number) => void
  },
) {
  const dragFrom = ref<number | null>(null)
  const dropIndex = ref<number | null>(null)

  function onDragStart(e: DragEvent, index: number) {
    dragFrom.value = index
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(index))
    }
  }

  function onDragEnd() {
    dragFrom.value = null
    dropIndex.value = null
  }

  function onDragOver(e: DragEvent, index: number) {
    e.preventDefault()
    dropIndex.value = index
  }

  function onDrop(e: DragEvent, toIndex: number) {
    e.preventDefault()
    const from = dragFrom.value
    dragFrom.value = null
    dropIndex.value = null
    if (from == null || from === toIndex) return

    const ids = slides.value.map((s) => s.entityId)
    const [moved] = ids.splice(from, 1)
    ids.splice(toIndex, 0, moved)
    emit.reorder(ids)
    emit.activeIndex(toIndex)
  }

  return { dragFrom, dropIndex, onDragStart, onDragEnd, onDragOver, onDrop }
}
