<script lang="ts" setup>
  import { useAppNavigate } from '~/composables/useAppNavigate'
  import { getSidebarSection, getCleanPath } from '~/config/routes'

  // Builder mode visual wrapper
  const { isInEditMode } = useAdminUI()

  const commandDialog = useCommandDialog()
  const routes = useRoutes()
  const appNavigate = useAppNavigate()
  const pageEl = ref<HTMLElement | null>(null)
  const route = useRoute()
  const router = useRouter()
  const pinned = usePinnedItems()
  const { collections, currentApp } = useInstantData()

  const hasLoggedInstantAuth = useState<boolean>('debug:instantAuthLogged', () => false)

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

      // Don't redirect if on a static child route (e.g., /collections/templates)
      const staticChildPaths = (section.children || []).map((c: any) => c.path)
      const isOnStaticChild = staticChildPaths.includes(cleanNewPath)
      if (isOnStaticChild) return

      if (section.path === '/collections' && isOnSectionRoot && collections.value.length > 0) {
        const appId = currentApp.value?.id
        const storageKey = appId ? `last-visited-collection:${appId}` : ''
        let storedSlug: string | null = null
        if (import.meta.client && storageKey) {
          try {
            storedSlug = localStorage.getItem(storageKey)
          } catch {
            storedSlug = null
          }
        }
        const hasStored = !!storedSlug && collections.value.some((c) => c.slug === storedSlug)
        const targetSlug = hasStored ? storedSlug! : collections.value[0]!.slug
        const targetPath = `/collections/${targetSlug}`
        if (getCleanPath(router.currentRoute.value.path) !== targetPath) {
          router.push(targetPath)
        }
        return
      }

      if (firstPinnedPath && (isOnSectionRoot || isOnSectionDefault)) {
        if (getCleanPath(router.currentRoute.value.path) !== firstPinnedPath) {
          router.push(appNavigate.resolvePath(firstPinnedPath))
        }
      } else if (isOnSectionRoot) {
        const allItems = [...pinnedItems, ...unpinnedItems]
        const firstItemPath = allItems[0]?.path
        if (firstItemPath && getCleanPath(router.currentRoute.value.path) !== firstItemPath) {
          router.push(appNavigate.resolvePath(firstItemPath))
        }
      }
    },
    { immediate: true, flush: 'post' },
  )

  const navigateTo = async (path: string) => {
    await appNavigate.navigate(path)
    commandDialog.close()
  }

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
  <!-- Root: base layer - edit mode adds accent ring as "4D wrapper" -->
  <div
    class="bg-background text-foreground flex h-dvh overflow-hidden transition-shadow duration-300"
    :class="{ 'ring-4 ring-accent ring-inset shadow-[inset_0_0_0_4px] shadow-accent': isInEditMode }">
    <!-- Command Dialog -->
    <UiCommandDialog
      :open="commandDialog.isOpen.value"
      title="Command Palette"
      description="Search for pages and navigate quickly"
      @update:open="(val) => (commandDialog.isOpen.value = val)">
      <UiCommandInput placeholder="Search pages..." />
      <UiCommandList>
        <UiCommandEmpty>No results found.</UiCommandEmpty>
        <template v-for="group in commandPaletteGroups" :key="group.label">
          <UiCommandGroup :heading="group.label">
            <template v-for="routeItem in group.routes" :key="routeItem?.path || ''">
              <UiCommandItem
                v-if="routeItem?.path"
                :value="`${group.label} ${routeItem.label}`"
                @select="() => navigateTo(routeItem.path)">
                <Icon :name="routeItem.icon" class="h-4 w-4" />
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

    <IconRail />

    <div class="flex flex-1 flex-col min-w-0 overflow-hidden">
      <AppHeader />
      <div class="flex flex-1 min-h-0 overflow-hidden">
        <AppSidebar />
        <main
          ref="pageEl"
          class="page-transition-wrapper bg-transparent flex-1 overflow-y-auto p-0 relative"
          aria-label="Main content">
          <slot />
        </main>
      </div>
    </div>

    <!-- Global Entity Detail Sheet -->
    <EntityDetailSheet />
  </div>
</template>
