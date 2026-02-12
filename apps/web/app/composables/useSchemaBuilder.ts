/**
 * Composable for building collection schemas
 *
 * Integrates with the ontology system to provide type-aware field definitions
 * and enables visual schema construction for collections.
 */

import type { DatabaseField, DatabaseSchema } from '~/types/database'

export interface FieldTypeDefinition {
  id: string
  label: string
  icon: string
  description: string
  valueType: string
  category: 'basic' | 'rich' | 'relation' | 'computed' | 'ontology'
  defaultConfig?: Record<string, any>
}

export interface OntologyFieldDefinition {
  id: string
  label: string
  icon: string
  valueType: string
  options?: Array<{ value: string; label: string; color?: string }>
  source: 'core' | 'system' | string
}

// Built-in field types
const BUILT_IN_FIELD_TYPES: FieldTypeDefinition[] = [
  // Basic types
  {
    id: 'text',
    label: 'Text',
    icon: 'lucide:type',
    description: 'Single line text input',
    valueType: 'text',
    category: 'basic',
  },
  {
    id: 'number',
    label: 'Number',
    icon: 'lucide:hash',
    description: 'Numeric value',
    valueType: 'number',
    category: 'basic',
  },
  {
    id: 'checkbox',
    label: 'Checkbox',
    icon: 'lucide:check-square',
    description: 'True/false toggle',
    valueType: 'checkbox',
    category: 'basic',
  },
  {
    id: 'date',
    label: 'Date',
    icon: 'lucide:calendar',
    description: 'Date picker',
    valueType: 'date',
    category: 'basic',
  },

  // Rich types
  {
    id: 'select',
    label: 'Select',
    icon: 'lucide:list',
    description: 'Single choice from options',
    valueType: 'select',
    category: 'rich',
  },
  {
    id: 'multiselect',
    label: 'Multi-select',
    icon: 'lucide:list-checks',
    description: 'Multiple choices from options',
    valueType: 'multiselect',
    category: 'rich',
  },
  {
    id: 'url',
    label: 'URL',
    icon: 'lucide:link',
    description: 'Web link',
    valueType: 'url',
    category: 'rich',
  },
  {
    id: 'email',
    label: 'Email',
    icon: 'lucide:mail',
    description: 'Email address',
    valueType: 'email',
    category: 'rich',
  },
  {
    id: 'file',
    label: 'File',
    icon: 'lucide:paperclip',
    description: 'File attachment',
    valueType: 'file',
    category: 'rich',
  },

  // Relation types
  {
    id: 'relation',
    label: 'Relation',
    icon: 'lucide:link-2',
    description: 'Link to another record',
    valueType: 'relation',
    category: 'relation',
  },

  // Computed types
  {
    id: 'formula',
    label: 'Formula',
    icon: 'lucide:function-square',
    description: 'Calculated value from other fields',
    valueType: 'formula',
    category: 'computed',
  },
]

/**
 * Main composable for schema building
 */
export function useSchemaBuilder(_collectionId?: Ref<string | undefined>) {
  const { ontologies } = useTrellisConfig()

  // Get all available field types (built-in + ontology)
  const availableFieldTypes = computed<FieldTypeDefinition[]>(() => {
    const types = [...BUILT_IN_FIELD_TYPES]

    // Add unique field types from server ontologies
    const seen = new Set(types.map(t => t.id))
    for (const schema of Object.values(ontologies.value || {})) {
      const s = schema as any
      if (!s.fields) continue
      for (const field of s.fields) {
        if (seen.has(field.name)) continue
        seen.add(field.name)
        types.push({
          id: field.name,
          label: field.name,
          icon: field.icon || 'lucide:box',
          description: `Field from ontology`,
          valueType: field.valueType || 'text',
          category: 'ontology',
          defaultConfig: field.selectOptions ? { options: field.selectOptions } : undefined,
        })
      }
    }

    return types
  })

  // Group field types by category
  const fieldTypesByCategory = computed(() => {
    const categories: Record<string, FieldTypeDefinition[]> = {
      basic: [],
      rich: [],
      relation: [],
      computed: [],
      ontology: [],
    }

    for (const type of availableFieldTypes.value) {
      const category = categories[type.category]
      if (category) {
        category.push(type)
      }
    }

    return categories
  })

  // Get ontology fields with their full definitions (derived from server ontologies)
  const ontologyFields = computed<OntologyFieldDefinition[]>(() => {
    const fields: OntologyFieldDefinition[] = []
    const seen = new Set<string>()
    for (const schema of Object.values(ontologies.value || {})) {
      const s = schema as any
      if (!s.fields) continue
      const tier = s.tier || 'user'
      for (const field of s.fields) {
        if (seen.has(field.name)) continue
        seen.add(field.name)
        fields.push({
          id: field.name,
          label: field.name,
          icon: field.icon || 'lucide:box',
          valueType: field.valueType || 'text',
          options: field.selectOptions,
          source: tier === 'core' ? 'core' : tier === 'system' ? 'system' : 'custom',
        })
      }
    }
    return fields
  })

  // Create a new field from a type definition
  const createFieldFromType = (typeDef: FieldTypeDefinition): DatabaseField => {
    return {
      id: crypto.randomUUID(),
      name: typeDef.label,
      type: typeDef.valueType as DatabaseField['type'],
      required: false,
      order: 0,
      config: typeDef.defaultConfig,
      options: typeDef.defaultConfig?.options,
    }
  }

  // Create a new field from an ontology field
  const createFieldFromOntology = (ontologyField: OntologyFieldDefinition): DatabaseField => {
    return {
      id: crypto.randomUUID(),
      name: ontologyField.label,
      type: ontologyField.valueType as DatabaseField['type'],
      required: false,
      order: 0,
      options: ontologyField.options?.map((o) => ({ value: o.value, color: o.color || 'gray' })),
    }
  }

  // Validate a schema
  const validateSchema = (schema: DatabaseSchema): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!schema.fields || schema.fields.length === 0) {
      errors.push('Schema must have at least one field')
    }

    const names = new Set<string>()
    for (const field of schema.fields) {
      if (!field.name || !field.name.trim()) {
        errors.push(`Field "${field.id}" has no name`)
      }
      if (names.has(field.name.toLowerCase())) {
        errors.push(`Duplicate field name: "${field.name}"`)
      }
      names.add(field.name.toLowerCase())
    }

    return { valid: errors.length === 0, errors }
  }

  // Generate a default schema for a new collection
  const createDefaultSchema = (collectionId: string): DatabaseSchema => {
    return {
      id: crypto.randomUUID(),
      collectionId,
      fields: [
        {
          id: crypto.randomUUID(),
          name: 'Title',
          type: 'text',
          required: true,
          order: 0,
          isDefault: true,
        },
      ],
      views: [
        {
          id: crypto.randomUUID(),
          name: 'All Records',
          type: 'table',
          filters: [],
          sorts: [],
          isDefault: true,
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  return {
    // Field types
    availableFieldTypes,
    fieldTypesByCategory,
    ontologyFields,

    // Field creation
    createFieldFromType,
    createFieldFromOntology,

    // Schema operations
    validateSchema,
    createDefaultSchema,

    // Constants
    BUILT_IN_FIELD_TYPES,
  }
}

/**
 * Get icon for a field type
 */
export function getFieldTypeIcon(type: string): string {
  const def = BUILT_IN_FIELD_TYPES.find((t) => t.id === type || t.valueType === type)
  return def?.icon || 'lucide:box'
}

/**
 * Get label for a field type
 */
export function getFieldTypeLabel(type: string): string {
  const def = BUILT_IN_FIELD_TYPES.find((t) => t.id === type || t.valueType === type)
  return def?.label || type
}
