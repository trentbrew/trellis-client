import { describe, expect, test, vi } from 'vitest'
import { pasteTsvIntoSelection, selectionToTsv } from './useSheetClipboard'
import type { SheetColumn } from '~/types/sheet'
import type { SheetSelectionState } from '~/composables/useSheetSelection'

const columns: SheetColumn[] = [
  { id: 'vendor', attribute: 'title', kind: 'text' },
  { id: 'budgeted', attribute: 'budgeted', kind: 'number' },
  { id: 'remaining', attribute: 'remaining', kind: 'formula', formula: 'budgeted - spent' },
]

const rows = [
  { entityId: 'entity:a', data: { title: 'A', budgeted: 10 } },
  { entityId: 'entity:b', data: { title: 'B', budgeted: 20 } },
]

const selection: SheetSelectionState = {
  anchor: { row: 0, col: 0 },
  focus: { row: 1, col: 1 },
  r0: 0,
  c0: 0,
  r1: 1,
  c1: 1,
}

function getCellValue(entityId: string, col: SheetColumn, _rowIndex: number) {
  const row = rows.find((r) => r.entityId === entityId)
  if (!row) return undefined
  if (col.kind === 'formula') return 999
  return row.data[col.attribute]
}

describe('useSheetClipboard', () => {
  test('selectionToTsv serializes 2x2 rect', () => {
    expect(selectionToTsv(selection, rows, columns, getCellValue)).toBe('A\t10\nB\t20')
  })

  test('pasteTsvIntoSelection skips formula column', async () => {
    const updateCell = vi.fn().mockResolvedValue(undefined)
    const sel: SheetSelectionState = { ...selection, r1: 0, c1: 2 }

    const { updated, skipped } = await pasteTsvIntoSelection(
      'X\t42\tignored',
      sel,
      rows,
      columns,
      updateCell,
    )

    expect(updated).toBe(2)
    expect(skipped).toBe(1)
    expect(updateCell).toHaveBeenCalledWith('entity:a', 'title', 'X')
    expect(updateCell).toHaveBeenCalledWith('entity:a', 'budgeted', 42)
  })
})
