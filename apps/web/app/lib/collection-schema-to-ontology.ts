import type { DatabaseField, DatabaseSchema } from '~/types/database'
import { normalizeOntologySlug, validateOntologySlug } from '~/lib/ontology-reserved-keys'

export type OntologyFieldDraft = {
  name: string
  valueType: string
  required?: boolean
  selectOptions?: Array<{ name: string }>
}

export const DATABASE_FIELD_TO_ONTOLOGY: Record<string, string> = {
  text: 'rich_text',
  number: 'number',
  select: 'select',
  multiselect: 'multi_select',
  date: 'date',
  checkbox: 'checkbox',
  url: 'url',
  email: 'email',
  file: 'files',
  relation: 'relation',
  formula: 'formula',
}

export function slugifyOntologyFieldName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return slug || 'field'
}

export function databaseFieldToOntologyField(field: DatabaseField, hasTitle: boolean): {
  field: OntologyFieldDraft
  hasTitle: boolean
} {
  let valueType = DATABASE_FIELD_TO_ONTOLOGY[field.type] ?? 'rich_text'
  let name = slugifyOntologyFieldName(field.name)

  const isTitleCandidate =
    !hasTitle && (field.type === 'text' || valueType === 'rich_text') && /^(title|name)$/i.test(field.name.trim())

  if (isTitleCandidate) {
    valueType = 'title'
    name = 'title'
    hasTitle = true
  }

  const draft: OntologyFieldDraft = {
    name,
    valueType,
    required: field.required ?? false,
  }

  if (field.type === 'select' && field.options?.length) {
    draft.selectOptions = field.options.map((option) => ({ name: option.value }))
  }

  return { field: draft, hasTitle }
}

export function databaseFieldsToOntologyFields(fields: DatabaseField[]): OntologyFieldDraft[] {
  const sorted = [...fields].sort((a, b) => a.order - b.order)
  let hasTitle = false
  const out: OntologyFieldDraft[] = []

  for (const field of sorted) {
    const mapped = databaseFieldToOntologyField(field, hasTitle)
    hasTitle = mapped.hasTitle
    out.push(mapped.field)
  }

  if (!hasTitle) {
    out.unshift({ name: 'title', valueType: 'title', required: true })
  }

  return out
}

export function databaseSchemaToOntologyFields(schema: DatabaseSchema | null | undefined): OntologyFieldDraft[] {
  if (!schema?.fields?.length) {
    return [{ name: 'title', valueType: 'title', required: true }]
  }
  return databaseFieldsToOntologyFields(schema.fields)
}

export type ProvisionCollectionOntologyInput = {
  slug: string
  title: string
  description?: string
  icon?: string
  schema?: DatabaseSchema | null
  agentId?: string
}

export type ProvisionCollectionOntologyResult = {
  created: boolean
  schemaId?: string
  skipped?: string
}

/**
 * Create a user-tier TQL ontology mirroring a new InstantDB database collection.
 * Non-throwing for reserved slugs / duplicates — collection create should succeed regardless.
 */
export async function provisionCollectionOntology(
  input: ProvisionCollectionOntologyInput,
): Promise<ProvisionCollectionOntologyResult> {
  const slugError = validateOntologySlug(input.slug)
  if (slugError) {
    return { created: false, skipped: slugError }
  }

  const slug = normalizeOntologySlug(input.slug)
  const schemaId = `trellis:schema/${slug}`
  const fields = databaseSchemaToOntologyFields(input.schema ?? null)

  try {
    await $fetch('/api/graph/ontology', {
      method: 'POST',
      body: {
        schema: {
          '@id': schemaId,
          '@type': 'trellis:Schema',
          version: '1.0.0',
          label: input.title.trim() || slug,
          description: input.description?.trim() || undefined,
          icon: input.icon || 'lucide:database',
          tier: 'user',
          browse: { enabled: true },
          fields,
        },
        agentId: input.agentId ?? 'browser',
      },
    })
    return { created: true, schemaId }
  } catch (err: unknown) {
    const status = (err as { statusCode?: number; status?: number })?.statusCode
      ?? (err as { status?: number })?.status
    const message = (err as { data?: { message?: string }; message?: string })?.data?.message
      ?? (err as { message?: string })?.message
      ?? 'Failed to create ontology'

    if (status === 409 || /already exists/i.test(String(message))) {
      return { created: false, skipped: 'ontology already exists', schemaId }
    }

    throw err
  }
}
