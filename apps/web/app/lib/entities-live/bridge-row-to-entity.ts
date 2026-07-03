import type { Entity, EntityType } from '~/types/entity'
import type { SidecarKernelBrowseRow } from '~/lib/trellis-sidecar/schema/browse-entity'

/** Parse a kernel-bridge KernelBrowse row into an app Entity. */
export function bridgeRowToEntity(row: SidecarKernelBrowseRow): Entity {
  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(row.payloadJson) as Record<string, unknown>
  } catch {
    payload = {}
  }

  const id = typeof payload.id === 'string' ? payload.id : row.id.replace(/^entity:/, '')
  const type = (typeof payload.type === 'string' ? payload.type : row.entityType) as EntityType
  const title = typeof payload.title === 'string' ? payload.title : row.title

  return {
    id,
    type,
    title,
    tags: Array.isArray(payload.tags) ? (payload.tags as string[]) : [],
    involved: Array.isArray(payload.involved) ? (payload.involved as string[]) : [],
    references: [],
    ...payload,
    id,
    type,
    title,
    references: [],
  } as Entity
}
