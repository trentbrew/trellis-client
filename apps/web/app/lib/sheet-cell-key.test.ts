import { describe, it, expect } from 'vitest'
import { makeSheetCellKey, parseSheetCellKey, normalizeSheetFormula } from '~/lib/sheet-cell-key'

describe('sheet-cell-key', () => {
  it('round-trips entity ids with colons', () => {
    const key = makeSheetCellKey('entity:expense-e2b', 'vendor')
    expect(parseSheetCellKey(key)).toEqual({
      entityId: 'entity:expense-e2b',
      columnId: 'vendor',
    })
  })

  it('strips this. from formulas', () => {
    expect(normalizeSheetFormula('this.budgeted - this.spent')).toBe('budgeted - spent')
  })
})
