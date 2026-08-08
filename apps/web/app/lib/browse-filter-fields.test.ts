import { describe, expect, it } from 'vitest'
import { buildBrowseFilterFields } from './browse-filter-fields'
import { getEntityTypeConfig } from '~/config/entityRegistry'

const lookup = (type: string) => getEntityTypeConfig(type as never)

describe('buildBrowseFilterFields', () => {
  it('includes type filter in multi-type browse', () => {
    const fields = buildBrowseFilterFields(['task', 'note'], lookup)
    expect(fields.some((f) => f.key === 'type')).toBe(true)
    const typeField = fields.find((f) => f.key === 'type')
    expect(typeField?.options?.some((o) => o.value === 'task')).toBe(true)
  })

  it('includes task-specific status field for single-type task browse', () => {
    const fields = buildBrowseFilterFields(['task'], lookup)
    expect(fields.some((f) => f.key === 'taskStatus')).toBe(true)
    expect(fields.some((f) => f.key === 'type')).toBe(false)
  })

  it('always includes title and date fields', () => {
    const fields = buildBrowseFilterFields(['note'], lookup)
    expect(fields.map((f) => f.key)).toEqual(
      expect.arrayContaining(['title', 'createdAt', 'updatedAt']),
    )
  })
})
