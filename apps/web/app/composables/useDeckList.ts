import type { Entity } from '~/types/entity'
import { deckPathFromEntityId, isDeckEntityType } from '~/lib/deck-routes'

/** Live list of deck entities from the graph (sidebar + index). */
export function useDeckList() {
  const { items } = useEntities()

  const decks = computed(() =>
    (items.value || [])
      .filter(
        (e): e is Entity => isDeckEntityType(e.type) || e.id.startsWith('entity:deck-'),
      )
      .sort((a, b) => (a.title || '').localeCompare(b.title || '')),
  )

  return { decks }
}

/** Navigate to the canvas deck projection (not the entity dialog). */
export function openDeckEntity(item: Pick<Entity, 'id' | 'type'>) {
  if (!isDeckEntityType(item.type)) return
  const { wpNavigate } = useWorkspacePath()
  wpNavigate(deckPathFromEntityId(item.id))
}
