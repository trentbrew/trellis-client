import { entityId } from '~/lib/tql-namespace'
import { sheetPathFromEntityId } from '~/lib/sheet-routes'
import { FOUNDER_FACILITY_ID, uniqueWorkshopSlug, WORKSHOP_ZONE_ID } from '~/lib/workshop-create'
import { resolveSheetTemplate, type SheetTemplateId } from '~/lib/sheet-templates'
import { useTrellisGraph } from '~/composables/useTrellisGraph'
import { useEntities } from '~/composables/useEntities'

export interface CreateSheetOptions {
  title?: string
  template?: SheetTemplateId
}

/** Create a sheet entity and open the sheet projection. */
export function useCreateSheet() {
  const { mutate } = useTrellisGraph()
  const { items } = useEntities()
  const { wpNavigate } = useWorkspacePath()

  const creating = ref(false)

  async function createSheet(titleOrOptions?: string | CreateSheetOptions) {
    if (creating.value) return null
    creating.value = true
    try {
      const options: CreateSheetOptions =
        typeof titleOrOptions === 'string' ? { title: titleOrOptions } : (titleOrOptions ?? {})
      const template = resolveSheetTemplate(options.template ?? 'blank')
      const trimmed = (options.title ?? template.defaultTitle).trim() || template.defaultTitle
      const slug = uniqueWorkshopSlug('sheet', trimmed, (items.value || []).map((e) => e.id))
      const sheetEntityId = entityId(`sheet-${slug}`)

      await mutate({
        action: 'createNode',
        entityId: sheetEntityId,
        type: 'entity',
        data: {
          type: 'sheet',
          title: trimmed,
          query: template.query,
          columns: template.columns,
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
