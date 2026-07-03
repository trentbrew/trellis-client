/**
 * useAppConfig — Server-Sourced Application Configuration
 *
 * Dual transport (ADR-002 P3):
 * - **Live** (sidecar + imported config): trellis/vue `useEntities` subscriptions
 * - **Fallback** (embedded kernel): GET /api/graph/config + SSE refetch (P1)
 */

import { useSSESubscribe } from './useTrellisSSE'
import { shouldRefetchAppConfigFromSSE } from '~/lib/app-config-sse'
import { useTrellisConfigLive } from './useTrellisConfigLive'
import { useTrellisDb } from './useTrellisSidecar'

import type { RouteConfig } from '~/config/routes'
import type { DatabaseField, DatabaseSchema } from '~/types/database'
import { suggestCollectionViews } from '~/lib/trellis-projection-registry'
import type {
  DerivedPageConfig,
  ServerConfig,
  ServerRouteDefinition,
  ServerSchemaDefinition,
} from '~/lib/app-config/types'

export type { DerivedPageConfig, ServerConfig, ServerRouteDefinition, ServerSchemaDefinition }

// ── Module-level fallback state (P1 path) ─────────────────────────────

const _config = ref<ServerConfig | null>(null)
const _loading = ref(false)
const _error = ref<string | null>(null)
const _initialized = ref(false)

async function fetchConfig(): Promise<void> {
  _loading.value = true
  _error.value = null

  try {
    const data = await $fetch<ServerConfig>('/api/graph/config')
    _config.value = data
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch app config'
    _error.value = message
    console.error('[useAppConfig] Failed to fetch:', err)
  } finally {
    _loading.value = false
    _initialized.value = true
  }
}

let _sseCleanup: (() => void) | null = null

function subscribeToSSE(): void {
  if (!import.meta.client) return
  if (_sseCleanup) return

  _sseCleanup = useSSESubscribe('mutation', (event) => {
    try {
      const data = JSON.parse(event.data)
      if (shouldRefetchAppConfigFromSSE(data)) {
        fetchConfig()
      }
    } catch {
      // Ignore malformed events
    }
  })
}

/** Tear down kernel SSE refetch when trellis/vue live path takes over (TRL-15 harden). */
function unsubscribeFromSSE(): void {
  if (_sseCleanup) {
    _sseCleanup()
    _sseCleanup = null
  }
}

function serverRouteToRouteConfig(route: ServerRouteDefinition): RouteConfig {
  const children = Array.isArray(route.children)
    ? route.children.map((child: any) => serverRouteToRouteConfig(child))
    : undefined

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
    permissions: route.permissions as RouteConfig['permissions'],
    order: route.order,
    editable: route.editable,
    tabs: route.tabs as RouteConfig['tabs'],
    sidebarSections,
  }
}

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

export function useTrellisConfig() {
  const client = useTrellisDb()
  const live = client ? useTrellisConfigLive(client) : null
  const liveActive = computed(() => live?.active.value ?? false)

  if (import.meta.client) {
    watchEffect(() => {
      if (liveActive.value) {
        _initialized.value = true
        unsubscribeFromSSE()
        return
      }
      if (!_initialized.value && !_loading.value) {
        void fetchConfig()
      }
      if (!_sseCleanup) {
        subscribeToSSE()
      }
    })
  }

  const app = computed(() =>
    liveActive.value ? live!.app.value : (_config.value?.app ?? null))
  const routes = computed(() =>
    liveActive.value ? live!.routes.value : (_config.value?.routes ?? {}))
  const projections = computed(() =>
    liveActive.value ? live!.projections.value : (_config.value?.projections ?? {}))
  const projectionViews = computed(() =>
    liveActive.value ? live!.projectionViews.value : (_config.value?.projectionViews ?? {}))
  const ontologies = computed(() =>
    liveActive.value ? live!.ontologies.value : (_config.value?.ontologies ?? {}))

  const loading = computed(() =>
    liveActive.value ? live!.loading.value : _loading.value)
  const error = computed(() =>
    liveActive.value ? live!.error.value?.message ?? null : _error.value)
  const initialized = computed(() =>
    liveActive.value ? !live!.loading.value : _initialized.value)

  const routeConfigTree = computed<RouteConfig[]>(() => {
    const routeMap = routes.value
    return Object.values(routeMap)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .map(serverRouteToRouteConfig)
  })

  function getOntology(schemaId: string): ServerSchemaDefinition | null {
    return ontologies.value[schemaId] ?? null
  }

  function getOntologyByType(type: string): ServerSchemaDefinition | null {
    return ontologies.value[`trellis:schema/${type}`] ?? null
  }

  function getRoute(routeId: string): ServerRouteDefinition | null {
    return routes.value[routeId] ?? null
  }

  function getRouteByPath(path: string): ServerRouteDefinition | null {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    for (const route of Object.values(routes.value)) {
      if (route.routePath === normalizedPath) return route

      if (Array.isArray(route.children)) {
        for (const child of route.children as ServerRouteDefinition[]) {
          if (child.routePath === normalizedPath) return child
        }
      }
    }

    return null
  }

  function buildSchemaFromType(type: string): DatabaseSchema | null {
    const ontology = getOntologyByType(type)
    if (!ontology) return null
    return ontologyToSchema(ontology)
  }

  function buildPageConfigFromRoute(routePath: string): DerivedPageConfig | null {
    const route = getRouteByPath(routePath)
    if (!route) return null

    const entityType = route.entityType
    const ontology = entityType ? getOntologyByType(entityType) : null
    const schema = ontology ? ontologyToSchema(ontology) : null

    let projectionTypes = route.projectionTypes ?? []
    if (!projectionTypes.length && ontology?.projections) {
      projectionTypes = ontology.projections
    }
    if (!projectionTypes.length && schema) {
      projectionTypes = suggestCollectionViews(schema)
        .filter((v) => v.supported)
        .map((v) => v.mode)
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

  function buildPageConfigFromSlug(slug: string): DerivedPageConfig | null {
    const type = slug.endsWith('s') ? slug.slice(0, -1) : slug

    const ontology = getOntologyByType(type)
    if (!ontology) return null

    const schema = ontologyToSchema(ontology)
    const projectionTypes =
      ontology.projections ??
      suggestCollectionViews(schema)
        .filter((v) => v.supported)
        .map((v) => v.mode)

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

  function getDevPort(): number {
    const runtimePort = Number(useRuntimeConfig().public.trellisPort)
    return app.value?.devPort ?? (Number.isFinite(runtimePort) ? runtimePort : 1414)
  }

  return {
    config: computed(() => (liveActive.value ? live!.config.value : _config.value)),
    app,
    routes,
    projections,
    projectionViews,
    ontologies,
    loading,
    error,
    initialized,
    transportMode: computed(() => (liveActive.value ? 'live' as const : 'fallback' as const)),

    routeConfigTree,

    getOntology,
    getOntologyByType,
    getRoute,
    getRouteByPath,

    buildSchemaFromType,
    buildPageConfigFromRoute,
    buildPageConfigFromSlug,
    getDevPort,

    refresh: fetchConfig,
  }
}
