import type { Entity, EntityReference, Reference } from '~/types/entity'
import { isEntityReference } from '~/types/entity'
import { getCurrentInstance } from 'vue'
import { DIALOG_ENTITY_CONTEXT_KEY } from '~/composables/useDialogStack'

/**
 * Composable for bidirectional entity reference management.
 *
 * Entity references are persisted as TQL graph links (not embedded data).
 * This means they're real graph edges — visible in graph visualization,
 * queryable via TQL, and inherently bidirectional via outgoing/incoming queries.
 *
 * Local `editableItem.references` is still mutated for immediate UI feedback,
 * but persistence is handled via `mutate({ action: 'link' })`.
 */
export function useEntityReferences(
  /** Reactive object for the entity currently being edited */
  editableItem: { id: string; type: string; title: string; references: Reference[] },
) {
  const { items: allItems } = useEntities()
  const { mutate } = useTrellisGraph()

  // Provide entity context so nested TipTap NodeViews (e.g. MentionChip)
  // can navigate to referenced entities via the dialog stack.
  if (getCurrentInstance()) {
    provide(DIALOG_ENTITY_CONTEXT_KEY, reactive({
      id: computed(() => editableItem.id),
      title: computed(() => editableItem.title),
      type: computed(() => editableItem.type),
    }))
  }

  /**
   * Add an outgoing entity reference to the current item.
   * Creates a TQL link (graph edge) for persistence.
   */
  async function addEntityRef(ref: EntityReference) {
    if (!editableItem.references) editableItem.references = []

    // Prevent duplicate outgoing references
    const exists = editableItem.references.some(
      (r) => isEntityReference(r) && r.entityId === ref.entityId,
    )
    if (exists) return

    // 1. Add to local state for immediate UI feedback
    editableItem.references.push(ref)

    // 2. Persist as a TQL link (graph edge)
    const sourceEntityId = `calendaritem:${editableItem.id}`
    const targetEntityId = `calendaritem:${ref.entityId}`
    try {
      await mutate({
        action: 'link',
        e1: sourceEntityId,
        relation: 'references',
        e2: targetEntityId,
      })
    } catch (err) {
      console.error('[useEntityReferences] Failed to create link:', err)
    }
  }

  /**
   * Remove a reference from the current item by its reference ID.
   * If it's an outgoing entity reference, removes the TQL link.
   */
  async function removeRef(refId: string) {
    if (!editableItem.references) return

    const removedRef = editableItem.references.find((r) => r.id === refId)
    editableItem.references = editableItem.references.filter((r) => r.id !== refId)

    // If it was an outgoing entity ref, remove the TQL link
    if (removedRef && isEntityReference(removedRef) && removedRef.direction === 'outgoing') {
      const sourceEntityId = `calendaritem:${editableItem.id}`
      const targetEntityId = `calendaritem:${removedRef.entityId}`
      try {
        await mutate({
          action: 'unlink',
          e1: sourceEntityId,
          relation: 'references',
          e2: targetEntityId,
        })
      } catch (err) {
        console.error('[useEntityReferences] Failed to remove link:', err)
      }
    }
  }

  /**
   * Open a referenced entity in a stacked dialog.
   */
  function openEntityRef(ref: EntityReference) {
    const targetItem = allItems.value.find((e: Entity) => e.id === ref.entityId)
    if (!targetItem) {
      if (import.meta.dev) console.debug('[useEntityReferences] Entity not found for ref:', ref.entityId)
      return
    }
    const dialogStack = useDialogStack()

    // If the target is already in the stack, pop back to it instead of pushing a duplicate
    const existingIndex = dialogStack.stack.value.findIndex((entry) => entry.entityId === ref.entityId)
    if (existingIndex >= 0) {
      // Pop everything above the existing entry
      const popCount = dialogStack.stack.value.length - 1 - existingIndex
      for (let i = 0; i < popCount; i++) dialogStack.pop()
      return
    }

    // If the target is the originating (page-managed) dialog beneath the stack, clear the stack
    if (dialogStack.size.value > 0 && ref.entityId === dialogStack.originEntityId.value) {
      dialogStack.clear()
      return
    }

    // Capture the originating dialog's title and entity ID for the back-button label
    if (dialogStack.size.value === 0) {
      dialogStack.setOriginTitle(editableItem.title, editableItem.id)
    }
    dialogStack.push(ref.entityId, ref.entityType, targetItem)
  }

  return {
    addEntityRef,
    removeRef,
    openEntityRef,
  }
}
