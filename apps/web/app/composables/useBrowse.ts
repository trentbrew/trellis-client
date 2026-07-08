import { ref, computed, type Ref, type ComputedRef } from 'vue'

/**
 * Legacy browse-page view vocabulary. Being reconciled to the canonical
 * `ProjectionType` (see `lib/trellis-projection-registry/browse-view-mode.ts`).
 * Kept as a `const` tuple so the reconciliation map/test can enumerate every mode.
 */
export const BROWSE_VIEW_MODES = [
  'grid',
  'list',
  'table',
  'spreadsheet',
  'calendar',
  'kanban',
  'timeline',
  'gantt',
  'month',
  'week',
  'agenda',
  'moodboard',
  'graph',
  'form',
] as const

export type BrowseViewMode = (typeof BROWSE_VIEW_MODES)[number]

export type BrowseVariant = 'default' | 'people' | 'media' | 'articles'

export interface BrowseSortOption {
  value: string
  label: string
  icon?: string
}

export interface BrowseFilterOption {
  value: string
  label: string
}

export interface BrowseFilter {
  id: string
  label: string
  icon?: string
  options: BrowseFilterOption[]
  currentValue: Ref<any>
  setFilter: (value: any) => void
}

export interface BrowseState<T = any> {
  searchQuery: Ref<string>
  setSearchQuery: (value: string) => void
  sortOptions: BrowseSortOption[]
  currentSortLabel: ComputedRef<string>
  sortBy: Ref<string>
  sortDirection: Ref<'asc' | 'desc'>
  setSort: (value: string) => void
  toggleSortDirection: () => void
  viewMode: Ref<BrowseViewMode>
  setViewMode: (mode: BrowseViewMode) => void
  filteredItems: ComputedRef<T[]>
  hasSearch: ComputedRef<boolean>
  clearSearch: () => void
  filters: BrowseFilter[]
}

export interface UseBrowseOptions<T> {
  items: Ref<T[]>
  searchFields?: (keyof T)[]
  sortOptions?: BrowseSortOption[]
  defaultViewMode?: BrowseViewMode
  filters?: {
    id: string
    label: string
    icon?: string
    options: BrowseFilterOption[]
    fn: (item: T, value: any) => boolean
  }[]
}

export function useBrowse<T>(options: UseBrowseOptions<T>) {
  const searchQuery = ref('')
  const viewMode = ref<BrowseViewMode>(options.defaultViewMode || 'table')
  const sortBy = ref(options.sortOptions?.[0]?.value || '')
  const sortDirection = ref<'asc' | 'desc'>('asc')

  // Initialize filter values
  const filterValues: Record<string, Ref<any>> = {}
  if (options.filters) {
    options.filters.forEach((f) => {
      filterValues[f.id] = ref('all')
    })
  }

  const setSearchQuery = (val: string) => (searchQuery.value = val)
  const setViewMode = (mode: BrowseViewMode) => (viewMode.value = mode)
  const setSort = (val: string) => (sortBy.value = val)
  const toggleSortDirection = () => (sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc')
  const clearSearch = () => (searchQuery.value = '')

  const currentSortLabel = computed(() => {
    const option = options.sortOptions?.find((o) => o.value === sortBy.value)
    return option?.label || 'Sort'
  })

  const filteredItems = computed(() => {
    let result = [...options.items.value]

    // Apply Search
    if (searchQuery.value && options.searchFields?.length) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter((item) =>
        options.searchFields!.some((field) =>
          String(item[field] || '')
            .toLowerCase()
            .includes(q),
        ),
      )
    }

    // Apply Filters
    if (options.filters) {
      options.filters.forEach((f) => {
        const filterRef = filterValues[f.id]
        if (filterRef) {
          const val = filterRef.value
          if (val && val !== 'all') {
            result = result.filter((item) => f.fn(item, val))
          }
        }
      })
    }

    // Apply Sorting
    if (sortBy.value) {
      result.sort((a: any, b: any) => {
        const valA = a[sortBy.value]
        const valB = b[sortBy.value]
        if (valA === undefined || valB === undefined) return 0
        if (valA < valB) return sortDirection.value === 'asc' ? -1 : 1
        if (valA > valB) return sortDirection.value === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  })

  const browseState: BrowseState<T> = {
    searchQuery,
    setSearchQuery,
    sortOptions: options.sortOptions || [],
    currentSortLabel,
    sortBy,
    sortDirection,
    setSort,
    toggleSortDirection,
    viewMode,
    setViewMode,
    filteredItems,
    hasSearch: computed(() => !!searchQuery.value),
    clearSearch,
    filters: (options.filters || []).map((f) => {
      const currentValue = filterValues[f.id]
      if (!currentValue) {
        throw new Error(`Filter value for ${f.id} not found`)
      }
      return {
        id: f.id,
        label: f.label,
        icon: f.icon,
        options: f.options,
        currentValue,
        setFilter: (val: any) => {
          const filter = filterValues[f.id]
          if (filter) {
            filter.value = val
          }
        },
      }
    }),
  }

  return {
    browseState,
    searchQuery,
    viewMode,
    sortBy,
    sortDirection,
    filterValues,
    filteredItems,
  }
}
