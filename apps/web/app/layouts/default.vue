<script lang="ts" setup>
  import { useAppNavigate } from '~/composables/useAppNavigate'
  import { getCleanPath, getSidebarSection } from '~/config/routes'

  // Builder mode visual wrapper + role checks
  const { isInEditMode: _isInEditMode } = useAdminUI()
  const { user: _railUser } = useInstantAuth()
  const showIconRail = computed(() => !!_railUser.value)
  const { sidebarDisabled } = usePageShell()
  const sidebarCollapse = useSidebarCollapse()
  // Calendar route always shows sidebar (it hosts CalendarSidebarPanel)
  const isCalendarRoute = computed(() => {
    const clean = getCleanPath(route.path)
    return clean === '/calendar' || clean.startsWith('/calendar/')
  })
  // Sidebar is hidden when the page explicitly disables it OR the route forces it closed
  // Exception: calendar route always shows sidebar
  const showSidebar = computed(() =>
    isCalendarRoute.value ? !sidebarDisabled.value : !sidebarDisabled.value && !sidebarCollapse.isForcedCollapsed.value,
  )

  // Layout preference toggle
  const { headerAboveSidebar, iconRailPosition } = useLayoutPreferences()
  const railAtBottom = computed(() => iconRailPosition.value === 'bottom')

  const routes = useRoutes()
  const appNavigate = useAppNavigate()
  const { wp } = useWorkspacePath()
  const pageEl = ref<HTMLElement | null>(null)
  const route = useRoute()
  const router = useRouter()
  const pinned = usePinnedItems()
  const { collections: _collections, currentApp: _currentApp } = useInstantData()

  const hasLoggedInstantAuth = useState<boolean>('debug:instantAuthLogged', () => false)

  // Global adjacent sidebar state
  const { setRightSidebarWidth, isRightSidebarOpen } = useRightSidebarWidth()
  const rightSidebarWidth = ref(320)
  const isResizingRightSidebar = ref(false)
  const MIN_RIGHT_SIDEBAR_WIDTH = 200
  const MAX_RIGHT_SIDEBAR_WIDTH = 600

  const startRightSidebarResize = (e: MouseEvent) => {
    isResizingRightSidebar.value = true
    const startX = e.clientX
    const startWidth = rightSidebarWidth.value

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX
      rightSidebarWidth.value = Math.min(MAX_RIGHT_SIDEBAR_WIDTH, Math.max(MIN_RIGHT_SIDEBAR_WIDTH, startWidth + delta))
    }

    const onMouseUp = () => {
      isResizingRightSidebar.value = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Register the page element for transitions
  onMounted(() => {
    if (pageEl.value) {
      appNavigate.registerPageElement(pageEl.value)
    }

    if (!hasLoggedInstantAuth.value) {
      hasLoggedInstantAuth.value = true
      const instant = useInstantDb()

      instant
        .getAuth()
        .then((user: any) => {
          if (user) {
            console.info('[auth] InstantDB authenticated user:', user)
          } else {
            console.info('[auth] InstantDB no authenticated user')
          }
        })
        .catch((err: any) => {
          console.warn('[auth] InstantDB getAuth failed:', err)
        })
    }
  })

  onBeforeUnmount(() => {
    appNavigate.registerPageElement(null)
  })

  const lastSectionPath = ref<string | null>(null)

  // Auto-select first item when entering a section (prefers top pinned item)
  watch(
    [() => route.path, () => pinned.isLoaded.value],
    async ([newPath, loaded]) => {
      if (!loaded) return

      const cleanNewPath = getCleanPath(newPath)
      const section = getSidebarSection(newPath)
      if (!section?.path) return
      lastSectionPath.value = section.path

      // Ensure derived section links have updated for the new route
      await nextTick()
      await nextTick()

      const currentSectionLinks = routes.currentSectionLinks.value
      const pinnedItems = pinned.getPinnedItems(currentSectionLinks)
      const unpinnedItems = pinned.getUnpinnedItems(currentSectionLinks)

      const firstPinnedPath = pinnedItems[0]?.path
      const firstUnpinnedPath = unpinnedItems[0]?.path

      const isOnSectionRoot = cleanNewPath === section.path
      const isOnSectionDefault = !!firstUnpinnedPath && cleanNewPath === firstUnpinnedPath

      if (section.path === '/welcome' && isOnSectionRoot) {
        return
      }

      // Don't redirect if on a static child route (e.g., /database/collections/templates)
      const staticChildPaths = (section.children || []).map((c: any) => c.path)
      const isOnStaticChild = staticChildPaths.includes(cleanNewPath)
      if (isOnStaticChild) return

      // Database has its own landing page — no auto-redirect needed
      if (section.path === '/database' && isOnSectionRoot) return

      if (firstPinnedPath && (isOnSectionRoot || isOnSectionDefault)) {
        if (getCleanPath(router.currentRoute.value.path) !== firstPinnedPath) {
          router.push(wp(firstPinnedPath))
        }
      } else if (isOnSectionRoot) {
        const allItems = [...pinnedItems, ...unpinnedItems]
        const firstItemPath = allItems[0]?.path
        if (firstItemPath && getCleanPath(router.currentRoute.value.path) !== firstItemPath) {
          router.push(wp(firstItemPath))
        }
      }
    },
    { immediate: true, flush: 'post' },
  )

  const rightSidebarCssWidth = computed(() => (isRightSidebarOpen.value ? `${rightSidebarWidth.value}px` : '0px'))

  watch([isRightSidebarOpen, rightSidebarWidth], ([open, w]) => setRightSidebarWidth(open ? w : 0), { immediate: true })
</script>

<template>
  <!-- Root: full-height row so right sidebar is adjacent to the entire layout -->
  <div
    class="bg-background text-foreground flex h-dvh overflow-hidden transition-shadow duration-500"
    :style="{ '--right-sidebar-width': rightSidebarCssWidth }">
    <!-- App body: icon rail + sidebar + content + right sidebar -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <!-- Global omnibox lives inside AppHeader via <AppOmnibox />. -->

      <!-- Layout Mode A: Header above sidebar (spans sidebar + content) -->
      <template v-if="headerAboveSidebar">
        <div class="flex flex-1 flex-col min-w-0 overflow-hidden">
          <AppHeader :above-sidebar="true" />
          <div class="flex flex-1 min-h-0 overflow-hidden rounded-xl bg-transparent pt-0 p-2.5">
            <div class="flex flex-1 min-h-0 overflow-hidden rounded-xl border bg-card/50">
              <!-- Left rail (default) -->
              <IconRail
                v-if="showIconRail && !railAtBottom"
                position="left"
                class="bg-transparent mr-0 border-l border-b border-t rounded-l-xl rounded-lg !rounded-r-none border-r-none!" />
              <div class="bg-transparent flex flex-1 min-w-0 overflow-hidden rounded-md! flex-col">
                <div class="flex flex-1 min-h-0 overflow-hidden">
                  <AppSidebar v-if="showSidebar" :header-above="true" class="bg-transparent rounded-xl" />
                  <div
                    class="flex flex-1 flex-col min-w-0 overflow-hidden p-2.5"
                    :class="showSidebar ? 'pl-0' : 'pl-2.5'">
                    <main
                      ref="pageEl"
                      class="page-transition-wrapper bg-card/50 rounded-md flex-1 overflow-y-auto p-0 border relative"
                      aria-label="Main content">
                      <slot />
                    </main>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- Bottom rail -->
          <div class="p-2.5 pt-0">
            <IconRail
              v-if="showIconRail && railAtBottom"
              position="bottom"
              class="bg-transparent border border-border/0 rounded-xl shrink-0" />
          </div>
        </div>
      </template>

      <!-- Layout Mode B: Default (header inside content column only) -->
      <template v-else>
        <!-- Left rail (default) -->
        <IconRail v-if="showIconRail && !railAtBottom" position="left" />
        <AppSidebar v-if="showSidebar" :header-above="false" />
        <!-- Gap when sidebar is hidden (forced-collapsed or page-disabled) -->
        <div v-if="!showSidebar" class="w-2.5 shrink-0" />
        <div class="flex flex-1 flex-col min-w-0 overflow-hidden">
          <AppHeader :above-sidebar="false" />
          <div class="flex flex-1 min-h-0 overflow-hidden">
            <main
              ref="pageEl"
              class="page-transition-wrapper bg-surface-2 flex-1 overflow-y-auto p-0 relative"
              aria-label="Main content">
              <slot />
            </main>
          </div>
          <!-- Bottom rail -->
          <IconRail v-if="showIconRail && railAtBottom" position="bottom" class="bg-card mt-2.5 rounded-xl shrink-0" />
        </div>
      </template>

      <!-- Global Entity Detail Sheet -->
      <EntityDetailSheet />
    </div>

    <!-- Global Right Sidebar: teleported to body to ensure it sits above portaled dialogs -->
    <Teleport to="body">
      <Transition name="sidebar-slide">
        <div
          v-if="isRightSidebarOpen"
          class="fixed right-0 top-0 bottom-0 p-2.5 pl-0 z-999"
          :style="{ width: `${rightSidebarWidth}px` }">
          <aside
            data-slot="right-sidebar"
            class="h-full border border-border/75 rounded-xl shrink-0 overflow-hidden flex flex-col"
            :class="{ 'select-none': isResizingRightSidebar }"
            aria-label="Right sidebar">
            <!-- Drag handle -->
            <div
              class="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-10"
              @mousedown.prevent="startRightSidebarResize" />
            <div class="flex-1 overflow-hidden">
              <AgentPanel />
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <!-- Layout Spacer: maintains flow when teleported sidebar is open -->
    <Transition name="spacer-width">
      <div v-if="isRightSidebarOpen" class="shrink-0" :style="{ width: `${rightSidebarWidth}px` }" />
    </Transition>
  </div>
</template>

<style scoped>
  /* Sidebar slide-in animation */
  .sidebar-slide-enter-active,
  .sidebar-slide-leave-active {
    transition:
      transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
      opacity 0.4s ease;
  }

  .sidebar-slide-enter-from,
  .sidebar-slide-leave-to {
    transform: translateX(100%);
    opacity: 0;
  }

  .sidebar-slide-enter-to,
  .sidebar-slide-leave-from {
    transform: translateX(0);
    opacity: 1;
  }

  /* Spacer width animation - syncs with sidebar */
  .spacer-width-enter-active,
  .spacer-width-leave-active {
    transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .spacer-width-enter-from,
  .spacer-width-leave-to {
    width: 0 !important;
  }
</style>
