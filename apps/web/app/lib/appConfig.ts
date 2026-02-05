import type { RouteConfig } from '../config/routes'
import type { ThemePreset, ThemePresets } from '../types/theme'
import type { DatabaseField, DatabaseSchema } from '../types/database'
import appConfigRaw from '../config/app-config.jsonld?raw'

export interface AppConfigFieldNode extends AppConfigNode {
  label?: string
  valueType?: DatabaseField['type']
  icon?: string
  inputComponent?: string
  displayComponent?: string
  options?: Array<{ value: string; label: string; color?: string }>
}

export interface AppConfigTypeNode extends AppConfigNode {
  label?: string
  description?: string
  icon?: string
  component?: string
  projectionTypes?: string[]
  fields?: Array<{ '@id': string } | string>
  'rdfs:subClassOf'?: { '@id': string }
}

export type AppConfigNode = Record<string, any> & {
  '@id'?: string
  '@type'?: string | string[]
}

export interface AppConfigDocument {
  '@context': Record<string, any>
  '@graph': AppConfigNode[]
}

export interface ProjectionSchemaRequirementsConfig {
  fieldTypes?: Array<DatabaseField['type']>
}

export interface ProjectionRequirementsConfig {
  schema?: ProjectionSchemaRequirementsConfig
}

export interface AppConfigProjectionNode extends AppConfigNode {
  label?: string
  projectionType?: string
  icon?: string
  component?: string
  status?: string
  order?: number
  requirements?: ProjectionRequirementsConfig
}

const parseAppConfig = (): AppConfigDocument => {
  try {
    const parsed = JSON.parse(appConfigRaw) as AppConfigDocument
    const graph = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : []

    return {
      '@context': parsed && typeof parsed['@context'] === 'object' ? (parsed['@context'] as Record<string, any>) : {},
      '@graph': graph,
    }
  } catch (error) {
    console.error('Failed to parse app-config.jsonld', error)
    return { '@context': {}, '@graph': [] }
  }
}

export const appConfig = parseAppConfig()

const graph = appConfig['@graph'] ?? []
const nodeById = new Map<string, AppConfigNode>()
const nodesByType = new Map<string, AppConfigNode[]>()

const normalizeTypes = (raw: AppConfigNode['@type']): string[] => {
  if (Array.isArray(raw)) return raw.filter((t) => typeof t === 'string') as string[]
  if (typeof raw === 'string') return [raw]
  return []
}

const registerNode = (node: AppConfigNode) => {
  if (!node || typeof node !== 'object') return
  const id = node['@id']
  if (typeof id === 'string') {
    nodeById.set(id, node)
  }

  normalizeTypes(node['@type']).forEach((type) => {
    const list = nodesByType.get(type) ?? []
    list.push(node)
    nodesByType.set(type, list)
  })
}

graph.forEach(registerNode)

export const getAppConfigNodeById = (id: string): AppConfigNode | null => {
  return nodeById.get(id) ?? null
}

export const getAppConfigNodesByType = (type: string): AppConfigNode[] => {
  return nodesByType.get(type) ?? []
}

const getRegistryMappings = (type: string): Record<string, string> => {
  const registry = getAppConfigNodesByType(type)[0]
  const mappings = registry?.mappings

  if (mappings && typeof mappings === 'object' && !Array.isArray(mappings)) {
    return mappings as Record<string, string>
  }

  return {}
}

export const getComponentRegistry = (): Record<string, string> => getRegistryMappings('ui:ComponentRegistry')
export const getIconRegistry = (): Record<string, string> => getRegistryMappings('ui:IconRegistry')

const resolveRegistryValue = (value: unknown, mappings: Record<string, string>): string | null => {
  if (typeof value !== 'string' || !value) return null
  return mappings[value] ?? value
}

export const resolveComponentPath = (value?: string | null): string | null => {
  return resolveRegistryValue(value ?? null, getComponentRegistry())
}

export const resolveIcon = (value?: string | null): string | null => {
  return resolveRegistryValue(value ?? null, getIconRegistry())
}

export const getProjectionNodes = (): AppConfigProjectionNode[] =>
  getAppConfigNodesByType('ui:Projection') as AppConfigProjectionNode[]

export const getProjectionByType = (projectionType: string): AppConfigProjectionNode | null => {
  return getProjectionNodes().find((node) => node.projectionType === projectionType) ?? null
}

export const resolveProjectionComponent = (projectionType: string): string | null => {
  const projection = getProjectionByType(projectionType)
  return resolveComponentPath(projection?.component ?? null)
}

export const resolveProjectionIcon = (projectionType: string): string | null => {
  const projection = getProjectionByType(projectionType)
  return resolveIcon(projection?.icon ?? null)
}

export const getTypeNodes = (): AppConfigNode[] => getAppConfigNodesByType('rdfs:Class')

export const resolveTypeComponent = (typeId: string): string | null => {
  const typeNode = getAppConfigNodeById(typeId)
  return resolveComponentPath(typeNode?.component ?? null)
}

export const resolveTypeIcon = (typeId: string): string | null => {
  const typeNode = getAppConfigNodeById(typeId)
  return resolveIcon(typeNode?.icon ?? null)
}

export const getFieldNodes = (): AppConfigNode[] => getAppConfigNodesByType('app:Field')

export const resolveFieldIcon = (fieldId: string): string | null => {
  const fieldNode = getAppConfigNodeById(fieldId)
  return resolveIcon(fieldNode?.icon ?? null)
}

const resolveIdRef = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const maybeId = (value as AppConfigNode)['@id']
    if (typeof maybeId === 'string') return maybeId
  }
  return null
}

const resolveRouteRef = (value: unknown): AppConfigNode | null => {
  const resolvedId = resolveIdRef(value)
  if (resolvedId)
    return getAppConfigNodeById(resolvedId) ?? (typeof value === 'object' ? (value as AppConfigNode) : null)
  return typeof value === 'object' ? (value as AppConfigNode) : null
}

export const buildRouteConfigFromNode = (node: AppConfigNode): RouteConfig => {
  const childNodes = Array.isArray(node.children) ? node.children.map(resolveRouteRef).filter(Boolean) : []
  const children = childNodes.length ? childNodes.map((child) => buildRouteConfigFromNode(child!)) : undefined

  return {
    path: String(node.routePath ?? node.path ?? ''),
    label: String(node.label ?? node.title ?? ''),
    icon: resolveIcon(node.icon ?? 'lucide:circle') ?? 'lucide:circle',
    tint: typeof node.tint === 'string' ? node.tint : undefined,
    badge: node.badge,
    meta: node.meta,
    inRail: typeof node.inRail === 'boolean' ? node.inRail : undefined,
    collapseSidebar: typeof node.collapseSidebar === 'boolean' ? node.collapseSidebar : undefined,
    railPosition: node.railPosition,
    inCommandPalette: typeof node.inCommandPalette === 'boolean' ? node.inCommandPalette : undefined,
    searchKeywords: Array.isArray(node.searchKeywords) ? node.searchKeywords : undefined,
    children,
    requiresAuth: typeof node.requiresAuth === 'boolean' ? node.requiresAuth : undefined,
    permissions: node.permissions,
    order: typeof node.order === 'number' ? node.order : undefined,
    editable: typeof node.editable === 'boolean' ? node.editable : undefined,
    tabs: Array.isArray(node.tabs) ? node.tabs : undefined,
    sidebarSections: Array.isArray(node.sidebarSections) ? node.sidebarSections : undefined,
    jsonLd: node.jsonLd,
  }
}

export const getRouteNodes = (): AppConfigNode[] => getAppConfigNodesByType('app:Route')

export const buildRouteConfigTree = (): RouteConfig[] => {
  const routeNodes = getRouteNodes()
  const childIds = new Set<string>()

  routeNodes.forEach((node) => {
    if (!Array.isArray(node.children)) return
    node.children.forEach((child) => {
      const resolved = resolveRouteRef(child)
      const id = resolved?.['@id']
      if (typeof id === 'string') childIds.add(id)
    })
  })

  return routeNodes
    .filter((node) => {
      const id = node['@id']
      if (!node.routePath && !node.path) return false
      if (node.inRail) return true
      if (typeof id === 'string' && childIds.has(id)) return false
      return true
    })
    .slice()
    .sort((a, b) => Number(a.order ?? 999) - Number(b.order ?? 999))
    .map(buildRouteConfigFromNode)
}

const normalizeThemePresetId = (id: string): string => {
  return id.startsWith('theme:') ? id.slice('theme:'.length) : id
}

export const getDefaultThemePresetId = (): string | null => {
  const appNode = getAppConfigNodesByType('app:Application')[0]
  if (!appNode) return null

  const themeRef = resolveIdRef(appNode.defaultTheme)
  if (!themeRef) return null

  return normalizeThemePresetId(themeRef)
}

export const getThemePresetsFromConfig = (): ThemePresets => {
  const presets: ThemePresets = {}

  getAppConfigNodesByType('ui:Theme').forEach((node) => {
    const id = typeof node['@id'] === 'string' ? node['@id'] : ''
    if (!id) return

    const styles = node.styles
    if (!styles || typeof styles !== 'object') return

    const preset: ThemePreset = {
      label: typeof node.label === 'string' ? node.label : id,
      styles: {
        light: typeof styles.light === 'object' && styles.light ? styles.light : {},
        dark: typeof styles.dark === 'object' && styles.dark ? styles.dark : {},
      },
    }

    presets[normalizeThemePresetId(id)] = preset
  })

  return presets
}

/**
 * Gets a type node by its ID (e.g., "type:Task")
 */
export const getTypeNodeById = (typeId: string): AppConfigTypeNode | null => {
  const node = getAppConfigNodeById(typeId)
  if (!node) return null
  const types = normalizeTypes(node['@type'])
  if (!types.includes('rdfs:Class')) return null
  return node as AppConfigTypeNode
}

/**
 * Gets a field node by its ID (e.g., "field:status")
 */
export const getFieldNodeById = (fieldId: string): AppConfigFieldNode | null => {
  const node = getAppConfigNodeById(fieldId)
  if (!node) return null
  const types = normalizeTypes(node['@type'])
  if (!types.includes('app:Field')) return null
  return node as AppConfigFieldNode
}

/**
 * Resolves field references from a type node to actual field nodes
 */
export const resolveTypeFields = (typeNode: AppConfigTypeNode): AppConfigFieldNode[] => {
  if (!Array.isArray(typeNode.fields)) return []

  return typeNode.fields
    .map((fieldRef) => {
      const fieldId = typeof fieldRef === 'string' ? fieldRef : fieldRef?.['@id']
      if (!fieldId) return null
      return getFieldNodeById(fieldId)
    })
    .filter((f): f is AppConfigFieldNode => f !== null)
}

/**
 * Builds a synthetic DatabaseSchema from a type's field definitions.
 * This allows view mode options to be dynamically inferred from the type's schema.
 */
export const buildSchemaFromType = (typeId: string): DatabaseSchema | null => {
  const typeNode = getTypeNodeById(typeId)
  if (!typeNode) return null

  const fieldNodes = resolveTypeFields(typeNode)
  const now = Date.now()

  const fields: DatabaseField[] = fieldNodes.map((fieldNode, index) => ({
    id: fieldNode['@id'] ?? `field-${index}`,
    name: fieldNode.label ?? 'Untitled Field',
    type: (fieldNode.valueType as DatabaseField['type']) ?? 'text',
    order: index,
    required: false,
    options: fieldNode.options?.map((opt) => ({ value: opt.value, color: opt.color ?? 'gray' })),
  }))

  return {
    id: typeId,
    collectionId: typeId,
    fields,
    views: [],
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Gets the explicit projection types defined on a type node.
 * Falls back to inferring from fields if not explicitly defined.
 */
export const getTypeProjectionTypes = (typeId: string): string[] => {
  const typeNode = getTypeNodeById(typeId)
  if (!typeNode) return []

  if (Array.isArray(typeNode.projectionTypes) && typeNode.projectionTypes.length > 0) {
    return typeNode.projectionTypes
  }

  // Fallback: return common types, let resolver filter based on schema
  return ['table', 'list', 'grid', 'kanban', 'calendar']
}

/**
 * Gets field types present in a type's schema.
 * Useful for checking what view modes should be enabled.
 */
export const getTypeFieldTypes = (typeId: string): Set<DatabaseField['type']> => {
  const schema = buildSchemaFromType(typeId)
  if (!schema) return new Set()
  return new Set(schema.fields.map((f) => f.type))
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Resolution Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Route node from app-config.jsonld
 */
export interface AppConfigRouteNode extends AppConfigNode {
  routePath?: string
  label?: string
  icon?: string
  tint?: string
  order?: number
  entityType?: { '@id': string } | string
  pageVariant?: 'browse' | 'detail' | 'form' | 'dashboard' | 'custom'
  projectionTypes?: string[]
  permissions?: {
    minRole?: string
    requiresFacilityMembership?: boolean
  }
  meta?: {
    title?: string
    description?: string
    subtitle?: string
  }
  children?: Array<{ '@id': string } | string>
}

/**
 * Page configuration derived from route and type definitions.
 */
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

/**
 * Get typed route nodes from the graph.
 */
const getTypedRouteNodes = (): AppConfigRouteNode[] => {
  return getAppConfigNodesByType('app:Route') as AppConfigRouteNode[]
}

/**
 * Find a route node by its path pattern.
 * Matches against routePath, supporting :param placeholders.
 */
export const getRouteByPath = (path: string): AppConfigRouteNode | null => {
  const routes = getTypedRouteNodes()

  // Normalize path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // Try exact match first
  const exact = routes.find((r) => r.routePath === normalizedPath)
  if (exact) return exact

  // Try pattern matching (e.g., /facility/tasks matches /facility/:slug)
  for (const route of routes) {
    if (!route.routePath) continue
    const pattern = route.routePath.replace(/:[^/]+/g, '[^/]+')
    const regex = new RegExp(`^${pattern}$`)
    if (regex.test(normalizedPath)) return route
  }

  return null
}

/**
 * Find a route node by its ID.
 */
export const getRouteById = (routeId: string): AppConfigRouteNode | null => {
  const routes = getTypedRouteNodes()
  return routes.find((r) => r['@id'] === routeId) ?? null
}

/**
 * Resolve the entity type ID from a route node.
 */
const resolveEntityTypeId = (route: AppConfigRouteNode): string | undefined => {
  if (!route.entityType) return undefined
  if (typeof route.entityType === 'string') return route.entityType
  return route.entityType['@id']
}

/**
 * Build a complete page configuration from a route path.
 * This is the main entry point for graph-driven pages.
 */
export const buildPageConfigFromRoute = (routePath: string): DerivedPageConfig | null => {
  const route = getRouteByPath(routePath)
  if (!route) return null

  const entityTypeId = resolveEntityTypeId(route)
  const schema = entityTypeId ? buildSchemaFromType(entityTypeId) : null

  // Get projection types: prefer route-level, fall back to type-level
  let projectionTypes = route.projectionTypes ?? []
  if (!projectionTypes.length && entityTypeId) {
    projectionTypes = getTypeProjectionTypes(entityTypeId)
  }

  return {
    routeId: route['@id'] ?? routePath,
    title: route.meta?.title ?? route.label ?? 'Untitled',
    subtitle: route.meta?.subtitle,
    description: route.meta?.description,
    icon: route.icon,
    iconClass: route.tint,
    entityTypeId,
    projectionTypes,
    pageVariant: route.pageVariant ?? 'browse',
    schema,
  }
}

/**
 * Build page config from an entity type slug.
 * Maps slugs like "tasks" to "type:Task".
 */
export const buildPageConfigFromSlug = (slug: string): DerivedPageConfig | null => {
  // Convert slug to type ID (e.g., "tasks" → "type:Task")
  const typeId = `type:${slug.charAt(0).toUpperCase()}${slug.slice(1).replace(/s$/, '')}`

  const typeNode = getTypeNodeById(typeId)
  if (!typeNode) return null

  const schema = buildSchemaFromType(typeId)
  const projectionTypes = getTypeProjectionTypes(typeId)

  return {
    routeId: `route:${slug}`,
    title: typeNode.label ? `${typeNode.label}s` : slug,
    subtitle: undefined,
    description: typeNode.description,
    icon: typeNode.icon,
    iconClass: undefined,
    entityTypeId: typeId,
    projectionTypes,
    pageVariant: 'browse',
    schema,
  }
}
