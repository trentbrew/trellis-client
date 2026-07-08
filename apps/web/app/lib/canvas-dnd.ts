import { canvasEntityIdFromSlug } from '~/lib/canvas-routes'
import { deckEntityIdFromSlug } from '~/lib/deck-routes'
import { sheetEntityIdFromSlug } from '~/lib/sheet-routes'
import { TRELLIS_ENTITY_DND_MIME } from '~/types/canvas'

export type SidebarDragItem = {
  path?: string
  meta?: { entityId?: string }
}

/** Resolve graph entity id from a sidebar nav item (meta or route path). */
export function resolveSidebarEntityId(item: SidebarDragItem): string | null {
  if (item.meta?.entityId) return item.meta.entityId

  const path = item.path ?? ''
  const deckMatch = /^\/decks\/([^/]+)/.exec(path)
  if (deckMatch?.[1]) return deckEntityIdFromSlug(deckMatch[1])

  const sheetMatch = /^\/sheets\/([^/]+)/.exec(path)
  if (sheetMatch?.[1]) return sheetEntityIdFromSlug(sheetMatch[1])

  const canvasMatch = /^\/canvases\/([^/]+)/.exec(path)
  if (canvasMatch?.[1]) return canvasEntityIdFromSlug(canvasMatch[1])

  return null
}

export function startCanvasEntityDrag(event: DragEvent, entityId: string | null | undefined) {
  if (!entityId || !event.dataTransfer) return
  event.dataTransfer.setData(TRELLIS_ENTITY_DND_MIME, entityId)
  event.dataTransfer.effectAllowed = 'copy'
}

export function isCanvasEntityDrag(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes(TRELLIS_ENTITY_DND_MIME) ?? false
}
