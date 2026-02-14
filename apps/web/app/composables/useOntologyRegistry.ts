import { ENTITY_NAMESPACE } from '~/lib/tql-namespace'

/**
 * Dynamic Ontology Registry
 *
 * Fetches ontologies from the TQL Graph API, subscribes to SSE events
 * for realtime updates, and converts SchemaDefinitions into EntityTypeConfig
 * shapes.
 *
 * Server ontologies with UI metadata (entityClass, label, icon, etc.) are
 * treated as the PRIMARY source. The static entityRegistry.ts is a fallback
 * for types not yet served by the API or during initial load.
 *
 * This allows runtime-created ontologies (via CLI or MCP) to automatically
 * appear in the UI — sidebar, browse pages, dialogs — with zero code changes.
 */

import type { EntityClass, EntityType, EntityTypeConfig, EntityClassConfig, PropertyFieldConfig, PropertyFieldId } from '~/types/entity'
import type { ProjectionType } from '~/types/database'
import {
  ENTITY_CLASSES,
  getEntityTypeConfig,
  getAllEntityTypeIds,
} from '~/config/entityRegistry'

// ── Types ──────────────────────────────────────────────────────────────

interface SchemaField {
  name: string
  valueType: string
  required?: boolean
  description?: string
  selectOptions?: any[]
  // UI metadata from server ontologies
  icon?: string
  group?: string
  display?: string
  editable?: boolean
  computed?: boolean
  modes?: string[]
  defaultValue?: any
}

export type OntologyTier = 'core' | 'system' | 'user'

interface SchemaDefinition {
  '@id': string
  '@type': string
  version: string
  tier?: OntologyTier
  fields: SchemaField[]
  // Extended UI metadata (populated by system ontologies)
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
  fields: SchemaField[]
}

// ── Class inference (fallback for schemas without entityClass) ────────

const TEMPORAL_FIELD_NAMES = new Set(['startDate', 'endDate', 'allDay', 'startTime', 'endTime', 'dueDate'])
const DOCUMENT_FIELD_NAMES = new Set(['content', 'pinned', 'wordCount', 'body'])
const ACTOR_FIELD_NAMES = new Set(['email', 'phone', 'avatar', 'firstName', 'lastName', 'role'])

function inferEntityClass(fields: SchemaField[]): EntityClass {
  const fieldNames = new Set(fields.map((f) => f.name))
  const hasTemporalFields = [...TEMPORAL_FIELD_NAMES].some((n) => fieldNames.has(n))
  if (hasTemporalFields) return 'temporal'
  const hasDocumentFields = [...DOCUMENT_FIELD_NAMES].some((n) => fieldNames.has(n))
  if (hasDocumentFields) return 'document'
  const hasActorFields = [...ACTOR_FIELD_NAMES].some((n) => fieldNames.has(n))
  if (hasActorFields) return 'actor'
  return 'container'
}

// ── Schema → EntityTypeConfig conversion ───────────────────────────────

function extractTypeSlug(schemaId: string): string {
  const parts = schemaId.split('/')
  return parts[parts.length - 1] || schemaId
}

function titleCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
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

/**
 * Convert propertyFieldIds from the server ontology into PropertyFieldConfig[].
 * Uses the field's own UI metadata from the schema when available,
 * otherwise falls back to a default config for that field ID.
 */
function buildPropertyFields(schema: SchemaDefinition): PropertyFieldConfig[] {
  const fieldIds = schema.propertyFieldIds || []
  if (fieldIds.length === 0) return []

  // Build a lookup from schema fields
  const fieldMap = new Map<string, SchemaField>()
  for (const f of schema.fields) {
    fieldMap.set(f.name, f)
  }

  return fieldIds.map((id) => {
    const schemaField = fieldMap.get(id)
    return {
      id: id as PropertyFieldId,
      group: (schemaField?.group || 'identity') as PropertyFieldConfig['group'],
      label: schemaField?.icon ? titleCase(id) : titleCase(id),
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

/**
 * Convert a server SchemaDefinition into a DynamicEntityTypeConfig.
 * If the schema has UI metadata (entityClass, label, icon, etc.), use it directly.
 * Otherwise, infer from fields (backward compat for user-created ontologies).
 */
function schemaToEntityTypeConfig(schema: SchemaDefinition): DynamicEntityTypeConfig {
  const slug = extractTypeSlug(schema['@id'])
  const entityClass = schema.entityClass || inferEntityClass(schema.fields)
  const classConfig: EntityClassConfig = ENTITY_CLASSES[entityClass]

  // Use server-provided UI metadata when available, fall back to inference
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

// ── Composable state (module-level singletons) ─────────────────────────

const _serverTypes = ref<Map<string, DynamicEntityTypeConfig>>(new Map())
const _loading = ref(false)
const _error = ref<string | null>(null)
const _initialized = ref(false)

// Schema IDs that are storage-level (not entity types) — skip them
const SYSTEM_SCHEMA_IDS = new Set([
  `trellis:schema/${ENTITY_NAMESPACE}`,
  'trellis:schema/comment',
])

async function fetchOntologies(): Promise<void> {
  _loading.value = true
  _error.value = null

  try {
    const data = await $fetch<{ ontologies: Record<string, SchemaDefinition> }>('/api/graph/ontologies')
    const ontologies = data.ontologies || {}
    const newMap = new Map<string, DynamicEntityTypeConfig>()

    for (const [, schema] of Object.entries(ontologies)) {
      // Skip system/storage-level ontologies
      if (SYSTEM_SCHEMA_IDS.has(schema['@id'])) continue

      const config = schemaToEntityTypeConfig(schema)
      newMap.set(config.type, config)
    }

    _serverTypes.value = newMap
  } catch (err: any) {
    _error.value = err.message || 'Failed to fetch ontologies'
  } finally {
    _loading.value = false
    _initialized.value = true
  }
}

let _sseCleanup: (() => void) | null = null

function subscribeToSSE(): void {
  if (!import.meta.client) return
  if (_sseCleanup) return // Already subscribed

  const eventSource = new EventSource('/api/graph/events')

  eventSource.addEventListener('mutation', (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.action?.includes('Ontology') || data.type === 'ontology') {
        // Re-fetch ontologies on any ontology mutation
        fetchOntologies()
      }
    } catch {
      // Ignore malformed events
    }
  })

  eventSource.onerror = () => {
    // EventSource auto-reconnects
  }

  _sseCleanup = () => {
    eventSource.close()
    _sseCleanup = null
  }
}

export function useOntologyRegistry() {
  // Initialize on first use (client-side only)
  if (import.meta.client && !_initialized.value && !_loading.value) {
    fetchOntologies()
    subscribeToSSE()
  }

  // ── Computed views ────────────────────────────────────────────────

  /**
   * All server-sourced types (both system entity types and user-created).
   * System entity types (task, note, etc.) now come from the server with
   * full UI metadata instead of being skipped.
   */
  const serverTypes = computed(() => Array.from(_serverTypes.value.values()))

  /**
   * Only user-created (truly dynamic) types — those with tier 'user' or no tier.
   * Excludes core (structural) and system (built-in entity) types.
   */
  const dynamicTypes = computed(() => {
    return Array.from(_serverTypes.value.values()).filter(
      (t) => !t.tier || t.tier === 'user',
    )
  })

  // App-scoped filtering: only show types whose schemaId is in currentApp.ontologies
  // If ontologies is null/undefined/empty → show ALL (backward compat for default "Workspace" app)
  const { currentApp } = useInstantData()

  const filteredDynamicTypes = computed(() => {
    const all = dynamicTypes.value
    const appOntologies = currentApp.value?.ontologies
    if (!appOntologies || appOntologies.length === 0) return all
    const allowed = new Set(appOntologies)
    return all.filter((t) => allowed.has(t.type))
  })

  const allTypeIds = computed<string[]>(() => {
    const staticIds = getAllEntityTypeIds() as string[]
    const serverIds = Array.from(_serverTypes.value.keys())
    // Deduplicate: server types override static ones
    const merged = new Set([...staticIds, ...serverIds])
    return Array.from(merged)
  })

  /**
   * Unified lookup: server ontology takes priority, falls back to static registry.
   * This means server-provided UI metadata (from tql-ontologies.ts) overrides
   * the hardcoded entityRegistry.ts values.
   */
  function getEntityConfig(type: string): EntityTypeConfig | DynamicEntityTypeConfig | null {
    // Server ontology takes priority (has UI metadata from server)
    const serverType = _serverTypes.value.get(type)
    if (serverType) return serverType

    // Fall back to static registry
    const staticIds = new Set(getAllEntityTypeIds())
    if (staticIds.has(type as EntityType)) {
      return getEntityTypeConfig(type as EntityType)
    }

    return null
  }

  /**
   * Check if a type exists in either registry.
   */
  function hasType(type: string): boolean {
    if (_serverTypes.value.has(type)) return true
    return new Set(getAllEntityTypeIds()).has(type as EntityType)
  }

  /**
   * Check if a type is served from the server ontology (not just static).
   */
  function isServerType(type: string): boolean {
    return _serverTypes.value.has(type)
  }

  /**
   * Check if a type is dynamically registered (user-created, tier 'user' or unset).
   */
  function isDynamicType(type: string): boolean {
    const config = _serverTypes.value.get(type)
    if (!config) return false
    return !config.tier || config.tier === 'user'
  }

  // Backward-compat alias
  const getDynamicEntityTypeConfig = getEntityConfig

  return {
    serverTypes,
    dynamicTypes,
    filteredDynamicTypes,
    allTypeIds,
    loading: computed(() => _loading.value),
    error: computed(() => _error.value),
    initialized: computed(() => _initialized.value),

    getEntityConfig,
    getDynamicEntityTypeConfig,
    hasType,
    isServerType,
    isDynamicType,
    refresh: fetchOntologies,
  }
}
