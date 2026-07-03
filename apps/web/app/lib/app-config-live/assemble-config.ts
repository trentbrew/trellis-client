import type { ProjectionRegistryNode } from '~/lib/trellis-projection-registry/types'
import type {
  ServerConfig,
  ServerProjectionDefinition,
  ServerRouteDefinition,
  ServerSchemaDefinition,
} from '~/lib/app-config/types'
import type {
  SidecarAppProjection,
  SidecarAppProjectionView,
  SidecarAppRoute,
  SidecarAppSchema,
} from '~/lib/trellis-sidecar/schema/app-config'

export type AppConfigLiveRows = {
  routes: SidecarAppRoute[]
  schemas: SidecarAppSchema[]
  projections: SidecarAppProjection[]
  projectionViews: SidecarAppProjectionView[]
  app?: ServerConfig['app']
}

function parseJsonField<T>(raw: string | undefined | null): T | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Assemble `/api/graph/config`-compatible snapshot from sidecar live-query rows.
 */
export function assembleAppConfigFromRows(rows: AppConfigLiveRows): ServerConfig {
  const routes: Record<string, ServerRouteDefinition> = {}
  for (const row of rows.routes) {
    const route = parseJsonField<ServerRouteDefinition>(row.configJson)
    if (route) routes[row.id] = route
  }

  const ontologies: Record<string, ServerSchemaDefinition> = {}
  for (const row of rows.schemas) {
    const schema = parseJsonField<ServerSchemaDefinition>(row.configJson)
    const schemaId = row.schemaId || schema?.['@id']
    if (schema && schemaId) ontologies[schemaId] = schema
  }

  const projections: Record<string, ServerProjectionDefinition> = {}
  for (const row of rows.projections) {
    const projection = parseJsonField<ServerProjectionDefinition>(row.configJson)
    const projectionId = row.projectionId || projection?.['@id']
    if (projection && projectionId) projections[projectionId] = projection
  }

  const projectionViews: Record<string, ProjectionRegistryNode> = {}
  for (const row of rows.projectionViews) {
    const view = parseJsonField<ProjectionRegistryNode>(row.configJson)
    if (view) projectionViews[row.id] = view
  }

  return {
    app: rows.app ?? null,
    routes,
    ontologies,
    projections,
    projectionViews,
  }
}

export function appConfigRowCount(config: ServerConfig): number {
  return Object.keys(config.routes).length
    + Object.keys(config.ontologies).length
    + Object.keys(config.projections).length
    + Object.keys(config.projectionViews).length
}
