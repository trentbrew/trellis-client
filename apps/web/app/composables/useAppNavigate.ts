import { animate } from 'motion-v'

import { getCleanPath } from '~/config/routes'

let pageElement: HTMLElement | null = null
let isTransitioning = false
let lastCustomNavigationTime = 0
const CUSTOM_NAV_THRESHOLD = 100 // ms - time window to detect custom navigation

// Faster transition durations for more responsive feel
const LEAVE_DURATION = 0.08 // 80ms - quick fade out
const ENTER_DELAY = 0.3 // 50ms - slight delay so sidebar enters first
const ENTER_DURATION = 0.12 // 120ms - smooth fade in

const navLog = (...args: any[]) => {
  if (!import.meta.dev) return
  console.log('[useAppNavigate]', ...args)
}

// Performance timing helper
const perfLog = (label: string, startTime: number) => {
  const elapsed = performance.now() - startTime
  console.log(`[nav-perf] ${label}: ${elapsed.toFixed(1)}ms`)
  return performance.now()
}

const scrollToTop = () => {
  if (!import.meta.client || !pageElement) return
  pageElement.scrollTo({ top: 0, behavior: 'instant' })
}

const selectFirstItem = () => {
  if (!import.meta.client) return

  nextTick(() => {
    const routes = useRoutes()
    const pinned = usePinnedItems()
    const router = useRouter()

    navLog('selectFirstItem: start', {
      currentPath: router.currentRoute.value.path,
    })

    const currentSectionLinks = routes.currentSectionLinks.value
    const pinnedItems = pinned.getPinnedItems(currentSectionLinks)
    const unpinnedItems = pinned.getUnpinnedItems(currentSectionLinks)

    const allItems = [...pinnedItems, ...unpinnedItems]

    if (allItems.length > 0 && allItems[0]?.path) {
      const firstItemPath = allItems[0].path

      navLog('selectFirstItem: candidate', {
        firstItemPath,
        currentPath: router.currentRoute.value.path,
      })

      if (router.currentRoute.value.path !== firstItemPath) {
        navLog('selectFirstItem: redirecting', {
          from: router.currentRoute.value.path,
          to: firstItemPath,
        })
        router.push(firstItemPath)
      }
    }
  })
}

const isPlainLeftClick = (e: MouseEvent) => {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

const performTransition = async (direction: 'forward' | 'back' = 'forward', skipLeave = false) => {
  if (!import.meta.client || !pageElement || isTransitioning) return

  isTransitioning = true
  const el = pageElement

  try {
    if (!skipLeave) {
      // LEAVE: start immediately (no perceived lag)
      el.style.pointerEvents = 'none'
      el.style.opacity = '1'
      el.style.transform = 'translateY(0px)'

      // For back navigation, reverse the direction
      const leaveY = direction === 'back' ? 4 : -4
      const leaveControls = animate(
        el,
        { opacity: [1, 0] as any, y: [0, leaveY] as any } as any,
        { duration: LEAVE_DURATION, easing: 'ease-in' } as any,
      )

      // Wait for the leave animation to complete
      await leaveControls.finished

      // Keep wrapper hidden during the swap to prevent any flash
      el.style.opacity = '0'
      el.style.transform = direction === 'back' ? 'translateY(-4px)' : 'translateY(4px)'

      // Wait for route change to complete
      await nextTick()
    } else {
      // For browser navigation, route has already changed, so wait for DOM update
      await nextTick()
    }

    // ENTER: Set initial state and animate in
    el.style.pointerEvents = 'none'
    el.style.opacity = '0'
    el.style.transform = direction === 'back' ? 'translateY(-4px)' : 'translateY(4px)'

    const enterControls = animate(
      el,
      { opacity: [0, 1] as any, y: [direction === 'back' ? -4 : 4, 0] as any } as any,
      {
        duration: ENTER_DURATION,
        easing: 'ease-out',
      } as any,
    )

    await enterControls.finished
  } finally {
    if (pageElement) {
      pageElement.style.pointerEvents = ''
      pageElement.style.opacity = ''
      pageElement.style.transform = ''
    }
    isTransitioning = false
  }
}

export const useAppNavigate = () => {
  const router = useRouter()
  const route = useRoute()
  const { animationsEnabled } = useAnimationSettings()

  const resolvePath = (to: string): string => {
    if (typeof to !== 'string' || !to) return to
    return to
  }

  const registerPageElement = (el: HTMLElement | null) => {
    pageElement = el
  }

  const navigate = async (to: string, e?: MouseEvent) => {
    if (e && !isPlainLeftClick(e)) return

    const resolvedTo = resolvePath(to)
    if (!resolvedTo || resolvedTo === route.path) return

    // If animations are disabled, just navigate directly
    if (!animationsEnabled.value) {
      await router.push(resolvedTo)
      scrollToTop()
      return
    }

    navLog('navigate: request', {
      from: route.path,
      to: resolvedTo,
      hasPageElement: !!pageElement,
      isTransitioning,
    })

    // If we're not on the client or we don't have a target element yet, just navigate.
    if (!import.meta.client || !pageElement) {
      navLog('navigate: router.push (no page element)')
      await router.push(resolvedTo)
      return
    }

    // Prevent router churn if user double-clicks.
    if (isTransitioning) return
    isTransitioning = true
    lastCustomNavigationTime = Date.now()

    const el = pageElement
    let t = performance.now()
    console.log('[nav-perf] === Navigation started ===')

    try {
      // Determine direction based on path depth using clean paths for consistency
      const currentClean = getCleanPath(route.path)
      const targetClean = getCleanPath(resolvedTo)
      const currentDepth = currentClean.split('/').filter(Boolean).length
      const targetDepth = targetClean.split('/').filter(Boolean).length
      const direction: 'forward' | 'back' = targetDepth < currentDepth ? 'back' : 'forward'

      t = perfLog('setup', t)

      // LEAVE: start immediately (no perceived lag)
      el.style.pointerEvents = 'none'
      el.style.opacity = '1'
      el.style.transform = 'translateY(0px)'

      const leaveY = direction === 'back' ? 4 : -4
      const leaveControls = animate(
        el,
        { opacity: [1, 0] as any, y: [0, leaveY] as any } as any,
        { duration: LEAVE_DURATION, easing: 'ease-in' } as any,
      )

      // Start route change immediately in parallel with leave animation
      const routeChangePromise = router.push(resolvedTo)

      t = perfLog('animations+route started', t)

      // Wait for both leave animation and route change to complete
      await Promise.all([leaveControls.finished, routeChangePromise])

      t = perfLog('leave+route complete', t)

      // Keep wrapper hidden during the swap to prevent any flash.
      el.style.opacity = '0'
      el.style.transform = direction === 'back' ? 'translateY(-4px)' : 'translateY(4px)'

      await nextTick()

      t = perfLog('nextTick after route', t)

      // ENTER: slight delay so sidebar content enters first
      el.style.pointerEvents = 'none'
      el.style.opacity = '0'
      el.style.transform = direction === 'back' ? 'translateY(-4px)' : 'translateY(4px)'

      const enterControls = animate(
        el,
        { opacity: [0, 1] as any, y: [direction === 'back' ? -4 : 4, 0] as any } as any,
        { duration: ENTER_DURATION, delay: ENTER_DELAY, easing: 'ease-out' } as any,
      )

      await enterControls.finished

      perfLog('enter complete', t)
    } finally {
      if (pageElement) {
        pageElement.style.pointerEvents = ''
        pageElement.style.opacity = ''
        pageElement.style.transform = ''
      }
      isTransitioning = false
      scrollToTop()
      navLog('navigate: done', {
        currentPath: router.currentRoute.value.path,
      })
    }
  }

  return {
    navigate,
    registerPageElement,
    resolvePath,
    selectFirstItem,
  }
}

// Export function to handle browser navigation
export const handleBrowserNavigation = async (direction: 'forward' | 'back' = 'back') => {
  const now = Date.now()
  const timeSinceCustomNav = now - lastCustomNavigationTime

  // If custom navigation happened recently, skip browser navigation transition
  if (timeSinceCustomNav < CUSTOM_NAV_THRESHOLD) {
    return
  }

  // For browser navigation, route has already changed, so skip leave animation
  await performTransition(direction, true)
  scrollToTop()
}
