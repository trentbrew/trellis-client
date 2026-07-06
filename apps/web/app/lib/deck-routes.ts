/** Route helpers for graph-native deck entities */

const DECK_TYPES = new Set(['deck', 'slide_deck'])

export type DeckVantageRoute = 'editor' | 'sorter' | 'thumb' | 'present'

export function isDeckEntityType(type: string | undefined): boolean {
  return type != null && DECK_TYPES.has(type)
}

export function deckSlugFromEntityId(entityId: string): string {
  return entityId.replace(/^entity:deck-/, '').replace(/^entity:/, '')
}

export function deckPathFromEntityId(entityId: string): string {
  return `/decks/${encodeURIComponent(deckSlugFromEntityId(entityId))}`
}

export function deckEntityIdFromSlug(slug: string): string {
  const raw = decodeURIComponent(slug)
  if (raw.includes(':')) return raw
  return raw.startsWith('deck-') ? `entity:${raw}` : `entity:deck-${raw}`
}

function slideQuery(slideIndex: number): string {
  return slideIndex > 0 ? `?slide=${slideIndex}` : ''
}

export function deckEditorPathFromEntityId(entityId: string, slideIndex = 0): string {
  return `${deckPathFromEntityId(entityId)}${slideQuery(slideIndex)}`
}

export function deckSorterPathFromEntityId(entityId: string, slideIndex = 0): string {
  return `${deckPathFromEntityId(entityId)}/sorter${slideQuery(slideIndex)}`
}

export function deckThumbPathFromEntityId(entityId: string, slideIndex = 0): string {
  return `${deckPathFromEntityId(entityId)}/thumb${slideQuery(slideIndex)}`
}

export function deckPresentPathFromEntityId(entityId: string, slideIndex = 0): string {
  return `${deckPathFromEntityId(entityId)}/present?slide=${slideIndex}`
}

export function activeDeckVantageFromPath(path: string): DeckVantageRoute {
  if (path.includes('/present')) return 'present'
  if (path.includes('/sorter')) return 'sorter'
  if (path.includes('/thumb')) return 'thumb'
  return 'editor'
}
