import type { Entity, EntityType } from '~/types/entity'
import { createDefaultItem } from '~/types/entity'
import type { FormPresentation } from '~/lib/ontology-form-spec'
import { useBrowse, type BrowseState, type BrowseViewMode, type BrowseSortOption } from '~/composables/useBrowse'
import { useDialogUrl } from '~/composables/useDialogUrl'
import { useHashDialogRestore } from '~/composables/useHashDialogRestore'
import { deduplicateRecurringEntities } from '~/utils/recurrence'

// ── Types ──────────────────────────────────────────────────────────────

export interface BrowsePageFilterDef {
  id: string
  label: string
  icon?: string
  options: { value: string; label: string }[]
  fn: (_item: any, _value: any) => boolean
}

/** Accepts a single type string, an array, or a Ref to either. */
export type EntityTypeInput = string | string[] | Ref<string> | Ref<string[]>

export interface UseBrowsePageOptions {
  /** Entity type(s) to filter items by. Pass an array for multi-type pages (e.g. documents). */
  entityType: EntityTypeInput
  /** Fields to search within. Defaults to ['title', 'description']. */
  searchFields?: string[]
  /** Default view mode. Defaults to 'list'. */
  defaultViewMode?: BrowseViewMode
  /** Sort options for the browse toolbar */
  sortOptions?: BrowseSortOption[]
  /** Filter definitions for the browse toolbar */
  filters?: BrowsePageFilterDef[]
  /** Optional custom item filter applied after type filtering (e.g. file category facet). */
  itemFilter?: (_item: Entity) => boolean
  /** Reactive key — when it changes, `itemFilter` is re-applied (e.g. route category param). */
  itemFilterKey?: Ref<unknown>
  /** When set, non-dialog presentations route + New to Form view instead of empty-entity create. */
  formPresentation?: Ref<FormPresentation | undefined>
}

export interface UseBrowsePageReturn {
  // Data
  /** All items matching the entity type(s) (unfiltered by search/sort) */
  items: ComputedRef<Entity[]>
  /** All items across all types (raw from data layer) */
  allItems: Ref<Entity[]>
  /** Items after search, filter, and sort */
  filteredItems: ComputedRef<Entity[]>

  // Type info
  /** Set of resolved type strings being browsed */
  resolvedTypes: ComputedRef<Set<string>>
  /** Whether this is a multi-type browse page */
  isMultiType: ComputedRef<boolean>
  /** The currently "active" type — useful for dynamic card/layout switching.
   *  Defaults to the single type, or the first type in a multi-type array.
   *  Pages can set this reactively (e.g. from a filter pill). */
  activeType: Ref<string>

  // Browse
  browseState: BrowseState<Entity>
  viewMode: ComputedRef<BrowseViewMode>

  // Dialog — create (auto-create on open)
  createOpen: Ref<boolean>
  handleNewItem: (_typeOverride?: string) => Promise<void>

  // Dialog — view/edit
  viewOpen: Ref<boolean>
  viewingItem: Ref<Entity | null>
  openDetail: (_item: Entity) => void

  // Navigation within filtered list
  viewingIndex: ComputedRef<number>
  canPrev: ComputedRef<boolean>
  canNext: ComputedRef<boolean>
  navPrev: () => void
  navNext: () => void

  // CRUD handlers (close dialog after success)
  handleCreate: (_item: Entity) => Promise<void>
  handleUpdate: (_item: Entity) => Promise<void>
  handleDelete: (_item: Entity) => Promise<void>
}

// ── Composable ─────────────────────────────────────────────────────────

export function useBrowsePage(options: UseBrowsePageOptions): UseBrowsePageReturn {
  const {
    entityType,
    searchFields = ['title', 'description'],
    defaultViewMode = 'list',
    sortOptions = [
      { value: 'startDate', label: 'Date' },
      { value: 'title', label: 'Title' },
    ],
    filters = [],
    itemFilter,
    itemFilterKey,
    formPresentation,
  } = options

  // Normalise entityType into a reactive Set<string>
  const resolvedTypes = computed<Set<string>>(() => {
    const raw = isRef(entityType) ? entityType.value : entityType
    return new Set(Array.isArray(raw) ? raw : [raw])
  })

  const isMultiType = computed(() => resolvedTypes.value.size > 1)

  // Active type — pages can mutate this to switch card layouts dynamically
  const initialType = (() => {
    const raw = isRef(entityType) ? entityType.value : entityType
    return Array.isArray(raw) ? (raw[0] ?? '') : raw
  })()
  const activeType = ref<string>(initialType)

  // ---------------------------------------------------------------------------
  // Data source
  // ---------------------------------------------------------------------------

  const { items: allItems, create: createItem, update: updateItem, remove: removeItem } = useEntities()

  const items = computed<Entity[]>(() => {
    if (itemFilterKey) void itemFilterKey.value
    const typeSet = resolvedTypes.value
    let result = allItems.value.filter((i) => typeSet.has(i.type))
    if (itemFilter) result = result.filter(itemFilter)
    return deduplicateRecurringEntities(result) as Entity[]
  })

  // ---------------------------------------------------------------------------
  // Browse (search, filter, sort, view mode)
  // ---------------------------------------------------------------------------

  const { browseState, filteredItems } = useBrowse<Entity>({
    items: items as Ref<Entity[]>,
    searchFields: searchFields as (keyof Entity)[],
    defaultViewMode,
    sortOptions,
    filters,
  })

  const viewMode = computed<BrowseViewMode>(() => browseState.viewMode.value)

  // ---------------------------------------------------------------------------
  // Dialog state
  // ---------------------------------------------------------------------------

  const createOpen = ref(false)
  const viewOpen = ref(false)
  const _viewingItemId = ref<string | null>(null)
  const _pendingNewItem = ref<Entity | null>(null)

  // Resolve viewingItem from the live store by ID so it stays in sync
  // when items.value is re-hydrated (e.g. after SSE link mutations).
  // Falls back to _pendingNewItem for newly created items before store hydration.
  const viewingItem = computed<Entity | null>(() => {
    if (!_viewingItemId.value) return null
    return allItems.value.find((i) => i.id === _viewingItemId.value) ?? _pendingNewItem.value ?? null
  })

  function openDetail(item: Entity) {
    _viewingItemId.value = item.id
    viewOpen.value = true
    const { setOriginHash } = useDialogUrl()
    setOriginHash(item.id)
  }

  // Restore dialog from URL hash on page mount (deep-link support).
  // Use the full entity store — filtered browse items may lag behind hydration.
  useHashDialogRestore(allItems as Ref<Entity[]>, (entityId, item) => {
    _viewingItemId.value = entityId
    _pendingNewItem.value = item
    viewOpen.value = true
  })

  // Clear hash when dialog closes by any means (X, Escape, outside click)
  watch(viewOpen, (open) => {
    if (!open) {
      const { clearHash } = useDialogUrl()
      clearHash()
      _viewingItemId.value = null
      _pendingNewItem.value = null
    }
  })

  // ---------------------------------------------------------------------------
  // Navigation within filtered list
  // ---------------------------------------------------------------------------

  const viewingIndex = computed(() =>
    viewingItem.value ? filteredItems.value.findIndex((i) => i.id === viewingItem.value?.id) : -1,
  )

  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < filteredItems.value.length - 1)

  function navPrev() {
    if (canPrev.value) {
      _viewingItemId.value = (filteredItems.value[viewingIndex.value - 1] as Entity).id
    }
  }

  function navNext() {
    if (canNext.value) {
      _viewingItemId.value = (filteredItems.value[viewingIndex.value + 1] as Entity).id
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD handlers
  // ---------------------------------------------------------------------------

  async function handleCreate(item: Entity) {
    // If the item already has a type that's in our set, keep it; otherwise default to activeType
    const itemType = item.type && resolvedTypes.value.has(item.type) ? item.type : activeType.value
    await createItem({ ...item, type: itemType } as Entity)
    createOpen.value = false
  }

  /**
   * Create an empty entity immediately and open it in edit mode.
   * The entity exists in the graph from the start so references/links work.
   */
  async function handleNewItem(typeOverride?: string) {
    const { $toast } = useNuxtApp()

    const presentation = formPresentation?.value ?? 'entity-dialog'
    if (presentation !== 'entity-dialog') {
      browseState.setViewMode('form')
      return
    }

    try {
      const type = (typeOverride || activeType.value) as EntityType
      const defaults = createDefaultItem(type)
      const newId = await createItem({ ...defaults, type, title: '' } as Entity)
      _pendingNewItem.value = { ...defaults, id: newId } as Entity
      _viewingItemId.value = newId
      viewOpen.value = true
      const { setOriginHash } = useDialogUrl()
      setOriginHash(newId)
    } catch (error: any) {
      const message = typeof error?.message === 'string' ? error.message : String(error ?? 'Unknown error')
      const isTimeout = /transaction timed out|operation[- ]timed[- ]out/i.test(message)
      console.error('[useBrowsePage] failed to create new item:', error)
      $toast?.error('Could not create item', {
        description: isTimeout ? 'InstantDB timed out. Please try again in a moment.' : message,
      })
    }
  }

  async function handleUpdate(item: Entity) {
    await updateItem(item)
    viewOpen.value = false
    const { clearHash } = useDialogUrl()
    clearHash()
  }

  async function handleDelete(item: Entity) {
    await removeItem(item.id)
    viewOpen.value = false
    const { clearHash } = useDialogUrl()
    clearHash()
  }

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Data
    items,
    allItems,
    filteredItems: filteredItems as ComputedRef<Entity[]>,

    // Type info
    resolvedTypes,
    isMultiType,
    activeType,

    // Browse
    browseState,
    viewMode,

    // Dialog
    createOpen,
    viewOpen,
    viewingItem,
    openDetail,
    handleNewItem,

    // Navigation
    viewingIndex,
    canPrev,
    canNext,
    navPrev,
    navNext,

    // CRUD
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}
