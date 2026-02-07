/**
 * Reactive composable for personal calendar items.
 *
 * Delegates to TQL graph API via useTrellisCalendarItems().
 * Same API surface as the original instant-local version — zero page changes needed.
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
  return useTrellisCalendarItems()
}
