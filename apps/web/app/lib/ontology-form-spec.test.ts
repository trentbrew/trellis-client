import { describe, it, expect } from 'vitest'
import {
  ontologyToFormSpec,
  validateFormValues,
  fieldsForStep,
  getFieldDefaultValue,
} from '~/lib/ontology-form-spec'
import type { OntologySchemaDefinition } from '~/lib/ontology-registry/schemas-to-server-types'

const sampleSchema: OntologySchemaDefinition = {
  '@id': 'trellis:schema/feedback',
  '@type': 'trellis:Schema',
  version: '1.0.0',
  label: 'Feedback',
  fields: [
    { name: 'title', valueType: 'title', required: true },
    { name: 'rating', valueType: 'select', required: true, selectOptions: [{ name: 'Good' }, { name: 'Bad' }] },
    { name: 'comments', valueType: 'rich_text', group: 'details' },
    { name: 'notify', valueType: 'checkbox', group: 'details' },
  ],
}

describe('ontology-form-spec', () => {
  it('builds stacked form spec with defaults', () => {
    const spec = ontologyToFormSpec(sampleSchema, { layout: 'stacked', includeTitle: true })
    expect(spec.presentation).toBe('stacked')
    expect(spec.fields.map((f) => f.field.name)).toEqual(['title', 'rating', 'comments', 'notify'])
    expect(spec.defaults.rating).toBe('Good')
    expect(spec.stepCount).toBe(1)
  })

  it('assigns one step per field in survey mode', () => {
    const spec = ontologyToFormSpec(sampleSchema, { layout: 'survey' })
    expect(spec.stepCount).toBe(3)
    expect(spec.fields[0]!.stepIndex).toBe(0)
    expect(spec.fields[1]!.stepIndex).toBe(1)
  })

  it('groups wizard steps by field.group', () => {
    const spec = ontologyToFormSpec(sampleSchema, { layout: 'wizard' })
    expect(spec.stepCount).toBe(2)
    const step0 = fieldsForStep(spec, 0)
    expect(step0.map((f) => f.field.name)).toEqual(['rating'])
    const step1 = fieldsForStep(spec, 1)
    expect(step1.map((f) => f.field.name)).toEqual(['comments', 'notify'])
  })

  it('uses schema formPresentation when layout omitted', () => {
    const spec = ontologyToFormSpec({ ...sampleSchema, formPresentation: 'survey' })
    expect(spec.presentation).toBe('survey')
  })

  it('validates required fields', () => {
    const spec = ontologyToFormSpec(sampleSchema, { layout: 'stacked', includeTitle: true })
    const errors = validateFormValues(spec, { title: '', rating: '' })
    expect(errors.title).toBeTruthy()
    expect(errors.rating).toBeTruthy()
  })

  it('returns checkbox default false', () => {
    expect(getFieldDefaultValue({ name: 'x', valueType: 'checkbox' })).toBe(false)
  })
})
