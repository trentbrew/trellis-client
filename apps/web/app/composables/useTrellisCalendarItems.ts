import type { CalendarItem, CalendarItemType } from '~/types/calendarItem'

/**
 * TQL-backed replacement for useCalendarItems.
 *
 * Same API surface as the instant-local version:
 * - `items`        — reactive ref of all CalendarItem[]
 * - `loading`      — true until first fetch
 * - `byType(type)` — filtered computed for a specific CalendarItemType
 * - `create(item)` — persist a new item via graph API
 * - `update(item)` — update an existing item via graph API
 * - `remove(id)`   — delete an item via graph API
 */
export function useTrellisCalendarItems() {
  const { query, mutate, fetchNode } = useTrellisGraph()

  const items = ref<CalendarItem[]>([])
  const loading = ref(true)

  // Query all calendar items from the graph
  const { data: entityIds, loading: queryLoading } = query(
    'FIND calendaritem AS ?e',
  )

  // When entity IDs change, hydrate full nodes
  watch(
    entityIds,
    async (ids) => {
      if (!ids || ids.length === 0) {
        items.value = []
        loading.value = false
        return
      }

      try {
        const nodes = await Promise.all(
          ids.map(async (row) => {
            const entityId = (row as any)['?e'] as string
            const result = await fetchNode(entityId)
            // Reconstruct CalendarItem shape from EAV node
            const node = result.node
            const id = entityId.replace('calendaritem:', '')
            const { '@id': _ld_id, '@type': _ld_type, ...rest } = node
            return {
              id,
              ...rest,
              // Ensure type field comes from the @type or the type attribute
              type: node['@type'] || node.type,
              // Ensure arrays are arrays (EAV may flatten single-element arrays)
              tags: normalizeArray(node.tags),
              involved: normalizeArray(node.involved),
              reminders: normalizeArray(node.reminders),
              checklist: normalizeArray(node.checklist),
              attachments: normalizeArray(node.attachments),
            } as unknown as CalendarItem
          }),
        )
        items.value = nodes
      } catch (err) {
        console.error('[useTrellisCalendarItems] hydration error:', err)
      } finally {
        loading.value = false
      }
    },
    { immediate: true },
  )

  // Also sync loading from query
  watch(queryLoading, (v) => {
    if (v) loading.value = true
  })

  // Filtered view by type
  function byType(type: CalendarItemType) {
    return computed(() => items.value.filter((i) => i.type === type))
  }

  // CRUD operations
  async function create(
    item: Partial<CalendarItem> & { type: CalendarItemType; title: string },
  ) {
    const itemId = item.id || crypto.randomUUID()
    const { id: _id, ...data } = item
    const now = Date.now()

    await mutate({
      action: 'createNode',
      entityId: `calendaritem:${itemId}`,
      type: 'calendaritem',
      data: {
        ...data,
        createdAt: now,
        updatedAt: now,
      },
    })

    return itemId
  }

  async function update(item: CalendarItem) {
    const { id: itemId, ...fields } = item

    await mutate({
      action: 'updateNode',
      entityId: `calendaritem:${itemId}`,
      type: 'calendaritem',
      data: {
        ...fields,
        updatedAt: Date.now(),
      },
    })
  }

  async function remove(itemId: string) {
    await mutate({
      action: 'deleteNode',
      entityId: `calendaritem:${itemId}`,
    })
  }

  return {
    items,
    loading,
    byType,
    create,
    update,
    remove,
  }
}

/** Normalize a value to an array — EAV stores may flatten single values */
function normalizeArray(val: unknown): any[] {
  if (Array.isArray(val)) return val
  if (val === undefined || val === null || val === '') return []
  return [val]
}
