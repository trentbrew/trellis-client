import type { TrellisKernel } from '@turtle.tech/trellis-kernel'
import { factsToNode } from '../app-config-facts'
import type {
  SidecarAppProjection,
  SidecarAppProjectionView,
  SidecarAppRoute,
  SidecarAppSchema,
} from '../../../app/lib/trellis-sidecar/schema/app-config'

/** Bridge `type` query param → kernel `data.type` domain type. */
export const BRIDGE_TYPE_TO_DOMAIN = {
  AppRoute: 'app_route',
  AppSchema: 'trellis_schema',
  AppProjection: 'app_projection',
  AppProjectionView: 'app_projection_view',
} as const

export type BridgeEntityType = keyof typeof BRIDGE_TYPE_TO_DOMAIN

export type BridgeAppConfigRow =
  | SidecarAppRoute
  | SidecarAppSchema
  | SidecarAppProjection
  | SidecarAppProjectionView

export const BRIDGE_APP_CONFIG_TYPES = Object.keys(BRIDGE_TYPE_TO_DOMAIN) as BridgeEntityType[]

function collectEntityIdsByDomainType(
  store: ReturnType<TrellisKernel['getStore']>,
  domainType: string,
): string[] {
  const ids = new Set<string>()
  for (const fact of store.getAllFacts()) {
    if (fact.a === 'type' && fact.v === domainType) {
      ids.add(fact.e)
    }
  }
  return [...ids]
}

function strField(node: Record<string, unknown>, key: string, fallback = ''): string {
  const value = node[key]
  return typeof value === 'string' ? value : fallback
}

/** Map a kernel node (from factsToNode) to a sidecar-compatible bridge row. */
export function kernelNodeToBridgeRow(
  entityId: string,
  node: Record<string, unknown>,
): BridgeAppConfigRow | null {
  const domainType = node['@type'] ?? node.type
  const title = strField(node, 'title', entityId)
  const configJson = strField(node, 'configJson', '{}')

  switch (domainType) {
    case 'app_route':
      return { id: entityId, type: 'AppRoute', title, configJson }
    case 'trellis_schema':
      return {
        id: entityId,
        type: 'AppSchema',
        title,
        schemaId: strField(node, 'schemaId'),
        configJson,
      }
    case 'app_projection':
      return {
        id: entityId,
        type: 'AppProjection',
        title,
        projectionId: strField(node, 'projectionId'),
        configJson,
      }
    case 'app_projection_view':
      return {
        id: entityId,
        type: 'AppProjectionView',
        title,
        projectionType: strField(node, 'projectionType'),
        configJson,
      }
    default:
      return null
  }
}

export function listBridgeEntities(
  kernel: TrellisKernel,
  bridgeType: BridgeEntityType,
  opts: { limit?: number; offset?: number } = {},
): { data: BridgeAppConfigRow[]; total: number; limit: number; offset: number } {
  const domainType = BRIDGE_TYPE_TO_DOMAIN[bridgeType]
  const store = kernel.getStore()
  const limit = opts.limit ?? 100
  const offset = opts.offset ?? 0

  const rows: BridgeAppConfigRow[] = []
  for (const entityId of collectEntityIdsByDomainType(store, domainType)) {
    const node = factsToNode(entityId, store.getFactsByEntity(entityId))
    const row = kernelNodeToBridgeRow(entityId, node)
    if (row) rows.push(row)
  }

  const page = rows.slice(offset, offset + limit)
  return { data: page, total: rows.length, limit, offset }
}

export function getBridgeEntity(
  kernel: TrellisKernel,
  entityId: string,
): BridgeAppConfigRow | null {
  const store = kernel.getStore()
  const facts = store.getFactsByEntity(entityId)
  if (facts.length === 0) return null
  const node = factsToNode(entityId, facts)
  return kernelNodeToBridgeRow(entityId, node)
}
