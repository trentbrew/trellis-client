import type { Entity, EntityType } from '~/types/entity'

// ============================================================================
// Dialog URL Sync — hash-based deep-linking for entity dialogs
// ============================================================================
//
// Hash format:
//   Single dialog:  #entity:task-abc123
//   Stacked:        #entity:task-abc123+entity:person-xyz789
//
// The first segment is the originating (page-managed) dialog.
// Subsequent segments are the dialog stack entries (in order, bottom to top).
// ============================================================================

const SEGMENT_SEPARATOR = '+'

/** Parse the current URL hash into an ordered list of entity IDs */
export function parseDialogHash(hash: string): string[] {
  if (!hash || hash === '#') return []
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  return raw
    .split(SEGMENT_SEPARATOR)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** Encode an ordered list of entity IDs into a URL hash string */
export function encodeDialogHash(entityIds: string[]): string {
  if (!entityIds.length) return ''
  return '#' + entityIds.join(SEGMENT_SEPARATOR)
}

/**
 * Composable that syncs dialog open state to/from the URL hash.
 *
 * Usage:
 *   const { pushHash, popHash, clearHash, getHashIds } = useDialogUrl()
 */
export function useDialogUrl() {
  const router = useRouter()
  const route = useRoute()

  /** Current ordered entity IDs from the hash (reactive) */
  const hashIds = computed<string[]>(() => parseDialogHash(route.hash))

  /** Replace the hash with a new ordered list of entity IDs (no navigation, just hash update) */
  function setHashIds(ids: string[]) {
    const newHash = encodeDialogHash(ids)
    const current = route.hash
    if (newHash === current) return
    // Use replace so back button doesn't create a history entry per keystroke
    router.replace({ hash: newHash || undefined })
  }

  /** Add an entity ID to the end of the hash stack */
  function pushHash(entityId: string) {
    const ids = [...hashIds.value]
    if (ids[ids.length - 1] === entityId) return
    ids.push(entityId)
    setHashIds(ids)
  }

  /** Remove the last entity ID from the hash stack */
  function popHash() {
    const ids = [...hashIds.value]
    if (!ids.length) return
    ids.pop()
    setHashIds(ids)
  }

  /** Set the originating (first) dialog entity ID, clearing any stack above it */
  function setOriginHash(entityId: string) {
    setHashIds([entityId])
  }

  /** Clear the entire hash */
  function clearHash() {
    setHashIds([])
  }

  return {
    hashIds,
    pushHash,
    popHash,
    setOriginHash,
    clearHash,
  }
}

// ============================================================================
// Boot-time restore helper (called once from app.vue after entities load)
// ============================================================================

/**
 * Given the current URL hash and the full entity store, open the appropriate
 * dialogs. Returns true if any dialogs were restored.
 *
 * @param hash       - raw window.location.hash string
 * @param allItems   - the full reactive entity store
 * @param openOrigin - callback to open the originating (page-managed) dialog by entity ID
 * @param pushStack  - callback to push a stacked dialog entry
 */
export async function restoreDialogsFromHash(
  hash: string,
  allItems: Entity[],
  openOrigin: (_entityId: string, _item: Entity) => void,
  pushStack: (_entityId: string, _entityType: EntityType, _item: Entity) => void,
): Promise<boolean> {
  const ids = parseDialogHash(hash)
  if (!ids.length) return false

  // Resolve all entity IDs to items
  const resolved: Array<{ id: string; item: Entity }> = []
  for (const id of ids) {
    const item = allItems.find((e) => e.id === id)
    if (!item) continue
    resolved.push({ id, item })
  }

  if (!resolved.length) return false

  // Open the originating dialog (first segment)
  const origin = resolved[0]!
  openOrigin(origin.id, origin.item)

  // Push any stacked dialogs (remaining segments)
  for (let i = 1; i < resolved.length; i++) {
    const entry = resolved[i]!
    pushStack(entry.id, entry.item.type as EntityType, entry.item)
  }

  return true
}
