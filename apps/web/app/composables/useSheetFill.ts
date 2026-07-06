import type { SheetColumn } from '~/types/sheet'
import type { SheetSelectionState } from '~/composables/useSheetSelection'

export function canFillColumn(column: SheetColumn): boolean {
  return column.kind === 'text' || column.kind === 'number' || column.kind === 'select'
}

export async function applyFillDown(
  selection: SheetSelectionState,
  columns: SheetColumn[],
  rows: Array<{ entityId: string; data: Record<string, unknown> }>,
  getCellValue: (entityId: string, column: SheetColumn, rowIndex: number) => unknown,
  updateCell: (entityId: string, attribute: string, value: unknown) => Promise<void>,
): Promise<{ filled: number; skipped: boolean }> {
  const col = columns[selection.c0]
  if (!col || !canFillColumn(col)) return { filled: 0, skipped: true }

  const sourceRow = rows[selection.r0]
  if (!sourceRow) return { filled: 0, skipped: true }

  const sourceVal = getCellValue(sourceRow.entityId, col, selection.r0)
  const updates: Promise<void>[] = []

  for (let r = selection.r0 + 1; r <= selection.r1; r++) {
    const row = rows[r]
    if (!row) continue
    updates.push(updateCell(row.entityId, col.attribute, sourceVal))
  }

  await Promise.all(updates)
  return { filled: updates.length, skipped: false }
}

export async function applyFillDragRange(
  anchorRow: number,
  targetRow: number,
  column: SheetColumn,
  rows: Array<{ entityId: string; data: Record<string, unknown> }>,
  getCellValue: (entityId: string, column: SheetColumn, rowIndex: number) => unknown,
  updateCell: (entityId: string, attribute: string, value: unknown) => Promise<void>,
): Promise<{ filled: number; skipped: boolean }> {
  if (!canFillColumn(column)) return { filled: 0, skipped: true }

  const sourceRow = rows[anchorRow]
  if (!sourceRow) return { filled: 0, skipped: true }

  const endRow = Math.max(anchorRow, targetRow)
  if (endRow <= anchorRow) return { filled: 0, skipped: false }

  const sourceVal = getCellValue(sourceRow.entityId, column, anchorRow)
  const updates: Promise<void>[] = []

  for (let r = anchorRow + 1; r <= endRow; r++) {
    const row = rows[r]
    if (!row) continue
    updates.push(updateCell(row.entityId, column.attribute, sourceVal))
  }

  await Promise.all(updates)
  return { filled: updates.length, skipped: false }
}
