import { extractMentionRefs } from '~/utils/extractMentionRefs'

/**
 * Syncs inline @mentions in HTML content to TQL graph links.
 *
 * Watches the entity's content field (debounced) and diffs the set of
 * mentioned entity IDs against the previously known set. New mentions
 * get a `mentions` link created; removed mentions get their link deleted.
 *
 * Uses a local baseline so that opening an existing entity with mentions
 * does NOT re-create links that already exist — only actual edits trigger
 * mutations.
 */
export function useMentionLinks(
  editableItem: { id: string; content?: string },
) {
  const { mutate } = useTrellisGraph()

  // Baseline: the set of mentioned entity IDs at the time we start watching.
  // Mutations only fire for the *diff* from this baseline.
  const prevMentionIds = ref<Set<string>>(new Set())

  function extractCurrentIds(): Set<string> {
    if (!editableItem.content) return new Set()
    const refs = extractMentionRefs(editableItem.content)
    return new Set(refs.map((r) => r.entityId))
  }

  // Seed baseline from current content so we don't re-link on dialog open
  const initBaseline = () => {
    prevMentionIds.value = extractCurrentIds()
  }

  // Debounced watcher — fires ~1s after the user stops typing
  watchDebounced(
    () => editableItem.content,
    () => {
      if (!editableItem.id) return

      const currentIds = extractCurrentIds()
      const sourceEntityId = `calendaritem:${editableItem.id}`

      // New mentions → create links
      for (const id of currentIds) {
        if (!prevMentionIds.value.has(id)) {
          mutate({
            action: 'link',
            e1: sourceEntityId,
            relation: 'mentions',
            e2: `calendaritem:${id}`,
          }).catch((err: unknown) =>
            console.error('[useMentionLinks] Failed to create link:', err),
          )
        }
      }

      // Removed mentions → delete links
      for (const id of prevMentionIds.value) {
        if (!currentIds.has(id)) {
          mutate({
            action: 'unlink',
            e1: sourceEntityId,
            relation: 'mentions',
            e2: `calendaritem:${id}`,
          }).catch((err: unknown) =>
            console.error('[useMentionLinks] Failed to remove link:', err),
          )
        }
      }

      prevMentionIds.value = currentIds
    },
    { debounce: 1000 },
  )

  // Initialize baseline after the editableItem has been populated
  onMounted(initBaseline)

  // Also re-seed when the item changes (e.g. navigating between dialogs)
  watch(
    () => editableItem.id,
    () => initBaseline(),
  )

  return { prevMentionIds }
}
