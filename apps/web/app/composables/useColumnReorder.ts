import type { SheetColumn } from '~/types/sheet'

/** Permute columns array — stable ids preserved (TRL-315). */
export function permuteColumns(columns: SheetColumn[], fromIndex: number, toIndex: number): SheetColumn[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= columns.length) {
    return columns
  }
  const next = [...columns]
  const [item] = next.splice(fromIndex, 1)
  if (!item) return columns
  next.splice(toIndex, 0, item)
  return next
}

export function useColumnReorder(
  sheetId: Ref<string>,
  columns: Ref<SheetColumn[]>,
  persist: (ordered: SheetColumn[]) => Promise<void>,
) {
  const dragFromIndex = ref<number | null>(null)
  const dropTargetIndex = ref<number | null>(null)
  const saving = ref(false)

  function onDragStart(colIndex: number) {
    dragFromIndex.value = colIndex
  }

  function onDragOver(colIndex: number) {
    dropTargetIndex.value = colIndex
  }

  function onDragEnd() {
    dragFromIndex.value = null
    dropTargetIndex.value = null
  }

  async function onDrop(toIndex: number) {
    const from = dragFromIndex.value
    onDragEnd()
    if (from == null || from === toIndex || !sheetId.value) return
    const reordered = permuteColumns(columns.value, from, toIndex)
    saving.value = true
    try {
      await persist(reordered)
    } finally {
      saving.value = false
    }
  }

  return {
    dragFromIndex,
    dropTargetIndex,
    saving,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    permuteColumns,
  }
}
