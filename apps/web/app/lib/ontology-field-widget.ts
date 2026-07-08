import type { OntologySchemaField } from '~/lib/ontology-registry/schemas-to-server-types'
import { fieldDisplayIcon, normalizeSelectOptions } from '~/lib/ontology-sidebar-fields'

/** Resolved widget kind for an ontology field — shared across dialogs, sidebars, and forms. */
export type OntologyFieldWidgetKind =
  | 'checkbox'
  | 'select'
  | 'multi_select'
  | 'status'
  | 'date'
  | 'people'
  | 'relation'
  | 'files'
  | 'rich_text'
  | 'text'
  | 'readonly'

export type OntologyHtmlInputType = 'text' | 'email' | 'url' | 'tel' | 'number'

export interface OntologyFieldWidgetMeta {
  kind: OntologyFieldWidgetKind
  valueType: string
  htmlInputType: OntologyHtmlInputType
  icon: string
  /** Compact property-row placement (entity dialog header strip). */
  isPropertyField: boolean
  /** Single-line text input in a popover or stacked field. */
  isTextLike: boolean
  hasSelectOptions: boolean
  selectOptions: { name: string; color?: string }[]
}

/** Value types that render in the entity dialog properties row. */
export const PROPERTY_FIELD_VALUE_TYPES = new Set([
  'select',
  'multi_select',
  'status',
  'date',
  'checkbox',
  'people',
  'number',
])

const TEXT_LIKE_VALUE_TYPES = new Set([
  'text',
  'rich_text',
  'email',
  'url',
  'phone_number',
  'number',
])

function resolveHtmlInputType(valueType: string): OntologyHtmlInputType {
  switch (valueType) {
    case 'email':
      return 'email'
    case 'url':
      return 'url'
    case 'phone_number':
      return 'tel'
    case 'number':
      return 'number'
    default:
      return 'text'
  }
}

function resolveWidgetKind(field: OntologySchemaField): OntologyFieldWidgetKind {
  switch (field.valueType) {
    case 'checkbox':
      return 'checkbox'
    case 'multi_select':
      return 'multi_select'
    case 'status':
      return 'status'
    case 'select':
      return 'select'
    case 'date':
      return 'date'
    case 'people':
      return 'people'
    case 'relation':
      return 'relation'
    case 'files':
      return 'files'
    case 'rich_text':
      return 'rich_text'
    case 'title':
    case 'text':
    case 'email':
    case 'url':
    case 'phone_number':
    case 'number':
      return 'text'
    default:
      return 'readonly'
  }
}

/**
 * Resolve how an ontology field should be rendered across entity dialogs,
 * property sidebars, and generated forms.
 */
export function resolveOntologyFieldWidget(field: OntologySchemaField): OntologyFieldWidgetMeta {
  const selectOptions = normalizeSelectOptions(field.selectOptions as unknown[] | undefined)
  const kind = resolveWidgetKind(field)

  return {
    kind,
    valueType: field.valueType,
    htmlInputType: resolveHtmlInputType(field.valueType),
    icon: fieldDisplayIcon(field),
    isPropertyField: PROPERTY_FIELD_VALUE_TYPES.has(field.valueType),
    isTextLike: TEXT_LIKE_VALUE_TYPES.has(field.valueType),
    hasSelectOptions: selectOptions.length > 0,
    selectOptions,
  }
}

/** Split schema fields into property-row vs body content (entity dialog layout). */
export function partitionSchemaFields(fields: OntologySchemaField[]): {
  propertyFields: OntologySchemaField[]
  bodyFields: OntologySchemaField[]
} {
  const propertyFields: OntologySchemaField[] = []
  const bodyFields: OntologySchemaField[] = []

  for (const field of fields) {
    if (field.valueType === 'title') continue
    if (resolveOntologyFieldWidget(field).isPropertyField) {
      propertyFields.push(field)
    } else {
      bodyFields.push(field)
    }
  }

  return { propertyFields, bodyFields }
}
