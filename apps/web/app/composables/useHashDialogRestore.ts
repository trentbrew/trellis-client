import type { Entity } from '~/types/entity'

// ============================================================================
// Hash Dialog Restore — page-level hook for boot-time dialog restore
// ============================================================================
//
// Usage (in any page that manages a dialog):
//
//   useHashDialogRestore((entityId, item) => {
//     _viewingItemId.value = entityId
//     viewOpen.value = true
//   })
//
// When the page mounts and a hash restore is pending for an entity that
// belongs to this page, the callback is invoked immediately.
// ============================================================================

/**
 * Register a page-level callback to open a dialog when the URL hash
 * contains an entity ID that matches one of the page's items.
 *
 * @param items    - The reactive list of entities this page manages
 * @param onOpen   - Called with (entityId, item) when a matching entity is found in the hash
 */
export function useHashDialogRestore(
  items: Ref<Entity[]> | ComputedRef<Entity[]>,
  onOpen: (_entityId: string, _item: Entity) => void,
) {
  const restoreId = useState<string | null>('dialog:restoreEntityId', () => null)

  // Check immediately on mount, and also watch for the restoreId to be set
  // (in case entities load before the page mounts)
  const tryRestore = () => {
    const id = restoreId.value
    if (!id) return
    const item = items.value.find((e) => e.id === id)
    if (!item) return
    // Consume the signal
    restoreId.value = null
    onOpen(id, item)
  }

  onMounted(() => {
    tryRestore()
  })

  watch(restoreId, () => {
    tryRestore()
  })

  // Entity may hydrate after restoreId is set (SSE / query refresh lag).
  watch(items, () => {
    tryRestore()
  })
}
