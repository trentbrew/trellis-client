/**
 * Composable for managing pinned sidebar items
 */
export const usePinnedItems = () => {
  const storageKey = 'pinned-sidebar-items'
  const pinnedItems = useState<string[]>('pinned-sidebar-items.v1', () => [])
  const isLoaded = useState<boolean>('pinned-sidebar-items-loaded.v1', () => false)

  // Load pinned items from localStorage
  const loadPinnedItems = () => {
    if (import.meta.client) {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) {
            pinnedItems.value = parsed
          } else {
            pinnedItems.value = []
          }
        }
      } catch (error) {
        console.error('Failed to load pinned items:', error)
        pinnedItems.value = []
      }
      isLoaded.value = true
    }
  }

  // Save pinned items to localStorage
  const savePinnedItems = () => {
    if (import.meta.client) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(pinnedItems.value))
      } catch (error) {
        console.error('Failed to save pinned items:', error)
      }
    }
  }

  // Check if an item is pinned
  const isPinned = (path: string) => {
    return pinnedItems.value.includes(path)
  }

  // Toggle pin status
  const togglePin = (path: string) => {
    if (isPinned(path)) {
      pinnedItems.value = pinnedItems.value.filter((p) => p !== path)
    } else {
      pinnedItems.value.push(path)
    }
    savePinnedItems()
  }

  // Get pinned items from route config
  const getPinnedItems = (allItems: any[]) => {
    const itemsByPath = new Map<string, any>()
    allItems.forEach((item) => {
      if (item?.path) itemsByPath.set(item.path, item)
    })

    return pinnedItems.value.map((path) => itemsByPath.get(path)).filter(Boolean)
  }

  // Get unpinned items
  const getUnpinnedItems = (allItems: any[]) => {
    return allItems.filter((item) => !item?.path || !isPinned(item.path))
  }

  // Initialize immediately if on client
  if (import.meta.client && !isLoaded.value) {
    loadPinnedItems()
  }

  return {
    pinnedItems: readonly(pinnedItems),
    isLoaded: readonly(isLoaded),
    isPinned,
    togglePin,
    getPinnedItems,
    getUnpinnedItems,
  }
}
