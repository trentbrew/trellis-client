import type { Entity, EntityType, EntityReference, PropertyFieldId } from '~/types/entity'
import { createDefaultItem, CATEGORY_OPTIONS } from '~/types/entity'
import { typeHasField } from '~/config/entityRegistry'
import { useComments } from '~/composables/useComments'

/**
 * Shared dialog logic extracted from EntityDialog, PersonDialog,
 * OrganizationDialog, ProjectDialog, and FileDialog.
 *
 * Handles: mode management, editableItem hydration, auto-save,
 * comments, entity references, owner filtering, close/save/delete.
 *
 * Each dialog component uses this composable and adds only its
 * type-specific UI (property pills, content panels, shell).
 */

export interface EntityDialogProps {
  open: boolean
  mode: 'view' | 'create' | 'edit'
  item: Entity | null
  itemType: EntityType
  canNavigatePrev: boolean
  canNavigateNext: boolean
  owners: { id: string; name: string }[]
}

export type EntityDialogEmit = (_event: string, ..._args: any[]) => void

export interface UseEntityDialogOptions {
  /** Default entity type for create mode. */
  defaultType: EntityType
  /** Called after editableItem is populated with defaults for a blank create. */
  afterInitBlank?: (_item: any) => void
  /** Called before each auto-save. Use for formulas, field defaults, etc. */
  beforeSave?: (_item: any) => void | Promise<void>
}

export function useEntityDialog(props: EntityDialogProps, emit: EntityDialogEmit, options: UseEntityDialogOptions) {
  const { user: currentUser } = useInstantAuth()

  // ── Mode ─────────────────────────────────────────────────────────
  const mode = computed(() => props.mode)
  const isViewMode = computed(() => mode.value === 'view')
  const isCreateMode = computed(() => mode.value === 'create')
  const isEditMode = computed(() => mode.value === 'edit')

  // ── Editable item ────────────────────────────────────────────────
  // Uses `any` because Vue's Reactive wrapper doesn't support
  // discriminated-union narrowing in templates. Runtime type guards
  // (isTask, isEvent, …) ensure correctness.
  const editableItem: any = reactive(createDefaultItem(props.itemType || options.defaultType))

  const hasField = (fieldId: PropertyFieldId): boolean => {
    try {
      return typeHasField(editableItem.type, fieldId)
    } catch {
      return false
    }
  }

  // Track which entity ID is currently loaded into editableItem.
  // Only do a full overwrite when the entity ID changes (switching
  // entities) or on first load. While the dialog is open in edit mode,
  // local state is authoritative — subscription echoes of our own
  // saves must NOT clobber edits.
  const _loadedItemId = ref<string | null>(null)

  watch(
    () => props.item?.id,
    (newId) => {
      if (newId && newId !== _loadedItemId.value) {
        const newItem = props.item!
        const defaults = createDefaultItem(newItem.type)
        Object.assign(editableItem, { ...defaults, ...newItem })
        _loadedItemId.value = newId
      } else if (!newId && isCreateMode.value) {
        const defaults = createDefaultItem(props.itemType || options.defaultType)
        Object.assign(editableItem, { ...defaults })
        _loadedItemId.value = null
      }
    },
    { immediate: true },
  )

  // ── Init blank create item ───────────────────────────────────────
  function initBlankCreateItem() {
    const defaults = createDefaultItem(options.defaultType)
    Object.assign(editableItem, {
      ...defaults,
      id: '',
      title: '',
      description: '',
      tags: [],
      category: '',
      owner: undefined,
      involved: [],
    })
    options.afterInitBlank?.(editableItem)
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen && isCreateMode.value && !props.item) initBlankCreateItem()
    },
  )

  // ── Comments ─────────────────────────────────────────────────────
  const currentEntityId = computed(() => editableItem.id || undefined)
  const { displayActivity, addComment: persistComment, loading: commentsLoading } = useComments(currentEntityId)

  const newComment = ref('')
  async function handleAddComment() {
    if (newComment.value.trim()) {
      await persistComment(newComment.value.trim())
      newComment.value = ''
    }
  }

  // ── Auto-save ────────────────────────────────────────────────────
  const { status: saveStatus, formatLastSaved } = useAutoSave(editableItem, {
    enabled: isEditMode,
    beforeSave: options.beforeSave,
  })

  // ── AI summary ──────────────────────────────────────────────────
  // Lazy-generates a 1–3 sentence summary of the entity's description
  // (persisted as `summary`). Rendered in the dialog header; composable
  // dedupes via source-hash, so the watcher is safe to fire often.
  const {
    ensure: _ensureSummary,
    regenerate: _regenerateSummary,
    isGenerating: _isSummaryGenerating,
  } = useEntitySummary()

  watch(
    () => [editableItem.id, editableItem.description] as const,
    () => {
      if (isCreateMode.value) return
      if (!editableItem.id || !editableItem.description) return
      void _ensureSummary(editableItem)
    },
    { immediate: true },
  )

  const entitySummary = computed(() => (editableItem.summary || '').trim())
  const isGeneratingSummary = computed(() => !!editableItem.id && _isSummaryGenerating(editableItem.id))
  function regenerateSummary() {
    if (!editableItem.id) return
    void _regenerateSummary(editableItem)
  }

  // ── Entity references ────────────────────────────────────────────
  const {
    addEntityRef,
    removeRef: removeEntityRef,
    openEntityRef: handleOpenEntityRef,
    createAndOpenEntityRef,
    createEntityAndLink,
  } = useEntityReferences(editableItem)

  const entityPickerOpen = ref(false)
  const entityPickerFilterType = ref<string | undefined>(undefined)

  // ── Right sidebar layout ─────────────────────────────────────────
  const rightSidebarW = ref(360)
  const rightSidebarCollapsed = ref(false)
  const isResizingSidebar = ref(false)

  function startRightSidebarResize(e: PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    isResizingSidebar.value = true
    const startX = e.clientX
    const startW = rightSidebarW.value
    document.body.style.cursor = 'ew-resize'
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      rightSidebarW.value = Math.max(240, Math.min(560, startW - dx))
    }
    const onUp = () => {
      isResizingSidebar.value = false
      document.body.style.cursor = ''
      el.releasePointerCapture(e.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  function handleAddEntityRef(ref: EntityReference) {
    addEntityRef(ref)
  }
  function handleCreatedEntityRef(ref: EntityReference) {
    createAndOpenEntityRef(ref)
  }
  function handleCreateEntityOfType(type: string, title: string) {
    void createEntityAndLink(type, title)
  }
  function handleRemoveRef(refId: string) {
    removeEntityRef(refId)
  }

  // ── Owner filtering ──────────────────────────────────────────────
  const ownerSearch = ref('')
  const owners = computed(() => props.owners ?? [])
  const isOwnerUnset = computed(() => !editableItem.owner)

  const filteredOwners = computed(() => {
    let list = owners.value
    if (ownerSearch.value) {
      const s = ownerSearch.value.toLowerCase()
      list = list.filter((o) => o.name.toLowerCase().includes(s))
    }
    if (currentUser.value?.id) {
      const uid = currentUser.value.id
      list = [...list].sort((a, b) => (a.id === uid ? -1 : b.id === uid ? 1 : 0))
    }
    return list
  })

  // ── Category ─────────────────────────────────────────────────────
  const currentCategory = computed(() => CATEGORY_OPTIONS.find((c) => c.value === editableItem.category))

  // ── Validation ───────────────────────────────────────────────────
  const isFormValid = computed(() => !!editableItem.title?.trim())

  // ── Actions ──────────────────────────────────────────────────────
  function closeDialog() {
    emit('update:open', false)
    emit('close')
  }

  function handleSave() {
    emit('save', { ...editableItem } as Entity)
    closeDialog()
  }

  function handleDelete() {
    emit('delete', { ...editableItem } as Entity)
    closeDialog()
  }

  return {
    // Mode
    mode,
    isViewMode,
    isCreateMode,
    isEditMode,

    // Core state
    editableItem,
    hasField,
    isFormValid,
    currentUser,

    // Comments
    displayActivity,
    commentsLoading,
    newComment,
    handleAddComment,

    // Auto-save
    saveStatus,
    formatLastSaved,

    // AI summary
    entitySummary,
    isGeneratingSummary,
    regenerateSummary,

    // Entity references
    entityPickerOpen,
    entityPickerFilterType,
    handleAddEntityRef,
    handleCreatedEntityRef,
    handleCreateEntityOfType,
    handleRemoveRef,
    handleOpenEntityRef,

    // Right sidebar layout
    rightSidebarW,
    rightSidebarCollapsed,
    isResizingSidebar,
    startRightSidebarResize,

    // Owners
    ownerSearch,
    owners,
    isOwnerUnset,
    filteredOwners,

    // Category
    currentCategory,

    // Actions
    closeDialog,
    handleSave,
    handleDelete,
    initBlankCreateItem,
  }
}
