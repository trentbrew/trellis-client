<script lang="ts" setup>
  import { useAppNavigate } from '~/composables/useAppNavigate'
  import { getSidebarSection, getCleanPath } from '~/config/routes'

  // Builder mode visual wrapper + role checks
  const { isInEditMode: _isInEditMode } = useAdminUI()
  const { user: _railUser } = useInstantAuth()
  const showIconRail = computed(() => !!_railUser.value)
  const { sidebarDisabled } = usePageShell()
  const sidebarCollapse = useSidebarCollapse()
  // Sidebar is hidden when the page explicitly disables it OR the route forces it closed
  const showSidebar = computed(() => !sidebarDisabled.value && !sidebarCollapse.isForcedCollapsed.value)

  // Layout preference toggle
  const { headerAboveSidebar, iconRailPosition } = useLayoutPreferences()
  const railAtBottom = computed(() => iconRailPosition.value === 'bottom')

  const commandDialog = useCommandDialog()
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
  const { setRightSidebarWidth } = useRightSidebarWidth()
  const isRightSidebarOpen = ref(false)
  const rightSidebarWidth = ref(320)
  const isResizingRightSidebar = ref(false)
  const MIN_RIGHT_SIDEBAR_WIDTH = 200
  const MAX_RIGHT_SIDEBAR_WIDTH = 600

  // Right sidebar tabs
  const activeSidebarTab = ref<'schedule' | 'messages' | 'agent'>('schedule')
  const sidebarTabs = [
    { id: 'schedule', label: 'Schedule', icon: 'lucide:calendar' },
    { id: 'messages', label: 'Messages', icon: 'lucide:message-square' },
    { id: 'agent', label: 'Agent', icon: 'lucide:bot' },
  ] as const

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

  const navigateTo = async (path: string) => {
    await appNavigate.navigate(wp(path))
    commandDialog.close()
  }

  const toggleRightSidebar = () => {
    isRightSidebarOpen.value = !isRightSidebarOpen.value
  }

  const rightSidebarCssWidth = computed(() =>
    isRightSidebarOpen.value ? `${rightSidebarWidth.value}px` : '0px'
  )

  watch(
    [isRightSidebarOpen, rightSidebarWidth],
    ([open, w]) => setRightSidebarWidth(open ? w : 0),
    { immediate: true },
  )

  // Group command palette routes by section for better organization
  const commandPaletteGroups = computed(() => {
    const groups = new Map<string, typeof routes.commandPaletteRoutes.value>()

    routes.commandPaletteRoutes.value.forEach((routeItem) => {
      const section = getSidebarSection(routeItem.path)
      const sectionLabel = section?.label || 'Other'

      if (!groups.has(sectionLabel)) {
        groups.set(sectionLabel, [])
      }
      groups.get(sectionLabel)!.push(routeItem)
    })

    return Array.from(groups.entries()).map(([label, routeItems]) => ({
      label,
      routes: routeItems,
    }))
  })
</script>

<template>
  <!-- Root: full-height row so right sidebar is adjacent to the entire layout -->
  <div
    class="bg-background text-foreground flex h-dvh overflow-hidden transition-shadow duration-500"
    :style="{ '--right-sidebar-width': rightSidebarCssWidth }">
    <!-- App body: icon rail + sidebar + content + right sidebar -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <!-- Command Dialog -->
      <UiCommandDialog
        :open="commandDialog.isOpen.value"
        title="Command Palette"
        description="Search for pages and navigate quickly"
        @update:open="(val) => (commandDialog.isOpen.value = val)">
        <UiCommandInput placeholder="Run a command or search..." />
        <UiCommandList>
          <UiCommandEmpty>No results found.</UiCommandEmpty>
          <template v-for="group in commandPaletteGroups" :key="group.label">
            <UiCommandGroup :heading="group.label">
              <template v-for="routeItem in group.routes" :key="routeItem?.path || ''">
                <UiCommandItem
                  v-if="routeItem?.path"
                  :value="`${group.label} ${routeItem.label}`"
                  @select="() => navigateTo(routeItem.path)">
                  <Icon :name="routeItem.icon || 'lucide:circle'" class="h-4 w-4" />
                  <span>{{ routeItem.label }}</span>
                  <span class="sr-only">{{ group.label }} {{ routeItem.searchKeywords?.join(' ') }}</span>
                  <UiCommandShortcut v-if="routes.getRouteBadge(routeItem)">
                    {{ routes.getRouteBadge(routeItem) }}
                  </UiCommandShortcut>
                </UiCommandItem>
              </template>
            </UiCommandGroup>
          </template>
        </UiCommandList>
      </UiCommandDialog>

      <!-- Layout Mode A: Header above sidebar (spans sidebar + content) -->
      <template v-if="headerAboveSidebar">
        <div class="flex flex-1 flex-col min-w-0 overflow-hidden">
          <AppHeader :above-sidebar="true" :hide-presence-controls="railAtBottom" @toggle-right-sidebar="toggleRightSidebar" />
          <div class="flex flex-1 min-h-0 overflow-hidden p-2.5 pt-0 rounded-lg">
            <div class="flex flex-1 min-h-0 overflow-hidden bg-transparent rounded-lg">
              <!-- Left rail (default) -->
              <IconRail
                v-if="showIconRail && !railAtBottom"
                position="left"
                class="bg-card/75! mr-2.5 border rounded-lg" />
              <div class="bg-card/50! border flex flex-1 min-w-0 overflow-hidden rounded-xl flex-col">
                <div class="flex flex-1 min-h-0 overflow-hidden">
                  <AppSidebar v-if="showSidebar" :header-above="true" class="bg-background" />
                  <div class="flex flex-1 flex-col min-w-0 overflow-hidden p-2.5" :class="showSidebar ? 'pl-0' : 'pl-2.5'">
                    <main
                      ref="pageEl"
                      class="page-transition-wrapper bg-card/75 rounded-lg flex-1 overflow-y-auto p-0 border relative"
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
              class="bg-card/0 border border-border/0 rounded-xl shrink-0" />
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
          <AppHeader :above-sidebar="false" :hide-presence-controls="railAtBottom">
            <!-- Right sidebar trigger in header -->
            <template #actions>
              <UiButton
                variant="ghost"
                size="icon"
                :aria-expanded="isRightSidebarOpen"
                aria-label="Toggle right sidebar"
                @click="toggleRightSidebar">
                <Icon name="lucide:panel-right" class="h-4 w-4" />
              </UiButton>
            </template>
          </AppHeader>
          <div class="flex flex-1 min-h-0 overflow-hidden">
            <main
              ref="pageEl"
              class="page-transition-wrapper bg-transparent flex-1 overflow-y-auto p-0 relative"
              aria-label="Main content">
              <slot />
            </main>
          </div>
          <!-- Bottom rail -->
          <IconRail
            v-if="showIconRail && railAtBottom"
            position="bottom"
            class="bg-card mt-2.5 rounded-xl shrink-0" />
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
            class="h-full border border-border/75 bg-card/75 rounded-xl shrink-0 overflow-hidden flex flex-col shadow-lg"
            :class="{ 'select-none': isResizingRightSidebar }"
            aria-label="Right sidebar">
            <!-- Drag handle -->
            <div
              class="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-10"
              @mousedown.prevent="startRightSidebarResize"
            />
            <!-- Tabs Header - matches AppHeader h-14 height -->
            <div class="h-14 shrink-0 border-b border-border bg-card/50 flex items-center px-2 rounded-t-xl">
              <UiTabs v-model="activeSidebarTab" class="w-full">
                <UiTabsList class="w-full grid grid-cols-3 bg-transparent p-0 gap-1">
                  <UiTabsTrigger
                    v-for="tab in sidebarTabs"
                    :key="tab.id"
                    :value="tab.id"
                    class="flex items-center justify-center gap-1.5 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all">
                    <Icon :name="tab.icon" class="h-3.5 w-3.5" />
                    <span>{{ tab.label }}</span>
                  </UiTabsTrigger>
                </UiTabsList>
              </UiTabs>
            </div>
            <div class="p-4 flex-1 overflow-y-auto">
              <!-- Tab Content -->
              <div v-if="activeSidebarTab === 'schedule'">
                <slot name="right-sidebar" />
              </div>
              <div v-else-if="activeSidebarTab === 'messages'" class="text-sm text-muted-foreground text-center py-8">
                Messages coming soon
              </div>
              <div v-else-if="activeSidebarTab === 'agent'" class="text-sm text-muted-foreground text-center py-8">
                Agent coming soon
              </div>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <!-- Layout Spacer: maintains flow when teleported sidebar is open -->
    <Transition name="spacer-width">
      <div
        v-if="isRightSidebarOpen"
        class="shrink-0"
        :style="{ width: `${rightSidebarWidth}px` }"
      />
    </Transition>
  </div>
</template>

<style scoped>
/* Sidebar slide-in animation */
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
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
