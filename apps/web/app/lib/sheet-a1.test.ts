/** Unit tests for A1 notation helpers */
import { describe, it, expect } from 'vitest'
import {
  columnIndexToLetter,
  columnLetterToIndex,
  parseA1Range,
  toA1Ref,
  semanticFormulaToA1,
} from '~/lib/sheet-a1'

describe('sheet-a1', () => {
  it('converts column indices to letters', () => {
    expect(columnIndexToLetter(0)).toBe('A')
    expect(columnIndexToLetter(4)).toBe('E')
  })

  it('parses A1 range', () => {
    const r = parseA1Range('A2:E6')
    expect(r).toEqual({ startCol: 0, startRow: 1, endCol: 4, endRow: 5 })
  })

  it('builds A1 ref', () => {
    expect(toA1Ref(7, 4)).toBe('E8')
  })

  it('maps semantic formula to A1', () => {
    const cols = [
      { id: 'b', attribute: 'budgeted' },
      { id: 's', attribute: 'spent' },
    ]
    expect(semanticFormulaToA1('this.budgeted - this.spent', 7, cols)).toBe('=A8 - B8')
  })
})
