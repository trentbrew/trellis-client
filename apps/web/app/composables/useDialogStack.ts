import type { InjectionKey } from 'vue'
import type { EntityType } from '~/types/entity'
import type { Entity } from '~/types/entity'

// ============================================================================
// Dialog Stack — Global singleton for stacked entity dialog management
// ============================================================================

export interface DialogStackEntry {
  /** Unique key for this stack frame (used as Vue :key) */
  id: string
  /** The entity being displayed */
  entityId: string
  /** Entity type determines which dialog component to render */
  entityType: EntityType
  /** Resolved entity data */
  item: Entity
}

/**
 * Injection key for per-dialog stack context.
 * Provided by DialogStackHost wrapper around each stacked dialog.
 * Value: the 0-based index of this dialog in the stack.
 */
export const DIALOG_STACK_INDEX_KEY: InjectionKey<Ref<number>> = Symbol('dialog-stack-index')

/**
 * Injection key for the entity context of the current dialog.
 * Provided by dialog components so that nested TipTap NodeViews
 * (e.g. MentionChip) can navigate to referenced entities.
 */
export interface DialogEntityContext {
  id: string
  title: string
  type: string
}
export const DIALOG_ENTITY_CONTEXT_KEY: InjectionKey<DialogEntityContext> = Symbol('dialog-entity-context')

/** Module-level singleton state — shared across all consumers */
const stack = ref<DialogStackEntry[]>([])

/**
 * Shared dialog dimensions — set by the originating (bottom) dialog
 * so that stacked dialogs render at the same size.
 */
const sharedW = ref(0)
const sharedH = ref(0)

/** Title of the originating (page-managed) dialog beneath the stack */
const originTitle = ref('')
/** Entity ID of the originating (page-managed) dialog beneath the stack */
const originEntityId = ref('')

/**
 * Global dialog stack composable.
 *
 * Manages an ordered stack of entity dialogs. When a user clicks
 * an entity reference inside an open dialog, the referenced entity
 * is pushed onto the stack. The topmost dialog is fully interactive;
 * dialogs below it are scaled down, nudged upward, and non-interactive.
 */
export function useDialogStack() {
  /** Push a new entity dialog onto the stack */
  function push(entityId: string, entityType: EntityType, item: Entity) {
    // Prevent duplicate top-of-stack
    const top = stack.value[stack.value.length - 1]
    if (top?.entityId === entityId) return

    stack.value.push({
      id: `dialog-${entityId}-${Date.now()}`,
      entityId,
      entityType,
      item,
    })
  }

  /** Set the title and entity ID of the originating dialog (call from useEntityReferences before pushing) */
  function setOriginTitle(title: string, entityId?: string) {
    originTitle.value = title
    if (entityId) originEntityId.value = entityId
  }

  /** Pop the topmost dialog off the stack */
  function pop() {
    stack.value.pop()
  }

  /** Clear the entire stack */
  function clear() {
    stack.value.splice(0)
    originEntityId.value = ''
  }

  /** Number of dialogs in the stack */
  const size = computed(() => stack.value.length)

  /** Whether any stacked dialogs are open */
  const isOpen = computed(() => stack.value.length > 0)

  /**
   * Compute the distance-from-top for a dialog.
   *
   * @param stackIndex — The dialog's index in the stack.
   *   - `>= 0` → stacked dialog at that index
   *   - `-1`   → originating (page-managed) dialog sitting beneath the stack
   */
  function distFromTop(stackIndex: number): number {
    const sz = stack.value.length
    if (sz === 0) return 0
    if (stackIndex < 0) return sz // originating dialog: all stack entries above
    return sz - 1 - stackIndex
  }

  /**
   * Compute the CSS transform/translate adjustments for stack depth.
   * Returns an object with `scale`, `offsetY`, `opacity`, and `pointerEvents`.
   * Dialog shells merge these into their existing fixed-position style.
   */
  function getStackTransform(stackIndex: number) {
    const d = distFromTop(stackIndex)
    const hasStack = stack.value.length > 0
    if (d === 0) {
      // Topmost dialog — slight downward nudge so background dialogs peek above
      return { scale: 1, offsetY: hasStack && stackIndex >= 0 ? 16 : 0, brightness: 1, interactive: true }
    }
    // Background dialogs — scale down + shift up, darken via filter:brightness
    return {
      scale: Math.max(0.78, 1 - d * 0.03),
      offsetY: d * -28,
      brightness: Math.max(0.4, 1 - d * 0.12),
      interactive: false,
    }
  }

  /**
   * Get the title of the dialog one level below the given stack index.
   * For index 0 → returns the originating dialog's title (not in the stack).
   * For index > 0 → returns stack[index - 1].item.title.
   */
  function parentTitle(stackIndex: number): string | undefined {
    if (stackIndex < 0) return undefined
    if (stackIndex === 0) return originTitle.value || undefined // first stacked → originating dialog
    return stack.value[stackIndex - 1]?.item?.title
  }

  /** Report dialog dimensions from the originating (page-managed) dialog */
  function setSharedDimensions(w: number, h: number) {
    sharedW.value = w
    sharedH.value = h
  }

  return {
    stack: readonly(stack),
    size,
    isOpen,
    push,
    pop,
    clear,
    distFromTop,
    getStackTransform,
    parentTitle,
    setOriginTitle,
    originEntityId: readonly(originEntityId),
    sharedW: readonly(sharedW),
    sharedH: readonly(sharedH),
    setSharedDimensions,
  }
}
