import { describe, expect, test } from 'vitest'
import { normalizeSelection, selectionRangeLabel } from './useSheetSelection'

describe('normalizeSelection', () => {
  test('normalizes inverted anchor/focus', () => {
    const s = normalizeSelection({ row: 4, col: 3 }, { row: 1, col: 1 })
    expect(s).toEqual({
      anchor: { row: 4, col: 3 },
      focus: { row: 1, col: 1 },
      r0: 1,
      c0: 1,
      r1: 4,
      c1: 3,
    })
  })
})

describe('selectionRangeLabel', () => {
  test('single cell', () => {
    const s = normalizeSelection({ row: 2, col: 2 }, { row: 2, col: 2 })
    expect(selectionRangeLabel(s)).toBe('C3')
  })

  test('multi cell range', () => {
    const s = normalizeSelection({ row: 2, col: 2 }, { row: 4, col: 4 })
    expect(selectionRangeLabel(s)).toBe('C3:E5')
  })
})
