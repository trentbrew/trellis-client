import { extractMentionRefs } from '~/utils/extractMentionRefs'
import type { Reference } from '~/types/entity'
import { isEntityReference } from '~/types/entity'
import { entityId as toEntityId } from '~/lib/tql-namespace'

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
 *
 * Also pushes new mention refs optimistically to `editableItem.references`
 * (150ms debounce) so they appear in the References section near-instantly,
 * before the TQL roundtrip completes.
 */
export function useMentionLinks(
  editableItem: { id: string; content?: string; references?: Reference[]; title?: string; ownerId?: string },
  context?: { orgId?: string; authorId?: string; authorName?: string },
) {
  const { mutate } = useTrellisGraph()
  const adapter = useDataAdapter()

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

  // ── Optimistic local push (150ms debounce) ──────────────────────────
  // Show new mention refs in the References section near-instantly,
  // before the TQL roundtrip completes.
  watchDebounced(
    () => editableItem.content,
    () => {
      if (!editableItem.id || !editableItem.references) return
      const currentRefs = extractMentionRefs(editableItem.content || '')
      for (const ref of currentRefs) {
        const alreadyExists = editableItem.references.some(
          (r) => isEntityReference(r) && r.entityId === ref.entityId,
        )
        if (!alreadyExists) {
          editableItem.references.push(ref)
        }
      }
    },
    { debounce: 150 },
  )

  // ── TQL link persistence (1s debounce) ──────────────────────────────
  // Fires ~1s after the user stops typing to create/remove graph links.
  watchDebounced(
    () => editableItem.content,
    () => {
      if (!editableItem.id) return

      const currentIds = extractCurrentIds()
      const sourceId = toEntityId(editableItem.id)

      // New mentions → create links + notify (cloud only)
      for (const id of currentIds) {
        if (!prevMentionIds.value.has(id)) {
          mutate({
            action: 'link',
            e1: sourceId,
            relation: 'mentions',
            e2: toEntityId(id),
          }).catch((err: unknown) =>
            console.error('[useMentionLinks] Failed to create link:', err),
          )

          // Notify the mentioned entity's owner (cloud mode only)
          if (adapter.mode === 'cloud' && context?.orgId && context?.authorId) {
            // Fetch the target entity to get its ownerId
            $fetch(`/api/graph/node/${encodeURIComponent(toEntityId(id))}`)
              .then((node: any) => {
                const targetOwnerId = node?.ownerId
                if (!targetOwnerId || targetOwnerId === context.authorId) return
                return $fetch('/api/notify', {
                  method: 'POST',
                  body: {
                    recipientId: targetOwnerId,
                    orgId: context.orgId,
                    type: 'mention',
                    title: `Mentioned in "${editableItem.title || 'a document'}"`,
                    message: `${context.authorName || 'Someone'} mentioned you.`,
                    actionUrl: `/workspace/tasks`,
                    icon: 'lucide:at-sign',
                    variant: 'default',
                    actorId: context.authorId,
                    actorName: context.authorName || '',
                    metadata: { entityId: editableItem.id, mentionedEntityId: id },
                  },
                })
              })
              .catch(() => { /* non-fatal */ })
          }
        }
      }

      // Removed mentions → delete links
      for (const id of prevMentionIds.value) {
        if (!currentIds.has(id)) {
          mutate({
            action: 'unlink',
            e1: sourceId,
            relation: 'mentions',
            e2: toEntityId(id),
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
