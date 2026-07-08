import { describe, it, expect } from 'vitest'
import {
  databaseFieldsToOntologyFields,
  databaseFieldToOntologyField,
  slugifyOntologyFieldName,
} from '~/lib/collection-schema-to-ontology'
import type { DatabaseField } from '~/types/database'

describe('collection-schema-to-ontology', () => {
  it('slugifies field names', () => {
    expect(slugifyOntologyFieldName('Due Date')).toBe('due_date')
    expect(slugifyOntologyFieldName('  ')).toBe('field')
  })

  it('maps database field types to ontology value types', () => {
    const { field } = databaseFieldToOntologyField(
      {
        id: '1',
        name: 'Amount',
        type: 'number',
        required: true,
        order: 0,
      },
      false,
    )
    expect(field.valueType).toBe('number')
    expect(field.name).toBe('amount')
  })

  it('promotes Title/Name text fields to ontology title', () => {
    const fields: DatabaseField[] = [
      { id: '1', name: 'Title', type: 'text', required: true, order: 0 },
      { id: '2', name: 'Status', type: 'select', required: false, order: 1, options: [{ value: 'Open', color: 'gray' }] },
    ]
    const mapped = databaseFieldsToOntologyFields(fields)
    expect(mapped[0]).toMatchObject({ name: 'title', valueType: 'title', required: true })
    expect(mapped[1]).toMatchObject({ name: 'status', valueType: 'select' })
    expect(mapped[1]?.selectOptions).toEqual([{ name: 'Open' }])
  })

  it('inserts title field when schema has none', () => {
    const mapped = databaseFieldsToOntologyFields([
      { id: '1', name: 'Status', type: 'select', required: false, order: 0 },
    ])
    expect(mapped[0]).toMatchObject({ name: 'title', valueType: 'title', required: true })
    expect(mapped[1]?.name).toBe('status')
  })
})
