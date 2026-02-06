<script lang="ts" setup>
  import { AnimatePresence, motion } from 'motion-v'
  import { SYSTEM_TYPES } from '~/lib/systemTypes'

  const BADGE_LABEL_THRESHOLD = 300

  const routes = useRoutes()
  const pinned = usePinnedItems()
  const collapsed = useCollapsedSections()
  const sidebarCollapse = useSidebarCollapse()
  const nuxtApp = useNuxtApp()
  const route = useRoute()

  // Admin UI controls
  const { showBuilderUI, canCreatePages } = useAdminUI()

  // Page Builder dialog state
  const pageBuilderOpen = ref(false)

  const sidebarSectionKey = computed(() => routes.currentSectionLabel.value)

  const isTypesSection = computed(() => routes.currentSidebarSection.value?.path === '/types')

  const { customTypes } = useInstantData()

  const activeTypeContext = computed(() => {
    const path = route.path
    if (path.startsWith('/types/system/')) {
      const id = path.replace('/types/system/', '')
      return { kind: 'system' as const, id }
    }
    if (path.startsWith('/types/')) {
      const id = path.replace('/types/', '')
      if (!id) return null
      if (id === 'ontology' || id === 'field-types' || id === 'presets') return null
      return { kind: 'custom' as const, id }
    }
    return null
  })

  type TypeLink = { id: string; label: string; icon: string; path: string; kind: 'system' | 'custom'; extends?: string }

  const systemTypeMap = computed(() => {
    const map = new Map<string, TypeLink>()
    SYSTEM_TYPES.forEach((t) => {
      map.set(t.id, {
        id: t.id,
        label: t.name,
        icon: t.icon || 'lucide:box',
        path: `/types/system/${t.id}`,
        kind: 'system',
      })
    })
    return map
  })

  const customTypeMap = computed(() => {
    const map = new Map<string, TypeLink>()
    ;(customTypes.value || []).forEach((t) => {
      map.set(t.id, {
        id: t.id,
        label: t.name,
        icon: t.icon || 'lucide:blocks',
        path: `/types/${t.id}`,
        kind: 'custom',
        extends: t.extends,
      })
    })
    return map
  })

  const resolveTypeLink = (id: string): TypeLink | null => {
    return customTypeMap.value.get(id) || systemTypeMap.value.get(id) || null
  }

  const activeTypeLink = computed(() => {
    const ctx = activeTypeContext.value
    if (!ctx) return null
    return resolveTypeLink(ctx.id)
  })

  const activeTypeParentChain = computed(() => {
    const current = activeTypeLink.value
    if (!current?.extends) return [] as TypeLink[]

    const chain: TypeLink[] = []
    const seen = new Set<string>([current.id])
    let nextId: string | undefined = current.extends
    while (nextId) {
      if (seen.has(nextId)) break
      seen.add(nextId)
      const resolved = resolveTypeLink(nextId)
      if (!resolved) break
      chain.push(resolved)
      nextId = resolved.extends
    }
    return chain
  })

  const activeTypeChildren = computed(() => {
    const current = activeTypeLink.value
    if (!current) return [] as TypeLink[]
    const children = (customTypes.value || [])
      .filter((t) => t.extends === current.id)
      .map((t) => ({
        id: t.id,
        label: t.name,
        icon: t.icon || 'lucide:blocks',
        path: `/types/${t.id}`,
        kind: 'custom' as const,
        extends: t.extends,
      }))
    return children
  })

  const systemTypeLinks = computed(() => {
    const sectionChildren = routes.currentSidebarSection.value?.children || []
    return [...(routes.typesSystemLinks.value || []), ...sectionChildren]
  })

  const customTypeLinks = computed(() => {
    return routes.typesCustomLinks.value || []
  })

  // Sidebar resize functionality
  const sidebarWidth = useState<number>('sidebarWidth', () => 290)
  const minWidth = 250
  const maxWidth = 500
  const isResizing = useState<boolean>('isSidebarResizing')
  const transitionsDisabled = useState<boolean>('sidebarTransitionsDisabled')

  let resizeTimeout: NodeJS.Timeout | null = null

  watch(isResizing, (val) => {
    console.log('AppHeader: isResizing changed to', val)
    if (!val) {
      // When resizing ends, keep transitions disabled for 1000ms
      transitionsDisabled.value = true
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        transitionsDisabled.value = false
        resizeTimeout = null
      }, 1000)
    } else {
      // When resizing starts, immediately disable transitions
      transitionsDisabled.value = true
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
        resizeTimeout = null
      }
    }
  })

  const startResize = (e: MouseEvent) => {
    console.log('Sidebar resize started')
    isResizing.value = true
    if (import.meta.client) {
      document.body.classList.add('is-resizing')
    }
    e.preventDefault()

    const startX = e.clientX
    const startWidth = sidebarWidth.value

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + delta))
      console.log('Sidebar resizing:', { newWidth, isResizing: isResizing.value })
      sidebarWidth.value = newWidth
    }

    const handleMouseUp = () => {
      console.log('Sidebar resize ended')
      isResizing.value = false
      if (import.meta.client) {
        document.body.classList.remove('is-resizing')
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Get pinned items from current section
  const pinnedItems = computed(() => {
    return pinned.getPinnedItems(routes.currentSectionLinks.value)
  })

  // Get unpinned items from current section
  const unpinnedItems = computed(() => {
    return pinned.getUnpinnedItems(routes.currentSectionLinks.value)
  })

  const systemUnpinnedItems = computed(() => {
    return pinned.getUnpinnedItems(systemTypeLinks.value)
  })

  const customUnpinnedItems = computed(() => {
    return pinned.getUnpinnedItems(customTypeLinks.value)
  })

  // Get dynamic sidebar sections with proper typing
  const dynamicSidebarSections = computed(() => {
    const sections = routes.currentSidebarSections.value
    return Array.isArray(sections) ? sections : null
  })

  // Aggregate badge counts and determine color based on severity
  const getSectionBadgeInfo = (items: any[]) => {
    let totalCount = 0
    let hasDestructive = false
    let hasWarning = false
    let hasSuccess = false

    items.forEach((item) => {
      const badge = routes.getRouteBadge(item)
      if (badge && typeof badge === 'object') {
        // Extract number from label
        const match = badge.label?.toString().match(/\d+/)
        if (match) {
          totalCount += parseInt(match[0], 10)
        }

        // Track severity levels
        if (badge.variant === 'destructive') hasDestructive = true
        else if (badge.variant === 'warning') hasWarning = true
        else if (badge.variant === 'success') hasSuccess = true
      }
    })

    if (totalCount === 0) return null

    // Determine color based on priority: destructive > warning > success
    let variant = 'default'
    if (hasDestructive) variant = 'destructive'
    else if (hasWarning) variant = 'warning'
    else if (hasSuccess) variant = 'success'

    return { count: totalCount, variant }
  }

  // Handle Add New button click - create collection immediately
  const { collections, currentApp, createCollection, updateCollection, deleteCollection } = useInstantData()
  const { downloadCollectionAsTrellis } = useTrellisAdapter()

  const deleteDialogOpen = ref(false)
  const pendingDeleteCollectionId = ref<string | null>(null)
  const pendingDeleteCollectionTitle = ref<string>('')

  const handleRename = (collectionSlug: string) => {
    const collection = collections.value.find((c) => `/collections/${c.slug}` === collectionSlug)
    if (!collection) return

    const newTitle = prompt('Rename collection:', collection.title)
    if (newTitle && newTitle.trim() && newTitle !== collection.title) {
      updateCollection(collection.id, { title: newTitle.trim() })
    }
  }

  const handleChangeIcon = async (collectionSlug: string) => {
    const collection = collections.value.find((c) => `/collections/${c.slug}` === collectionSlug)
    if (!collection) return

    // Navigate to collection page where icon picker is available
    await navigateTo(collectionSlug)
  }

  const handleDelete = async (collectionSlug: string) => {
    const collection = collections.value.find((c) => `/collections/${c.slug}` === collectionSlug)
    if (!collection) return

    pendingDeleteCollectionId.value = collection.id
    pendingDeleteCollectionTitle.value = collection.title
    deleteDialogOpen.value = true
  }

  const handleExportTrellis = async (collectionSlug: string) => {
    const collection = collections.value.find((c) => `/collections/${c.slug}` === collectionSlug)
    if (!collection) return

    try {
      await downloadCollectionAsTrellis(collection)
      ;(nuxtApp as any).$toast?.success('Exported')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Export failed'
      ;(nuxtApp as any).$toast?.error(message)
    }
  }

  const confirmDelete = async () => {
    const id = pendingDeleteCollectionId.value
    if (!id) return

    await deleteCollection(id)
    deleteDialogOpen.value = false
    navigateTo('/collections')
  }

  watch(deleteDialogOpen, (open) => {
    if (open) return
    pendingDeleteCollectionId.value = null
    pendingDeleteCollectionTitle.value = ''
  })

  const isCollectionItem = (path: string) => {
    return path.startsWith('/collections/') && path !== '/collections'
  }

  const goTo = async (path: string) => {
    await navigateTo(path)
  }

  const handleAddNew = async () => {
    const section = routes.currentSidebarSection.value
    if (section?.path === '/collections') {
      if (!currentApp.value) return

      // Create new collection with defaults
      const slug = `untitled-${Date.now()}`
      await createCollection({
        appId: currentApp.value.id,
        title: 'Untitled',
        icon: 'lucide:database',
        slug,
        type: 'database',
        order: collections.value.length,
        isPublished: false,
        createdBy: 'current-user',
      })

      // UI updates automatically - no manual reload needed
      // Navigate to new collection
      navigateTo(`/collections/${slug}`)
    }
  }

  // Create new page - opens the page builder dialog
  const handleCreatePage = () => {
    pageBuilderOpen.value = true
  }

  // Handle page save from builder
  const handlePageSave = (page: any) => {
    // TODO: Save page to database
    ;(nuxtApp as any).$toast?.success(`Page "${page.title}" created!`)
    pageBuilderOpen.value = false
  }
</script>

<template>
  <!-- Sidebar: Content frame (matches page header) -->
  <aside
    class="border-sidebar-border bg-sidebar/99 text-sidebar-foreground hidden flex-col border-r px-0 pb-0 lg:flex relative"
    :style="{
      width: sidebarCollapse.isCollapsed.value ? '0px' : `${sidebarWidth}px`,
      transition: transitionsDisabled ? 'none' : 'width 0.3s ease',
    }"
    :class="[
      sidebarCollapse.isCollapsed.value ? 'overflow-hidden' : '',
      isResizing ? 'is-resizing' : '',
      transitionsDisabled ? 'transitions-disabled' : '',
    ]"
    aria-label="Sidebar">
    <!-- Resize handle -->
    <div
      v-if="!sidebarCollapse.isCollapsed.value"
      class="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
      :class="{
        'bg-primary': isResizing,
      }"
      @mousedown="startResize" />

    <!-- Builder Controls (Edit Mode) -->
    <div v-if="showBuilderUI && canCreatePages" class="px-4 py-2 border-b border-sidebar-border/10">
      <UiButton
        variant="ghost"
        size="sm"
        class="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-amber-500/10 border border-dashed border-amber-500/30 justify-start gap-2 px-3"
        @click="handleCreatePage">
        <Icon name="lucide:plus" class="h-4 w-4 text-amber-500" />
        <span class="text-xs font-medium">New Page</span>
        <span class="ml-auto text-[10px] text-amber-500/70 bg-amber-500/10 px-1.5 py-0.5 rounded">Edit Mode</span>
      </UiButton>
    </div>

    <!-- Sidebar section items animate per rail route (client-only to avoid hydration mismatches from localStorage/pins) -->
    <ClientOnly>
      <template v-if="!sidebarCollapse.isCollapsed.value">
        <div class="flex min-h-0 flex-1 flex-col pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              :key="sidebarSectionKey"
              :initial="{ opacity: 0, x: -8 }"
              :animate="{ opacity: 1, x: 0 }"
              :exit="{ opacity: 0, x: -8 }"
              :transition="transitionsDisabled ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }"
              class="flex min-h-0 flex-1 flex-col p-3 pl-2 pt-0">
              <!-- Dynamic Sidebar Sections (if configured in route) -->
              <template v-if="dynamicSidebarSections">
                <div v-for="(section, idx) in dynamicSidebarSections" :key="section.key" :class="idx > 0 ? 'mt-6' : ''">
                  <button
                    v-if="section.collapsible !== false"
                    type="button"
                    class="text-muted-foreground hover:text-sidebar-foreground flex w-full items-center justify-start text-xs tracking-wide uppercase transition-colors px-3"
                    @click="collapsed.toggleSection(section.key)">
                    <div class="flex items-center">
                      <Icon v-if="section.icon" :name="section.icon" class="mr-2 h-4 w-4 opacity-70" />
                      <span class="font-medium">{{ section.label }}</span>
                      <span
                        v-if="collapsed.isCollapsed(section.key) && getSectionBadgeInfo(section.items)"
                        class="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        :class="[
                          getSectionBadgeInfo(section.items)?.variant === 'destructive'
                            ? 'bg-destructive/15 text-destructive border border-destructive/30'
                            : getSectionBadgeInfo(section.items)?.variant === 'warning'
                              ? 'bg-warning/15 text-warning border border-warning/30'
                              : getSectionBadgeInfo(section.items)?.variant === 'success'
                                ? 'bg-success/15 text-success border border-success/30'
                                : 'bg-sidebar-accent text-sidebar-accent-foreground',
                        ]">
                        {{ getSectionBadgeInfo(section.items)?.count }}
                      </span>
                    </div>
                    <div class="flex items-center gap-1">
                      <UiButton
                        v-if="section.editable"
                        variant="ghost"
                        size="icon-sm"
                        class="h-6 w-6"
                        @click.stop="handleAddNew">
                        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                      </UiButton>
                      <Icon
                        name="lucide:chevron-down"
                        class="h-4 w-4 transition-transform ml-1.5 opacity-50"
                        :class="{ '-rotate-90': collapsed.isCollapsed(section.key) }" />
                    </div>
                  </button>
                  <div v-else class="flex items-center justify-between mb-3 px-3">
                    <div class="flex items-center">
                      <Icon v-if="section.icon" :name="section.icon" class="mr-2 h-4 w-4 opacity-70" />
                      <span class="text-muted-foreground text-xs tracking-wide uppercase font-medium">
                        {{ section.label }}
                      </span>
                    </div>
                    <UiButton
                      v-if="section.editable"
                      variant="ghost"
                      size="icon-sm"
                      class="h-6 w-6"
                      @click.stop="handleAddNew">
                      <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                    </UiButton>
                  </div>

                  <AnimatePresence>
                    <motion.div
                      v-if="section.collapsible === false || !collapsed.isCollapsed(section.key)"
                      :initial="{ opacity: 0, height: 0 }"
                      :animate="{ opacity: 1, height: 'auto' }"
                      :exit="{ opacity: 0, height: 0 }"
                      :transition="transitionsDisabled ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }"
                      class="mt-3 overflow-hidden">
                      <div class="relative">
                        <!-- Vertical indentation line -->
                        <div
                          id="border"
                          class="absolute ml-[19px] top-0 bottom-[18px] w-px bg-sidebar-border/15 translate-y-2" />
                        <motion.ul
                          class="space-y-1 text-sm"
                          :transition="transitionsDisabled ? { duration: 0 } : undefined"
                          :layout="!transitionsDisabled">
                          <motion.li
                            v-for="(item, i) in section.items"
                            :key="item?.path || ''"
                            :initial="{ opacity: 0, x: -10 }"
                            :animate="{ opacity: 1, x: 0 }"
                            :exit="{ opacity: 0, x: -10 }"
                            :transition="
                              transitionsDisabled
                                ? { duration: 0 }
                                : { duration: 0.28, ease: 'easeOut', delay: i * 0.035 }
                            "
                            :layout="!transitionsDisabled">
                            <div class="group relative elbow-connector">
                              <AppNavLink
                                v-if="item?.path"
                                :to="item.path"
                                class="text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground flex items-center gap-3 rounded-lg px-3 py-2 transition ml-8"
                                :class="[
                                  {
                                    'bg-white/6 text-sidebar-foreground': routes.isRouteExactlyActive(item.path),
                                  },
                                  isCollectionItem(item.path) ? 'pr-16' : 'pr-8',
                                ]">
                                <Icon :name="item.icon" class="h-4 w-4 shrink-0 opacity-50" />
                                <span
                                  class="flex-1 truncate min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs">
                                  {{ item.label }}
                                </span>
                                <template v-if="routes.getRouteBadge(item)">
                                  <template v-if="typeof routes.getRouteBadge(item) === 'object'">
                                    <span
                                      class="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                                      :class="[
                                        (routes.getRouteBadge(item) as any).variant === 'success'
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                          : (routes.getRouteBadge(item) as any).variant === 'warning'
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                            : (routes.getRouteBadge(item) as any).variant === 'destructive'
                                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                                              : (routes.getRouteBadge(item) as any).variant === 'accent'
                                                ? 'bg-accent text-accent-foreground'
                                                : 'bg-white/10 text-sidebar-foreground/70',
                                      ]"
                                      :style="
                                        (routes.getRouteBadge(item) as any).color
                                          ? { color: (routes.getRouteBadge(item) as any).color }
                                          : {}
                                      ">
                                      {{
                                        sidebarWidth >= BADGE_LABEL_THRESHOLD
                                          ? (routes.getRouteBadge(item) as any).label
                                          : (routes.getRouteBadge(item) as any).label.match(/\d+/)?.[0] ||
                                            (routes.getRouteBadge(item) as any).label
                                      }}
                                    </span>
                                  </template>
                                  <template v-else>
                                    <span
                                      class="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0">
                                      {{ routes.getRouteBadge(item) }}
                                    </span>
                                  </template>
                                </template>
                              </AppNavLink>
                              <div
                                class="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <UiDropdownMenu v-if="isCollectionItem(item.path)">
                                  <UiDropdownMenuTrigger as-child>
                                    <button
                                      type="button"
                                      class="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded p-0.5 hover:bg-white/10"
                                      aria-label="Collection options"
                                      @click.stop>
                                      <Icon name="lucide:more-horizontal" class="h-3.5 w-3.5" />
                                    </button>
                                  </UiDropdownMenuTrigger>
                                  <UiDropdownMenuContent align="end" :side-offset="4" class="w-48">
                                    <UiDropdownMenuItem @click="handleRename(item.path)">
                                      <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />
                                      Rename
                                    </UiDropdownMenuItem>
                                    <UiDropdownMenuItem @click="handleChangeIcon(item.path)">
                                      <Icon name="lucide:palette" class="mr-2 h-4 w-4" />
                                      Change Icon
                                    </UiDropdownMenuItem>
                                    <UiDropdownMenuSeparator />
                                    <UiDropdownMenuItem @click="goTo(item.path)">
                                      <Icon name="lucide:arrow-right" class="mr-2 h-4 w-4" />
                                      Open
                                    </UiDropdownMenuItem>
                                    <UiDropdownMenuItem @click="handleExportTrellis(item.path)">
                                      <Icon name="lucide:download" class="mr-2 h-4 w-4" />
                                      Export
                                    </UiDropdownMenuItem>
                                    <UiDropdownMenuSeparator />
                                    <UiDropdownMenuItem
                                      class="text-destructive focus:text-destructive"
                                      @click="handleDelete(item.path)">
                                      <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                                      Delete
                                    </UiDropdownMenuItem>
                                  </UiDropdownMenuContent>
                                </UiDropdownMenu>
                                <button
                                  type="button"
                                  class="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded p-0.5 hover:bg-white/10"
                                  :aria-label="pinned.isPinned(item.path) ? 'Unpin' : 'Pin'"
                                  @click.prevent.stop="pinned.togglePin(item.path)">
                                  <Icon
                                    name="lucide:pin"
                                    class="h-3.5 w-3.5"
                                    :class="{ 'fill-current': pinned.isPinned(item.path) }" />
                                </button>
                              </div>
                            </div>
                          </motion.li>
                        </motion.ul>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </template>

              <div
                v-else-if="!dynamicSidebarSections && pinnedItems.length === 0 && !isTypesSection"
                class="flex flex-col items-center justify-center py-8 text-center">
                <Icon name="lucide:inbox" class="w-8 h-8 text-sidebar-foreground/50 mb-3" />
                <p class="text-sm text-sidebar-foreground/70">No available sections</p>
                <p class="text-xs text-sidebar-foreground/50 mt-1">Contact your administrator for access</p>
              </div>

              <!-- Fallback: Legacy Pinned Section (if no dynamic sections configured) -->
              <div v-else-if="pinnedItems.length > 0" class="mb-6">
                <button
                  type="button"
                  class="text-muted-foreground hover:text-sidebar-foreground flex w-full items-center justify-start text-xs tracking-wide uppercase transition-colors"
                  @click="collapsed.toggleSection('pinned')">
                  <Icon
                    name="lucide:chevron-down"
                    class="mx-2 h-3.5 w-3.5 transition-transform opacity-50"
                    :class="{ '-rotate-90': collapsed.isCollapsed('pinned') }" />
                  <span class="font-medium">Pinned</span>
                  <span
                    v-if="collapsed.isCollapsed('pinned') && getSectionBadgeInfo(pinnedItems)"
                    class="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    :class="[
                      getSectionBadgeInfo(pinnedItems)?.variant === 'destructive'
                        ? 'bg-destructive/15 text-destructive border border-destructive/30'
                        : getSectionBadgeInfo(pinnedItems)?.variant === 'warning'
                          ? 'bg-warning/15 text-warning border border-warning/30'
                          : getSectionBadgeInfo(pinnedItems)?.variant === 'success'
                            ? 'bg-success/15 text-success border border-success/30'
                            : 'bg-sidebar-accent text-sidebar-accent-foreground',
                    ]">
                    {{ getSectionBadgeInfo(pinnedItems)?.count }}
                  </span>
                </button>

                <AnimatePresence>
                  <motion.div
                    v-if="!collapsed.isCollapsed('pinned')"
                    :initial="{ opacity: 0, height: 0 }"
                    :animate="{ opacity: 1, height: 'auto' }"
                    :exit="{ opacity: 0, height: 0 }"
                    :transition="transitionsDisabled ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }"
                    class="mt-3 overflow-hidden">
                    <div class="relative">
                      <!-- Vertical indentation line -->
                      <div
                        class="absolute ml-[20px] top-0 bottom-[15px] w-px bg-sidebar-border"
                        style="transform: translate(0px, -10px)" />
                      <motion.ul
                        class="space-y-1 text-sm"
                        :transition="transitionsDisabled ? { duration: 0 } : undefined"
                        :layout="!transitionsDisabled">
                        <motion.li
                          v-for="(item, i) in pinnedItems"
                          :key="item?.path || ''"
                          :initial="{ opacity: 0, x: -10 }"
                          :animate="{ opacity: 1, x: 0 }"
                          :exit="{ opacity: 0, x: -10 }"
                          :transition="
                            transitionsDisabled
                              ? { duration: 0 }
                              : { duration: 0.28, ease: 'easeOut', delay: i * 0.035 }
                          "
                          :layout="!transitionsDisabled">
                          <div class="group relative elbow-connector">
                            <AppNavLink
                              v-if="item?.path"
                              :to="item.path"
                              class="text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground flex items-center gap-3 rounded-lg px-3 py-2 transition ml-7"
                              :class="[
                                { 'bg-white/10 text-sidebar-foreground': routes.isRouteExactlyActive(item.path) },
                                isCollectionItem(item.path) ? 'pr-16' : 'pr-8',
                              ]">
                              <Icon :name="item.icon" class="h-4 w-4 shrink-0 opacity-50" />
                              <span class="flex-1 truncate min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                {{ item.label }}
                              </span>
                              <template v-if="routes.getRouteBadge(item)">
                                <template v-if="typeof routes.getRouteBadge(item) === 'object'">
                                  <span
                                    class="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                                    :class="[
                                      (routes.getRouteBadge(item) as any).variant === 'success'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                        : (routes.getRouteBadge(item) as any).variant === 'warning'
                                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                          : (routes.getRouteBadge(item) as any).variant === 'destructive'
                                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                                            : (routes.getRouteBadge(item) as any).variant === 'accent'
                                              ? 'bg-accent text-accent-foreground'
                                              : 'bg-white/10 text-sidebar-foreground/70',
                                    ]"
                                    :style="
                                      (routes.getRouteBadge(item) as any).color
                                        ? { color: (routes.getRouteBadge(item) as any).color }
                                        : {}
                                    ">
                                    {{
                                      sidebarWidth >= BADGE_LABEL_THRESHOLD
                                        ? (routes.getRouteBadge(item) as any).label
                                        : (routes.getRouteBadge(item) as any).label.match(/\d+/)?.[0] ||
                                          (routes.getRouteBadge(item) as any).label
                                    }}
                                  </span>
                                </template>
                                <template v-else>
                                  <span
                                    class="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0">
                                    {{ routes.getRouteBadge(item) }}
                                  </span>
                                </template>
                              </template>
                            </AppNavLink>
                            <div
                              class="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <UiDropdownMenu v-if="isCollectionItem(item.path)">
                                <UiDropdownMenuTrigger as-child>
                                  <button
                                    type="button"
                                    class="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded p-0.5 hover:bg-white/10"
                                    aria-label="Collection options"
                                    @click.stop>
                                    <Icon name="lucide:more-horizontal" class="h-3.5 w-3.5" />
                                  </button>
                                </UiDropdownMenuTrigger>
                                <UiDropdownMenuContent align="end" :side-offset="4" class="w-48">
                                  <UiDropdownMenuItem @click="handleRename(item.path)">
                                    <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />
                                    Rename
                                  </UiDropdownMenuItem>
                                  <UiDropdownMenuItem @click="handleChangeIcon(item.path)">
                                    <Icon name="lucide:palette" class="mr-2 h-4 w-4" />
                                    Change Icon
                                  </UiDropdownMenuItem>
                                  <UiDropdownMenuSeparator />
                                  <UiDropdownMenuItem @click="goTo(item.path)">
                                    <Icon name="lucide:arrow-right" class="mr-2 h-4 w-4" />
                                    Open
                                  </UiDropdownMenuItem>
                                  <UiDropdownMenuItem @click="handleExportTrellis(item.path)">
                                    <Icon name="lucide:download" class="mr-2 h-4 w-4" />
                                    Export
                                  </UiDropdownMenuItem>
                                  <UiDropdownMenuSeparator />
                                  <UiDropdownMenuItem
                                    class="text-destructive focus:text-destructive"
                                    @click="handleDelete(item.path)">
                                    <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                                    Delete
                                  </UiDropdownMenuItem>
                                </UiDropdownMenuContent>
                              </UiDropdownMenu>
                              <button
                                type="button"
                                class="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded p-0.5 hover:bg-white/10"
                                aria-label="Unpin"
                                @click.prevent.stop="pinned.togglePin(item.path)">
                                <Icon name="lucide:pin" class="h-3.5 w-3.5 fill-current" />
                              </button>
                            </div>
                          </div>
                        </motion.li>
                      </motion.ul>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <!-- Regular Section (legacy fallback - only show if no dynamic sections) -->
              <div v-if="!dynamicSidebarSections && !isTypesSection && unpinnedItems.length > 0">
                <button
                  type="button"
                  class="text-muted-foreground hover:text-sidebar-foreground flex w-full items-center justify-start text-xs tracking-wide uppercase transition-colors"
                  @click="collapsed.toggleSection(routes.currentSectionLabel.value)">
                  <Icon
                    name="lucide:chevron-down"
                    class="mx-2 h-3.5 w-3.5 transition-transform"
                    :class="{ '-rotate-90': collapsed.isCollapsed(routes.currentSectionLabel.value) }" />
                  <span class="font-medium">{{ routes.currentSectionLabel.value }}</span>
                  <span
                    v-if="collapsed.isCollapsed(routes.currentSectionLabel.value) && getSectionBadgeInfo(unpinnedItems)"
                    class="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    :class="[
                      getSectionBadgeInfo(unpinnedItems)?.variant === 'destructive'
                        ? 'bg-destructive/15 text-destructive border border-destructive/30'
                        : getSectionBadgeInfo(unpinnedItems)?.variant === 'warning'
                          ? 'bg-warning/15 text-warning border border-warning/30'
                          : getSectionBadgeInfo(unpinnedItems)?.variant === 'success'
                            ? 'bg-success/15 text-success border border-success/30'
                            : 'bg-sidebar-accent text-sidebar-accent-foreground',
                    ]">
                    {{ getSectionBadgeInfo(unpinnedItems)?.count }}
                  </span>
                </button>

                <AnimatePresence>
                  <motion.div
                    v-if="!collapsed.isCollapsed(routes.currentSectionLabel.value)"
                    :initial="{ opacity: 0, height: 0 }"
                    :animate="{ opacity: 1, height: 'auto' }"
                    :exit="{ opacity: 0, height: 0 }"
                    :transition="transitionsDisabled ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }"
                    class="mt-3 overflow-hidden">
                    <div class="relative">
                      <!-- Vertical indentation line -->
                      <div class="absolute ml-[19px] top-0 bottom-[18px] w-px bg-sidebar-border/15" />
                      <motion.ul
                        class="space-y-1 text-sm"
                        :transition="transitionsDisabled ? { duration: 0 } : undefined"
                        :layout="!transitionsDisabled">
                        <motion.li
                          v-for="(item, i) in unpinnedItems"
                          :key="item?.path || ''"
                          :initial="{ opacity: 0, x: -10 }"
                          :animate="{ opacity: 1, x: 0 }"
                          :exit="{ opacity: 0, x: -10 }"
                          :transition="
                            transitionsDisabled
                              ? { duration: 0 }
                              : { duration: 0.28, ease: 'easeOut', delay: i * 0.035 }
                          "
                          :layout="!transitionsDisabled">
                          <div class="group relative elbow-connector">
                            <AppNavLink
                              v-if="item?.path"
                              :to="item.path"
                              class="text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground flex items-center gap-3 rounded-lg px-3 py-2 transition ml-8"
                              :class="[
                                { 'bg-white/15 text-sidebar-foreground': routes.isRouteExactlyActive(item.path) },
                                isCollectionItem(item.path) ? 'pr-16' : 'pr-8',
                              ]">
                              <Icon :name="item.icon" class="h-4 w-4 shrink-0 opacity-50" />
                              <span class="flex-1 truncate min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                {{ item.label }}
                              </span>
                              <template v-if="routes.getRouteBadge(item)">
                                <template v-if="typeof routes.getRouteBadge(item) === 'object'">
                                  <span
                                    class="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                                    :class="[
                                      (routes.getRouteBadge(item) as any).variant === 'success'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                        : (routes.getRouteBadge(item) as any).variant === 'warning'
                                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                          : (routes.getRouteBadge(item) as any).variant === 'destructive'
                                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                                            : (routes.getRouteBadge(item) as any).variant === 'accent'
                                              ? 'bg-accent text-accent-foreground'
                                              : 'bg-white/10 text-sidebar-foreground/70',
                                    ]"
                                    :style="
                                      (routes.getRouteBadge(item) as any).color
                                        ? { color: (routes.getRouteBadge(item) as any).color }
                                        : {}
                                    ">
                                    {{ (routes.getRouteBadge(item) as any).label }}
                                  </span>
                                </template>
                                <template v-else>
                                  <span
                                    class="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0">
                                    {{ routes.getRouteBadge(item) }}
                                  </span>
                                </template>
                              </template>
                            </AppNavLink>
                            <div
                              class="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <UiDropdownMenu v-if="isCollectionItem(item.path)">
                                <UiDropdownMenuTrigger as-child>
                                  <button
                                    type="button"
                                    class="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded p-0.5 hover:bg-white/10"
                                    aria-label="Collection options"
                                    @click.stop>
                                    <Icon name="lucide:more-horizontal" class="h-3.5 w-3.5" />
                                  </button>
                                </UiDropdownMenuTrigger>
                                <UiDropdownMenuContent align="end" :side-offset="4" class="w-48">
                                  <UiDropdownMenuItem @click="handleRename(item.path)">
                                    <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />
                                    Rename
                                  </UiDropdownMenuItem>
                                  <UiDropdownMenuItem @click="handleChangeIcon(item.path)">
                                    <Icon name="lucide:palette" class="mr-2 h-4 w-4" />
                                    Change Icon
                                  </UiDropdownMenuItem>
                                  <UiDropdownMenuSeparator />
                                  <UiDropdownMenuItem @click="goTo(item.path)">
                                    <Icon name="lucide:arrow-right" class="mr-2 h-4 w-4" />
                                    Open
                                  </UiDropdownMenuItem>
                                  <UiDropdownMenuItem @click="handleExportTrellis(item.path)">
                                    <Icon name="lucide:download" class="mr-2 h-4 w-4" />
                                    Export
                                  </UiDropdownMenuItem>
                                  <UiDropdownMenuSeparator />
                                  <UiDropdownMenuItem
                                    class="text-destructive focus:text-destructive"
                                    @click="handleDelete(item.path)">
                                    <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                                    Delete
                                  </UiDropdownMenuItem>
                                </UiDropdownMenuContent>
                              </UiDropdownMenu>
                              <button
                                type="button"
                                class="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded p-0.5 hover:bg-white/10"
                                aria-label="Pin"
                                @click.stop="pinned.togglePin(item.path)">
                                <Icon name="lucide:pin" class="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.li>
                      </motion.ul>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div v-else-if="isTypesSection">
                <div>
                  <button
                    type="button"
                    class="text-muted-foreground hover:text-sidebar-foreground flex w-full items-center justify-start text-xs tracking-wide uppercase transition-colors"
                    @click="collapsed.toggleSection('types:diagram')">
                    <Icon
                      name="lucide:chevron-down"
                      class="mx-2 h-3.5 w-3.5 transition-transform"
                      :class="{ '-rotate-90': collapsed.isCollapsed('types:diagram') }" />
                    <span class="font-medium">Diagram</span>
                    <span
                      v-if="collapsed.isCollapsed('types:diagram') && activeTypeLink"
                      class="ml-2 bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
                      {{ activeTypeParentChain.length + 1 + activeTypeChildren.length }}
                    </span>
                  </button>

                  <AnimatePresence>
                    <motion.div
                      v-if="!collapsed.isCollapsed('types:diagram')"
                      :initial="{ opacity: 0, height: 0 }"
                      :animate="{ opacity: 1, height: 'auto' }"
                      :exit="{ opacity: 0, height: 0 }"
                      :transition="transitionsDisabled ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }"
                      class="mt-3 overflow-hidden">
                      <div v-if="!activeTypeLink" class="px-3 pb-2 text-xs text-sidebar-foreground/70">
                        Select a type to view relationships.
                      </div>
                      <div v-else class="space-y-3 px-3 pb-2 relative">
                        <!-- Vertical indentation line -->
                        <div class="absolute ml-[19px] top-0 bottom-[18px] w-px bg-sidebar-border/15" />

                        <motion.ul
                          class="space-y-1 text-sm"
                          :transition="transitionsDisabled ? { duration: 0 } : undefined"
                          :layout="!transitionsDisabled">
                          <motion.li
                            v-for="(item, i) in activeTypeParentChain"
                            :key="item.path"
                            :initial="{ opacity: 0, x: -10 }"
                            :animate="{ opacity: 1, x: 0 }"
                            :exit="{ opacity: 0, x: -10 }"
                            :transition="
                              transitionsDisabled
                                ? { duration: 0 }
                                : { duration: 0.28, ease: 'easeOut', delay: i * 0.035 }
                            "
                            :layout="!transitionsDisabled">
                            <div class="group relative elbow-connector">
                              <AppNavLink
                                :to="item.path"
                                class="text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground flex items-center gap-2 rounded-md px-2 py-1 transition ml-8">
                                <Icon :name="item.icon" class="h-3.5 w-3.5" />
                                <span class="truncate">{{ item.label }}</span>
                              </AppNavLink>
                            </div>
                          </motion.li>
                        </motion.ul>

                        <div class="space-y-1 relative">
                          <div class="text-[10px] uppercase tracking-wide text-sidebar-foreground/50 ml-8">Current</div>
                          <motion.div class="group relative elbow-connector" :layout="!transitionsDisabled">
                            <AppNavLink
                              :to="activeTypeLink.path"
                              class="bg-white/15 text-sidebar-foreground flex items-center gap-2 rounded-md px-2 py-1 ml-8">
                              <Icon :name="activeTypeLink.icon" class="h-3.5 w-3.5" />
                              <span class="truncate">{{ activeTypeLink.label }}</span>
                            </AppNavLink>
                          </motion.div>
                        </div>

                        <motion.ul
                          class="space-y-1 text-sm"
                          :transition="transitionsDisabled ? { duration: 0 } : undefined"
                          :layout="!transitionsDisabled">
                          <motion.li
                            v-for="(item, i) in activeTypeChildren"
                            :key="item.path"
                            :initial="{ opacity: 0, x: -10 }"
                            :animate="{ opacity: 1, x: 0 }"
                            :exit="{ opacity: 0, x: -10 }"
                            :transition="
                              transitionsDisabled
                                ? { duration: 0 }
                                : { duration: 0.28, ease: 'easeOut', delay: i * 0.035 }
                            "
                            :layout="!transitionsDisabled">
                            <div class="group relative elbow-connector">
                              <AppNavLink
                                :to="item.path"
                                class="text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground flex items-center gap-2 rounded-md px-2 py-1 transition ml-8">
                                <Icon :name="item.icon" class="h-3.5 w-3.5" />
                                <span class="truncate">{{ item.label }}</span>
                              </AppNavLink>
                            </div>
                          </motion.li>
                        </motion.ul>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <button
                    type="button"
                    class="text-muted-foreground hover:text-sidebar-foreground flex w-full items-center justify-start text-xs tracking-wide uppercase transition-colors"
                    @click="collapsed.toggleSection('types:system')">
                    <Icon
                      name="lucide:chevron-down"
                      class="mx-2 h-3.5 w-3.5 transition-transform"
                      :class="{ '-rotate-90': collapsed.isCollapsed('types:system') }" />
                    <span class="font-medium">System</span>
                    <span
                      v-if="collapsed.isCollapsed('types:system') && getSectionBadgeInfo(systemUnpinnedItems)"
                      class="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      :class="[
                        getSectionBadgeInfo(systemUnpinnedItems)?.variant === 'destructive'
                        ? 'bg-destructive/15 text-destructive border border-destructive/30'
                        : getSectionBadgeInfo(systemUnpinnedItems)?.variant === 'warning'
                          ? 'bg-warning/15 text-warning border border-warning/30'
                          : getSectionBadgeInfo(systemUnpinnedItems)?.variant === 'success'
                            ? 'bg-success/15 text-success border border-success/30'
                            : 'bg-sidebar-accent text-sidebar-accent-foreground',
                      ]">
                      {{ getSectionBadgeInfo(systemUnpinnedItems)?.count }}
                    </span>
                  </button>

                  <AnimatePresence>
                    <motion.div
                      v-if="!collapsed.isCollapsed('types:system')"
                      :initial="{ opacity: 0, height: 0 }"
                      :animate="{ opacity: 1, height: 'auto' }"
                      :exit="{ opacity: 0, height: 0 }"
                      :transition="transitionsDisabled ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }"
                      class="mt-3 overflow-hidden">
                      <div class="relative">
                        <!-- Vertical indentation line -->
                        <div class="absolute ml-[19px] top-0 bottom-[18px] w-px bg-sidebar-border/15" />
                        <motion.ul
                          class="space-y-1 text-sm"
                          :transition="transitionsDisabled ? { duration: 0 } : undefined"
                          :layout="!transitionsDisabled">
                          <motion.li
                            v-for="(item, i) in systemUnpinnedItems"
                            :key="item?.path || ''"
                            :initial="{ opacity: 0, x: -10 }"
                            :animate="{ opacity: 1, x: 0 }"
                            :exit="{ opacity: 0, x: -10 }"
                            :transition="
                              transitionsDisabled
                                ? { duration: 0 }
                                : { duration: 0.28, ease: 'easeOut', delay: i * 0.035 }
                            "
                            :layout="!transitionsDisabled">
                            <div class="group relative elbow-connector">
                              <AppNavLink
                                v-if="item?.path"
                                :to="item.path"
                                class="text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground flex items-center gap-3 rounded-lg px-3 py-2 transition ml-7"
                                :class="[
                                  { 'bg-white/15 text-sidebar-foreground': routes.isRouteExactlyActive(item.path) },
                                  'pr-8',
                                ]">
                                <Icon :name="item.icon" class="h-4 w-4 shrink-0 opacity-50" />
                                <span class="flex-1 truncate min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                  {{ item.label }}
                                </span>
                                <template v-if="routes.getRouteBadge(item)">
                                  <template v-if="typeof routes.getRouteBadge(item) === 'object'">
                                    <span
                                      class="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                                      :class="[
                                        (routes.getRouteBadge(item) as any).variant === 'success'
                                          ? 'bg-success/15 text-success border border-success/30'
                                          : (routes.getRouteBadge(item) as any).variant === 'warning'
                                            ? 'bg-warning/15 text-warning border border-warning/30'
                                            : (routes.getRouteBadge(item) as any).variant === 'destructive'
                                              ? 'bg-destructive/15 text-destructive border border-destructive/30'
                                              : (routes.getRouteBadge(item) as any).variant === 'accent'
                                                ? 'bg-accent text-accent-foreground'
                                                : 'bg-white/10 text-sidebar-foreground/70',
                                      ]"
                                      :style="
                                        (routes.getRouteBadge(item) as any).color
                                          ? { color: (routes.getRouteBadge(item) as any).color }
                                          : {}
                                      ">
                                      {{
                                        sidebarWidth >= BADGE_LABEL_THRESHOLD
                                          ? (routes.getRouteBadge(item) as any).label
                                          : (routes.getRouteBadge(item) as any).label.match(/\d+/)?.[0] ||
                                            (routes.getRouteBadge(item) as any).label
                                      }}
                                    </span>
                                  </template>
                                  <template v-else>
                                    <span
                                      class="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0">
                                      {{ routes.getRouteBadge(item) }}
                                    </span>
                                  </template>
                                </template>
                              </AppNavLink>
                              <div
                                class="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  type="button"
                                  class="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded p-0.5 hover:bg-white/10"
                                  aria-label="Pin"
                                  @click.stop="pinned.togglePin(item.path)">
                                  <Icon name="lucide:pin" class="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.li>
                        </motion.ul>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div v-if="customUnpinnedItems.length > 0" class="mt-6">
                  <button
                    type="button"
                    class="text-muted-foreground hover:text-sidebar-foreground flex w-full items-center justify-start text-xs tracking-wide uppercase transition-colors"
                    @click="collapsed.toggleSection('types:custom')">
                    <Icon
                      name="lucide:chevron-down"
                      class="mx-2 h-3.5 w-3.5 transition-transform"
                      :class="{ '-rotate-90': collapsed.isCollapsed('types:custom') }" />
                    <span class="font-medium">Custom</span>
                    <span
                      v-if="collapsed.isCollapsed('types:custom') && getSectionBadgeInfo(customUnpinnedItems)"
                      class="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      :class="[
                        getSectionBadgeInfo(customUnpinnedItems)?.variant === 'destructive'
                        ? 'bg-destructive/15 text-destructive border border-destructive/30'
                        : getSectionBadgeInfo(customUnpinnedItems)?.variant === 'warning'
                          ? 'bg-warning/15 text-warning border border-warning/30'
                          : getSectionBadgeInfo(customUnpinnedItems)?.variant === 'success'
                            ? 'bg-success/15 text-success border border-success/30'
                            : 'bg-sidebar-accent text-sidebar-accent-foreground',
                      ]">
                      {{ getSectionBadgeInfo(customUnpinnedItems)?.count }}
                    </span>
                  </button>

                  <AnimatePresence>
                    <motion.div
                      v-if="!collapsed.isCollapsed('types:custom')"
                      :initial="{ opacity: 0, height: 0 }"
                      :animate="{ opacity: 1, height: 'auto' }"
                      :exit="{ opacity: 0, height: 0 }"
                      :transition="transitionsDisabled ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }"
                      class="mt-3 overflow-hidden">
                      <div class="relative">
                        <!-- Vertical indentation line -->
                        <div class="absolute ml-[19px] top-0 bottom-[18px] w-px bg-sidebar-border/15" />
                        <motion.ul
                          class="space-y-1 text-sm"
                          :transition="transitionsDisabled ? { duration: 0 } : undefined"
                          :layout="!transitionsDisabled">
                          <motion.li
                            v-for="(item, i) in customUnpinnedItems"
                            :key="item?.path || ''"
                            :initial="{ opacity: 0, x: -10 }"
                            :animate="{ opacity: 1, x: 0 }"
                            :exit="{ opacity: 0, x: -10 }"
                            :transition="
                              transitionsDisabled
                                ? { duration: 0 }
                                : { duration: 0.28, ease: 'easeOut', delay: i * 0.035 }
                            "
                            :layout="!transitionsDisabled">
                            <div class="group relative elbow-connector">
                              <AppNavLink
                                v-if="item?.path"
                                :to="item.path"
                                class="text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground flex items-center gap-3 rounded-lg px-3 py-2 transition ml-7"
                                :class="[
                                  { 'bg-white/15 text-sidebar-foreground': routes.isRouteExactlyActive(item.path) },
                                  'pr-8',
                                ]">
                                <Icon :name="item.icon" class="h-4 w-4 shrink-0 opacity-50" />
                                <span class="flex-1 truncate min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                  {{ item.label }}
                                </span>
                                <template v-if="routes.getRouteBadge(item)">
                                  <template v-if="typeof routes.getRouteBadge(item) === 'object'">
                                    <span
                                      class="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                                      :class="[
                                        (routes.getRouteBadge(item) as any).variant === 'success'
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                          : (routes.getRouteBadge(item) as any).variant === 'warning'
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                            : (routes.getRouteBadge(item) as any).variant === 'destructive'
                                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                                              : (routes.getRouteBadge(item) as any).variant === 'accent'
                                                ? 'bg-accent text-accent-foreground'
                                                : 'bg-white/10 text-sidebar-foreground/70',
                                      ]"
                                      :style="
                                        (routes.getRouteBadge(item) as any).color
                                          ? { color: (routes.getRouteBadge(item) as any).color }
                                          : {}
                                      ">
                                      {{
                                        sidebarWidth >= BADGE_LABEL_THRESHOLD
                                          ? (routes.getRouteBadge(item) as any).label
                                          : (routes.getRouteBadge(item) as any).label.match(/\d+/)?.[0] ||
                                            (routes.getRouteBadge(item) as any).label
                                      }}
                                    </span>
                                  </template>
                                  <template v-else>
                                    <span
                                      class="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0">
                                      {{ routes.getRouteBadge(item) }}
                                    </span>
                                  </template>
                                </template>
                              </AppNavLink>
                              <div
                                class="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  type="button"
                                  class="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded p-0.5 hover:bg-white/10"
                                  aria-label="Pin"
                                  @click.stop="pinned.togglePin(item.path)">
                                  <Icon name="lucide:pin" class="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.li>
                        </motion.ul>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </template>
      <template #fallback>
        <div v-if="!sidebarCollapse.isCollapsed.value" class="min-h-0 flex-1">
          <div>
            <template v-if="routes.currentSectionLinks.value.length > 0">
              <button
                type="button"
                class="text-muted-foreground hover:text-sidebar-foreground flex w-full items-center justify-start text-xs tracking-wide uppercase transition-colors">
                <Icon name="lucide:chevron-down" class="mx-2 h-3.5 w-3.5" />
                <span class="font-medium">{{ routes.currentSectionLabel.value }}</span>
              </button>
              <ul class="mt-3 space-y-1 text-sm">
                <li v-for="item in routes.currentSectionLinks.value" :key="item?.path || ''">
                  <AppNavLink
                    v-if="item?.path"
                    :to="item.path"
                    class="text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground flex items-center gap-3 rounded-lg px-3 py-2 pr-8 transition w-full"
                    :class="{ 'bg-white/15 text-sidebar-foreground': routes.isRouteExactlyActive(item.path) }">
                    <Icon :name="item.icon" class="h-4 w-4 shrink-0" />
                    <span class="flex-1 truncate min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                      {{ item.label }}
                    </span>
                  </AppNavLink>
                </li>
              </ul>
            </template>
          </div>
        </div>
      </template>
    </ClientOnly>

    <!-- Sidebar content -->
    <div
      v-if="!sidebarCollapse.isCollapsed.value && routes.currentSidebarSection.value?.path === '/collections'"
      class="border-border bg-transparent rounded-xl border-none p-4 pt-0">
      <UiButton
        class="w-full justify-center bg-white/10 border border-white/20 text-sidebar-foreground hover:bg-white/20 hover:text-sidebar-foreground"
        variant="default"
        @click="handleAddNew">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New collection
      </UiButton>
    </div>

    <UiAlertDialog v-model:open="deleteDialogOpen">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Delete collection?</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            This action cannot be undone.
            <template v-if="pendingDeleteCollectionTitle">
              You are about to delete "{{ pendingDeleteCollectionTitle }}".
            </template>
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel>Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" @click="confirmDelete">
            Delete
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>

    <!-- Page Builder Dialog -->
    <PageBuilder
      :open="pageBuilderOpen"
      @update:open="pageBuilderOpen = $event"
      @save="handlePageSave" />
  </aside>
</template>

<style scoped>
  /* Elbow connector using pseudo-element to avoid Framer Motion DOM traversal issues */
  .elbow-connector::before {
    content: '';
    position: absolute;
    left: 19px;
    top: 50%;
    height: 1rem;
    width: 0.875rem;
    transform: translateY(-1rem);
    border-left: 1px solid;
    border-bottom: 1px solid;
    border-bottom-left-radius: 0.5rem;
    border-color: var(--color-rail-border);
    backdrop-filter: blur(10px);
  }

  #border {
    transform: translateY(-1rem) !important;
    background: var(--color-rail-border);
  }

  /* Disable all transitions on sidebar children during resize and for 1000ms after */
  .is-resizing,
  .is-resizing :deep(*),
  .transitions-disabled,
  .transitions-disabled :deep(*) {
    transition: none !important;
    animation: none !important;
  }
</style>
