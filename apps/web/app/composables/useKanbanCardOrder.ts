import type { Entity } from '~/types/entity'

export type KanbanCardOrderMap = Record<string, string[]>

/**
 * Persisted card order within kanban columns (per entity type + column source).
 */
export function useKanbanCardOrder(
  entityType: MaybeRefOrGetter<string | undefined>,
  sourceId: MaybeRefOrGetter<string | null | undefined>,
) {
  const typeRef = computed(() => toValue(entityType) ?? 'all')
  const sourceRef = computed(() => toValue(sourceId) ?? 'auto')

  const storageKey = computed(
    () => `browse:kanban:${typeRef.value}:card-order:${sourceRef.value}`,
  )

  const orderMap = ref<KanbanCardOrderMap>({})

  function load() {
    if (!import.meta.client) return
    try {
      const raw = window.localStorage.getItem(storageKey.value)
      if (!raw) {
        orderMap.value = {}
        return
      }
      const parsed = JSON.parse(raw) as KanbanCardOrderMap
      orderMap.value = parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      orderMap.value = {}
    }
  }

  function persist() {
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(storageKey.value, JSON.stringify(orderMap.value))
    } catch {
      // ignore quota / private mode
    }
  }

  watch(storageKey, load, { immediate: true })

  function applyOrder(items: Entity[], columnId: string): Entity[] {
    const ids = orderMap.value[columnId]
    if (!ids?.length) return items.slice()

    const byId = new Map(items.map((item) => [item.id, item]))
    const ordered: Entity[] = []
    for (const id of ids) {
      const item = byId.get(id)
      if (item) {
        ordered.push(item)
        byId.delete(id)
      }
    }
    for (const item of items) {
      if (byId.has(item.id)) ordered.push(item)
    }
    return ordered
  }

  function applyOrderToColumns(
    columnIds: string[],
    grouped: Record<string, Entity[]>,
  ): Record<string, Entity[]> {
    const next: Record<string, Entity[]> = {}
    for (const columnId of columnIds) {
      next[columnId] = applyOrder(grouped[columnId] ?? [], columnId)
    }
    return next
  }

  function persistFromLists(lists: Record<string, Entity[]>) {
    const next: KanbanCardOrderMap = { ...orderMap.value }
    for (const [columnId, items] of Object.entries(lists)) {
      next[columnId] = items.map((item) => item.id)
    }
    orderMap.value = next
    persist()
  }

  return {
    orderMap,
    applyOrder,
    applyOrderToColumns,
    persistFromLists,
  }
}
