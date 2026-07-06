import { describe, expect, test } from 'vitest'
import { inferEntityTypeFromEqls } from './sheet-query-infer'

describe('inferEntityTypeFromEqls', () => {
  test('parses double-quoted type filter', () => {
    expect(
      inferEntityTypeFromEqls('FIND entity AS ?e WHERE ?e.type = "expense" AND ?e.quarter = "Q3-2026"'),
    ).toBe('expense')
  })

  test('parses single-quoted type filter', () => {
    expect(inferEntityTypeFromEqls("FIND entity AS ?e WHERE ?e.type = 'task'")).toBe('task')
  })

  test('returns null when no type filter', () => {
    expect(inferEntityTypeFromEqls('FIND entity AS ?e')).toBeNull()
  })
})
