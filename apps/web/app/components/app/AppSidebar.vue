<script lang="ts" setup>
  import { AnimatePresence, motion } from 'motion-v'
  import Sortable from 'sortablejs'
  import { SYSTEM_TYPES } from '~/lib/systemTypes'
  import { getAllEntityTypes } from '~/config/entityRegistry'
  import type { ContextMenuEvent } from '~/types/contextMenu'
  import { CONTEXT_ACTIONS } from '~/types/contextMenu'
  import type { SidebarTreeNode } from '~/composables/useSidebarTree'
  import {
    sidebarItemMenu,
    sidebarSectionMenu,
    collectionItemMenu,
    customSectionMenu,
    sidebarSurfaceMenu,
    treeNodeSectionMenu,
    treeNodeItemMenu,
  } from '~/composables/useContextMenu'

  defineProps<{
    headerAbove?: boolean
  }>()

  const BADGE_LABEL_THRESHOLD = 300

  const { wp } = useWorkspacePath()
  const routes = useRoutes()
  const pinned = usePinnedItems()
  const settingsPinned = usePinnedSettings()
  const sidebarOrder = useSidebarOrder()
  const collapsed = useCollapsedSections()
  const sidebarCollapse = useSidebarCollapse()
  const { copyLink } = useContextMenu()
  const nuxtApp = useNuxtApp()
  const route = useRoute()

  // Tree-driven sidebar state
  const { sidebarTree } = routes
  const isTreeDriven = computed(() => {
    return isWorkspaceRoute.value && sidebarTree.initialized.value && sidebarTree.tree.value.length > 0
  })

  // Admin UI controls
  const { showBuilderUI, canCreatePages, canEditContent } = useAdminUI()

  // Pages CRUD
  const { createPage } = usePages()

  // Page Builder dialog state
  const pageBuilderOpen = ref(false)

  // Ontology create dialog state
  const ontologyCreateOpen = ref(false)

  // ── Sidebar filter ─────────────────────────────────────────
  const sidebarFilter = ref('')
  const sidebarFilterInputRef = ref<HTMLInputElement | null>(null)
  const menuIconRef = ref<{ startAnimation: () => void; stopAnimation: () => void } | null>(null)

  watch(
    () => sidebarCollapse.isCollapsed.value,
    (collapsed) => {
      if (collapsed) {
        menuIconRef.value?.stopAnimation()
      } else {
        menuIconRef.value?.startAnimation()
      }
    },
  )

  const matchesFilter = (label: string) => {
    if (!sidebarFilter.value) return true
    return label.toLowerCase().includes(sidebarFilter.value.toLowerCase())
  }

  const filteredDynamicSidebarSections = computed(() => {
    const sections = dynamicSidebarSections.value
    if (!sections || !sidebarFilter.value) return sections
    return sections
      .map((section: any) => ({
        ...section,
        items: section.items?.filter((item: any) => matchesFilter(item?.label || '')) || [],
      }))
      .filter((section: any) => section.items.length > 0)
  })

  const filteredPinnedItems = computed(() => {
    if (!sidebarFilter.value) return pinnedItems.value
    return pinnedItems.value.filter((item: any) => matchesFilter(item?.label || ''))
  })

  const filteredUnpinnedItems = computed(() => {
    if (!sidebarFilter.value) return unpinnedItems.value
    return unpinnedItems.value.filter((item: any) => matchesFilter(item?.label || ''))
  })

  const filteredSystemUnpinnedItems = computed(() => {
    if (!sidebarFilter.value) return systemUnpinnedItems.value
    return systemUnpinnedItems.value.filter((item: any) => matchesFilter(item?.label || ''))
  })

  const filteredCustomUnpinnedItems = computed(() => {
    if (!sidebarFilter.value) return customUnpinnedItems.value
    return customUnpinnedItems.value.filter((item: any) => matchesFilter(item?.label || ''))
  })

  // Clear filter when switching sidebar sections
  watch(
    () => routes.currentSectionLabel.value,
    () => {
      sidebarFilter.value = ''
    },
  )

  const sidebarSectionKey = computed(() => routes.currentSectionLabel.value)

  const isTypesSection = computed(() => routes.currentSidebarSection.value?.path === '/types')
  const isSettingsSection = computed(() => route.path.startsWith('/settings'))

  const pinnedSettingsItems = computed(() => {
    if (!isSettingsSection.value || !filteredDynamicSidebarSections.value) return []
    const allItems: any[] = []
    for (const section of filteredDynamicSidebarSections.value) {
      if (section.items) allItems.push(...section.items)
    }
    return allItems.filter((item: any) => item?.path && settingsPinned.isPinned(item.path))
  })

  const { customTypes } = useInstantData()

  const { state: graphTypesState } = useGraphTypesSidebar()

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
    // console.log('AppHeader: isResizing changed to', val)
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
    // console.log('Sidebar resize started')
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

  // Handle Add New button click - opens ontology create dialog
  const {
    collections,
    currentApp: _currentApp,
    createCollection: _createCollection,
    updateCollection,
    deleteCollection,
    deleteCustomType,
  } = useInstantData()
  const { downloadCollectionAsTrellis } = useTrellisAdapter()

  const deleteDialogOpen = ref(false)
  const pendingDeleteCollectionId = ref<string | null>(null)
  const pendingDeleteCollectionTitle = ref<string>('')
  const skipDeleteConfirm = ref(localStorage.getItem('trellis:skipDeleteCollectionConfirm') === 'true')
  const dontAskAgain = ref(false)

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
    await navigateTo(wp(collectionSlug))
  }

  const handleDelete = async (collectionSlug: string) => {
    const collection = collections.value.find((c) => `/collections/${c.slug}` === collectionSlug)
    if (!collection) return

    pendingDeleteCollectionId.value = collection.id
    pendingDeleteCollectionTitle.value = collection.title

    if (skipDeleteConfirm.value) {
      await confirmDelete()
      return
    }

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
    navigateTo(wp('/ontologies'))
  }

  watch(deleteDialogOpen, (open) => {
    if (open) return
    if (dontAskAgain.value) {
      skipDeleteConfirm.value = true
      localStorage.setItem('trellis:skipDeleteCollectionConfirm', 'true')
    }
    dontAskAgain.value = false
    pendingDeleteCollectionId.value = null
    pendingDeleteCollectionTitle.value = ''
  })

  const isCollectionItem = (path: string) => {
    return path.startsWith('/collections/') && path !== '/collections'
  }

  const goTo = async (path: string) => {
    await navigateTo(path)
  }

  const handleAddNew = async (sectionKey?: string) => {
    // Route based on which section's + was clicked
    if (sectionKey === 'personal-pages') {
      await handleCreatePageInstant()
      return
    }

    if (sectionKey === 'workflows') {
      await handleCreateWorkflow()
      return
    }

    const section = routes.currentSidebarSection.value
    if (section?.path === '/ontologies' || section?.path === '/database') {
      ontologyCreateOpen.value = true
    }
  }

  const handleCreateWorkflow = async () => {
    try {
      const { createWorkflow } = useInstantData()
      const id = await createWorkflow({ name: 'Untitled Workflow', icon: 'lucide:workflow', active: true })
      await navigateTo(wp(`/workflows/${id}`))
    } catch (e) {
      console.error('Failed to create workflow:', e)
    }
  }

  // Instant page creation — creates a grid page and navigates to it
  const handleCreatePageInstant = async () => {
    try {
      const id = await createPage({
        title: 'Untitled',
        dataSource: 'all',
        layout: 'grid',
      })
      await navigateTo(wp(`/workspace/pages/${id}`))
    } catch (e) {
      console.error('Failed to create page:', e)
    }
  }

  // Create new page - opens the page builder dialog (kept as fallback)
  const handleCreatePage = () => {
    pageBuilderOpen.value = true
  }

  // Handle page created from dialog
  const handlePageCreated = (page: { id: string; title: string }) => {
    ;(nuxtApp as any).$toast?.success(`Page "${page.title}" created!`)
    pageBuilderOpen.value = false
  }

  // ── Context menu action dispatch ─────────────────────────────

  const getItemContextMenu = (item: any, sectionKey: string) => {
    if (isCollectionItem(item.path)) {
      return collectionItemMenu()
    }
    // Tree-driven items get rename/changeIcon/move/delete options
    if (isTreeDriven.value && item._treeNodeId) {
      return treeNodeItemMenu({
        isPinned: pinned.isPinned(item.path),
        canPin: sectionKey !== 'personal-pinned',
        isLocked: !!item._locked,
        path: item.path,
      })
    }
    return sidebarItemMenu({
      isPinned: pinned.isPinned(item.path),
      canPin: sectionKey !== 'personal-pinned',
      path: item.path,
    })
  }

  const typeItemMenu = (item: any) => {
    return [
      {
        id: CONTEXT_ACTIONS.OPEN,
        label: 'Open',
        icon: 'lucide:arrow-right',
      },
      {
        id: CONTEXT_ACTIONS.OPEN_NEW_TAB,
        label: 'Open in New Tab',
        icon: 'lucide:external-link',
      },
      {
        id: CONTEXT_ACTIONS.COPY_LINK,
        label: 'Copy Link',
        icon: 'lucide:link',
      },
      {
        id: CONTEXT_ACTIONS.DELETE,
        label: 'Delete Type',
        icon: 'lucide:trash-2',
        variant: 'destructive' as const,
        separator: true,
        visible: !!item?.isCustom,
      },
    ]
  }

  const getSidebarSurfaceMenu = () => {
    const sections = dynamicSidebarSections.value || []
    const hasCollapsed = sections.some((s: any) => collapsed.isCollapsed(s.key))
    return sidebarSurfaceMenu({
      isWorkspace: isWorkspaceRoute.value,
      canCreateSection: isWorkspaceRoute.value,
      hasCollapsedSections: hasCollapsed,
    })
  }

  const getSectionContextMenu = (section: any) => {
    if ((section as any).isCustom) {
      return customSectionMenu({ isCollapsed: collapsed.isCollapsed(section.key) })
    }
    // Tree-driven sections get rename/changeIcon/delete options
    if (isTreeDriven.value && section._treeNodeId) {
      return treeNodeSectionMenu({
        isCollapsed: collapsed.isCollapsed(section.key),
        isLocked: !!section._locked,
        canCreate: canEditContent.value,
      })
    }
    return sidebarSectionMenu({
      isCollapsed: collapsed.isCollapsed(section.key),
      canResetOrder: isWorkspaceRoute.value || (isOntologiesRoute.value && section.key === 'ontologies-custom'),
      canCreate: canEditContent.value && (isWorkspaceRoute.value || !!section.editable),
    })
  }

  const handleContextAction = async (event: ContextMenuEvent) => {
    const { actionId, context } = event
    switch (actionId) {
      // Navigation
      case CONTEXT_ACTIONS.OPEN:
        if (context?.path) goTo(context.path)
        break
      case CONTEXT_ACTIONS.OPEN_NEW_TAB:
        if (context?.path && import.meta.client) {
          window.open(context.path, '_blank')
        }
        break
      case CONTEXT_ACTIONS.COPY_LINK:
        if (context?.path) copyLink(context.path)
        break

      // Pin
      case CONTEXT_ACTIONS.PIN:
      case CONTEXT_ACTIONS.UNPIN:
        if (context?.path) pinned.togglePin(context.path)
        break

      // Section collapse
      case CONTEXT_ACTIONS.COLLAPSE:
      case CONTEXT_ACTIONS.EXPAND:
        if (context?.key) collapsed.toggleSection(context.key)
        break

      // Create
      case CONTEXT_ACTIONS.CREATE:
        handleAddNew(context?.key)
        break

      // Reset order
      case CONTEXT_ACTIONS.RESET_ORDER:
        if (context?.key) sidebarOrder.resetSection(context.key)
        break

      // Collection & Tree Node CRUD
      case CONTEXT_ACTIONS.RENAME:
        if (context?._treeNodeId) {
          handleRenameTreeNode(context._treeNodeId, context.label)
        } else if (context?.isCustomSection) {
          handleRenameCustomSection(context.key)
        } else if (context?.path) {
          handleRename(context.path)
        }
        break
      case CONTEXT_ACTIONS.CHANGE_ICON:
        if (context?._treeNodeId) {
          handleChangeTreeNodeIcon(context._treeNodeId, context.icon)
        } else if (context?.path) {
          handleChangeIcon(context.path)
        }
        break
      case CONTEXT_ACTIONS.DUPLICATE:
        // TODO: implement duplicate
        break
      case CONTEXT_ACTIONS.EXPORT:
        if (context?.path) handleExportTrellis(context.path)
        break
      case CONTEXT_ACTIONS.MOVE_TO:
        // TODO: implement move-to-section picker for tree nodes
        break
      case CONTEXT_ACTIONS.DELETE:
        if (context?._treeNodeId) {
          handleDeleteTreeNode(context._treeNodeId, context.label)
        } else if (context?.isCustomSection) {
          handleDeleteCustomSection(context.key)
        } else if (context?.path) {
          if (isTypesSection.value && context.typeId) {
            const label = context.typeLabel || 'this type'
            const confirmed = window.confirm(`Delete ${label}? This action cannot be undone.`)
            if (!confirmed) break
            await handleDeleteType(context.typeId)
          } else {
            handleDelete(context.path)
          }
        }
        break

      // Sidebar surface actions
      case 'expand-all': {
        const sections = dynamicSidebarSections.value || []
        sections.forEach((s: any) => {
          if (collapsed.isCollapsed(s.key)) collapsed.toggleSection(s.key)
        })
        break
      }
      case 'collapse-all': {
        const sections = dynamicSidebarSections.value || []
        sections.forEach((s: any) => {
          if (!collapsed.isCollapsed(s.key)) collapsed.toggleSection(s.key)
        })
        break
      }
      case 'create-section':
        isCreatingSection.value = true
        break
    }
  }

  // ── Drag-and-drop reordering ─────────────────────────────────

  const isWorkspaceRoute = computed(() => routes.currentSidebarSection.value?.path === '/workspace')
  const isOntologiesRoute = computed(() => routes.currentSidebarSection.value?.path === '/ontologies')
  const isChatRoute = computed(
    () => route.path.startsWith('/messages') || routes.currentSidebarSection.value?.path === '/messages',
  )
  const isPagesRoute = computed(
    () => route.path.startsWith('/pages') || routes.currentSidebarSection.value?.path === '/pages',
  )
  const isCalendarRoute = computed(
    () =>
      route.path === '/calendar' ||
      route.path.startsWith('/calendar/') ||
      routes.currentSidebarSection.value?.path === '/calendar',
  )

  const _isGraphRoute = computed(
    () =>
      route.path === '/graph' ||
      route.path.startsWith('/graph/') ||
      routes.currentSidebarSection.value?.path === '/graph',
  )

  const isBrowseRoute = computed(() => route.path.endsWith('/workspace/browse'))

  const pageSidebar = usePageSidebar()

  const browseTotalCount = computed(() => Object.values(pageSidebar.state.typeCounts).reduce((s, n) => s + n, 0))

  const browseAllPinned = computed(() => pageSidebar.isPinned('all'))

  const browsePinnedTypes = computed(() => {
    const allTypes = getAllEntityTypes()
    return allTypes.filter((t) => pageSidebar.isPinned(t.type))
  })

  const browseUnpinnedTypes = computed(() => {
    const allTypes = getAllEntityTypes()
    return allTypes.filter(
      (t) =>
        !pageSidebar.isPinned(t.type) &&
        ((pageSidebar.state.typeCounts[t.type] ?? 0) > 0 || t.type === pageSidebar.state.activeTypeId),
    )
  })

  const sectionsContainerRef = ref<HTMLElement | null>(null)
  const sortableInstances = ref<Sortable[]>([])

  const destroySortables = () => {
    sortableInstances.value.forEach((s) => s.destroy())
    sortableInstances.value = []
  }

  const initSortables = () => {
    destroySortables()
    if (!import.meta.client) return

    // Item reorder within sections
    nextTick(() => {
      const lists = document.querySelectorAll<HTMLElement>('[data-sortable-section]')
      lists.forEach((list) => {
        const sectionKey = list.dataset.sortableSection
        if (!sectionKey) return

        // Only enable for workspace sections + ontologies-custom
        const canReorder = isWorkspaceRoute.value || (isOntologiesRoute.value && sectionKey === 'ontologies-custom')
        if (!canReorder) return

        // In tree-driven mode, allow cross-section dragging for reparenting
        const groupConfig = isTreeDriven.value
          ? { name: 'sidebar-tree', pull: true, put: true }
          : { name: sectionKey, pull: false, put: false }

        const instance = Sortable.create(list, {
          animation: 150,
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          dragClass: 'sortable-drag',
          forceFallback: true,
          fallbackClass: 'sortable-fallback',
          fallbackOnBody: true,
          delay: 100,
          delayOnTouchOnly: false,
          group: groupConfig,
          onEnd: (evt: any) => {
            const targetList = evt.to as HTMLElement
            const targetSectionKey = targetList?.dataset?.sortableSection
            const items = Array.from(targetList.querySelectorAll<HTMLElement>('[data-item-path]'))
            const newOrder = items.map((el) => el.dataset.itemPath!).filter(Boolean)

            // Persist to localStorage
            if (targetSectionKey) {
              sidebarOrder.setItemOrder(targetSectionKey, newOrder)
            }

            // Also update source section order if item moved across sections
            if (evt.from !== evt.to) {
              const srcSectionKey = (evt.from as HTMLElement)?.dataset?.sortableSection
              if (srcSectionKey) {
                const srcItems = Array.from((evt.from as HTMLElement).querySelectorAll<HTMLElement>('[data-item-path]'))
                const srcOrder = srcItems.map((el) => el.dataset.itemPath!).filter(Boolean)
                sidebarOrder.setItemOrder(srcSectionKey, srcOrder)
              }
            }

            // Sync to TQL graph nodes when tree-driven
            if (isTreeDriven.value) {
              const flatNodes = sidebarTree.flatNodes.value
              const movedPath = evt.item?.dataset?.itemPath

              // If item moved between sections, reparent it
              if (evt.from !== evt.to && movedPath && targetSectionKey) {
                const movedNode = flatNodes.find((n) => n.routePath === movedPath)
                // Find the target section's tree node ID
                const targetSection = (dynamicSidebarSections.value || []).find((s: any) => s.key === targetSectionKey)
                const newParentId = (targetSection as any)?._treeNodeId || null

                if (movedNode && newParentId) {
                  sidebarTree.moveNode(movedNode.id, newParentId, evt.newIndex + 1)
                }
              }

              // Update order for all items in the target section
              newOrder.forEach((path, idx) => {
                const node = flatNodes.find((n) => n.routePath === path)
                if (node && node.order !== idx + 1) {
                  sidebarTree.updateNode(node.id, { order: idx + 1 })
                }
              })
            }
          },
        })
        sortableInstances.value.push(instance)
      })

      // Section reorder (workspace only)
      if (isWorkspaceRoute.value && sectionsContainerRef.value) {
        const instance = Sortable.create(sectionsContainerRef.value, {
          animation: 150,
          ghostClass: 'sortable-ghost',
          forceFallback: true,
          fallbackClass: 'sortable-fallback',
          fallbackOnBody: true,
          delay: 100,
          delayOnTouchOnly: false,
          draggable: '[data-section-key]',
          filter: '[data-section-pinned]',
          onEnd: () => {
            const sectionEls = Array.from(
              sectionsContainerRef.value!.querySelectorAll<HTMLElement>('[data-section-key]'),
            )
            const newOrder = sectionEls.map((el) => el.dataset.sectionKey!).filter(Boolean)
            sidebarOrder.setSectionOrder('/workspace', newOrder)

            // Sync section order to TQL graph nodes when tree-driven
            if (isTreeDriven.value) {
              const treeNodes = sidebarTree.tree.value
              newOrder.forEach((key, idx) => {
                const node = treeNodes.find((n) => (n.sectionKey || n.id) === key)
                if (node && node.order !== (idx + 1) * 10) {
                  sidebarTree.updateNode(node.id, { order: (idx + 1) * 10 })
                }
              })
            }
          },
        })
        sortableInstances.value.push(instance)
      }
    })
  }

  // Re-init when sidebar sections change or collapse state changes
  watch(
    [() => dynamicSidebarSections.value, () => collapsed.collapsedSections.value],
    () => {
      if (import.meta.client) {
        nextTick(() => initSortables())
      }
    },
    { flush: 'post' },
  )

  onMounted(() => {
    nextTick(() => initSortables())
  })

  onUnmounted(() => {
    destroySortables()
  })

  // ── Create Section (workspace only) ──────────────────────────

  const newSectionName = ref('')
  const isCreatingSection = ref(false)

  const handleCreateSection = async () => {
    const name = newSectionName.value.trim()
    if (!name) return

    if (isTreeDriven.value) {
      // Create a SidebarNode entity for the new section
      const slug = `custom-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`
      const maxOrder = Math.max(0, ...sidebarTree.tree.value.map((n) => n.order))
      await sidebarTree.createNode(slug, {
        label: name.toUpperCase(),
        icon: 'lucide:folder',
        scope: 'workspace',
        nodeType: 'section',
        locked: false,
        collapsed: false,
        order: maxOrder + 10,
        editable: true,
      })
    } else {
      sidebarOrder.createSection('/workspace', name)
    }

    newSectionName.value = ''
    isCreatingSection.value = false
  }

  const handleDeleteCustomSection = (key: string) => {
    sidebarOrder.deleteSection(key)
  }

  const handleDeleteType = async (typeId: string) => {
    try {
      await deleteCustomType(typeId)
      ;(nuxtApp as any).$toast?.success('Type deleted')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete type'
      ;(nuxtApp as any).$toast?.error(message)
    }
  }

  const handleRenameCustomSection = (key: string) => {
    const section = sidebarOrder.getCustomSections('/workspace').find((s) => s.key === key)
    if (!section) return
    const newName = prompt('Rename section:', section.label)
    if (newName && newName.trim()) {
      sidebarOrder.renameSection(key, newName.trim())
    }
  }

  // ── SidebarTreeItem helpers ─────────────────────────────────

  /** Convert a resolved section item with _nodeType=group back to SidebarTreeNode shape */
  const itemToTreeNode = (item: any): SidebarTreeNode => ({
    id: item._treeNodeId || '',
    label: item.label || '',
    icon: item.icon || 'lucide:folder',
    routePath: item.path || '',
    scope: 'workspace',
    nodeType: item._nodeType || 'item',
    locked: !!item._locked,
    collapsed: !!item._collapsed,
    order: 0,
    editable: false,
    children: (item._children || []).map((c: any) => ({
      ...c,
      children: c.children || [],
    })),
  })

  /** Context menu resolver for SidebarTreeItem */
  const getTreeNodeContextMenu = (node: SidebarTreeNode) => {
    if (node.nodeType === 'group') {
      return treeNodeSectionMenu({
        isCollapsed: collapsed.isCollapsed(`tree-group:${node.id}`),
        isLocked: node.locked,
        canCreate: canEditContent.value,
      })
    }
    return treeNodeItemMenu({
      isPinned: pinned.isPinned(node.routePath || ''),
      canPin: true,
      isLocked: node.locked,
      path: node.routePath,
    })
  }

  // ── Tree node mutation handlers ─────────────────────────────

  const handleRenameTreeNode = (nodeId: string, currentLabel?: string) => {
    const newLabel = prompt('Rename:', currentLabel || '')
    if (newLabel && newLabel.trim()) {
      sidebarTree.updateNode(nodeId, { label: newLabel.trim() })
    }
  }

  const handleChangeTreeNodeIcon = (nodeId: string, currentIcon?: string) => {
    const newIcon = prompt('Icon name (e.g. lucide:star):', currentIcon || 'lucide:circle')
    if (newIcon && newIcon.trim()) {
      sidebarTree.updateNode(nodeId, { icon: newIcon.trim() })
    }
  }

  const handleDeleteTreeNode = (nodeId: string, label?: string) => {
    const name = label || 'this item'
    const confirmed = window.confirm(`Remove "${name}" from the sidebar?`)
    if (confirmed) {
      sidebarTree.deleteNode(nodeId)
    }
  }
</script>

<template>
  <!-- Sidebar: Content frame (matches page header) -->
  <aside
    data-slot="app-sidebar"
    class="border-sidebar-border/75 rounded-xl! text-sidebar-foreground hidden flex-col border-r-none px-0 pb-0 lg:flex relative"
    :style="{
      width: sidebarCollapse.isCollapsed.value ? '0px' : `${sidebarWidth}px`,
      transition: transitionsDisabled ? 'none' : 'width 0.3s ease',
    }"
    :class="[
      sidebarCollapse.isCollapsed.value ? 'overflow-visible pr-2.5' : 'overflow-hidden',
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

    <!-- Sidebar toggle: always rendered, sits at search-row position -->
    <!-- <ClientOnly>
      <UiTooltip v-if="!sidebarCollapse.isForcedCollapsed.value">
        <UiTooltipTrigger as-child>
          <button
            type="button"
            :aria-label="sidebarCollapse.isCollapsed.value ? 'Expand sidebar' : 'Collapse sidebar'"
            :class="sidebarCollapse.isCollapsed.value ? 'border-none!' : 'bg-foreground/3'"
            class="absolute z-20 flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:text-foreground hover:bg-muted mr-2"
            :style="{ left: '10px', top: '10px' }"
            @click="sidebarCollapse.toggle()">
            <AnimatedIconsMenu ref="menuIconRef" :size="14" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="bottom" :side-offset="6">
          {{ sidebarCollapse.isCollapsed.value ? 'Expand sidebar' : 'Collapse sidebar' }}
        </UiTooltipContent>
      </UiTooltip>
    </ClientOnly> -->

    <!-- Builder Controls (Edit Mode) -->
    <div v-if="showBuilderUI && canCreatePages" class="px-4 py-0 border-b border-sidebar-border/10">
      <UiButton
        variant="ghost"
        size="sm"
        class="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-amber-500/10 border border-dashed border-amber-500/30 justify-start gap-2 px-3 bg-red-500"
        @click="handleCreatePage">
        <Icon name="lucide:plus" class="h-4 w-4 text-amber-500" />
        <span class="text-xs font-medium">New Page</span>
        <span class="ml-auto text-[10px] text-amber-500/70 bg-amber-500/10 px-1.5 py-0.5 rounded">Edit Mode</span>
      </UiButton>
    </div>

    <!-- Sidebar section items animate per rail route (client-only to avoid hydration mismatches from localStorage/pins) -->
    <ClientOnly>
      <template v-if="!sidebarCollapse.isCollapsed.value">
        <AppContextMenu :actions="getSidebarSurfaceMenu()" :context="{ surface: true }" @action="handleContextAction">
          <template #trigger>
            <div class="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
              <!-- Sticky sidebar filter -->
              <!-- <div class="sticky top-0 z-10 px-2.5 pt-2.5 pb-2.5" style="background: linear-gradient(to bottom, var(--card) 0%, transparent 100%)"> -->
              <div v-if="!isCalendarRoute" class="sticky top-0 z-10 px-2.5 pt-2.5 pb-2.5">
                <div class="flex items-center gap-1.5">
                  <!-- Toggle placeholder: reserves space equal to the toggle button -->
                  <!-- <div v-if="!sidebarCollapse.isForcedCollapsed.value" class="shrink-0 h-[30px] w-[30px]" /> -->
                  <!-- Search input -->
                  <div class="relative flex-1 flex items-center">
                    <Icon
                      name="lucide:search"
                      class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/75 z-10" />
                    <input
                      ref="sidebarFilterInputRef"
                      v-model="sidebarFilter"
                      type="text"
                      placeholder="Search..."
                      class="w-full bg-card/50 border border-border backdrop-blur-md text-sidebar-foreground text-xs rounded-md pl-8 pr-10 py-2 outline-none placeholder:text-sidebar-foreground/30 focus:ring-1 focus:ring-ring/50 transition-colors"
                      @keydown.escape="sidebarFilter = ''" />
                    <UiTooltipProvider
                      v-if="isWorkspaceRoute || routes.currentSidebarSection.value?.path === '/ontologies'">
                      <UiTooltip>
                        <UiTooltipTrigger as-child>
                          <button
                            type="button"
                            class="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 w-6 shrink-0 rounded-full text-foreground hover:text-sidebar-foreground hover:bg-foreground/5 transition-colors"
                            :aria-label="isWorkspaceRoute ? 'Add page' : 'New type'"
                            @click="isWorkspaceRoute ? handleCreatePageInstant() : handleAddNew()">
                            <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                          </button>
                        </UiTooltipTrigger>
                        <UiTooltipContent side="bottom" :side-offset="4">
                          <p>{{ isWorkspaceRoute ? 'Add page' : 'New type' }}</p>
                        </UiTooltipContent>
                      </UiTooltip>
                    </UiTooltipProvider>
                  </div>
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  :key="sidebarSectionKey"
                  :initial="{ opacity: 0, x: -8 }"
                  :animate="{ opacity: 1, x: 0 }"
                  :exit="{ opacity: 0, x: -8 }"
                  :transition="transitionsDisabled ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }"
                  :class="
                    isCalendarRoute
                      ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                      : 'flex min-h-0 flex-1 flex-col p-3 pl-2 pt-0 pb-24'
                  ">
                  <!-- Calendar Sidebar Panel (calendar route) -->
                  <template v-if="isCalendarRoute">
                    <CalendarSidebarPanel />
                  </template>

                  <!-- Chat Sidebar (messages route) -->
                  <template v-else-if="isChatRoute">
                    <ChatSidebar class="pt-2" />
                  </template>

                  <!-- Pages Sidebar (pages route) -->
                  <template v-else-if="isPagesRoute">
                    <PagesSidebar class="pt-2" />
                  </template>

                  <!-- Browse type filter sidebar -->
                  <template v-else-if="isBrowseRoute">
                    <div class="py-4">
                      <template v-if="pageSidebar.state.isActive">
                        <div class="relative px-2 space-y-4">
                          <!-- Pinned section -->
                          <div v-if="browseAllPinned || browsePinnedTypes.length > 0">
                            <div class="flex items-center px-3 mb-1">
                              <span class="text-muted-foreground text-[10px] tracking-wide uppercase font-medium">
                                Pinned
                              </span>
                            </div>
                            <ul class="space-y-0.5 text-sm">
                              <!-- All (pinned) -->
                              <li v-if="browseAllPinned">
                                <div
                                  class="group relative flex items-center rounded-lg transition hover:bg-foreground/5"
                                  :class="{ 'bg-foreground/10': pageSidebar.state.activeTypeId === 'all' }">
                                  <button
                                    type="button"
                                    class="flex flex-1 items-center justify-start gap-3 px-3 py-2 min-w-0"
                                    :class="
                                      pageSidebar.state.activeTypeId === 'all'
                                        ? 'text-foreground font-semibold'
                                        : 'text-sidebar-foreground'
                                    "
                                    @click="pageSidebar.state.onSelectType?.('all')">
                                    <Icon name="lucide:layers-3" class="h-4 w-4 shrink-0 opacity-50" />
                                    <span class="flex-1 flex justify-start truncate min-w-0 text-xs">All</span>
                                    <span
                                      class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shrink-0"
                                      :class="
                                        pageSidebar.state.activeTypeId === 'all'
                                          ? 'bg-primary/20 text-primary'
                                          : 'bg-muted text-muted-foreground'
                                      ">
                                      {{ browseTotalCount }}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    class="shrink-0 mr-1.5 p-1 rounded transition text-primary/60"
                                    title="Unpin"
                                    @click.stop="pageSidebar.togglePin('all')">
                                    <Icon name="lucide:pin" class="h-3 w-3" />
                                  </button>
                                </div>
                              </li>
                              <!-- Pinned types -->
                              <li v-for="t in browsePinnedTypes" :key="t.type">
                                <div
                                  class="group relative flex items-center rounded-lg transition hover:bg-foreground/5"
                                  :class="{ 'bg-foreground/10': pageSidebar.state.activeTypeId === t.type }">
                                  <button
                                    type="button"
                                    class="flex flex-1 items-center justify-start gap-3 px-3 py-2 min-w-0"
                                    :class="
                                      pageSidebar.state.activeTypeId === t.type
                                        ? 'text-foreground font-semibold'
                                        : 'text-sidebar-foreground'
                                    "
                                    @click="pageSidebar.state.onSelectType?.(t.type)">
                                    <Icon
                                      :name="t.icon"
                                      class="h-4 w-4 shrink-0 opacity-50"
                                      :class="pageSidebar.state.activeTypeId === t.type ? `text-${t.color}-400` : ''" />
                                    <span class="flex-1 flex justify-start truncate min-w-0 text-xs">
                                      {{ t.labelPlural ?? t.label }}
                                    </span>
                                    <span
                                      v-if="pageSidebar.state.typeCounts[t.type]"
                                      class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shrink-0"
                                      :class="
                                        pageSidebar.state.activeTypeId === t.type
                                          ? 'bg-primary/20 text-primary'
                                          : 'bg-muted text-muted-foreground'
                                      ">
                                      {{ pageSidebar.state.typeCounts[t.type] }}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    class="shrink-0 mr-1.5 p-1 rounded transition text-primary/60"
                                    title="Unpin"
                                    @click.stop="pageSidebar.togglePin(t.type)">
                                    <Icon name="lucide:pin" class="h-3 w-3" />
                                  </button>
                                </div>
                              </li>
                            </ul>
                          </div>

                          <!-- Types section -->
                          <div v-if="!browseAllPinned || browseUnpinnedTypes.length > 0">
                            <div class="flex items-center px-3 mb-1">
                              <span class="text-muted-foreground text-[10px] tracking-wide uppercase font-medium">
                                Types
                              </span>
                            </div>
                            <ul class="space-y-0.5 text-sm">
                              <!-- All (unpinned) -->
                              <li v-if="!browseAllPinned">
                                <div
                                  class="group relative flex items-center rounded-lg transition hover:bg-foreground/5"
                                  :class="{ 'bg-foreground/10': pageSidebar.state.activeTypeId === 'all' }">
                                  <button
                                    type="button"
                                    class="flex flex-1 items-center justify-start gap-3 px-3 py-2 min-w-0"
                                    :class="
                                      pageSidebar.state.activeTypeId === 'all'
                                        ? 'text-foreground font-semibold'
                                        : 'text-sidebar-foreground'
                                    "
                                    @click="pageSidebar.state.onSelectType?.('all')">
                                    <Icon name="lucide:layers-3" class="h-4 w-4 shrink-0 opacity-50" />
                                    <span class="flex-1 flex justify-start truncate min-w-0 text-xs">All</span>
                                    <span
                                      class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shrink-0"
                                      :class="
                                        pageSidebar.state.activeTypeId === 'all'
                                          ? 'bg-primary/20 text-primary'
                                          : 'bg-muted text-muted-foreground'
                                      ">
                                      {{ browseTotalCount }}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    class="shrink-0 mr-1.5 p-1 rounded transition opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                                    title="Pin"
                                    @click.stop="pageSidebar.togglePin('all')">
                                    <Icon name="lucide:pin" class="h-3 w-3" />
                                  </button>
                                </div>
                              </li>
                              <!-- Unpinned types -->
                              <li v-for="t in browseUnpinnedTypes" :key="t.type">
                                <div
                                  class="group relative flex items-center rounded-lg transition hover:bg-foreground/5"
                                  :class="{ 'bg-foreground/10': pageSidebar.state.activeTypeId === t.type }">
                                  <button
                                    type="button"
                                    class="flex flex-1 items-center justify-start gap-3 px-3 py-2 min-w-0"
                                    :class="
                                      pageSidebar.state.activeTypeId === t.type
                                        ? 'text-foreground font-semibold'
                                        : 'text-sidebar-foreground'
                                    "
                                    @click="pageSidebar.state.onSelectType?.(t.type)">
                                    <Icon
                                      :name="t.icon"
                                      class="h-4 w-4 shrink-0 opacity-50"
                                      :class="pageSidebar.state.activeTypeId === t.type ? `text-${t.color}-400` : ''" />
                                    <span class="flex-1 flex justify-start truncate min-w-0 text-xs">
                                      {{ t.labelPlural ?? t.label }}
                                    </span>
                                    <span
                                      v-if="pageSidebar.state.typeCounts[t.type]"
                                      class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shrink-0"
                                      :class="
                                        pageSidebar.state.activeTypeId === t.type
                                          ? 'bg-primary/20 text-primary'
                                          : 'bg-muted text-muted-foreground'
                                      ">
                                      {{ pageSidebar.state.typeCounts[t.type] }}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    class="shrink-0 mr-1.5 p-1 rounded transition opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                                    title="Pin"
                                    @click.stop="pageSidebar.togglePin(t.type)">
                                    <Icon name="lucide:pin" class="h-3 w-3" />
                                  </button>
                                </div>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </template>
                      <template v-else>
                        <div class="space-y-1.5 px-3">
                          <div v-for="n in 6" :key="n" class="h-8 rounded-xl bg-muted/30 animate-pulse" />
                        </div>
                      </template>
                    </div>
                  </template>

                  <!-- Dynamic Sidebar Sections (if configured in route) -->
                  <template v-else-if="filteredDynamicSidebarSections">
                    <div ref="sectionsContainerRef" class="py-4">
                      <!-- Settings: Pinned section -->
                      <div v-if="isSettingsSection && pinnedSettingsItems.length > 0" class="mb-6">
                        <div class="flex items-center px-3 mb-1">
                          <Icon name="lucide:pin" class="mr-2 h-4 w-4 opacity-70 text-muted-foreground" />
                          <span class="text-muted-foreground text-xs tracking-wide uppercase font-medium">Pinned</span>
                        </div>
                        <div class="relative pl-1">
                          <div class="absolute ml-[18px] top-0 bottom-[18px] w-px bg-sidebar-border/15 translate-y-2" />
                          <ul class="space-y-1 text-sm">
                            <li v-for="item in pinnedSettingsItems" :key="item.path">
                              <div class="group relative elbow-connector">
                                <AppNavLink
                                  :to="item.path"
                                  class="text-sidebar-foreground hover:bg-foreground/5 hover:text-sidebar-foreground flex items-center gap-3 rounded-xl px-3 py-2 transition ml-8"
                                  :class="{
                                    'bg-foreground/5 text-foreground': routes.isRouteExactlyActive(item.path),
                                  }">
                                  <Icon :name="item.icon" class="h-4 w-4 shrink-0 opacity-50" />
                                  <span class="flex-1 truncate min-w-0 text-xs">{{ item.label }}</span>
                                </AppNavLink>
                                <div
                                  class="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    type="button"
                                    class="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded p-0.5 hover:bg-white/10"
                                    aria-label="Unpin"
                                    @click.prevent.stop="settingsPinned.togglePin(item.path)">
                                    <Icon name="lucide:pin" class="h-3.5 w-3.5 fill-current" />
                                  </button>
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div
                        v-for="(section, idx) in filteredDynamicSidebarSections"
                        :key="section.key"
                        :data-section-key="section.key"
                        :data-section-pinned="section.key === 'personal-pinned' ? '' : undefined"
                        :class="idx > 0 ? 'mt-6' : ''">
                        <AppContextMenu
                          :actions="getSectionContextMenu(section)"
                          :context="{
                            key: section.key,
                            label: section.label,
                            icon: section.icon,
                            isCustomSection: !!(section as any).isCustom,
                            _treeNodeId: (section as any)._treeNodeId,
                            _locked: (section as any)._locked,
                          }"
                          @action="handleContextAction">
                          <template #trigger>
                            <button
                              v-if="section.collapsible !== false"
                              type="button"
                              class="text-muted-foreground hover:text-sidebar-foreground flex w-full items-center justify-between text-xs tracking-wide uppercase transition-colors px-3 group/section"
                              :class="{ 'cursor-grab': isWorkspaceRoute && section.key !== 'personal-pinned' }"
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
                                  v-if="section.editable && canEditContent"
                                  variant="ghost"
                                  size="icon-sm"
                                  class="h-6 w-6 opacity-0 group-hover/section:opacity-100 transition-opacity"
                                  @click.stop="handleAddNew(section.key)">
                                  <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                                </UiButton>
                                <Icon
                                  name="lucide:chevron-down"
                                  class="h-4 w-4 transition-transform ml-1.5 opacity-50"
                                  :class="{ '-rotate-90': collapsed.isCollapsed(section.key) }" />
                              </div>
                            </button>
                            <div v-else class="flex items-center justify-between mb-3 px-3 group/section">
                              <div class="flex items-center">
                                <Icon v-if="section.icon" :name="section.icon" class="mr-2 h-4 w-4 opacity-70" />
                                <span class="text-muted-foreground text-xs tracking-wide uppercase font-medium">
                                  {{ section.label }}
                                </span>
                              </div>
                              <UiButton
                                v-if="section.editable && canEditContent"
                                variant="ghost"
                                size="icon-sm"
                                class="h-6 w-6 opacity-0 group-hover/section:opacity-100 transition-opacity"
                                @click.stop="handleAddNew(section.key)">
                                <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                              </UiButton>
                            </div>
                          </template>
                        </AppContextMenu>

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
                                class="absolute ml-[18px] top-0 bottom-[18px] w-px bg-sidebar-border/15 translate-y-2" />
                              <motion.ul
                                class="space-y-1 text-sm"
                                :data-sortable-section="section.key"
                                :transition="transitionsDisabled ? { duration: 0 } : undefined"
                                :layout="!transitionsDisabled">
                                <motion.li
                                  v-for="(item, i) in section.items"
                                  :key="item?._treeNodeId || item?.path || ''"
                                  :data-item-path="item?.path || ''"
                                  :initial="{ opacity: 0, x: -10 }"
                                  :animate="{ opacity: 1, x: 0 }"
                                  :exit="{ opacity: 0, x: -10 }"
                                  :transition="
                                    transitionsDisabled
                                      ? { duration: 0 }
                                      : { duration: 0.28, ease: 'easeOut', delay: i * 0.035 }
                                  "
                                  :layout="!transitionsDisabled">
                                  <!-- Group node: render via recursive SidebarTreeItem -->
                                  <SidebarTreeItem
                                    v-if="item._nodeType === 'group'"
                                    :node="itemToTreeNode(item)"
                                    :depth="0"
                                    :section-key="section.key"
                                    :is-active="(p: string) => routes.isRouteExactlyActive(p)"
                                    :get-context-menu="getTreeNodeContextMenu"
                                    :get-badge="(n: any) => routes.getRouteBadge(n)"
                                    :sidebar-width="sidebarWidth"
                                    @action="handleContextAction" />
                                  <!-- Regular item node: flat nav link -->
                                  <AppContextMenu
                                    v-else
                                    :actions="
                                      isTypesSection ? typeItemMenu(item) : getItemContextMenu(item, section.key)
                                    "
                                    :context="
                                      isTypesSection
                                        ? { path: item.path, typeId: item.id }
                                        : {
                                            path: item.path,
                                            sectionKey: section.key,
                                            label: item.label,
                                            icon: item.icon,
                                            _treeNodeId: item._treeNodeId,
                                            _locked: item._locked,
                                          }
                                    "
                                    @action="handleContextAction">
                                    <template #trigger>
                                      <div class="group relative elbow-connector">
                                        <AppNavLink
                                          v-if="item?.path"
                                          :to="item.path"
                                          class="text-sidebar-foreground hover:bg-foreground/5 hover:text-sidebar-foreground flex items-center gap-3 rounded-xl px-3 py-2 transition ml-8"
                                          :class="[
                                            {
                                              'bg-foreground/5 text-foreground': routes.isRouteExactlyActive(item.path),
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
                                            :aria-label="
                                              (
                                                isSettingsSection
                                                  ? settingsPinned.isPinned(item.path)
                                                  : pinned.isPinned(item.path)
                                              )
                                                ? 'Unpin'
                                                : 'Pin'
                                            "
                                            @click.prevent.stop="
                                              isSettingsSection
                                                ? settingsPinned.togglePin(item.path)
                                                : pinned.togglePin(item.path)
                                            ">
                                            <Icon
                                              name="lucide:pin"
                                              class="h-3.5 w-3.5"
                                              :class="{
                                                'fill-current': isSettingsSection
                                                  ? settingsPinned.isPinned(item.path)
                                                  : pinned.isPinned(item.path),
                                              }" />
                                          </button>
                                        </div>
                                      </div>
                                    </template>
                                  </AppContextMenu>
                                </motion.li>
                              </motion.ul>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <!-- + New Section button (workspace only) -->
                      <div v-if="isWorkspaceRoute" class="mt-4 px-3">
                        <div v-if="isCreatingSection" class="flex items-center gap-1.5">
                          <input
                            v-model="newSectionName"
                            type="text"
                            placeholder="Section name..."
                            class="flex-1 bg-transparent border border-border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                            @keydown.enter="handleCreateSection"
                            @keydown.escape="isCreatingSection = false" />
                          <button
                            type="button"
                            class="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-white/10"
                            @click="handleCreateSection">
                            <Icon name="lucide:check" class="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            class="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-white/10"
                            @click="isCreatingSection = false">
                            <Icon name="lucide:x" class="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          v-else
                          type="button"
                          class="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                          @click="isCreatingSection = true">
                          <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                          <span>New Section</span>
                        </button>
                      </div>
                    </div>
                  </template>

                  <AppSidebarGraphTypes v-else-if="graphTypesState.active && !isTypesSection" class="h-full" />

                  <div
                    v-else-if="!filteredDynamicSidebarSections && filteredPinnedItems.length === 0 && !isTypesSection"
                    class="flex flex-col items-center justify-center py-8 text-center">
                    <Icon name="lucide:inbox" class="w-8 h-8 text-sidebar-foreground/50 mb-3" />
                    <p class="text-sm text-sidebar-foreground/70">No available sections</p>
                    <p class="text-xs text-sidebar-foreground/50 mt-1">Contact your administrator for access</p>
                  </div>

                  <!-- Fallback: Legacy Pinned Section (if no dynamic sections configured) -->
                  <div v-else-if="filteredPinnedItems.length > 0" class="mb-6">
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
                              v-for="(item, i) in filteredPinnedItems"
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
                                    { 'bg-white/10 text-foreground': routes.isRouteExactlyActive(item.path) },
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
                  <div v-if="!filteredDynamicSidebarSections && !isTypesSection && filteredUnpinnedItems.length > 0">
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
                        v-if="
                          collapsed.isCollapsed(routes.currentSectionLabel.value) && getSectionBadgeInfo(unpinnedItems)
                        "
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
                              v-for="(item, i) in filteredUnpinnedItems"
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
                                    { 'bg-white/15 text-foreground': routes.isRouteExactlyActive(item.path) },
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
                              <div class="text-[10px] uppercase tracking-wide text-sidebar-foreground/50 ml-8">
                                Current
                              </div>
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
                                v-for="(item, i) in filteredSystemUnpinnedItems"
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
                                      { 'bg-white/15 text-foreground': routes.isRouteExactlyActive(item.path) },
                                      'pr-8',
                                    ]">
                                    <Icon :name="item.icon" class="h-4 w-4 shrink-0 opacity-50" />
                                    <span
                                      class="flex-1 truncate min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
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

                    <div v-if="filteredCustomUnpinnedItems.length > 0" class="mt-6">
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
                                v-for="(item, i) in filteredCustomUnpinnedItems"
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
                                <AppContextMenu
                                  :actions="typeItemMenu(item)"
                                  :context="{ path: item.path, typeId: item.id, typeLabel: item.label, isCustom: true }"
                                  @action="handleContextAction">
                                  <template #trigger>
                                    <div class="group relative elbow-connector">
                                      <AppNavLink
                                        v-if="item?.path"
                                        :to="item.path"
                                        class="text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground flex items-center gap-3 rounded-lg px-3 py-2 transition ml-7"
                                        :class="[
                                          { 'bg-white/15 text-foreground': routes.isRouteExactlyActive(item.path) },
                                          'pr-8',
                                        ]">
                                        <Icon :name="item.icon" class="h-4 w-4 shrink-0 opacity-50" />
                                        <span
                                          class="flex-1 truncate min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
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
                                  </template>
                                </AppContextMenu>
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
        </AppContextMenu>
      </template>
      <template #fallback>
        <div v-if="!sidebarCollapse.isCollapsed.value" class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
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
                    :class="{ 'bg-white/15 text-foreground': routes.isRouteExactlyActive(item.path) }">
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
        <label class="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <UiCheckbox v-model:checked="dontAskAgain" />
          Don't ask me again
        </label>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel>Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction class="bg-destructive text-white hover:bg-destructive/90" @click="confirmDelete">
            Delete
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>

    <!-- Ontology Create Dialog -->
    <OntologyCreateDialog v-model:open="ontologyCreateOpen" />

    <!-- Create Page Dialog -->
    <CreatePageDialog :open="pageBuilderOpen" @update:open="pageBuilderOpen = $event" @created="handlePageCreated" />
  </aside>
</template>

<style scoped>
  /* Elbow connector using pseudo-element to avoid Framer Motion DOM traversal issues */
  .elbow-connector::before {
    content: '';
    position: absolute;
    left: 18px;
    top: 50%;
    height: 1rem;
    width: 0.875rem;
    transform: translateY(-1rem);
    border-left: 1.5px solid var(--sidebar-border);
    border-bottom: 1.5px solid var(--sidebar-border);
    border-bottom-left-radius: 0.5rem;
    border-color: var(--sidebar-border);
  }

  #border {
    transform: translateY(-1rem) !important;
    background: var(--sidebar-border);
  }

  /* Disable all transitions on sidebar children during resize and for 1000ms after */
  .is-resizing,
  .is-resizing :deep(*),
  .transitions-disabled,
  .transitions-disabled :deep(*) {
    transition: none !important;
    animation: none !important;
  }

  /* SortableJS drag-and-drop feedback */
  :deep(.sortable-ghost) {
    opacity: 0.3;
  }

  :deep(.sortable-chosen) {
    background: hsl(var(--accent) / 0.15);
    border-radius: 0.5rem;
  }

  :deep(.sortable-fallback) {
    opacity: 0.85;
    background: hsl(var(--sidebar-background));
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
</style>
