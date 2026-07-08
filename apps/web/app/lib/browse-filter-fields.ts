import type { FilterFieldDef, FilterFieldType } from '~/composables/useAdvancedFilters'
import { getAllEntityTypes, getPropertyFieldsForType } from '~/config/entityRegistry'
import { resolveFieldEditorConfig, resolvePropertyKey } from '~/lib/fieldEditorConfig'
import type { DynamicEntityTypeConfig, OntologySchemaField } from '~/lib/ontology-registry/schemas-to-server-types'
import { TABLE_SKIP_FIELD_NAMES } from '~/lib/ontology-sidebar-fields'
import { getValueTypeIcon } from '~/lib/ontology-value-types'
import {
  PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  URGENCY_OPTIONS,
  type EntityType,
  type EntityTypeConfig,
  type PropertyFieldConfig,
  type PropertyFieldId,
} from '~/types/entity'

const SKIP_FILTER_VALUE_TYPES = new Set(['files', 'formula', 'relation'])

function titleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

function valueTypeToFilterType(valueType: string): FilterFieldType {
  switch (valueType) {
    case 'number':
      return 'number'
    case 'select':
    case 'status':
      return 'select'
    case 'multi_select':
      return 'multi_select'
    case 'date':
      return 'date'
    case 'checkbox':
      return 'checkbox'
    default:
      return 'text'
  }
}

function normalizeSelectOptions(
  options: unknown[] | undefined,
): { value: string; label: string }[] | undefined {
  if (!options?.length) return undefined
  return options.map((o) => {
    if (typeof o === 'string') return { value: o, label: o }
    if (o && typeof o === 'object') {
      const rec = o as Record<string, unknown>
      const value = String(rec.name ?? rec.value ?? rec.label ?? o)
      const label = String(rec.label ?? rec.name ?? rec.value ?? o)
      return { value, label }
    }
    return { value: String(o), label: String(o) }
  })
}

function fieldFromOntology(field: OntologySchemaField): FilterFieldDef | null {
  if (SKIP_FILTER_VALUE_TYPES.has(field.valueType)) return null
  if (field.valueType === 'rich_text' && TABLE_SKIP_FIELD_NAMES.has(field.name)) return null
  if (field.name === 'type') return null

  const def: FilterFieldDef = {
    key: field.name,
    label: titleCase(field.name),
    type: valueTypeToFilterType(field.valueType),
    icon: field.icon || getValueTypeIcon(field.valueType),
  }

  if (field.valueType === 'select' || field.valueType === 'status' || field.valueType === 'multi_select') {
    def.options = normalizeSelectOptions(field.selectOptions)
  }

  return def
}

function fieldFromPropertyField(
  fieldId: PropertyFieldId,
  entityType: EntityType,
  propField: PropertyFieldConfig,
): FilterFieldDef | null {
  if (fieldId === 'type' || fieldId === 'involved') return null

  const key = fieldId === 'status' ? resolvePropertyKey('status', entityType) : fieldId
  const editorCfg = resolveFieldEditorConfig(fieldId, entityType)

  let type: FilterFieldType = 'text'
  switch (editorCfg.editorType) {
    case 'select':
      type = 'select'
      break
    case 'date':
      type = 'date'
      break
    case 'toggle':
      type = 'checkbox'
      break
    case 'number':
      type = 'number'
      break
    case 'tags':
      type = 'multi_select'
      break
    default:
      type = 'text'
  }

  const def: FilterFieldDef = {
    key,
    label: propField.label,
    type,
    icon: propField.icon,
  }

  if (editorCfg.options?.length) {
    def.options = editorCfg.options.map((o) => ({ value: o.value, label: o.label }))
  }

  return def
}

function addField(seen: Map<string, FilterFieldDef>, def: FilterFieldDef | null) {
  if (!def || seen.has(def.key)) return
  seen.set(def.key, def)
}

/** Build Notion-style advanced filter field definitions for a browse context. */
export function buildBrowseFilterFields(
  entityTypes: string[],
  lookup: (_type: string) => EntityTypeConfig | DynamicEntityTypeConfig | null,
): FilterFieldDef[] {
  const seen = new Map<string, FilterFieldDef>()
  const isMultiType = entityTypes.length > 1

  addField(seen, { key: 'title', label: 'Title', type: 'text', icon: 'lucide:type' })
  addField(seen, { key: 'description', label: 'Description', type: 'text', icon: 'lucide:align-left' })
  addField(seen, { key: 'createdAt', label: 'Created', type: 'date', icon: 'lucide:calendar-plus' })
  addField(seen, { key: 'updatedAt', label: 'Updated', type: 'date', icon: 'lucide:calendar-clock' })

  if (isMultiType) {
    addField(seen, {
      key: 'type',
      label: 'Type',
      type: 'select',
      icon: 'lucide:layers',
      options: getAllEntityTypes()
        .filter((t) => entityTypes.includes(t.type))
        .map((t) => ({ value: t.type, label: t.label })),
    })
    addField(seen, { key: 'startDate', label: 'Start Date', type: 'date', icon: 'lucide:calendar' })
    addField(seen, { key: 'category', label: 'Category', type: 'text', icon: 'lucide:tag' })
    addField(seen, { key: 'owner', label: 'Owner', type: 'text', icon: 'lucide:user' })
    addField(seen, {
      key: 'taskStatus',
      label: 'Status',
      type: 'select',
      icon: 'lucide:circle-dot',
      options: TASK_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    })
    addField(seen, {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      icon: 'lucide:minus',
      options: PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    })
    addField(seen, {
      key: 'urgency',
      label: 'Urgency',
      type: 'select',
      icon: 'lucide:clock',
      options: URGENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    })
    addField(seen, { key: 'tags', label: 'Tags', type: 'multi_select', icon: 'lucide:tags' })
    return Array.from(seen.values())
  }

  const singleType = entityTypes[0]
  if (!singleType) return Array.from(seen.values())

  const config = lookup(singleType)
  if (config && 'fields' in config && config.fields?.length) {
    for (const field of config.fields) {
      addField(seen, fieldFromOntology(field))
    }
  } else {
    for (const propField of getPropertyFieldsForType(singleType as EntityType)) {
      addField(seen, fieldFromPropertyField(propField.id, singleType as EntityType, propField))
    }
  }

  return Array.from(seen.values())
}
