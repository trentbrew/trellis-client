import { ENTITY_NAMESPACE } from '~/lib/tql-namespace'
import type {
  EntityClass,
  EntityTypeConfig,
  EntityClassConfig,
  PropertyFieldConfig,
  PropertyFieldId,
} from '~/types/entity'
import type { ProjectionType } from '~/types/database'
import type { ServerSchemaDefinition } from '~/lib/app-config/types'
import { ENTITY_CLASSES } from '~/config/entityRegistry'

export type OntologyTier = 'core' | 'system' | 'user'

export interface OntologySchemaField {
  name: string
  valueType: string
  required?: boolean
  description?: string
  selectOptions?: unknown[]
  relation?: {
    targetSchema?: string
    cardinality?: 'one' | 'many'
    syncedProperty?: string
  }
  icon?: string
  group?: string
  display?: string
  editable?: boolean
  computed?: boolean
  modes?: string[]
  defaultValue?: unknown
}

/** Server / API ontology shape (compatible with ServerSchemaDefinition). */
export interface OntologySchemaDefinition {
  '@id': string
  '@type': string
  version: string
  tier?: OntologyTier
  fields: OntologySchemaField[]
  entityClass?: EntityClass
  label?: string
  labelPlural?: string
  icon?: string
  color?: string
  projections?: string[]
  defaultProjection?: string
  dialogShell?: string
  panels?: { properties: string; content: string; footerActions: string[] }
  propertyFieldIds?: string[]
  defaultSortField?: string
  searchFields?: string[]
}

export interface DynamicEntityTypeConfig extends Omit<EntityTypeConfig, 'type' | 'dialogShell'> {
  type: string
  dialogShell: string
  dynamic: true
  tier?: OntologyTier
  schemaId: string
  schemaVersion: string
  fields: OntologySchemaField[]
}

/** Storage-level schemas — not entity types for the UI registry. */
export const ONTOLOGY_SYSTEM_SCHEMA_IDS = new Set([
  `trellis:schema/${ENTITY_NAMESPACE}`,
  'trellis:schema/comment',
])

const TEMPORAL_FIELD_NAMES = new Set(['startDate', 'endDate', 'allDay', 'startTime', 'endTime', 'dueDate'])
const DOCUMENT_FIELD_NAMES = new Set(['content', 'pinned', 'wordCount', 'body'])
const ACTOR_FIELD_NAMES = new Set(['email', 'phone', 'avatar', 'firstName', 'lastName', 'role'])

function inferEntityClass(fields: OntologySchemaField[]): EntityClass {
  const fieldNames = new Set(fields.map((f) => f.name))
  if ([...TEMPORAL_FIELD_NAMES].some((n) => fieldNames.has(n))) return 'temporal'
  if ([...DOCUMENT_FIELD_NAMES].some((n) => fieldNames.has(n))) return 'document'
  if ([...ACTOR_FIELD_NAMES].some((n) => fieldNames.has(n))) return 'actor'
  return 'container'
}

function extractTypeSlug(schemaId: string): string {
  const parts = schemaId.split('/')
  return parts[parts.length - 1] || schemaId
}

function titleCase(str: string): string {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function pluralize(word: string): string {
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z')) return word + 'es'
  if (word.endsWith('y') && !/[aeiou]y$/.test(word)) return word.slice(0, -1) + 'ies'
  return word + 's'
}

const CLASS_COLORS: Record<EntityClass, string> = {
  temporal: 'blue',
  document: 'emerald',
  actor: 'sky',
  container: 'violet',
}

const CLASS_ICONS: Record<EntityClass, string> = {
  temporal: 'lucide:calendar',
  document: 'lucide:file-text',
  actor: 'lucide:user',
  container: 'lucide:folder',
}

function buildPropertyFields(schema: OntologySchemaDefinition): PropertyFieldConfig[] {
  const fieldIds = schema.propertyFieldIds || []
  if (fieldIds.length === 0) return []

  const fieldMap = new Map<string, OntologySchemaField>()
  for (const f of schema.fields) {
    fieldMap.set(f.name, f)
  }

  return fieldIds.map((id) => {
    const schemaField = fieldMap.get(id)
    return {
      id: id as PropertyFieldId,
      group: (schemaField?.group || 'identity') as PropertyFieldConfig['group'],
      label: titleCase(id),
      icon: schemaField?.icon || 'lucide:circle',
      display: (schemaField?.display || 'popover') as PropertyFieldConfig['display'],
      editable: schemaField?.editable ?? true,
      required: schemaField?.required ?? false,
      computed: schemaField?.computed ?? false,
      modes: schemaField?.modes as PropertyFieldConfig['modes'],
      defaultValue: schemaField?.defaultValue,
    }
  })
}

export function schemaToEntityTypeConfig(schema: OntologySchemaDefinition): DynamicEntityTypeConfig {
  const slug = extractTypeSlug(schema['@id'])
  const entityClass = schema.entityClass || inferEntityClass(schema.fields)
  const classConfig: EntityClassConfig = ENTITY_CLASSES[entityClass]
  const hasUIMetadata = !!schema.entityClass

  return {
    type: slug,
    class: entityClass,
    label: schema.label || titleCase(slug),
    labelPlural: schema.labelPlural || titleCase(pluralize(slug)),
    icon: schema.icon || CLASS_ICONS[entityClass],
    color: schema.color || CLASS_COLORS[entityClass],
    projections: (schema.projections || classConfig.baseProjections) as ProjectionType[],
    defaultProjection: (schema.defaultProjection || classConfig.baseProjections[0]) as ProjectionType,
    dialogShell: schema.dialogShell || entityClass,
    panels: schema.panels || {
      properties: hasUIMetadata ? `${titleCase(slug)}Properties` : 'DynamicProperties',
      content: hasUIMetadata ? `${titleCase(slug)}Content` : 'DynamicContent',
      footerActions: ['archive', 'delete'],
    },
    propertyFields: buildPropertyFields(schema),
    defaultSortField: schema.defaultSortField || 'title',
    searchFields: schema.searchFields || ['title', 'description'],
    dynamic: true,
    tier: schema.tier,
    schemaId: schema['@id'],
    schemaVersion: schema.version,
    fields: schema.fields,
  }
}

/**
 * Convert live config or API ontologies map → registry slug map.
 * ServerSchemaDefinition is structurally compatible with OntologySchemaDefinition.
 */
export function schemasRecordToServerTypes(
  ontologies: Record<string, ServerSchemaDefinition | OntologySchemaDefinition>,
): Map<string, DynamicEntityTypeConfig> {
  const map = new Map<string, DynamicEntityTypeConfig>()

  for (const schema of Object.values(ontologies)) {
    if (ONTOLOGY_SYSTEM_SCHEMA_IDS.has(schema['@id'])) continue
    const config = schemaToEntityTypeConfig(schema as OntologySchemaDefinition)
    map.set(config.type, config)
  }

  return map
}
