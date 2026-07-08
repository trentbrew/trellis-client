/** Route helpers for graph-native canvas entities */

export function isCanvasEntityType(type: string | undefined): boolean {
  return type === 'canvas'
}

export function canvasSlugFromEntityId(entityId: string): string {
  return entityId.replace(/^entity:canvas-/, '').replace(/^entity:/, '')
}

export function canvasPathFromEntityId(entityId: string): string {
  return `/canvases/${encodeURIComponent(canvasSlugFromEntityId(entityId))}`
}

export function canvasEntityIdFromSlug(slug: string): string {
  const raw = decodeURIComponent(slug)
  if (raw.includes(':')) return raw
  return raw.startsWith('canvas-') ? `entity:${raw}` : `entity:canvas-${raw}`
}

/** Navigate to the canvas projection (not the entity dialog). */
export function openCanvasEntity(item: Pick<{ id: string; type?: string }, 'id' | 'type'>) {
  if (!isCanvasEntityType(item.type)) return
  const { wpNavigate } = useWorkspacePath()
  wpNavigate(canvasPathFromEntityId(item.id))
}
