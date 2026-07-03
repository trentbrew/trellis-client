/** Shared app config shapes — kernel `/api/graph/config` and live sidecar assembly. */

export interface ServerSchemaField {
  name: string
  valueType: string
  required?: boolean
  description?: string
  selectOptions?: unknown[]
  icon?: string
  group?: string
  display?: string
  editable?: boolean
  computed?: boolean
  modes?: string[]
  defaultValue?: unknown
}

export interface ServerSchemaDefinition {
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

export interface ServerRouteDefinition {
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
  permissions?: Record<string, unknown>
  meta?: {
    title?: string
    description?: string
    subtitle?: string
    showBackButton?: boolean
    fullWidth?: boolean
  }
  sidebarSections?: unknown[]
  children?: unknown[]
  editable?: boolean
  tabs?: unknown[]
  entityType?: string
  pageVariant?: string
  projectionTypes?: string[]
}

export interface ServerProjectionDefinition {
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
  config?: Record<string, unknown>
}

export interface ServerAppDefinition {
  '@id': string
  '@type': string
  title?: string
  description?: string
  version?: string
  devPort?: number
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
  schema: import('~/types/database').DatabaseSchema | null
}

export interface ServerConfig {
  app: ServerAppDefinition | null
  routes: Record<string, ServerRouteDefinition>
  projections: Record<string, ServerProjectionDefinition>
  projectionViews: Record<string, import('~/lib/trellis-projection-registry/types').ProjectionRegistryNode>
  ontologies: Record<string, ServerSchemaDefinition>
}
