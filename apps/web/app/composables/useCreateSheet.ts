import { entityId } from '~/lib/tql-namespace'
import { sheetPathFromEntityId } from '~/lib/sheet-routes'
import { FOUNDER_FACILITY_ID, uniqueWorkshopSlug, WORKSHOP_ZONE_ID } from '~/lib/workshop-create'
import { useTrellisGraph } from '~/composables/useTrellisGraph'
import { useEntities } from '~/composables/useEntities'

/** Create a sheet entity and open the sheet projection. */
export function useCreateSheet() {
  const { mutate } = useTrellisGraph()
  const { items } = useEntities()
  const { wpNavigate } = useWorkspacePath()

  const creating = ref(false)

  async function createSheet(title = 'Untitled sheet') {
    if (creating.value) return null
    creating.value = true
    try {
      const trimmed = title.trim() || 'Untitled sheet'
      const slug = uniqueWorkshopSlug('sheet', trimmed, (items.value || []).map((e) => e.id))
      const sheetEntityId = entityId(`sheet-${slug}`)

      await mutate({
        action: 'createNode',
        entityId: sheetEntityId,
        type: 'entity',
        data: {
          type: 'sheet',
          title: trimmed,
          query: 'FIND entity AS ?t WHERE ?t.type = "task" RETURN ?t.title, ?t.taskStatus LIMIT 20',
          zoneId: WORKSHOP_ZONE_ID,
          facilityId: FOUNDER_FACILITY_ID,
        },
      })

      await wpNavigate(sheetPathFromEntityId(sheetEntityId))
      return sheetEntityId
    } finally {
      creating.value = false
    }
  }

  return { createSheet, creating }
}
