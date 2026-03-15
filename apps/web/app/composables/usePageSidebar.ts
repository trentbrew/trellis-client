import { reactive, ref, watch } from 'vue'

/**
 * Module-level reactive state shared across all composable instances.
 * Allows a page to inject custom sidebar content into AppSidebar.
 */
const pageSidebarState = reactive({
  isActive: false,
  typeCounts: {} as Record<string, number>,
  activeTypeId: 'all' as string,
  onSelectType: null as ((_type: string) => void) | null,
})

const PINNED_STORAGE_KEY = 'browse:pinnedTypes'
const _pinnedTypes = ref<string[]>(['all'])

if (import.meta.client) {
  try {
    const stored = localStorage.getItem(PINNED_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      if (Array.isArray(parsed)) _pinnedTypes.value = parsed
    }
  }
  catch { /* ignore storage errors */ }

  watch(_pinnedTypes, (val) => {
    try { localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(val)) }
    catch { /* ignore storage errors */ }
  }, { deep: true })
}

export function usePageSidebar() {
  function activate(
    counts: Record<string, number>,
    activeId: string,
    onSelect: (_type: string) => void,
  ) {
    pageSidebarState.typeCounts = { ...counts }
    pageSidebarState.activeTypeId = activeId
    pageSidebarState.onSelectType = onSelect
    pageSidebarState.isActive = true
  }

  function updateCounts(counts: Record<string, number>) {
    pageSidebarState.typeCounts = { ...counts }
  }

  function updateActiveType(id: string) {
    pageSidebarState.activeTypeId = id
  }

  function deactivate() {
    pageSidebarState.isActive = false
    pageSidebarState.typeCounts = {}
    pageSidebarState.activeTypeId = 'all'
    pageSidebarState.onSelectType = null
  }

  function isPinned(type: string) {
    return _pinnedTypes.value.includes(type)
  }

  function togglePin(type: string) {
    if (_pinnedTypes.value.includes(type)) {
      _pinnedTypes.value = _pinnedTypes.value.filter(t => t !== type)
    } else {
      _pinnedTypes.value = [..._pinnedTypes.value, type]
    }
  }

  return {
    state: pageSidebarState,
    pinnedTypes: _pinnedTypes,
    activate,
    updateCounts,
    updateActiveType,
    deactivate,
    isPinned,
    togglePin,
  }
}
