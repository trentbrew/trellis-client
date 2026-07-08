import { describe, it, expect } from 'vitest'
import {
  resolveOntologyFieldWidget,
  partitionSchemaFields,
  PROPERTY_FIELD_VALUE_TYPES,
} from '~/lib/ontology-field-widget'
import type { OntologySchemaField } from '~/lib/ontology-registry/schemas-to-server-types'

describe('ontology-field-widget', () => {
  it('resolves select field widget', () => {
    const field: OntologySchemaField = {
      name: 'status',
      valueType: 'select',
      selectOptions: [{ name: 'Open' }, { name: 'Closed' }],
    }
    const widget = resolveOntologyFieldWidget(field)
    expect(widget.kind).toBe('select')
    expect(widget.isPropertyField).toBe(true)
    expect(widget.hasSelectOptions).toBe(true)
    expect(widget.selectOptions).toHaveLength(2)
  })

  it('resolves rich_text as body field', () => {
    const widget = resolveOntologyFieldWidget({ name: 'notes', valueType: 'rich_text' })
    expect(widget.kind).toBe('rich_text')
    expect(widget.isPropertyField).toBe(false)
  })

  it('partitions property vs body fields', () => {
    const fields: OntologySchemaField[] = [
      { name: 'title', valueType: 'title' },
      { name: 'priority', valueType: 'select' },
      { name: 'notes', valueType: 'rich_text' },
    ]
    const { propertyFields, bodyFields } = partitionSchemaFields(fields)
    expect(propertyFields.map((f) => f.name)).toEqual(['priority'])
    expect(bodyFields.map((f) => f.name)).toEqual(['notes'])
  })

  it('exports property value types set', () => {
    expect(PROPERTY_FIELD_VALUE_TYPES.has('date')).toBe(true)
    expect(PROPERTY_FIELD_VALUE_TYPES.has('rich_text')).toBe(false)
  })
})
