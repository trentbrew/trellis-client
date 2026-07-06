import { describe, expect, test } from 'vitest'
import { permuteColumns } from './useColumnReorder'
import type { SheetColumn } from '~/types/sheet'

const cols: SheetColumn[] = [
  { id: 'a', attribute: 'a', kind: 'text' },
  { id: 'b', attribute: 'b', kind: 'number' },
  { id: 'c', attribute: 'c', kind: 'text' },
]

describe('permuteColumns', () => {
  test('moves column preserving ids', () => {
    const result = permuteColumns(cols, 0, 2)
    expect(result.map((c) => c.id)).toEqual(['b', 'c', 'a'])
  })

  test('no-op when same index', () => {
    expect(permuteColumns(cols, 1, 1)).toBe(cols)
  })
})
