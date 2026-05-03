export type IconRailPosition = 'left' | 'bottom'
export type ToolbarMode = 'floating' | 'static'
export type EnterKeyBehavior = 'send' | 'newline'

/**
 * Composable for managing layout preferences
 * Persists to localStorage and provides global state for layout style toggling
 */
export const useLayoutPreferences = () => {
  const STORAGE_KEY = 'layout-preferences'

  // Global state using useState for SSR compatibility
  const headerAboveSidebar = useState<boolean>('layout:headerAboveSidebar', () => true)
  const iconRailPosition = useState<IconRailPosition>('layout:iconRailPosition', () => 'bottom')
  const toolbarMode = useState<ToolbarMode>('layout:toolbarMode', () => 'floating')
  const showRecentPages = useState<boolean>('layout:showRecentPages', () => false)
  const enterKeyBehavior = useState<EnterKeyBehavior>('layout:enterKeyBehavior', () => 'send')

  // Load from localStorage on client
  if (import.meta.client) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      try {
        const parsed = JSON.parse(stored)
        headerAboveSidebar.value = parsed.headerAboveSidebar ?? true
        iconRailPosition.value = parsed.iconRailPosition ?? 'bottom'
        toolbarMode.value = parsed.toolbarMode ?? 'floating'
        showRecentPages.value = parsed.showRecentPages ?? false
        enterKeyBehavior.value = parsed.enterKeyBehavior ?? 'send'
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
          toolbarMode: toolbarMode.value,
          showRecentPages: showRecentPages.value,
          enterKeyBehavior: enterKeyBehavior.value,
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

  const setToolbarMode = (mode: ToolbarMode) => {
    toolbarMode.value = mode
    _persist()
  }

  const setShowRecentPages = (enabled: boolean) => {
    showRecentPages.value = enabled
    _persist()
  }

  const setEnterKeyBehavior = (behavior: EnterKeyBehavior) => {
    enterKeyBehavior.value = behavior
    _persist()
  }

  const resetLayoutPreferences = () => {
    setHeaderAboveSidebar(true)
    setIconRailPosition('bottom')
    setToolbarMode('floating')
    setShowRecentPages(false)
    setEnterKeyBehavior('send')
  }

  return {
    headerAboveSidebar: readonly(headerAboveSidebar),
    setHeaderAboveSidebar,
    toggleHeaderAboveSidebar,
    iconRailPosition: readonly(iconRailPosition),
    setIconRailPosition,
    toolbarMode: readonly(toolbarMode),
    setToolbarMode,
    showRecentPages: readonly(showRecentPages),
    setShowRecentPages,
    enterKeyBehavior: readonly(enterKeyBehavior),
    setEnterKeyBehavior,
    resetLayoutPreferences,
  }
}
