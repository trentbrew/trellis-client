import type { TrellisKernel, RouteDefinition, SchemaDefinition, ProjectionDefinition } from '@turtle.tech/trellis-kernel'
import { createWorkspaceConfig } from '../utils/trellis-ontologies'
import { factsToNode, isAppConfigEntityType } from './app-config-facts'
import { parseRouteDefinitionFromNode } from './seed-app-config'
import type { ProjectionRegistryNode } from '../../app/lib/trellis-projection-registry/types'
import { listSchemasFromGraph, schemasToRecord } from './ontology-registry/graph-schema-registry'

export type AppConfigSnapshot = {
  app: Record<string, unknown> | null
  routes: Record<string, RouteDefinition>
  projections: Record<string, ProjectionDefinition>
  projectionViews: Record<string, ProjectionRegistryNode>
  ontologies: Record<string, SchemaDefinition>
}

function collectEntitiesByDomainType(store: ReturnType<TrellisKernel['getStore']>, domainType: string): string[] {
  const ids = new Set<string>()
  for (const fact of store.getAllFacts()) {
    if (fact.a === 'type' && fact.v === domainType) {
      ids.add(fact.e)
    }
  }
  return [...ids]
}

function parseJsonField<T>(node: Record<string, unknown>, field = 'configJson'): T | null {
  const raw = node[field]
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Assemble workspace config from graph-resident app config entities.
 * Falls back to module definitions when the graph has no seeded routes.
 */
export function buildAppConfigSnapshot(kernel: TrellisKernel): AppConfigSnapshot {
  const store = kernel.getStore()
  const fallback = createWorkspaceConfig().workspace

  const routes: Record<string, RouteDefinition> = {}
  for (const entityId of collectEntitiesByDomainType(store, 'app_route')) {
    const node = factsToNode(entityId, store.getFactsByEntity(entityId))
    const route = parseRouteDefinitionFromNode(node)
    if (route) routes[entityId] = route
  }

  const projections: Record<string, ProjectionDefinition> = {}
  for (const entityId of collectEntitiesByDomainType(store, 'app_projection')) {
    const node = factsToNode(entityId, store.getFactsByEntity(entityId))
    const projection = parseJsonField<ProjectionDefinition>(node)
    const projectionId = typeof node.projectionId === 'string' ? node.projectionId : projection?.['@id']
    if (projection && projectionId) projections[projectionId] = projection
  }

  const projectionViews: Record<string, ProjectionRegistryNode> = {}
  for (const entityId of collectEntitiesByDomainType(store, 'app_projection_view')) {
    const node = factsToNode(entityId, store.getFactsByEntity(entityId))
    const view = parseJsonField<ProjectionRegistryNode>(node)
    if (view) projectionViews[entityId] = view
  }

  const routeCount = Object.keys(routes).length
  const projectionCount = Object.keys(projections).length
  const ontologies = schemasToRecord(listSchemasFromGraph(kernel))

  return {
    app: (fallback.app as Record<string, unknown>) ?? null,
    routes: routeCount > 0 ? routes : (fallback.routes as Record<string, RouteDefinition>),
    ontologies,
    projections: projectionCount > 0 ? projections : (fallback.projections as Record<string, ProjectionDefinition>),
    projectionViews,
  }
}

export function graphHasAppConfigEntities(kernel: TrellisKernel): boolean {
  const store = kernel.getStore()
  for (const fact of store.getAllFacts()) {
    if (fact.a === 'type' && isAppConfigEntityType(fact.v)) return true
  }
  return false
}
