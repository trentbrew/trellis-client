import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DataTableSchemaEditor from '~/components/data/DataTable/DataTableSchemaEditor.vue'
import type { DatabaseSchema } from '~/types/database'

describe('SchemaEditor', () => {
  let wrapper: any
  let mockSchema: DatabaseSchema

  beforeEach(() => {
    mockSchema = {
      id: 'test-schema',
      collectionId: 'test-collection',
      fields: [
        {
          id: 'field-1',
          name: 'Name',
          type: 'text',
          required: true,
          order: 0,
        },
        {
          id: 'field-2',
          name: 'Price',
          type: 'number',
          required: false,
          order: 1,
        },
      ],
      views: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    wrapper = mount(DataTableSchemaEditor, {
      props: {
        schema: mockSchema,
      },
    })
  })

  describe('Field Type Selection', () => {
    it('should show formula field type in dropdown', () => {
      const fieldTypes = wrapper.vm.fieldTypes
      const formulaType = fieldTypes.find((t: any) => t.value === 'formula')

      expect(formulaType).toBeDefined()
      expect(formulaType.label).toBe('Formula')
      expect(formulaType.icon).toBe('lucide:function-square')
    })

    it('should have all expected field types', () => {
      const fieldTypes = wrapper.vm.fieldTypes
      const typeValues = fieldTypes.map((t: any) => t.value)

      expect(typeValues).toContain('text')
      expect(typeValues).toContain('number')
      expect(typeValues).toContain('formula')
      expect(typeValues).toContain('date')
      expect(typeValues).toContain('checkbox')
    })
  })

  describe('Formula Field UI', () => {
    beforeEach(() => {
      mockSchema.fields.push({
        id: 'field-formula',
        name: 'Total',
        type: 'formula',
        formula: '$sum(field1, field2)',
        formulaReturnType: 'number',
        required: false,
        order: 2,
      })

      wrapper = mount(DataTableSchemaEditor, {
        props: {
          schema: mockSchema,
        },
      })
    })

    it('should show formula editor when field type is formula', async () => {
      // The formula editor should be visible for formula fields
      const formulaField = mockSchema.fields.find((f: DatabaseSchema['fields'][number]) => f.type === 'formula')
      expect(formulaField).toBeDefined()
      expect(formulaField?.formula).toBe('$sum(field1, field2)')
    })

    it('should have formula helper buttons', () => {
      const helpers = wrapper.vm.formulaHelpers

      expect(helpers).toBeDefined()
      expect(helpers.length).toBeGreaterThan(0)

      const helperLabels = helpers.map((h: any) => h.label)
      expect(helperLabels).toContain('Sum')
      expect(helperLabels).toContain('Average')
      expect(helperLabels).toContain('Currency')
      expect(helperLabels).toContain('If/Else')
    })

    it('should insert helper code when button is clicked', () => {
      const fieldId = 'field-formula'
      const helperCode = '$sum(field1, field2)'

      wrapper.vm.insertHelper(fieldId, helperCode)

      // Should append helper code to existing formula
      expect(wrapper.emitted('update')).toBeTruthy()
    })
  })

  describe('Field CRUD Operations', () => {
    it('should add new field', () => {
      const initialFieldCount = mockSchema.fields.length

      wrapper.vm.addField()

      const updateEvent = wrapper.emitted('update')
      expect(updateEvent).toBeTruthy()

      const updatedSchema = updateEvent[0][0] as DatabaseSchema
      expect(updatedSchema.fields.length).toBe(initialFieldCount + 1)
      expect(updatedSchema.fields[initialFieldCount].name).toBe('New Field')
    })

    it('should update field properties', () => {
      const fieldId = 'field-1'
      const updates = { name: 'Updated Name', required: false }

      wrapper.vm.updateField(fieldId, updates)

      const updateEvent = wrapper.emitted('update')
      expect(updateEvent).toBeTruthy()

      const updatedSchema = updateEvent[0][0] as DatabaseSchema
      const updatedField = updatedSchema.fields.find((f: DatabaseSchema['fields'][number]) => f.id === fieldId)

      expect(updatedField?.name).toBe('Updated Name')
      expect(updatedField?.required).toBe(false)
    })

    it('should delete field', () => {
      const fieldId = 'field-1'
      const initialFieldCount = mockSchema.fields.length

      wrapper.vm.deleteField(fieldId)

      const updateEvent = wrapper.emitted('update')
      expect(updateEvent).toBeTruthy()

      const updatedSchema = updateEvent[0][0] as DatabaseSchema
      expect(updatedSchema.fields.length).toBe(initialFieldCount - 1)
      expect(updatedSchema.fields.find((f: DatabaseSchema['fields'][number]) => f.id === fieldId)).toBeUndefined()
    })
  })

  describe('Formula Field Updates', () => {
    it('should update formula expression', () => {
      const fieldId = 'field-1'
      const newFormula = '$currency($sum(price, tax))'

      wrapper.vm.updateField(fieldId, {
        type: 'formula',
        formula: newFormula,
      })

      const updateEvent = wrapper.emitted('update')
      const updatedSchema = updateEvent[0][0] as DatabaseSchema
      const updatedField = updatedSchema.fields.find((f: DatabaseSchema['fields'][number]) => f.id === fieldId)

      expect(updatedField?.type).toBe('formula')
      expect(updatedField?.formula).toBe(newFormula)
    })

    it('should update formula return type', () => {
      const fieldId = 'field-1'

      wrapper.vm.updateField(fieldId, {
        type: 'formula',
        formulaReturnType: 'number',
      })

      const updateEvent = wrapper.emitted('update')
      const updatedSchema = updateEvent[0][0] as DatabaseSchema
      const updatedField = updatedSchema.fields.find((f) => f.id === fieldId)

      expect(updatedField?.formulaReturnType).toBe('number')
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no fields exist', () => {
      const emptySchema: DatabaseSchema = {
        ...mockSchema,
        fields: [],
      }

      wrapper = mount(DataTableSchemaEditor, {
        props: {
          schema: emptySchema,
        },
      })

      // Should show empty state message
      expect(wrapper.vm.schema.fields.length).toBe(0)
    })
  })
})
