/**
 * Composable for managing layout preferences
 * Persists to localStorage and provides global state for layout style toggling
 */
export const useLayoutPreferences = () => {
  const STORAGE_KEY = 'layout-preferences'

  // Global state using useState for SSR compatibility
  const headerAboveSidebar = useState<boolean>('layout:headerAboveSidebar', () => true)

  // Load from localStorage on client
  if (import.meta.client) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      try {
        const parsed = JSON.parse(stored)
        headerAboveSidebar.value = parsed.headerAboveSidebar ?? true
      } catch {
        // Invalid JSON, use default
      }
    }
  }

  const setHeaderAboveSidebar = (enabled: boolean) => {
    headerAboveSidebar.value = enabled
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ headerAboveSidebar: enabled }))
    }
  }

  const toggleHeaderAboveSidebar = () => {
    setHeaderAboveSidebar(!headerAboveSidebar.value)
  }

  return {
    headerAboveSidebar: readonly(headerAboveSidebar),
    setHeaderAboveSidebar,
    toggleHeaderAboveSidebar,
  }
}
