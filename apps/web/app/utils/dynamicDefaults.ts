/**
 * Dynamic Default Item Factory
 *
 * Creates a default entity shape from an ontology schema definition,
 * replacing the hardcoded `createDefaultItem()` switch for user-created types.
 *
 * For known system types, falls back to `createDefaultItem()`.
 * For dynamic/user types, builds defaults from field definitions.
 */

import { getFieldDefaultValue } from '~/lib/ontology-form-spec'
import { createDefaultBase, createDefaultItem } from '~/types/entity'
import type { EntityType } from '~/types/entity'

/**
 * Types that have dedicated factory functions in createDefaultItem.
 * Must stay in sync with the switch in ~/types/entity.ts.
 */
const KNOWN_TYPES = new Set<string>([
  'task', 'event', 'trip', 'payment', 'note', 'slide_deck',
  'file', 'bookmark', 'person', 'organization', 'project',
  'sprint', 'milestone', 'goal', 'budget',
])

interface SchemaField {
  name: string
  valueType: string
  required?: boolean
  defaultValue?: unknown
  selectOptions?: { name: string }[]
}

/** Default value for a field based on its valueType. */
function defaultForValueType(field: SchemaField): unknown {
  return getFieldDefaultValue(field)
}

/**
 * Create a default entity from an ontology schema.
 * Uses the base entity shape (EntityItemBase) plus field-specific defaults.
 *
 * @param typeSlug - The entity type slug (e.g. 'invoice', 'deal')
 * @param fields - Schema field definitions from the ontology
 * @returns A default entity shape ready for use in dialogs
 */
export function createDynamicDefaultItem(
  typeSlug: string,
  fields: SchemaField[],
): Record<string, unknown> {
  // Start with the shared base
  const base = createDefaultBase()

  // Override type
  const item: Record<string, unknown> = {
    ...base,
    type: typeSlug,
  }

  // Apply field-specific defaults
  for (const field of fields) {
    // Skip fields that are already in the base (title, description, tags, etc.)
    // Only set if not already present or if the field has an explicit default
    if (field.name === 'title' || field.name === 'description') continue

    const defaultVal = defaultForValueType(field)
    if (defaultVal !== undefined) {
      item[field.name] = defaultVal
    }
  }

  return item
}

/**
 * Smart default item factory: uses createDefaultItem for known system types
 * (task, note, etc.), falls back to createDynamicDefaultItem for user-created
 * types that have schema field definitions.
 */
export function createSmartDefaultItem(
  typeSlug: string,
  fields?: SchemaField[],
): Record<string, unknown> {
  // Known system types have dedicated factory functions with richer defaults
  if (KNOWN_TYPES.has(typeSlug)) {
    return { ...createDefaultItem(typeSlug as EntityType) }
  }

  // Dynamic/user type with schema fields — build from field definitions
  if (fields && fields.length > 0) {
    return createDynamicDefaultItem(typeSlug, fields)
  }

  // Bare minimum fallback for unknown types without schema
  return { ...createDefaultBase(), type: typeSlug }
}
