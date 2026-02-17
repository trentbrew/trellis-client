/**
 * Reactive composable for all entities.
 *
 * Delegates to TQL graph API via useTrellisEntities().
 * Same API surface as the original composable — zero page changes needed.
 *
 * Provides:
 * - `items`        — reactive ref of all Entity[]
 * - `loading`      — true until first query result
 * - `byType(type)` — filtered computed for a specific EntityType
 * - `create(item)` — persist a new item
 * - `update(item)` — update an existing item
 * - `remove(id)`   — delete an item
 */
export function useEntities() {
  return useTrellisEntities()
}
