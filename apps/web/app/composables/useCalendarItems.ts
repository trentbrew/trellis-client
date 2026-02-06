import type { CalendarItem, CalendarItemType } from '~/types/calendarItem'
import { id as generateId } from '~/lib/instant-local'

/**
 * Reactive composable for personal calendar items backed by instant-local.
 *
 * Provides:
 * - `items`        — reactive ref of all CalendarItem[]
 * - `loading`      — true until first query result
 * - `byType(type)` — filtered computed for a specific CalendarItemType
 * - `create(item)` — persist a new item
 * - `update(item)` — update an existing item
 * - `remove(id)`   — delete an item
 */
export function useCalendarItems() {
  const db = useInstantDb()
  const items = ref<CalendarItem[]>([])
  const loading = ref(true)

  // Subscribe reactively — re-fires on every transact touching calendarItems
  const unsub = db.subscribeQuery(
    { calendarItems: {} },
    (result: { data?: Record<string, any[]>; error?: any }) => {
      if (result.data?.calendarItems) {
        items.value = result.data.calendarItems as CalendarItem[]
      }
      loading.value = false
    },
  )

  // Clean up subscription when component unmounts
  if (getCurrentInstance()) {
    onUnmounted(() => unsub())
  }

  // Filtered view by type
  function byType(type: CalendarItemType) {
    return computed(() => items.value.filter((i) => i.type === type))
  }

  // CRUD operations
  async function create(item: Partial<CalendarItem> & { type: CalendarItemType; title: string }) {
    const itemId = item.id || generateId()
    const now = Date.now()
    const payload = {
      ...item,
      createdAt: now,
      updatedAt: now,
    }
    // Remove `id` from payload — it's the entity key, not a field
    delete (payload as any).id
    await db.transact([db.tx.calendarItems[itemId].create(payload)])
    return itemId
  }

  async function update(item: CalendarItem) {
    const { id: itemId, ...fields } = item
    await db.transact([
      db.tx.calendarItems[itemId].update({
        ...fields,
        updatedAt: Date.now(),
      }),
    ])
  }

  async function remove(itemId: string) {
    await db.transact([db.tx.calendarItems[itemId].delete()])
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
