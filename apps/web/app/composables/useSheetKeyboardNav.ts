/**
 * Keyboard navigation helpers for sheet grid (TRL-315).
 * Grid handles keydown in SheetGrid.vue; this module documents tab-skip rules.
 */
import type { SheetColumn } from '~/types/sheet'

export function isEditableColumn(col: SheetColumn): boolean {
  return col.kind !== 'formula'
}

export function nextTabColumn(columns: SheetColumn[], from: number, direction: 1 | -1): number | null {
  let c = from + direction
  while (c >= 0 && c < columns.length) {
    if (isEditableColumn(columns[c]!)) return c
    c += direction
  }
  return null
}
