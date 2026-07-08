import type { Ref } from 'vue'
import { buildBrowseFilterFields } from '~/lib/browse-filter-fields'
import { useAdvancedFilters, type AdvancedFilterState } from '~/composables/useAdvancedFilters'
import { useOntologyRegistry } from '~/composables/useOntologyRegistry'

export interface UseBrowseAdvancedFiltersOptions {
  /** Entity type slug(s) currently being browsed. */
  entityTypes: Ref<string[]>
}

export function useBrowseAdvancedFilters(options: UseBrowseAdvancedFiltersOptions) {
  const { getEntityConfig } = useOntologyRegistry()

  const filterFields = computed(() =>
    buildBrowseFilterFields(options.entityTypes.value, getEntityConfig),
  )

  const advancedFilters = shallowRef<AdvancedFilterState | null>(null)

  watch(
    filterFields,
    (fields) => {
      advancedFilters.value = fields.length > 0 ? useAdvancedFilters({ fields }) : null
    },
    { immediate: true },
  )

  function applyAdvancedFilters<T>(items: T[]): T[] {
    const filters = advancedFilters.value
    if (!filters?.hasActiveFilters.value) return items
    return filters.filterItems(items)
  }

  return {
    advancedFilters,
    filterFields,
    applyAdvancedFilters,
  }
}
