import type { SheetColumn } from '~/types/sheet'
import type { SheetSelectionState } from '~/composables/useSheetSelection'

export function isPasteableColumn(col: SheetColumn): boolean {
  return col.kind === 'text' || col.kind === 'number' || col.kind === 'select'
}

export function selectionToTsv(
  selection: SheetSelectionState,
  rows: Array<{ entityId: string; data: Record<string, unknown> }>,
  columns: SheetColumn[],
  getCellValue: (entityId: string, column: SheetColumn, rowIndex: number) => unknown,
): string {
  const lines: string[] = []
  for (let r = selection.r0; r <= selection.r1; r++) {
    const row = rows[r]
    if (!row) continue
    const cells: string[] = []
    for (let c = selection.c0; c <= selection.c1; c++) {
      const col = columns[c]
      if (!col) continue
      const v = getCellValue(row.entityId, col, r)
      cells.push(v == null ? '' : String(v))
    }
    lines.push(cells.join('\t'))
  }
  return lines.join('\n')
}

export async function pasteTsvIntoSelection(
  tsv: string,
  selection: SheetSelectionState,
  rows: Array<{ entityId: string; data: Record<string, unknown> }>,
  columns: SheetColumn[],
  updateCell: (entityId: string, attribute: string, value: unknown) => Promise<void>,
): Promise<{ updated: number; skipped: number }> {
  const parsed = tsv
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split('\t'))

  let updated = 0
  let skipped = 0

  for (let dr = 0; dr < parsed.length; dr++) {
    const rowIdx = selection.r0 + dr
    if (rowIdx >= rows.length) break
    const row = rows[rowIdx]
    if (!row) continue
    const line = parsed[dr] ?? []

    for (let dc = 0; dc < line.length; dc++) {
      const colIdx = selection.c0 + dc
      if (colIdx >= columns.length) break
      const col = columns[colIdx]
      if (!col) continue

      if (!isPasteableColumn(col)) {
        skipped++
        continue
      }

      const raw = line[dc] ?? ''
      let value: unknown = raw
      if (col.kind === 'number') {
        const n = Number(raw)
        value = Number.isFinite(n) ? n : raw
      }

      await updateCell(row.entityId, col.attribute, value)
      updated++
    }
  }

  return { updated, skipped }
}
