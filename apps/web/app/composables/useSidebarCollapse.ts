/**
 * Composable for managing sidebar collapse state (per-page)
 */
export const useSidebarCollapse = () => {
  const storageKey = 'sidebar-collapsed'
  const explicitKey = 'sidebar-collapsed:explicit'
  const route = useRoute()
  const { findRoute } = useRoutes()

  // Shared state so AppHeader + AppSidebar always see the same collapse value
  const isCollapsed = useState<boolean>('sidebarCollapsed', () => false)

  // True when the current route forces the sidebar closed (user cannot reopen)
  const isForcedCollapsed = useState<boolean>('sidebarForcedCollapsed', () => false)

  const loadCollapsedState = () => {
    if (!import.meta.client) return

    try {
      const explicit = localStorage.getItem(explicitKey)
      if (explicit !== 'true') {
        isCollapsed.value = false
        return
      }

      const stored = localStorage.getItem(storageKey)
      if (stored === null) {
        isCollapsed.value = false
        return
      }

      const parsed = JSON.parse(stored)
      if (typeof parsed !== 'boolean') return

      isCollapsed.value = parsed
    } catch (error) {
      console.error('Failed to load sidebar collapse state:', error)
    }
  }

  // Persist user's explicit choice to localStorage
  const setCollapsed = (collapsed: boolean) => {
    isCollapsed.value = collapsed

    if (import.meta.client) {
      try {
        localStorage.setItem(explicitKey, 'true')
        localStorage.setItem(storageKey, JSON.stringify(collapsed))
      } catch (error) {
        console.error('Failed to save sidebar collapse state:', error)
      }
    }
  }

  // Force-collapse without touching localStorage (route-driven, not user-driven)
  const forceCollapsed = (collapsed: boolean) => {
    isCollapsed.value = collapsed
    isForcedCollapsed.value = collapsed
  }

  const toggle = () => {
    if (isForcedCollapsed.value) return
    setCollapsed(!isCollapsed.value)
  }

  // Apply route-based sidebar collapse
  const applyRouteCollapseBehavior = () => {
    if (!import.meta.client) return

    const routeConfig = findRoute(route.path)

    if (routeConfig?.collapseSidebar === true) {
      // Route forces sidebar closed — do NOT write to localStorage
      forceCollapsed(true)
    } else {
      // Leaving a forced-collapse route: clear the force flag and restore
      isForcedCollapsed.value = false

      if (routeConfig?.collapseSidebar === false) {
        // Route explicitly requests expanded sidebar
        setCollapsed(false)
      } else {
        // No route preference — restore user's last explicit choice, default expanded
        const explicit = localStorage.getItem(explicitKey)
        if (explicit !== 'true') {
          isCollapsed.value = false
        } else {
          const stored = localStorage.getItem(storageKey)
          isCollapsed.value = stored ? JSON.parse(stored) : false
        }
      }
    }
  }

  onMounted(() => {
    loadCollapsedState()
    nextTick(() => {
      applyRouteCollapseBehavior()
    })
  })

  // Watch for route changes and apply route-based collapse behavior
  watch(
    () => route.path,
    () => {
      nextTick(() => {
        applyRouteCollapseBehavior()
      })
    },
  )

  return {
    isCollapsed,
    isForcedCollapsed,
    toggle,
    setCollapsed,
    forceCollapsed,
  }
}
