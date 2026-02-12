import type { CalendarItem } from '~/types/calendarItem'
import { useBrowse, type BrowseState, type BrowseViewMode, type BrowseSortOption } from '~/composables/useBrowse'

// ── Types ──────────────────────────────────────────────────────────────

export interface BrowsePageFilterDef {
  id: string
  label: string
  icon?: string
  options: { value: string; label: string }[]
  fn: (_item: any, _value: any) => boolean
}

export interface UseBrowsePageOptions {
  /** Entity type to filter items by (e.g., 'note', 'task', 'bookmark') */
  entityType: string | Ref<string>
  /** Fields to search within. Defaults to ['title', 'description']. */
  searchFields?: string[]
  /** Default view mode. Defaults to 'list'. */
  defaultViewMode?: BrowseViewMode
  /** Sort options for the browse toolbar */
  sortOptions?: BrowseSortOption[]
  /** Filter definitions for the browse toolbar */
  filters?: BrowsePageFilterDef[]
}

export interface UseBrowsePageReturn {
  // Data
  /** All items of the given entity type (unfiltered) */
  items: ComputedRef<CalendarItem[]>
  /** All items across all types (raw from data layer) */
  allItems: Ref<CalendarItem[]>
  /** Items after search, filter, and sort */
  filteredItems: ComputedRef<CalendarItem[]>

  // Browse
  browseState: BrowseState<CalendarItem>
  viewMode: ComputedRef<BrowseViewMode>

  // Dialog — create
  createOpen: Ref<boolean>

  // Dialog — view/edit
  viewOpen: Ref<boolean>
  viewingItem: Ref<CalendarItem | null>
  openDetail: (_item: CalendarItem) => void

  // Navigation within filtered list
  viewingIndex: ComputedRef<number>
  canPrev: ComputedRef<boolean>
  canNext: ComputedRef<boolean>
  navPrev: () => void
  navNext: () => void

  // CRUD handlers (close dialog after success)
  handleCreate: (_item: CalendarItem) => Promise<void>
  handleUpdate: (_item: CalendarItem) => Promise<void>
  handleDelete: (_item: CalendarItem) => Promise<void>
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
  } = options

  const resolvedType = computed(() =>
    typeof entityType === 'string' ? entityType : entityType.value,
  )

  // ---------------------------------------------------------------------------
  // Data source
  // ---------------------------------------------------------------------------

  const {
    items: allItems,
    create: createItem,
    update: updateItem,
    remove: removeItem,
  } = useCalendarItems()

  const items = computed<CalendarItem[]>(() =>
    allItems.value.filter((i) => i.type === resolvedType.value),
  )

  // ---------------------------------------------------------------------------
  // Browse (search, filter, sort, view mode)
  // ---------------------------------------------------------------------------

  const { browseState, filteredItems } = useBrowse<CalendarItem>({
    items: items as Ref<CalendarItem[]>,
    searchFields: searchFields as (keyof CalendarItem)[],
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
  const viewingItem = ref<CalendarItem | null>(null)

  function openDetail(item: CalendarItem) {
    viewingItem.value = item
    viewOpen.value = true
  }

  // ---------------------------------------------------------------------------
  // Navigation within filtered list
  // ---------------------------------------------------------------------------

  const viewingIndex = computed(() =>
    viewingItem.value
      ? filteredItems.value.findIndex((i) => i.id === viewingItem.value?.id)
      : -1,
  )

  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < filteredItems.value.length - 1)

  function navPrev() {
    if (canPrev.value) {
      viewingItem.value = filteredItems.value[viewingIndex.value - 1] as CalendarItem
    }
  }

  function navNext() {
    if (canNext.value) {
      viewingItem.value = filteredItems.value[viewingIndex.value + 1] as CalendarItem
    }
  }

  // ---------------------------------------------------------------------------
  // CRUD handlers
  // ---------------------------------------------------------------------------

  async function handleCreate(item: CalendarItem) {
    await createItem({ ...item, type: resolvedType.value } as CalendarItem)
    createOpen.value = false
  }

  async function handleUpdate(item: CalendarItem) {
    await updateItem(item)
    viewOpen.value = false
  }

  async function handleDelete(item: CalendarItem) {
    await removeItem(item.id)
    viewOpen.value = false
  }

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Data
    items,
    allItems,
    filteredItems: filteredItems as ComputedRef<CalendarItem[]>,

    // Browse
    browseState,
    viewMode,

    // Dialog
    createOpen,
    viewOpen,
    viewingItem,
    openDetail,

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
