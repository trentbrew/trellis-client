import type { Entity } from '~/types/entity'
import type { OntologySchemaDefinition } from '~/lib/ontology-registry/schemas-to-server-types'
import type { FormPresentation } from '~/lib/ontology-form-spec'
import { ontologyToFormSpec, validateFormValues } from '~/lib/ontology-form-spec'
import { createSmartDefaultItem } from '~/utils/dynamicDefaults'

export class FormResponseValidationError extends Error {
  constructor(public errors: Record<string, string>) {
    super('Form validation failed')
    this.name = 'FormResponseValidationError'
  }
}

/** Resolve inline form layout — entity-dialog falls back to stacked in Form view. */
export function resolveFormLayout(
  formPresentation?: FormPresentation | null,
): Exclude<FormPresentation, 'entity-dialog'> {
  const presentation = formPresentation ?? 'stacked'
  return presentation === 'entity-dialog' ? 'stacked' : presentation
}

type FormSchema = Pick<OntologySchemaDefinition, '@id' | 'label' | 'fields' | 'formPresentation'>

/**
 * Validate form values and create an entity from a browse Form view submission.
 * Stamps `submittedVia: 'form'` on the created record.
 */
export async function createFormResponse(
  entityType: string,
  schema: FormSchema,
  values: Record<string, unknown>,
  createItem: (entity: Entity) => Promise<string>,
): Promise<string> {
  const layout = resolveFormLayout(schema.formPresentation)
  const spec = ontologyToFormSpec(schema, { layout, includeTitle: true, mode: 'create' })
  const errors = validateFormValues(spec, values)

  if (Object.keys(errors).length > 0) {
    throw new FormResponseValidationError(errors)
  }

  const base = createSmartDefaultItem(entityType, schema.fields)
  const title = String(values.title ?? '').trim() || 'Untitled'

  const payload = {
    ...base,
    ...values,
    type: entityType,
    title,
    submittedVia: 'form',
  } as Entity

  return createItem(payload)
}
