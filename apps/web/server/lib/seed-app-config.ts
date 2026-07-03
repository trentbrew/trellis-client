import type { TrellisKernel, RouteDefinition, SchemaDefinition } from '@turtle.tech/trellis-kernel'
import { getRouteDefinitions } from '../utils/trellis-shell-routes'
import { createWorkspaceConfig } from '../utils/trellis-ontologies'
import { PROJECTION_REGISTRY_NODES } from '../../app/lib/trellis-projection-registry/nodes'
import {
  FOUNDER_FACILITY_ID,
  FOUNDER_LAB_ZONE_ID,
} from '../utils/trellis-events'
import {
  findTrellisSchemaEntityIdBySchemaId,
  schemaEntityIdFromSchemaId,
} from './ontology-registry/graph-schema-registry'

export const APP_CONFIG_ZONE_ID = FOUNDER_LAB_ZONE_ID
export const APP_CONFIG_FACILITY_ID = FOUNDER_FACILITY_ID

export type AppConfigSeedStats = {
  routes: number
  ontologies: number
  projections: number
  projectionViews: number
}

function projectionSlugFromId(projectionId: string): string {
  return projectionId.replace(/^trellis:projection\//, '').replace(/\//g, '-')
}

/**
 * Idempotent seed: writes shell routes, ontologies, kernel projections, and
 * collection-view registry nodes into the graph as document entities.
 */
export async function seedAppConfigFromModules(kernel: TrellisKernel): Promise<AppConfigSeedStats> {
  const stats: AppConfigSeedStats = {
    routes: 0,
    ontologies: 0,
    projections: 0,
    projectionViews: 0,
  }

  const stamp = {
    zoneId: APP_CONFIG_ZONE_ID,
    facilityId: APP_CONFIG_FACILITY_ID,
  }

  const routes = getRouteDefinitions()
  for (const [routeId, route] of Object.entries(routes)) {
    await kernel.createNode(
      routeId,
      {
        type: 'app_route',
        title: route.label,
        ...stamp,
        configJson: JSON.stringify(route),
      },
      'entity',
    )
    stats.routes++
  }

  const workspace = createWorkspaceConfig().workspace
  for (const [, schema] of Object.entries(workspace.ontologies ?? {})) {
    await upsertTrellisSchemaEntity(kernel, schema as SchemaDefinition)
    stats.ontologies++
  }

  for (const [projectionId, projection] of Object.entries(workspace.projections ?? {})) {
    const entityId = `projection:${projectionSlugFromId(projectionId)}`
    await kernel.createNode(
      entityId,
      {
        type: 'app_projection',
        title: (projection as { name?: string }).name ?? projectionId,
        projectionId,
        ...stamp,
        configJson: JSON.stringify(projection),
      },
      'entity',
    )
    stats.projections++
  }

  for (const node of PROJECTION_REGISTRY_NODES) {
    const entityId = `projection-view:${node.projectionType}`
    await kernel.createNode(
      entityId,
      {
        type: 'app_projection_view',
        title: node.label,
        projectionType: node.projectionType,
        ...stamp,
        configJson: JSON.stringify(node),
      },
      'entity',
    )
    stats.projectionViews++
  }

  return stats
}

export function parseRouteDefinitionFromNode(node: Record<string, unknown>): RouteDefinition | null {
  const raw = node.configJson
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    return JSON.parse(raw) as RouteDefinition
  } catch {
    return null
  }
}

type OntologyWriteCtx = { agentId?: string }

export async function upsertTrellisSchemaEntity(
  kernel: TrellisKernel,
  schema: SchemaDefinition,
  ctx: OntologyWriteCtx = {},
): Promise<string> {
  const schemaId = schema['@id']
  const entityId = schemaEntityIdFromSchemaId(schemaId)
  await kernel.createNode(
    entityId,
    {
      type: 'trellis_schema',
      title: schema.label ?? schemaId,
      schemaId,
      zoneId: APP_CONFIG_ZONE_ID,
      facilityId: APP_CONFIG_FACILITY_ID,
      configJson: JSON.stringify(schema),
    },
    'entity',
    ctx,
  )
  return entityId
}

export async function deleteTrellisSchemaBySchemaId(
  kernel: TrellisKernel,
  schemaId: string,
  ctx: OntologyWriteCtx = {},
): Promise<void> {
  const entityId = findTrellisSchemaEntityIdBySchemaId(kernel, schemaId)
    ?? schemaEntityIdFromSchemaId(schemaId)
  const facts = kernel.getStore().getFactsByEntity(entityId)
  if (facts.length > 0) {
    await kernel.deleteNode(entityId, ctx)
  }
}
