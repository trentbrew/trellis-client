/** Route helpers for graph-native sheet entities */

export function sheetSlugFromEntityId(entityId: string): string {
  return entityId.replace(/^entity:sheet-/, '').replace(/^entity:/, '')
}

export function sheetPathFromEntityId(entityId: string): string {
  return `/sheets/${encodeURIComponent(sheetSlugFromEntityId(entityId))}`
}

export function sheetEntityIdFromSlug(slug: string): string {
  const raw = decodeURIComponent(slug)
  if (raw.includes(':')) return raw
  return raw.startsWith('sheet-') ? `entity:${raw}` : `entity:sheet-${raw}`
}
