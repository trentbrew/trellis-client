import { entityId } from '~/lib/tql-namespace'
import { deckEditorPathFromEntityId } from '~/lib/deck-routes'
import { FOUNDER_FACILITY_ID, uniqueWorkshopSlug, WORKSHOP_ZONE_ID } from '~/lib/workshop-create'
import { useTrellisGraph } from '~/composables/useTrellisGraph'
import { useEntities } from '~/composables/useEntities'

/** Create a slide_deck entity + first slide, then open the deck projection. */
export function useCreateDeck() {
  const { mutate } = useTrellisGraph()
  const { items } = useEntities()
  const { wpNavigate } = useWorkspacePath()

  const creating = ref(false)

  async function createDeck(title = 'Untitled deck') {
    if (creating.value) return null
    creating.value = true
    try {
      const trimmed = title.trim() || 'Untitled deck'
      const slug = uniqueWorkshopSlug('deck', trimmed, (items.value || []).map((e) => e.id))
      const deckEntityId = entityId(`deck-${slug}`)
      const slideEntityId = entityId(`slide-${slug}-1`)

      await mutate({
        action: 'createNode',
        entityId: deckEntityId,
        type: 'entity',
        data: {
          type: 'slide_deck',
          title: trimmed,
          zoneId: WORKSHOP_ZONE_ID,
          facilityId: FOUNDER_FACILITY_ID,
        },
      })

      await mutate({
        action: 'createNode',
        entityId: slideEntityId,
        type: 'entity',
        data: {
          type: 'slide',
          title: 'Slide 1',
          deckId: deckEntityId,
          order: 1,
          'regions.title': `<p>${trimmed}</p>`,
          'regions.body': '<p></p>',
          'regions.layoutId': 'title',
          zoneId: WORKSHOP_ZONE_ID,
          facilityId: FOUNDER_FACILITY_ID,
        },
      })

      await mutate({
        action: 'link',
        e1: deckEntityId,
        relation: 'parentOf',
        e2: slideEntityId,
      })

      await wpNavigate(deckEditorPathFromEntityId(deckEntityId))
      return deckEntityId
    } finally {
      creating.value = false
    }
  }

  return { createDeck, creating }
}
