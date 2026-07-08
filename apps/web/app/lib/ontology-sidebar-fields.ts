import type { OntologySchemaField } from '~/lib/ontology-registry/schemas-to-server-types'
import type { PropertyFieldId } from '~/types/entity'
import { getValueTypeIcon } from '~/lib/ontology-value-types'

/** Long-form / relational fields omitted from browse table columns. */
export const TABLE_SKIP_FIELD_NAMES = new Set([
  'description',
  'content',
  'notes',
  'checklistContent',
  'bodyText',
  'bodyHtml',
  'snippet',
  'subject',
  'tags',
  'involved',
])

/** Fields rendered elsewhere (header, body panel, references). */
export const SIDEBAR_SKIP_FIELD_NAMES = new Set([
  'title',
  'description',
  'tags',
  'type',
  'pin',
  'content',
  'notes',
  'checklistContent',
  'bodyText',
  'bodyHtml',
  'snippet',
  'subject',
  'createdAt',
  'updatedAt',
])

const PROPERTY_FIELD_IDS = new Set<string>([
  'startDate',
  'endDate',
  'allDay',
  'timeRange',
  'priority',
  'urgency',
  'status',
  'category',
  'folder',
  'owner',
  'involved',
  'pin',
  'tags',
  'amount',
  'currency',
  'payee',
  'invoiceNumber',
  'paymentStatus',
  'recurring',
  'origin',
  'destination',
  'transportation',
  'tripStatus',
  'tripBudget',
  'confirmationNumber',
  'sprintStatus',
  'velocity',
  'sprintGoal',
  'achieved',
  'projectId',
  'budgetAmount',
  'budgetCurrency',
  'budgetStatus',
  'metric',
  'targetDate',
  'currentValue',
  'targetValue',
  'location',
  'eventSubtype',
  'latitude',
  'longitude',
  'conferenceLink',
])

const SCHEMA_TO_PROPERTY_FIELD: Record<string, PropertyFieldId> = {
  taskStatus: 'status',
}

export function titleCaseFieldName(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export function getSidebarSchemaFields(fields: OntologySchemaField[]): OntologySchemaField[] {
  return fields.filter((field) => {
    if (SIDEBAR_SKIP_FIELD_NAMES.has(field.name)) return false
    if (field.valueType === 'relation' || field.valueType === 'files' || field.valueType === 'formula') {
      return false
    }
    return true
  })
}

export function schemaFieldToPropertyFieldId(fieldName: string): PropertyFieldId | null {
  const mapped = SCHEMA_TO_PROPERTY_FIELD[fieldName]
  if (mapped) return mapped
  if (PROPERTY_FIELD_IDS.has(fieldName)) return fieldName as PropertyFieldId
  return null
}

export function fieldDisplayIcon(field: OntologySchemaField): string {
  return field.icon || getValueTypeIcon(field.valueType)
}

export function normalizeSelectOptions(raw: unknown[] | undefined): { name: string; color?: string }[] {
  if (!raw?.length) return []
  return raw.map((option) => {
    if (typeof option === 'string') return { name: option }
    if (option && typeof option === 'object' && 'name' in option) {
      return option as { name: string; color?: string }
    }
    return { name: String(option) }
  })
}
