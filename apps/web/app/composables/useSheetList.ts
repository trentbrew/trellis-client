import type { Entity } from '~/types/entity'
import { sheetPathFromEntityId } from '~/lib/sheet-routes'

/** Live list of `sheet` entities from the graph (sidebar + index). */
export function useSheetList() {
  const { items } = useEntities()

  const sheets = computed(() =>
    (items.value || [])
      .filter((e): e is Entity => (e as { type?: string }).type === 'sheet')
      .sort((a, b) => (a.title || '').localeCompare(b.title || '')),
  )

  return { sheets }
}

/** Navigate to the canvas sheet projection (not the entity dialog). */
export function openSheetEntity(item: Pick<Entity, 'id' | 'type'>) {
  if ((item as { type?: string }).type !== 'sheet') return
  const { wpNavigate } = useWorkspacePath()
  wpNavigate(sheetPathFromEntityId(item.id))
}

export function sheetToNavItem(sheet: Entity) {
  return {
    path: sheetPathFromEntityId(sheet.id),
    label: sheet.title || sheet.id,
    icon: 'lucide:table-2',
    tint: 'text-emerald-400',
    meta: {
      title: sheet.title,
      subtitle: 'Sheet projection',
    },
  }
}
