/**
 * useAppConfig — Server-Sourced Application Configuration
 *
 * Replaces the static `app-config.jsonld` + `appConfig.ts` with a composable
 * that fetches configuration from `GET /api/graph/config` at boot and stays
 * in sync via SSE.
 *
 * Provides reactive access to:
 * - routes: Server-defined route tree
 * - ontologies: Schema definitions with UI metadata
 * - projections: Named projection definitions
 * - app: Application-level metadata (title, version, devPort)
 *
 * Also provides helper functions equivalent to what appConfig.ts exported:
 * - buildPageConfigFromRoute()
 * - buildRouteConfigTree()
 * - etc.
 */

import type { RouteConfig } from '~/config/routes'
import type { DatabaseField, DatabaseSchema } from '~/types/database'

// ── Types ──────────────────────────────────────────────────────────────

interface ServerSchemaField {
  name: string
  valueType: string
  required?: boolean
  description?: string
  selectOptions?: any[]
  icon?: string
  group?: string
  display?: string
  editable?: boolean
  computed?: boolean
  modes?: string[]
  defaultValue?: any
}

interface ServerSchemaDefinition {
  '@id': string
  '@type': string
  version: string
  fields: ServerSchemaField[]
  entityClass?: string
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

interface ServerRouteDefinition {
  '@id': string
  '@type': string
  routePath: string
  label: string
  icon?: string
  tint?: string
  order?: number
  inRail?: boolean
  railPosition?: 'primary' | 'secondary'
  collapseSidebar?: boolean
  requiresAuth?: boolean
  inCommandPalette?: boolean
  searchKeywords?: string[]
  permissions?: Record<string, any>
  meta?: {
    title?: string
    description?: string
    subtitle?: string
    showBackButton?: boolean
    fullWidth?: boolean
  }
  sidebarSections?: any[]
  children?: any[]
  editable?: boolean
  tabs?: any[]
  entityType?: string
  pageVariant?: string
  projectionTypes?: string[]
}

interface ServerProjectionDefinition {
  '@id': string
  '@type': string
  name: string
  type: string
  query?: string
  icon?: string
  component?: string
  order?: number
  status?: string
  requirements?: { schema?: { fieldTypes?: string[] } }
  config?: Record<string, any>
}

interface ServerAppDefinition {
  '@id': string
  '@type': string
  title?: string
  description?: string
  version?: string
  devPort?: number
}

interface ServerConfig {
  app: ServerAppDefinition | null
  routes: Record<string, ServerRouteDefinition>
  projections: Record<string, ServerProjectionDefinition>
  ontologies: Record<string, ServerSchemaDefinition>
}

export interface DerivedPageConfig {
  routeId: string
  title: string
  subtitle?: string
  description?: string
  icon?: string
  iconClass?: string
  entityTypeId?: string
  projectionTypes: string[]
  pageVariant: 'browse' | 'detail' | 'form' | 'dashboard' | 'custom'
  schema: DatabaseSchema | null
}

// ── Module-level state ─────────────────────────────────────────────────

const _config = ref<ServerConfig | null>(null)
const _loading = ref(false)
const _error = ref<string | null>(null)
const _initialized = ref(false)

// ── Fetcher ────────────────────────────────────────────────────────────

async function fetchConfig(): Promise<void> {
  _loading.value = true
  _error.value = null

  try {
    const data = await $fetch<ServerConfig>('/api/graph/config')
    _config.value = data
  } catch (err: any) {
    _error.value = err.message || 'Failed to fetch app config'
    console.error('[useAppConfig] Failed to fetch:', err)
  } finally {
    _loading.value = false
    _initialized.value = true
  }
}

// ── SSE subscription ───────────────────────────────────────────────────

let _sseCleanup: (() => void) | null = null

function subscribeToSSE(): void {
  if (!import.meta.client) return
  if (_sseCleanup) return

  const eventSource = new EventSource('/api/graph/events')

  eventSource.addEventListener('mutation', (event) => {
    try {
      const data = JSON.parse(event.data)
      // Re-fetch config on ontology or route mutations
      if (
        data.action?.includes('Ontology') ||
        data.type === 'ontology' ||
        data.action?.includes('Route') ||
        data.type === 'route'
      ) {
        fetchConfig()
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

// ── Conversion helpers ─────────────────────────────────────────────────

/**
 * Convert a server RouteDefinition into a client RouteConfig.
 */
function serverRouteToRouteConfig(route: ServerRouteDefinition): RouteConfig {
  const children = Array.isArray(route.children)
    ? route.children.map((child: any) => serverRouteToRouteConfig(child))
    : undefined

  // Convert sidebar section items from server shape (routePath) to client shape (path)
  const sidebarSections = Array.isArray(route.sidebarSections)
    ? route.sidebarSections.map((section: any) => ({
        ...section,
        items: section.items === 'pinned' || section.items === 'unpinned'
          ? section.items
          : Array.isArray(section.items)
            ? section.items.map((item: any) => ({
                path: item.routePath || item.path,
                label: item.label,
                icon: item.icon || 'lucide:circle',
                tint: item.tint,
                meta: item.meta,
                order: item.order,
              }))
            : section.items,
      }))
    : undefined

  return {
    path: route.routePath,
    label: route.label,
    icon: route.icon || 'lucide:circle',
    tint: route.tint,
    meta: route.meta,
    inRail: route.inRail,
    collapseSidebar: route.collapseSidebar,
    railPosition: route.railPosition,
    inCommandPalette: route.inCommandPalette,
    searchKeywords: route.searchKeywords,
    children,
    requiresAuth: route.requiresAuth,
    permissions: route.permissions as any,
    order: route.order,
    editable: route.editable,
    tabs: route.tabs,
    sidebarSections,
  }
}

/**
 * Build a DatabaseSchema from a server ontology definition.
 */
function ontologyToSchema(ontology: ServerSchemaDefinition): DatabaseSchema {
  const now = Date.now()
  const fields: DatabaseField[] = ontology.fields.map((field, index) => ({
    id: field.name,
    name: field.name,
    type: (field.valueType as DatabaseField['type']) ?? 'text',
    order: index,
    required: field.required ?? false,
    options: field.selectOptions?.map((opt: any) =>
      typeof opt === 'string' ? { value: opt, color: 'gray' } : { value: opt.value ?? opt, color: opt.color ?? 'gray' },
    ),
  }))

  return {
    id: ontology['@id'],
    collectionId: ontology['@id'],
    fields,
    views: [],
    createdAt: now,
    updatedAt: now,
  }
}

// ── Composable ─────────────────────────────────────────────────────────

export function useTrellisConfig() {
  // Initialize on first use (client-side only)
  if (import.meta.client && !_initialized.value && !_loading.value) {
    fetchConfig()
    subscribeToSSE()
  }

  // ── Computed views ──────────────────────────────────────────────────

  const app = computed(() => _config.value?.app ?? null)
  const routes = computed(() => _config.value?.routes ?? {})
  const projections = computed(() => _config.value?.projections ?? {})
  const ontologies = computed(() => _config.value?.ontologies ?? {})

  /**
   * Build RouteConfig[] tree from server route definitions.
   * This replaces buildRouteConfigTree() from appConfig.ts.
   */
  const routeConfigTree = computed<RouteConfig[]>(() => {
    const routeMap = routes.value
    return Object.values(routeMap)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .map(serverRouteToRouteConfig)
  })

  /**
   * Get an ontology by its schema ID (e.g., 'trellis:schema/task')
   */
  function getOntology(schemaId: string): ServerSchemaDefinition | null {
    return ontologies.value[schemaId] ?? null
  }

  /**
   * Get an ontology by entity type slug (e.g., 'task' → 'trellis:schema/task')
   */
  function getOntologyByType(type: string): ServerSchemaDefinition | null {
    return ontologies.value[`trellis:schema/${type}`] ?? null
  }

  /**
   * Get a route definition by its ID (e.g., 'route:workspace')
   */
  function getRoute(routeId: string): ServerRouteDefinition | null {
    return routes.value[routeId] ?? null
  }

  /**
   * Find a route definition by path
   */
  function getRouteByPath(path: string): ServerRouteDefinition | null {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    // Search top-level routes
    for (const route of Object.values(routes.value)) {
      if (route.routePath === normalizedPath) return route

      // Search children
      if (Array.isArray(route.children)) {
        for (const child of route.children) {
          if (child.routePath === normalizedPath) return child
        }
      }
    }

    return null
  }

  /**
   * Build a DatabaseSchema from an ontology type slug.
   */
  function buildSchemaFromType(type: string): DatabaseSchema | null {
    const ontology = getOntologyByType(type)
    if (!ontology) return null
    return ontologyToSchema(ontology)
  }

  /**
   * Build a DerivedPageConfig from a route path.
   * This replaces buildPageConfigFromRoute() from appConfig.ts.
   */
  function buildPageConfigFromRoute(routePath: string): DerivedPageConfig | null {
    const route = getRouteByPath(routePath)
    if (!route) return null

    const entityType = route.entityType
    const ontology = entityType ? getOntologyByType(entityType) : null
    const schema = ontology ? ontologyToSchema(ontology) : null

    // Get projection types: prefer route-level, fall back to ontology-level
    let projectionTypes = route.projectionTypes ?? []
    if (!projectionTypes.length && ontology?.projections) {
      projectionTypes = ontology.projections
    }

    return {
      routeId: route['@id'] ?? routePath,
      title: route.meta?.title ?? route.label ?? 'Untitled',
      subtitle: route.meta?.subtitle,
      description: route.meta?.description,
      icon: route.icon,
      iconClass: undefined,
      entityTypeId: entityType,
      projectionTypes,
      pageVariant: (route.pageVariant as DerivedPageConfig['pageVariant']) ?? 'browse',
      schema,
    }
  }

  /**
   * Build a DerivedPageConfig from an entity type slug.
   * Maps slugs like "tasks" → "task" and looks up the ontology.
   * This replaces buildPageConfigFromSlug() from appConfig.ts.
   */
  function buildPageConfigFromSlug(slug: string): DerivedPageConfig | null {
    // Normalize: plural → singular (e.g., "tasks" → "task")
    const type = slug.endsWith('s') ? slug.slice(0, -1) : slug

    const ontology = getOntologyByType(type)
    if (!ontology) return null

    const schema = ontologyToSchema(ontology)
    const projectionTypes = ontology.projections ?? ['table', 'list', 'grid', 'kanban', 'calendar']

    return {
      routeId: `route:${slug}`,
      title: ontology.labelPlural ?? ontology.label ?? slug,
      subtitle: undefined,
      description: undefined,
      icon: ontology.icon,
      iconClass: undefined,
      entityTypeId: type,
      projectionTypes,
      pageVariant: 'browse',
      schema,
    }
  }

  /**
   * Get the dev port from app metadata.
   */
  function getDevPort(): number {
    return app.value?.devPort ?? 4141
  }

  return {
    // Raw reactive state
    config: computed(() => _config.value),
    app,
    routes,
    projections,
    ontologies,
    loading: computed(() => _loading.value),
    error: computed(() => _error.value),
    initialized: computed(() => _initialized.value),

    // Derived views
    routeConfigTree,

    // Lookup helpers
    getOntology,
    getOntologyByType,
    getRoute,
    getRouteByPath,

    // Page config builders (replaces appConfig.ts exports)
    buildSchemaFromType,
    buildPageConfigFromRoute,
    buildPageConfigFromSlug,
    getDevPort,

    // Actions
    refresh: fetchConfig,
  }
}
