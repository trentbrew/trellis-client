/**
 * Composable for managing sidebar collapse state (per-page)
 */
export const useSidebarCollapse = () => {
  const storageKey = 'sidebar-collapsed'
  const explicitKey = 'sidebar-collapsed:explicit'

  // Shared state so AppHeader + AppSidebar always see the same collapse value
  const isCollapsed = useState<boolean>('sidebarCollapsed', () => false)

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
        // No stored state for this route; default to expanded
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

  const toggle = () => {
    setCollapsed(!isCollapsed.value)
  }

  // Apply route-based sidebar collapse
  const applyRouteCollapseBehavior = () => {
    if (!import.meta.client) return

    const route = useRoute()
    const { findRoute } = useRoutes()

    // Find the route configuration for the current path
    const routeConfig = findRoute(route.path)

    if (routeConfig?.collapseSidebar === true) {
      // Route explicitly requests collapsed sidebar
      setCollapsed(true)
    } else if (routeConfig?.collapseSidebar === false) {
      // Route explicitly requests expanded sidebar
      setCollapsed(false)
    } else {
      // No explicit preference - use user's last choice if they've made one
      const explicit = localStorage.getItem(explicitKey)
      if (explicit !== 'true') {
        // User hasn't explicitly set a preference, default to expanded
        setCollapsed(false)
      }
      // Otherwise, keep their last explicit choice
    }
  }

  onMounted(() => {
    loadCollapsedState()
    // Apply route-based behavior after initial load
    nextTick(() => {
      applyRouteCollapseBehavior()
    })
  })

  // Watch for route changes and apply route-based collapse behavior
  watch(
    () => useRoute().path,
    () => {
      nextTick(() => {
        applyRouteCollapseBehavior()
      })
    },
  )

  return {
    isCollapsed,
    toggle,
    setCollapsed,
  }
}
