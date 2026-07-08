import type {
  OntologySchemaDefinition,
  OntologySchemaField,
} from '~/lib/ontology-registry/schemas-to-server-types'
import { titleCaseFieldName } from '~/lib/ontology-sidebar-fields'
import { resolveOntologyFieldWidget, type OntologyFieldWidgetMeta } from '~/lib/ontology-field-widget'

/** How a generated form is presented to the user. */
export type FormPresentation = 'entity-dialog' | 'stacked' | 'survey' | 'wizard'

export type FormMode = 'create' | 'edit' | 'view'

export interface FormFieldSpec {
  field: OntologySchemaField
  widget: OntologyFieldWidgetMeta
  label: string
  required: boolean
  description?: string
  validate: (value: unknown) => string | null
  defaultValue: unknown
  /** Step index for survey/wizard layouts (0-based). */
  stepIndex: number
}

export interface OntologyFormSpec {
  schemaId: string
  label: string
  presentation: FormPresentation
  mode: FormMode
  fields: FormFieldSpec[]
  defaults: Record<string, unknown>
  stepCount: number
}

export interface OntologyToFormSpecOptions {
  layout?: FormPresentation
  mode?: FormMode
  /** Include the title field in the generated form (default false — often handled by shell). */
  includeTitle?: boolean
}

const FORM_SKIP_FIELD_NAMES = new Set(['type', 'createdAt', 'updatedAt'])

function isEmptyValue(value: unknown): boolean {
  if (value == null || value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

/** Default value for a single ontology field. */
export function getFieldDefaultValue(field: OntologySchemaField): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue

  switch (field.valueType) {
    case 'title':
    case 'rich_text':
    case 'text':
    case 'url':
    case 'email':
    case 'phone_number':
      return ''
    case 'number':
    case 'date':
    case 'relation':
      return undefined
    case 'checkbox':
      return false
    case 'select':
    case 'status': {
      const options = field.selectOptions as { name: string }[] | undefined
      if (field.required && options?.length) return options[0]!.name
      return ''
    }
    case 'multi_select':
    case 'people':
    case 'files':
      return []
    default:
      return undefined
  }
}

function createFieldValidator(field: OntologySchemaField, label: string): (value: unknown) => string | null {
  return (value: unknown) => {
    if (field.required && isEmptyValue(value)) {
      return `${label} is required`
    }

    if (field.valueType === 'email' && value && typeof value === 'string') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Enter a valid email address'
      }
    }

    if (field.valueType === 'url' && value && typeof value === 'string' && value.trim()) {
      try {
        // eslint-disable-next-line no-new
        new URL(value.startsWith('http') ? value : `https://${value}`)
      } catch {
        return 'Enter a valid URL'
      }
    }

    return null
  }
}

function filterFormFields(
  fields: OntologySchemaField[],
  includeTitle: boolean,
): OntologySchemaField[] {
  return fields.filter((field) => {
    if (FORM_SKIP_FIELD_NAMES.has(field.name)) return false
    if (field.computed) return false
    if (field.valueType === 'formula') return false
    if (!includeTitle && field.valueType === 'title') return false
    return true
  })
}

function assignStepIndices(
  fields: OntologySchemaField[],
  presentation: FormPresentation,
): number[] {
  if (presentation === 'stacked' || presentation === 'entity-dialog') {
    return fields.map(() => 0)
  }

  if (presentation === 'survey') {
    return fields.map((_, index) => index)
  }

  // wizard — group by field.group when multiple distinct groups exist
  const groups = fields.map((f) => f.group || 'default')
  const uniqueGroups = [...new Set(groups)]
  if (uniqueGroups.length <= 1) {
    return fields.map((_, index) => index)
  }

  const groupToStep = new Map(uniqueGroups.map((g, i) => [g, i]))
  return fields.map((f) => groupToStep.get(f.group || 'default') ?? 0)
}

function buildDefaults(fields: OntologySchemaField[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  for (const field of fields) {
    const value = getFieldDefaultValue(field)
    if (value !== undefined) {
      defaults[field.name] = value
    }
  }
  return defaults
}

/**
 * Convert an ontology schema into a form specification with field widgets,
 * validation rules, defaults, and step layout for survey/wizard modes.
 */
export function ontologyToFormSpec(
  schema: Pick<OntologySchemaDefinition, '@id' | 'label' | 'fields' | 'formPresentation'>,
  options: OntologyToFormSpecOptions = {},
): OntologyFormSpec {
  const presentation = options.layout ?? schema.formPresentation ?? 'stacked'
  const mode = options.mode ?? 'create'
  const includeTitle = options.includeTitle ?? false

  const filtered = filterFormFields(schema.fields, includeTitle)
  const stepIndices = assignStepIndices(filtered, presentation)
  const stepCount =
    presentation === 'survey' || presentation === 'wizard'
      ? Math.max(...stepIndices, -1) + 1
      : 1

  const fields: FormFieldSpec[] = filtered.map((field, index) => {
    const label = titleCaseFieldName(field.name)
    return {
      field,
      widget: resolveOntologyFieldWidget(field),
      label,
      required: !!field.required,
      description: field.description,
      validate: createFieldValidator(field, label),
      defaultValue: getFieldDefaultValue(field),
      stepIndex: stepIndices[index] ?? 0,
    }
  })

  return {
    schemaId: schema['@id'],
    label: schema.label || 'Form',
    presentation,
    mode,
    fields,
    defaults: buildDefaults(filtered),
    stepCount: Math.max(stepCount, 1),
  }
}

/** Validate all fields; returns map of field name → error message. */
export function validateFormValues(
  spec: OntologyFormSpec,
  values: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const fieldSpec of spec.fields) {
    const error = fieldSpec.validate(values[fieldSpec.field.name])
    if (error) errors[fieldSpec.field.name] = error
  }
  return errors
}

/** Fields belonging to a specific wizard/survey step. */
export function fieldsForStep(spec: OntologyFormSpec, stepIndex: number): FormFieldSpec[] {
  return spec.fields.filter((f) => f.stepIndex === stepIndex)
}
