export type IconRailPosition = 'left' | 'bottom'

/**
 * Composable for managing layout preferences
 * Persists to localStorage and provides global state for layout style toggling
 */
export const useLayoutPreferences = () => {
  const STORAGE_KEY = 'layout-preferences'

  // Global state using useState for SSR compatibility
  const headerAboveSidebar = useState<boolean>('layout:headerAboveSidebar', () => true)
  const iconRailPosition = useState<IconRailPosition>('layout:iconRailPosition', () => 'bottom')

  // Load from localStorage on client
  if (import.meta.client) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      try {
        const parsed = JSON.parse(stored)
        headerAboveSidebar.value = parsed.headerAboveSidebar ?? true
        iconRailPosition.value = parsed.iconRailPosition ?? 'bottom'
      } catch {
        // Invalid JSON, use default
      }
    }
  }

  const _persist = () => {
    if (import.meta.client) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          headerAboveSidebar: headerAboveSidebar.value,
          iconRailPosition: iconRailPosition.value,
        }),
      )
    }
  }

  const setHeaderAboveSidebar = (enabled: boolean) => {
    headerAboveSidebar.value = enabled
    _persist()
  }

  const toggleHeaderAboveSidebar = () => {
    setHeaderAboveSidebar(!headerAboveSidebar.value)
  }

  const setIconRailPosition = (position: IconRailPosition) => {
    iconRailPosition.value = position
    _persist()
  }

  return {
    headerAboveSidebar: readonly(headerAboveSidebar),
    setHeaderAboveSidebar,
    toggleHeaderAboveSidebar,
    iconRailPosition: readonly(iconRailPosition),
    setIconRailPosition,
  }
}
