import type { Entity } from '~/types/entity'
import { canvasPathFromEntityId, isCanvasEntityType } from '~/lib/canvas-routes'

/** Live list of canvas entities from the graph (sidebar + index). */
export function useCanvasList() {
  const { items } = useEntities()

  const canvases = computed(() =>
    (items.value || [])
      .filter((e): e is Entity => isCanvasEntityType(e.type) || e.id.startsWith('entity:canvas-'))
      .sort((a, b) => (a.title || '').localeCompare(b.title || '')),
  )

  return { canvases }
}

export function openCanvasFromEntity(item: Pick<Entity, 'id' | 'type'>) {
  if (!isCanvasEntityType(item.type)) return
  const { wpNavigate } = useWorkspacePath()
  wpNavigate(canvasPathFromEntityId(item.id))
}
