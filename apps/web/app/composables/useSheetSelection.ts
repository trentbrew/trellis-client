import { toA1Ref } from '~/lib/sheet-a1'

export interface CellPos {
  row: number
  col: number
}

export interface SheetSelectionState {
  anchor: CellPos
  focus: CellPos
  r0: number
  c0: number
  r1: number
  c1: number
}

export function normalizeSelection(anchor: CellPos, focus: CellPos): SheetSelectionState {
  return {
    anchor,
    focus,
    r0: Math.min(anchor.row, focus.row),
    c0: Math.min(anchor.col, focus.col),
    r1: Math.max(anchor.row, focus.row),
    c1: Math.max(anchor.col, focus.col),
  }
}

export function selectionRangeLabel(sel: SheetSelectionState): string {
  if (sel.r0 === sel.r1 && sel.c0 === sel.c1) return toA1Ref(sel.r0, sel.c0)
  return `${toA1Ref(sel.r0, sel.c0)}:${toA1Ref(sel.r1, sel.c1)}`
}

export function useSheetSelection(rowCount: Ref<number>, colCount: Ref<number>) {
  const anchor = ref<CellPos>({ row: 0, col: 0 })
  const focus = ref<CellPos>({ row: 0, col: 0 })

  const selection = computed(() => normalizeSelection(anchor.value, focus.value))

  function clampRow(r: number): number {
    return Math.max(0, Math.min(rowCount.value - 1, r))
  }

  function clampCol(c: number): number {
    return Math.max(0, Math.min(colCount.value - 1, c))
  }

  function selectCell(row: number, col: number) {
    const pos = { row: clampRow(row), col: clampCol(col) }
    anchor.value = pos
    focus.value = { ...pos }
  }

  function extendFocus(row: number, col: number) {
    focus.value = { row: clampRow(row), col: clampCol(col) }
  }

  function moveFocus(dr: number, dc: number, extend = false) {
    const nr = clampRow(focus.value.row + dr)
    const nc = clampCol(focus.value.col + dc)
    if (extend) extendFocus(nr, nc)
    else selectCell(nr, nc)
  }

  function isSelected(row: number, col: number): boolean {
    const s = selection.value
    return row >= s.r0 && row <= s.r1 && col >= s.c0 && col <= s.c1
  }

  function isFocused(row: number, col: number): boolean {
    return focus.value.row === row && focus.value.col === col
  }

  function rangeLabel(): string {
    return selectionRangeLabel(selection.value)
  }

  function isMultiCell(): boolean {
    const s = selection.value
    return s.r0 !== s.r1 || s.c0 !== s.c1
  }

  return {
    anchor,
    focus,
    selection,
    selectCell,
    extendFocus,
    moveFocus,
    isSelected,
    isFocused,
    rangeLabel,
    isMultiCell,
  }
}

export type SheetSelectionApi = ReturnType<typeof useSheetSelection>
