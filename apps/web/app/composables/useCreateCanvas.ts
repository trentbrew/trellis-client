import { entityId } from '~/lib/tql-namespace'
import { canvasPathFromEntityId } from '~/lib/canvas-routes'
import { EMPTY_CANVAS_LAYOUT, serializeCanvasLayout } from '~/types/canvas'
import { FOUNDER_FACILITY_ID, uniqueWorkshopSlug, WORKSHOP_ZONE_ID } from '~/lib/workshop-create'
import { useTrellisGraph } from '~/composables/useTrellisGraph'
import { useEntities } from '~/composables/useEntities'

/** Create a canvas entity with empty layout, then open the canvas projection. */
export function useCreateCanvas() {
  const { mutate } = useTrellisGraph()
  const { items } = useEntities()
  const { wpNavigate } = useWorkspacePath()

  const creating = ref(false)

  async function createCanvas(title = 'Untitled board') {
    if (creating.value) return null
    creating.value = true
    try {
      const trimmed = title.trim() || 'Untitled board'
      const slug = uniqueWorkshopSlug('canvas', trimmed, (items.value || []).map((e) => e.id))
      const canvasEntityId = entityId(`canvas-${slug}`)

      await mutate({
        action: 'createNode',
        entityId: canvasEntityId,
        type: 'entity',
        data: {
          type: 'canvas',
          title: trimmed,
          layout: serializeCanvasLayout(JSON.parse(JSON.stringify(EMPTY_CANVAS_LAYOUT)) as typeof EMPTY_CANVAS_LAYOUT),
          zoneId: WORKSHOP_ZONE_ID,
          facilityId: FOUNDER_FACILITY_ID,
        },
      })

      await wpNavigate(canvasPathFromEntityId(canvasEntityId))
      return canvasEntityId
    } finally {
      creating.value = false
    }
  }

  return { createCanvas, creating }
}
