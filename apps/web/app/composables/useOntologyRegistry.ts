import type { DataAdapter } from '~/lib/data-adapter'
import { useSSESubscribe } from './useTrellisSSE'
import { useTrellisConfig } from './useTrellisConfig'

/**
 * Dynamic Ontology Registry
 *
 * Dual transport (ADR-002 TRL-20b):
 * - **Live** (kernel-bridge / sidecar): reads ontologies from `useTrellisConfig` AppSchema subscribe
 * - **Fallback**: GET /api/graph/ontologies + SSE refetch
 *
 * Server ontologies with UI metadata are the PRIMARY source. Static entityRegistry.ts
 * is a fallback for types not yet served by the API or during initial load.
 */

import type { EntityType, EntityTypeConfig } from '~/types/entity'
import { getEntityTypeConfig, getAllEntityTypeIds } from '~/config/entityRegistry'
import {
  ONTOLOGY_SYSTEM_SCHEMA_IDS,
  schemasRecordToServerTypes,
  schemaToEntityTypeConfig,
  type DynamicEntityTypeConfig,
  type OntologySchemaDefinition,
  type OntologySchemaField,
  type OntologyTier,
} from '~/lib/ontology-registry/schemas-to-server-types'

export type { DynamicEntityTypeConfig, OntologyTier }

type SchemaDefinition = OntologySchemaDefinition

// ── Composable state (module-level singletons) ─────────────────────────

const _serverTypes = ref<Map<string, DynamicEntityTypeConfig>>(new Map())
const _loading = ref(false)
const _error = ref<string | null>(null)
const _initialized = ref(false)

/**
 * Fetch core + system ontologies from TQL API (fallback path).
 */
async function fetchOntologiesFromTql(): Promise<Map<string, DynamicEntityTypeConfig>> {
  const data = await $fetch<{ ontologies: Record<string, SchemaDefinition> }>('/api/graph/ontologies')
  return schemasRecordToServerTypes(data.ontologies || {})
}

/**
 * Fetch user ontologies from the DataAdapter (InstantDB settings).
 * User ontologies are stored as settings with key prefix 'ontology:'.
 */
async function fetchUserOntologiesFromAdapter(adapter: DataAdapter): Promise<Map<string, DynamicEntityTypeConfig>> {
  const map = new Map<string, DynamicEntityTypeConfig>()

  try {
    const result = await adapter.queryOnce({
      settings: {
        $: {
          where: {
            entityType: 'ontology',
          },
        },
      },
    })

    const settings = (result.data as any)?.settings || []
    for (const setting of settings) {
      const schema = setting.value as SchemaDefinition | null
      if (!schema || !schema['@id'] || !schema.fields) continue
      if (ONTOLOGY_SYSTEM_SCHEMA_IDS.has(schema['@id'])) continue

      // Ensure user ontologies have tier 'user'
      schema.tier = schema.tier || 'user'
      const config = schemaToEntityTypeConfig(schema)
      map.set(config.type, config)
    }
  } catch (err) {
    console.error('[useOntologyRegistry] Failed to fetch user ontologies from adapter:', err)
  }

  return map
}

async function fetchOntologies(): Promise<void> {
  _loading.value = true
  _error.value = null

  try {
    // Core + system ontologies always come from TQL
    const tqlMap = await fetchOntologiesFromTql()

    // If ontologyBackend is 'adapter', also fetch user ontologies from the adapter
    let adapterMap = new Map<string, DynamicEntityTypeConfig>()
    if (_adapterRef && _adapterRef.ontologyBackend === 'adapter') {
      adapterMap = await fetchUserOntologiesFromAdapter(_adapterRef)
    }

    // Merge: adapter user ontologies overlay TQL ontologies
    const merged = new Map([...tqlMap, ...adapterMap])
    _serverTypes.value = merged
  } catch (err: any) {
    _error.value = err.message || 'Failed to fetch ontologies'
  } finally {
    _loading.value = false
    _initialized.value = true
  }
}

// Reference to the adapter for ontology fetching
let _adapterRef: DataAdapter | null = null
let _usingLiveConfig = false
let _lastLiveOntologies: Record<string, OntologySchemaDefinition> = {}

let _sseCleanup: (() => void) | null = null
let _adapterOntologyUnsub: (() => void) | null = null

function unsubscribeFromOntologySSE(): void {
  if (_sseCleanup) {
    _sseCleanup()
    _sseCleanup = null
  }
}

function subscribeToSSE(): void {
  if (!import.meta.client) return
  if (_sseCleanup) return // Already subscribed

  _sseCleanup = useSSESubscribe('mutation', (event) => {
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
}

/**
 * Subscribe to adapter ontology changes (for cloud mode).
 * When a user ontology is created/updated/deleted in InstantDB,
 * re-fetch and merge ontologies.
 */
function subscribeToAdapterOntologies(adapter: DataAdapter): void {
  if (!import.meta.client) return
  if (_adapterOntologyUnsub) return

  _adapterOntologyUnsub = adapter.subscribeQuery(
    {
      settings: {
        $: {
          where: {
            entityType: 'ontology',
          },
        },
      },
    },
    () => {
      if (_usingLiveConfig) {
        void (async () => {
          const tqlMap = schemasRecordToServerTypes(_lastLiveOntologies)
          const adapterMap = await fetchUserOntologiesFromAdapter(adapter)
          _serverTypes.value = new Map([...tqlMap, ...adapterMap])
        })()
        return
      }
      fetchOntologies()
    },
  )
}

export function useOntologyRegistry() {
  const appConfig = useTrellisConfig()
  const adapter = useDataAdapter()
  _adapterRef = adapter

  if (import.meta.client) {
    watchEffect(async () => {
      const live = appConfig.transportMode.value === 'live'
      _usingLiveConfig = live

      if (live) {
        unsubscribeFromOntologySSE()
        _loading.value = appConfig.loading.value
        _error.value = appConfig.error.value
        _lastLiveOntologies = appConfig.ontologies.value as Record<string, OntologySchemaDefinition>

        if (!appConfig.loading.value) {
          const tqlMap = schemasRecordToServerTypes(_lastLiveOntologies)
          let adapterMap = new Map<string, DynamicEntityTypeConfig>()
          if (adapter.ontologyBackend === 'adapter') {
            adapterMap = await fetchUserOntologiesFromAdapter(adapter)
          }
          _serverTypes.value = new Map([...tqlMap, ...adapterMap])
          _initialized.value = true
        }
        if (adapter.ontologyBackend === 'adapter' && !_adapterOntologyUnsub) {
          subscribeToAdapterOntologies(adapter)
        }
        return
      }

      if (!_initialized.value && !_loading.value) {
        void fetchOntologies()
      }
      if (!_sseCleanup) {
        subscribeToSSE()
      }
      if (adapter.ontologyBackend === 'adapter' && !_adapterOntologyUnsub) {
        subscribeToAdapterOntologies(adapter)
      }
    })
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
    return Array.from(_serverTypes.value.values()).filter((t) => !t.tier || t.tier === 'user')
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
   * Wait until a newly-created ontology becomes visible in the server-type
   * registry (populated by SSE + refetch). Used right after `POST /api/graph/ontology`
   * so that subsequent entity creates don't race the schema installation.
   *
   * Resolves with `true` once the type appears, or `false` on timeout.
   */
  function waitForType(type: string, timeoutMs = 3000): Promise<boolean> {
    if (_serverTypes.value.has(type)) return Promise.resolve(true)

    return new Promise((resolve) => {
      let stopWatch: (() => void) | null = null
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      const done = (ok: boolean) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        if (stopWatch) {
          stopWatch()
          stopWatch = null
        }
        resolve(ok)
      }

      // Resolve as soon as the map contains the slug.
      stopWatch = watch(
        _serverTypes,
        (map) => {
          if (map.has(type)) done(true)
        },
        { deep: true, flush: 'post' },
      )

      timeoutId = setTimeout(() => done(false), timeoutMs)
    })
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

  /**
   * Auto-generate browse page configuration from a type's ontology schema.
   * Returns sort options, search fields, and table columns
   * derived from the schema's field definitions.
   * Synchronous — safe for use in reactive computeds.
   */
  function getBrowseConfig(type: string) {
    const config = _serverTypes.value.get(type)
    if (!config || !config.fields?.length) {
      return {
        sortOptions: [
          { value: 'title', label: 'Title' },
          { value: 'createdAt', label: 'Created' },
        ] as { value: string; label: string }[],
        searchFields: ['title', 'description'],
        tableColumns: [] as {
          key: string
          label: string
          valueType: string
          align: 'left' | 'right'
          isTitle: boolean
          sortable: boolean
        }[],
      }
    }

    // Inline lightweight derivation (no async import)
    const SORTABLE = new Set(['title', 'number', 'date', 'select', 'status'])
    const SEARCHABLE = new Set(['title', 'rich_text', 'url', 'email', 'phone_number', 'select'])

    const sortOptions = config.fields
      .filter((f) => SORTABLE.has(f.valueType))
      .map((f) => ({ value: f.name, label: _titleCase(f.name) }))
    if (!sortOptions.some((o) => o.value === 'createdAt')) {
      sortOptions.push({ value: 'createdAt', label: 'Created' })
    }

    const baseSearchFields = config.searchFields?.length
      ? [...config.searchFields]
      : config.fields.filter((f) => SEARCHABLE.has(f.valueType)).map((f) => f.name)
    if (!baseSearchFields.includes('description')) baseSearchFields.push('description')
    const searchFields = baseSearchFields

    const tableColumns = config.fields
      .filter((f) => f.valueType !== 'rich_text' && f.valueType !== 'files')
      .map((f) => ({
        key: f.name,
        label: _titleCase(f.name),
        valueType: f.valueType,
        align: (f.valueType === 'number' ? 'right' : 'left') as 'left' | 'right',
        isTitle: f.valueType === 'title',
        sortable: SORTABLE.has(f.valueType),
      }))

    return { sortOptions, searchFields, tableColumns }
  }

  function _titleCase(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase())
      .trim()
  }

  /**
   * Add a field to an existing ontology schema (user-tier only).
   * Fetches the current schema, appends the field, and PUTs the update.
   * SSE propagation handles UI refresh automatically.
   */
  async function addFieldToType(
    schemaId: string,
    field: { name: string; valueType: string; required?: boolean; description?: string; selectOptions?: any[] },
  ): Promise<void> {
    // Safety: only allow mutation of user-tier ontologies
    const config = Array.from(_serverTypes.value.values()).find((t) => t.schemaId === schemaId)
    if (config && config.tier && config.tier !== 'user') {
      throw new Error(`Cannot add fields to ${config.tier}-tier ontology "${schemaId}"`)
    }

    // Fetch current schema
    const { ontology: currentSchema } = await $fetch<{ ontology: SchemaDefinition }>(
      `/api/graph/ontology/${encodeURIComponent(schemaId)}`,
    )

    // Check for duplicate field name
    if (currentSchema.fields.some((f) => f.name === field.name)) {
      throw new Error(`Field "${field.name}" already exists on "${schemaId}"`)
    }

    // Append the new field
    const updatedFields = [...currentSchema.fields, field]

    // PUT the updated schema
    await $fetch(`/api/graph/ontology/${encodeURIComponent(schemaId)}`, {
      method: 'PUT',
      body: {
        schema: {
          ...currentSchema,
          fields: updatedFields,
        },
        agentId: 'browser',
      },
    })

    // SSE event will trigger fetchOntologies() automatically
  }

  /**
   * Remove a field from an existing ontology schema (user-tier only).
   */
  async function removeFieldFromType(schemaId: string, fieldName: string): Promise<void> {
    const config = Array.from(_serverTypes.value.values()).find((t) => t.schemaId === schemaId)
    if (config && config.tier && config.tier !== 'user') {
      throw new Error(`Cannot remove fields from ${config.tier}-tier ontology "${schemaId}"`)
    }

    const { ontology: currentSchema } = await $fetch<{ ontology: SchemaDefinition }>(
      `/api/graph/ontology/${encodeURIComponent(schemaId)}`,
    )

    const updatedFields = currentSchema.fields.filter((f) => f.name !== fieldName)
    if (updatedFields.length === currentSchema.fields.length) {
      throw new Error(`Field "${fieldName}" not found on "${schemaId}"`)
    }

    await $fetch(`/api/graph/ontology/${encodeURIComponent(schemaId)}`, {
      method: 'PUT',
      body: {
        schema: {
          ...currentSchema,
          fields: updatedFields,
        },
        agentId: 'browser',
      },
    })
  }

  /** Guard that mutation of a given schema is allowed (user-tier only). */
  function assertMutable(schemaId: string): void {
    const config = Array.from(_serverTypes.value.values()).find((t) => t.schemaId === schemaId)
    if (config && config.tier && config.tier !== 'user') {
      throw new Error(`Cannot modify ${config.tier}-tier ontology "${schemaId}"`)
    }
  }

  /** Fetch the current raw SchemaDefinition from the server. */
  async function _fetchSchema(schemaId: string): Promise<SchemaDefinition> {
    const { ontology } = await $fetch<{ ontology: SchemaDefinition }>(
      `/api/graph/ontology/${encodeURIComponent(schemaId)}`,
    )
    return ontology
  }

  /** PUT the updated schema back to the server. */
  async function _putSchema(schemaId: string, schema: SchemaDefinition): Promise<void> {
    await $fetch(`/api/graph/ontology/${encodeURIComponent(schemaId)}`, {
      method: 'PUT',
      body: { schema, agentId: 'browser' },
    })
  }

  /**
   * Update a single field's properties in an existing ontology schema.
   * The field to update is identified by its original name (`originalName`);
   * the patch may include a new `name` (rename), `valueType`, `required`,
   * `description`, or `selectOptions`.
   */
  async function updateFieldOnType(
    schemaId: string,
    originalName: string,
    patch: Partial<
      Pick<
        SchemaField,
        'name' | 'valueType' | 'required' | 'description' | 'selectOptions' | 'relation' | 'defaultValue' | 'icon'
      >
    >,
  ): Promise<void> {
    assertMutable(schemaId)
    const currentSchema = await _fetchSchema(schemaId)

    const index = currentSchema.fields.findIndex((f) => f.name === originalName)
    if (index === -1) throw new Error(`Field "${originalName}" not found on "${schemaId}"`)

    // Prevent rename collisions with another existing field.
    if (patch.name && patch.name !== originalName) {
      if (currentSchema.fields.some((f, i) => i !== index && f.name === patch.name)) {
        throw new Error(`Field "${patch.name}" already exists on "${schemaId}"`)
      }
    }

    const updatedFields = [...currentSchema.fields]
    updatedFields[index] = { ...updatedFields[index]!, ...patch } as SchemaField

    await _putSchema(schemaId, { ...currentSchema, fields: updatedFields })
  }

  /**
   * Replace the entire ordered field list for a schema. Used when the editor
   * has reordered or bulk-edited fields client-side and needs to flush the
   * final state in one request.
   */
  async function replaceFieldsOnType(schemaId: string, fields: SchemaField[]): Promise<void> {
    assertMutable(schemaId)
    const currentSchema = await _fetchSchema(schemaId)
    await _putSchema(schemaId, { ...currentSchema, fields })
  }

  /**
   * Update top-level schema metadata (label, icon, description, color,
   * entityClass, projections, searchFields, etc.). Does not touch fields.
   */
  async function updateTypeMeta(
    schemaId: string,
    patch: Partial<
      Pick<
        SchemaDefinition,
        | 'label'
        | 'labelPlural'
        | 'icon'
        | 'color'
        | 'entityClass'
        | 'projections'
        | 'defaultProjection'
        | 'searchFields'
        | 'defaultSortField'
      >
    > & { description?: string },
  ): Promise<void> {
    assertMutable(schemaId)
    const currentSchema = await _fetchSchema(schemaId)
    await _putSchema(schemaId, { ...currentSchema, ...patch })
  }

  /**
   * Delete an ontology schema entirely (user-tier only).
   * Records of this type are NOT deleted — callers are responsible for
   * surfacing that consequence in the UI.
   */
  async function deleteType(schemaId: string): Promise<void> {
    assertMutable(schemaId)
    await $fetch(`/api/graph/ontology/${encodeURIComponent(schemaId)}`, {
      method: 'DELETE',
    })
  }

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
    getBrowseConfig,
    hasType,
    waitForType,
    isServerType,
    isDynamicType,
    addFieldToType,
    removeFieldFromType,
    updateFieldOnType,
    replaceFieldsOnType,
    updateTypeMeta,
    deleteType,
    refresh: fetchOntologies,
  }
}
