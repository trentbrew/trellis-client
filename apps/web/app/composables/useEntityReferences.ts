import type { Entity, EntityReference, EntityType, Reference } from '~/types/entity'
import { createDefaultItem, isEntityReference } from '~/types/entity'
import { getCurrentInstance } from 'vue'
import { DIALOG_ENTITY_CONTEXT_KEY } from '~/composables/useDialogStack'
import { entityId as toEntityId } from '~/lib/tql-namespace'
import { useEntities } from '~/composables/useEntities'
import { getEntityTypeConfig } from '~/config/entityRegistry'

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
  const adapter = useDataAdapter()
  const isCloudMode = adapter.mode === 'cloud'

  // Provide entity context so nested TipTap NodeViews (e.g. MentionChip)
  // can navigate to referenced entities via the dialog stack.
  if (getCurrentInstance()) {
    provide(
      DIALOG_ENTITY_CONTEXT_KEY,
      reactive({
        id: computed(() => editableItem.id),
        title: computed(() => editableItem.title),
        type: computed(() => editableItem.type),
      }),
    )
  }

  /**
   * Add an outgoing entity reference to the current item.
   * Creates a TQL link (graph edge) for persistence.
   */
  async function addEntityRef(ref: EntityReference) {
    if (!editableItem.references) editableItem.references = []

    // Prevent duplicate outgoing references
    const exists = editableItem.references.some((r) => isEntityReference(r) && r.entityId === ref.entityId)
    if (exists) return

    // 1. Add to local state for immediate UI feedback
    editableItem.references.push(ref)

    // 2. Persist as a TQL link (graph edge) — only in local mode.
    // In cloud mode, the references JSON field is persisted via auto-save.
    if (!isCloudMode) {
      const sourceId = toEntityId(editableItem.id)
      const targetId = toEntityId(ref.entityId)
      try {
        await mutate({
          action: 'link',
          e1: sourceId,
          relation: 'references',
          e2: targetId,
        })
      } catch (err) {
        console.error('[useEntityReferences] Failed to create link:', err)
      }
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

    // If it was an outgoing entity ref, remove the TQL link (local mode only)
    if (!isCloudMode && removedRef && isEntityReference(removedRef) && removedRef.direction === 'outgoing') {
      const sourceId = toEntityId(editableItem.id)
      const targetId = toEntityId(removedRef.entityId)
      try {
        await mutate({
          action: 'unlink',
          e1: sourceId,
          relation: 'references',
          e2: targetId,
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

  /**
   * Add a newly-created entity as a reference AND open it in a stacked dialog.
   *
   * Unlike `openEntityRef`, this doesn't require the entity to already be
   * in `allItems` — it polls briefly for the store to hydrate, then pushes
   * the entity onto the dialog stack so the user can fill in details.
   */
  async function createAndOpenEntityRef(ref: EntityReference) {
    // 1. Add the reference link (also pushes to local state)
    await addEntityRef(ref)

    // 2. Wait for the store to hydrate the new entity (SSE triggers re-fetch)
    const MAX_WAIT = 3000
    const POLL_INTERVAL = 100
    let elapsed = 0
    let targetItem: Entity | undefined

    while (elapsed < MAX_WAIT) {
      targetItem = allItems.value.find((e: Entity) => e.id === ref.entityId)
      if (targetItem) break
      await new Promise((r) => setTimeout(r, POLL_INTERVAL))
      elapsed += POLL_INTERVAL
    }

    if (!targetItem) {
      // Fallback: construct a minimal entity so the dialog can still open
      targetItem = { id: ref.entityId, type: ref.entityType as EntityType, title: ref.title } as Entity
    }

    // 3. Push onto the dialog stack
    const dialogStack = useDialogStack()
    if (dialogStack.size.value === 0) {
      dialogStack.setOriginTitle(editableItem.title, editableItem.id)
    }
    dialogStack.push(ref.entityId, ref.entityType, targetItem)
  }

  /**
   * Create a new entity of the given type + title, then link it as a reference
   * and open it in a stacked dialog for further editing.
   */
  async function createEntityAndLink(type: EntityType | string, rawTitle?: string) {
    const entityType = type as EntityType
    let label = entityType as string
    try {
      label = getEntityTypeConfig(entityType).label
    } catch {
      // fall back to raw type
    }
    const title = (rawTitle || '').trim() || `New ${label}`

    const { create: createItem } = useEntities()
    const defaults = createDefaultItem(entityType)
    const newItem = { ...defaults, title } as Entity
    const realId = await createItem(newItem)

    const ref: EntityReference = {
      kind: 'entity',
      id: `ref-${crypto.randomUUID().slice(0, 8)}`,
      entityId: realId,
      entityType,
      title,
      direction: 'outgoing',
    }
    await createAndOpenEntityRef(ref)
    return ref
  }

  return {
    addEntityRef,
    removeRef,
    openEntityRef,
    createEntityAndLink,
    createAndOpenEntityRef,
  }
}
