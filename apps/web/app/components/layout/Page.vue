<script setup lang="ts">
  import AppEmptyState from '~/components/app/AppEmptyState.vue'
  import FilterBuilder from '~/components/layout/FilterBuilder.vue'
  import type { BrowseState, BrowseVariant, BrowseViewMode } from '~/composables/useBrowse'
  import type { AdvancedFilterState } from '~/composables/useAdvancedFilters'

  const NuxtLink = resolveComponent('NuxtLink')
  const pageShell = usePageShell()
  const slots = useSlots()

  interface PageTab {
    /** Tab label */
    label: string
    /** Route path for the tab */
    to: string
    /** Icon name */
    icon?: string
  }

  export interface PageStat {
    label: string
    value: string | number
    icon?: string
    color?: string
    trend?: 'up' | 'down' | 'neutral'
    change?: string
    progress?: number
  }

  export interface PageAction {
    label: string
    icon?: string
    /** Button variant */
    variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive'
    /** Type of action to perform */
    type: 'download' | 'dialog' | 'link' | 'click'
    /** URL for download or link */
    to?: string
    /**
     * ID for dialog content slot.
     * Provide a <template #dialog-[id]> with full dialog markup for bespoke layouts.
     */
    dialogId?: string
    /** Custom click handler */
    onClick?: () => void
    /** Loading state for the button */
    isLoading?: boolean
    /** Disabled state */
    disabled?: boolean
    /** Tooltip text */
    tooltip?: string
  }

  /**
   * Page layout variants:
   * - 'default': Standard page with header, optional tabs, and content
   * - 'prose': Documentation/article style with readable max-width
   * - 'canvas': Immersive full-bleed layout (no header/tabs)
   * - 'settings': Settings pages with header, tabs, full-width content
   * - 'sidebar': Page with left sub-navigation sidebar
   * - 'browse': List/grid browsing with search, filters, sort, and view switcher
   * - 'station': Station overview with tabs only (no header), content handles its own layout
   * - 'filesystem': Full-height split layout for tree + viewer style pages
   * - 'folders': Split-view with folder tree navigation (left) and content preview (right)
   * - 'calendar': Fullscreen calendar layout (no header/tabs/toolbar/search)
   * - 'feed': Chronological stream from integrations — narrow list, source filter ribbon, no view switcher
   * - 'grid': Multi-view grid dashboard — no built-in header (page renders its own inline-editable header), no toolbar
   */
  type PageVariant =
    | 'default'
    | 'prose'
    | 'canvas'
    | 'settings'
    | 'sidebar'
    | 'browse'
    | 'station'
    | 'filesystem'
    | 'folders'
    | 'calendar'
    | 'feed'
    | 'grid'

  interface PageProps {
    /** Page layout variant */
    variant?: PageVariant
    /** Sub-variant for browse mode */
    browseVariant?: BrowseVariant
    /** The page title */
    title?: string
    /** Subtitle text (displayed above title) */
    subtitle?: string
    /** Description text (displayed below title) */
    description?: string
    /** Icon name to display next to subtitle */
    icon?: string
    /** Icon color class */
    iconClass?: string
    /** Show back button */
    showBackButton?: boolean
    /** Metadata/badges to display */
    metadata?: string | string[]
    /** Tabs to display below description */
    tabs?: PageTab[]
    /** Custom class for the container */
    containerClass?: string
    /** Custom class for the content area */
    contentClass?: string
    /** SEO title (if different from display title) */
    seoTitle?: string
    /** SEO description (if different from display description) */
    seoDescription?: string
    /** Initial full width state (user can toggle) */
    fullWidth?: boolean
    /** Show the width toggle button */
    showWidthToggle?: boolean
    /** Fill available height (content scrolls within) */
    fillHeight?: boolean
    /** Hide the main app sidebar */
    hideSidebar?: boolean
    /** Hide the header section */
    hideHeader?: boolean
    /** Hide the tabs bar */
    hideTabs?: boolean
    /** Enable secondary (right) sidebar slot */
    secondarySidebar?: boolean
    /** Enable left sub-sidebar slot */
    leftSidebar?: boolean
    /** Search placeholder text (browse variant) */
    searchPlaceholder?: string
    /** Show view mode switcher (browse variant) */
    showViewSwitcher?: boolean
    /** Show sort controls (browse variant) */
    showSortControls?: boolean
    /** Total count for display */
    totalCount?: number
    /** Filtered count for display */
    filteredCount?: number
    /** Count label (e.g., 'series', 'channels') */
    countLabel?: string
    /** Transparent background and borders for browse variant */
    transparent?: boolean
    /** Browse state from useBrowse (enables automatic toolbar controls) */
    browse?: BrowseState
    /** Advanced filter state from useAdvancedFilters */
    advancedFilters?: AdvancedFilterState
    /** Loading state for browse/list pages */
    isLoading?: boolean
    /** Error message for browse/list pages */
    error?: string | null
    /** Custom empty state title */
    emptyTitle?: string
    /** Custom empty state description */
    emptyDescription?: string
    /** Custom empty state icon */
    emptyIcon?: string
    /** Stats to display in the header */
    stats?: PageStat[]
    /** Custom icon to display to the left of the header title */
    headerIcon?: string
    /** Primary call to action */
    primaryAction?: PageAction
    /** Secondary call to action */
    secondaryAction?: PageAction
    /** Tertiary call to action */
    tertiaryAction?: PageAction
    /** Custom view mode options for browse view switcher */
    viewModeOptions?: ViewModeOption[]
    /** Entity type slug(s) powering this page's data. Renders a clickable link to /database/<type>. */
    dataSource?: string | string[]
    /** Folder tree items for folders variant */
    folderItems?: FolderTreeItem[]
    /** Currently selected folder path for folders variant */
    selectedFolderPath?: string
    /** Currently selected item ID in folders variant */
    selectedItemId?: string | null
    /** Callback when folder is selected */
    onFolderSelect?: (_path: string) => void
    /** Callback when item is selected */
    onItemSelect?: (_id: string | null) => void
    /** Callback to add a new folder */
    onAddFolder?: (_parentPath: string) => void
    /** Callback to add a new item to a folder */
    onAddItem?: (_folderPath: string) => void
    /** Callback to move an item between folders */
    onMoveItem?: (_itemId: string, _targetFolderPath: string) => void
    /** Empty state text for folders preview */
    folderEmptyTitle?: string
    /** Empty state description for folders preview */
    folderEmptyDescription?: string
  }

  export interface FolderTreeItem {
    id: string
    name: string
    path: string
    icon?: string
    openIcon?: string
    type: 'folder' | 'item'
    children?: FolderTreeItem[]
  }

  interface ViewModeOption {
    mode: BrowseViewMode
    label: string
    icon: string
    disabled?: boolean
    visible?: boolean
    tooltip?: string
    suggested?: boolean
    score?: number
    reason?: string
    isDefault?: boolean
  }

  const props = withDefaults(defineProps<PageProps>(), {
    variant: 'default',
    browseVariant: 'default',
    showBackButton: false,
    containerClass: '',
    contentClass: '',
    fullWidth: true,
    showWidthToggle: false,
    fillHeight: false,
    hideSidebar: false,
    hideHeader: false,
    hideTabs: false,
    secondarySidebar: false,
    leftSidebar: false,
    searchPlaceholder: 'Search...',
    showViewSwitcher: true,
    showSortControls: true,
    countLabel: 'items',
    transparent: false,
    browse: undefined,
    isLoading: false,
    error: null,
    headerIcon: undefined,
    primaryAction: undefined,
    secondaryAction: undefined,
    tertiaryAction: undefined,
    viewModeOptions: undefined,
    folderItems: undefined,
    selectedFolderPath: undefined,
    selectedItemId: null,
    onFolderSelect: undefined,
    onItemSelect: undefined,
    onAddFolder: undefined,
    onAddItem: undefined,
    onMoveItem: undefined,
    folderEmptyTitle: undefined,
    folderEmptyDescription: undefined,
    dataSource: undefined,
  })

  const emit = defineEmits<{
    retry: []
    moveItem: [itemId: string]
  }>()

  // Computed variant-based settings
  const variantConfig = computed(() => {
    switch (props.variant) {
      case 'canvas':
        return { showHeader: false, showTabs: false, contentPadding: 'p-0', maxWidth: '', showToolbar: false }
      case 'prose':
        return {
          showHeader: true,
          showTabs: false,
          contentPadding: 'px-8 pb-6 pt-0',
          maxWidth: 'max-w-4xl mx-auto',
          showToolbar: false,
        }
      case 'settings':
        return { showHeader: true, showTabs: true, contentPadding: 'px-8 py-6', maxWidth: '', showToolbar: false }
      case 'sidebar':
        return { showHeader: false, showTabs: false, contentPadding: 'p-0', maxWidth: '', showToolbar: false }
      case 'browse':
        return { showHeader: true, showTabs: false, contentPadding: 'px-8 py-6 pt-0', maxWidth: '', showToolbar: true }
      case 'filesystem':
        return { showHeader: false, showTabs: false, contentPadding: 'p-0', maxWidth: '', showToolbar: false }
      case 'folders':
        return { showHeader: true, showTabs: false, contentPadding: 'p-0', maxWidth: '', showToolbar: false }
      case 'calendar':
        return { showHeader: false, showTabs: false, contentPadding: 'p-0', maxWidth: '', showToolbar: false }
      case 'feed':
        return { showHeader: true, showTabs: false, contentPadding: 'px-4 py-4 pt-0', maxWidth: '', showToolbar: true }
      case 'station':
        return { showHeader: false, showTabs: true, contentPadding: 'p-0', maxWidth: '', showToolbar: false }
      case 'grid':
        return { showHeader: false, showTabs: false, contentPadding: 'p-0', maxWidth: '', showToolbar: false }
      default:
        return { showHeader: true, showTabs: true, contentPadding: 'px-8 py-6', maxWidth: '', showToolbar: false }
    }
  })

  const isFilesystem = computed(() => props.variant === 'filesystem')
  const isFolders = computed(() => props.variant === 'folders')
  const isCalendar = computed(() => props.variant === 'calendar')
  const isFeed = computed(() => props.variant === 'feed')
  const effectiveFillHeight = computed(
    () => props.fillHeight || isFilesystem.value || isFolders.value || isCalendar.value,
  )

  // Resolved display states (props override variant defaults)
  const effectiveSearchPlaceholder = computed(() => {
    if (props.totalCount !== undefined) {
      const label = props.countLabel || 'items'
      return `Search ${props.totalCount} ${label}...`
    }
    return props.searchPlaceholder
  })

  const showHeader = computed(() => {
    if (props.hideHeader) return false
    return (
      variantConfig.value.showHeader &&
      (props.subtitle || props.title || props.description || props.headerIcon || !!useSlots().headerIcon)
    )
  })

  const showTabs = computed(() => {
    if (props.hideTabs) return false
    return variantConfig.value.showTabs
  })

  const route = useRoute()
  const router = useRouter()
  const routes = useRoutes()

  // Derive tabs from route config if not explicitly provided via props
  const effectiveTabs = computed(() => {
    // If tabs prop is explicitly passed, use it
    if (props.tabs !== undefined) return props.tabs
    // Otherwise, try to get tabs from route config
    return routes.currentRouteTabs.value
  })

  // Storage key based on route path
  const storageKey = computed(() => `page-width:${route.path}`)

  // Initialize from localStorage or prop default
  // Always start with prop default to ensure SSR/client consistency
  const isFullWidth = ref(props.fullWidth)

  // Load preference from localStorage after hydration completes (client-only)
  onMounted(() => {
    // Communicate sidebar disabled state to shell components
    pageShell.setSidebarDisabled(props.hideSidebar)

    if (import.meta.client) {
      // Wait for next tick to ensure hydration is complete
      nextTick(() => {
        try {
          const stored = localStorage.getItem(storageKey.value)
          if (stored !== null) {
            isFullWidth.value = stored === 'true'
          }
        } catch {
          return
        }
      })
    }
  })

  // Reset sidebar disabled state when component unmounts
  onUnmounted(() => {
    pageShell.setSidebarDisabled(false)
  })

  // Update sidebar disabled state if prop changes
  watch(
    () => props.hideSidebar,
    (newVal) => {
      pageShell.setSidebarDisabled(newVal)
    },
  )

  // Toggle width and persist preference
  function _toggleWidth() {
    isFullWidth.value = !isFullWidth.value
    if (import.meta.client) {
      try {
        localStorage.setItem(storageKey.value, String(isFullWidth.value))
      } catch {
        return
      }
    }
  }

  // Container class
  const finalContainerClass = computed(() => {
    const base = props.containerClass || ''
    const heightClass = effectiveFillHeight.value ? 'h-full flex flex-col' : ''
    return `${base} ${heightClass}`.trim()
  })

  // Content wrapper class
  const contentWrapperClass = computed(() => {
    if (!effectiveFillHeight.value) return 'w-full'
    const overflowClass = isFilesystem.value ? 'overflow-hidden' : 'overflow-y-auto'
    return `w-full flex h-full flex-col ${overflowClass}`.trim()
  })

  // Main content area class
  const mainContentClass = computed(() => {
    const base = props.contentClass || ''
    const padding = variantConfig.value.contentPadding
    const maxWidth = variantConfig.value.maxWidth
    const fillClass = effectiveFillHeight.value ? 'min-h-0' : ''
    const growthClass = effectiveFillHeight.value ? 'flex-1' : ''
    return `${base} ${padding} ${maxWidth} ${fillClass} ${growthClass}`.trim()
  })

  // Handle SEO meta reactively
  const seoTitle = computed(() => props.seoTitle || props.title)
  const seoDesc = computed(() => props.seoDescription || props.description)

  watchEffect(() => {
    if (seoTitle.value || seoDesc.value) {
      useSeoMeta({
        title: seoTitle.value,
        description: seoDesc.value,
        ogTitle: seoTitle.value,
        ogDescription: seoDesc.value,
        twitterTitle: seoTitle.value,
        twitterDescription: seoDesc.value,
        twitterCard: 'summary_large_image',
      })

      // Set OG image if title and description are available
      if (seoTitle.value && seoDesc.value) {
        const og = (globalThis as any).defineOgImageComponent
        if (typeof og === 'function') {
          og('Site', {
            title: seoTitle.value,
            description: seoDesc.value,
          })
        }
      }
    }
  })

  // Hash-based tab support
  const activeHash = ref('')
  const isScrolling = ref(false)
  const highlightedSection = ref('')

  // Get all hash-based tabs
  const hashTabs = computed(() => effectiveTabs.value?.filter((tab) => tab.to?.startsWith('#')) || [])

  // Initialize hash from URL and set up Intersection Observer
  onMounted(() => {
    if (import.meta.client) {
      // Set initial hash
      activeHash.value = window.location.hash || hashTabs.value[0]?.to || ''

      // Ensure the first hash tab is actually selected (and reflected in route.hash)
      if (!route.hash && hashTabs.value[0]?.to && !window.location.hash) {
        router.replace({ path: route.path, query: route.query, hash: hashTabs.value[0].to })
      }

      // Listen for manual hash changes
      window.addEventListener('hashchange', () => {
        if (!isScrolling.value) {
          activeHash.value = window.location.hash
        }
      })

      // Set up Intersection Observer to track visible sections
      setupScrollObserver()
    }
  })

  // Intersection Observer to auto-update active tab on scroll
  function setupScrollObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling.value) return

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const hash = `#${entry.target.id}`
            if (hashTabs.value.some((tab) => tab.to === hash)) {
              activeHash.value = hash
              window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
            }
          }
        }
      },
      { threshold: [0.3, 0.5, 0.7], rootMargin: '-100px 0px -50% 0px' },
    )

    // Observe all hash-based sections
    nextTick(() => {
      hashTabs.value.forEach((tab) => {
        const el = document.querySelector(tab.to)
        if (el) observer.observe(el)
      })
    })
  }

  const isTabActive = (to: string): boolean => {
    if (to.startsWith('#')) {
      if (!activeHash.value && hashTabs.value[0]?.to === to) return true
      return activeHash.value === to
    }
    return route.path === to
  }

  // Handle hash click with smooth scroll and highlight
  function handleHashClick(hash: string) {
    if (import.meta.client) {
      const el = document.querySelector(hash)
      if (el) {
        isScrolling.value = true
        activeHash.value = hash
        window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${hash}`)

        // Smooth scroll to section
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })

        // Brief highlight animation
        highlightedSection.value = hash
        setTimeout(() => {
          highlightedSection.value = ''
        }, 800)

        // Reset scrolling flag after animation completes
        setTimeout(() => {
          isScrolling.value = false
        }, 600)
      }
    }
  }

  // Check if a section should be highlighted
  function isSectionHighlighted(id: string): boolean {
    return highlightedSection.value === `#${id}`
  }

  const searchQuery = computed({
    get: () => props.browse?.searchQuery?.value || '',
    set: (val: string) => {
      if (props.browse?.setSearchQuery) {
        props.browse.setSearchQuery(val)
      }
    },
  })

  const _userRole = useUserRole()

  const isStuck = ref(false)
  const stickyRef = ref<HTMLElement | null>(null)

  const hasCalendarSlot = computed(() => !!slots.calendar)

  // Data source indicator — resolves entity type slug(s) to a database link + label
  const dataSourceTypes = computed(() => {
    if (!props.dataSource) return []
    return Array.isArray(props.dataSource) ? props.dataSource : [props.dataSource]
  })

  const dataSourceLink = computed(() => {
    const types = dataSourceTypes.value
    if (types.length === 1) return `/database/${types[0]}`
    return '/database'
  })

  const dataSourceLabel = computed(() => {
    const types = dataSourceTypes.value
    if (types.length === 0) return ''
    if (types.length === 1) return types[0]!
    return `${types.length} types`
  })

  const defaultViewModeOptions = computed<ViewModeOption[]>(() => [
    { mode: 'grid', label: 'Grid', icon: 'lucide:grid-3x3' },
    { mode: 'list', label: 'List', icon: 'lucide:list' },
    { mode: 'table', label: 'Table', icon: 'lucide:table' },
    {
      mode: 'calendar',
      label: 'Calendar',
      icon: 'lucide:calendar',
      visible: hasCalendarSlot.value || props.browse?.viewMode.value === 'calendar',
    },
    { mode: 'kanban', label: 'Kanban', icon: 'lucide:square-kanban' },
  ])

  const effectiveViewModeOptions = computed(() => {
    const options = props.viewModeOptions?.length ? props.viewModeOptions : defaultViewModeOptions.value
    return options.filter((option) => option.visible !== false)
  })

  const setViewMode = (mode: BrowseViewMode, disabled?: boolean) => {
    if (disabled) return
    props.browse?.setViewMode(mode)
  }

  watch(
    [() => props.browse?.viewMode.value, effectiveViewModeOptions],
    () => {
      const browse = props.browse
      if (!browse) return
      const options = effectiveViewModeOptions.value
      if (!options.length) return
      const current = browse.viewMode.value
      const isValid = options.some((option) => option.mode === current && option.visible !== false)
      if (isValid) return

      const fallback = options.find((option) => !option.disabled)?.mode ?? options[0]?.mode
      if (fallback) browse.setViewMode(fallback)
    },
    { immediate: true },
  )

  // Dialog state
  const activeDialogId = ref<string | null>(null)
  const isDialogOpen = ref(false)

  const dialogSlotName = computed(() => (activeDialogId.value ? `dialog-${activeDialogId.value}` : null))
  const hasActionDialogSlot = computed(() => {
    const name = dialogSlotName.value
    return !!(name && slots[name])
  })

  const openActionDialog = (dialogId: string) => {
    activeDialogId.value = dialogId
    isDialogOpen.value = true
  }

  const closeActionDialog = () => {
    isDialogOpen.value = false
  }

  const handleActionClick = (action: PageAction) => {
    if (action.disabled || action.isLoading) return

    if (action.type === 'dialog' && action.dialogId) {
      openActionDialog(action.dialogId)
    } else if (action.type === 'download' && action.to) {
      const link = document.createElement('a')
      link.href = action.to
      link.setAttribute('download', '')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else if (action.type === 'link' && action.to) {
      navigateTo(action.to)
    } else if (action.onClick) {
      action.onClick()
    }
  }

  watch(stickyRef, (el) => {
    if (import.meta.client && el) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (entry) {
            isStuck.value = entry.intersectionRatio < 1
          }
        },
        { threshold: [1], rootMargin: '-1px 0px 0px 0px' },
      )
      observer.observe(el)
    }
  })

  function _exportToCsv() {
    if (!props.browse?.filteredItems?.value) return
    const items = props.browse.filteredItems.value
    if (items.length === 0) return

    // Get all keys from the first item as columns
    const [firstItem] = items
    if (!firstItem || typeof firstItem !== 'object') return
    const keys = Object.keys(firstItem as Record<string, unknown>)
    const csvContent = [
      keys.join(','),
      ...items.map((item: Record<string, unknown>) =>
        keys
          .map((key) => {
            const val = item[key]
            if (val === null || val === undefined) return ''
            const str = String(val).replace(/"/g, '""')
            return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
          })
          .join(','),
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${props.title || 'export'}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Expose for parent components
  defineExpose({ activeHash, isSectionHighlighted })
</script>

<template>
  <div class="flex h-full w-full bg-transparent">
    <!-- Left Sidebar (optional) -->
    <aside
      v-if="leftSidebar && $slots.sidebar"
      class="w-64 shrink-0 border-r border-border flex flex-col overflow-y-auto">
      <slot name="sidebar" />
    </aside>

    <!-- Main Page Content -->
    <div :class="finalContainerClass" class="flex-1 min-w-0 h-full bg-card/0">
      <!-- Main content uses base background (darkest layer) -->
      <div class="h-full" :class="[contentWrapperClass, transparent ? 'bg-transparent' : '']">
        <!-- Header Section (Non-sticky) -->
        <div v-if="showHeader || $slots.header" class="shrink-0 space-y-0 pb-0" :class="isFeed ? 'p-4' : 'p-0'">
          <div class="px-8 py-8 relative border-b border-border/60" :class="variantConfig.maxWidth">
            <div class="relative flex items-stretch gap-6">
              <!-- Header Icon -->
              <div v-if="headerIcon || $slots.headerIcon" class="shrink-0">
                <slot name="headerIcon">
                  <img
                    v-if="headerIcon"
                    :src="`/assets/icons/${headerIcon}`"
                    class="size-20 object-contain drop-shadow-xl"
                    alt="" />
                </slot>
              </div>

              <div class="flex-1 min-w-0">
                <!-- Subtitle with optional back button and icon -->
                <div v-if="subtitle || showBackButton || icon || dataSource" class="inline-flex items-center gap-0.5 mb-0">
                  <BackButton v-if="showBackButton" />
                  <Icon v-if="icon" :name="icon" class="mr-2 h-4 w-4 text-muted-foreground/70" />
                  <p v-if="subtitle" class="text-xs uppercase tracking-wide text-muted-foreground/80">
                    {{ subtitle }}
                  </p>
                  <span v-if="subtitle && dataSource" class="text-muted-foreground/40 mx-1 text-xs">/</span>
                  <NuxtLink
                    v-if="dataSource"
                    :to="dataSourceLink"
                    class="inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-primary transition-colors group"
                    title="View in database">
                    <Icon name="lucide:database" class="size-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    <span class="uppercase tracking-wide">{{ dataSourceLabel }}</span>
                  </NuxtLink>
                </div>

                <!-- Title -->
                <h1 v-if="title || $slots.title" class="text-foreground text-3xl font-semibold my-2">
                  <slot name="title">{{ title }}</slot>
                </h1>

                <!-- Description -->
                <p v-if="description || $slots.description" class="max-w-2xl text-sm text-muted-foreground">
                  <slot name="description">{{ description }}</slot>
                </p>

                <!-- Custom header slot -->
                <slot name="header" />

                <!-- Metadata Row -->
                <div v-if="metadata || $slots.metadata" class="flex items-center gap-2 mt-4">
                  <slot name="metadata">
                    <template v-if="Array.isArray(metadata)">
                      <span
                        v-for="(item, i) in metadata"
                        :key="i"
                        class="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold">
                        {{ item }}
                      </span>
                    </template>
                    <span
                      v-else-if="metadata"
                      class="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold">
                      {{ metadata }}
                    </span>
                  </slot>
                </div>
              </div>

              <!-- Stats Section (right-aligned) -->
              <div
                v-if="(stats && stats.length > 0) || $slots.stats"
                class="shrink-0 w-fit max-w-[75%] self-stretch flex gap-4">
                <slot name="stats">
                  <div
                    v-for="stat in stats"
                    :key="stat.label"
                    class="flex flex-col justify-between gap-1 rounded-lg border border-border bg-card/20 backdrop-blur-sm px-5 py-3 h-[92px] min-w-36">
                    <div
                      class="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      <Icon
                        v-if="stat.icon"
                        :name="stat.icon"
                        :class="['size-3', stat.color || 'text-muted-foreground/70']" />
                      {{ stat.label }}
                    </div>
                    <!-- Progress bar for health stat -->
                    <div v-if="stat.progress !== undefined" class="space-y-1">
                      <div class="flex items-baseline justify-between gap-2">
                        <span class="text-xl font-bold text-foreground tracking-tight">{{ stat.value }}</span>
                        <span
                          v-if="stat.change"
                          :class="[
                            'text-[10px] font-semibold',
                            stat.trend === 'up'
                              ? 'text-success'
                              : stat.trend === 'down'
                                ? 'text-destructive'
                                : 'text-muted-foreground',
                          ]">
                          {{ stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '' }} {{ stat.change }}
                        </span>
                      </div>
                      <div class="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          :class="[
                            stat.progress >= 80 ? 'bg-success' : stat.progress >= 50 ? 'bg-warning' : 'bg-destructive',
                          ]"
                          :style="{ width: `${stat.progress}%` }" />
                      </div>
                    </div>
                    <!-- Standard stat without progress -->
                    <div v-else class="flex items-baseline gap-1.5">
                      <span class="text-xl font-bold text-foreground tracking-tight">{{ stat.value }}</span>
                      <span
                        v-if="stat.change"
                        :class="[
                          'text-[10px] font-semibold',
                          stat.trend === 'up'
                            ? 'text-success'
                            : stat.trend === 'down'
                              ? 'text-destructive'
                              : 'text-muted-foreground',
                        ]">
                        {{ stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '' }} {{ stat.change }}
                      </span>
                    </div>
                  </div>
                </slot>
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky Tabs Section -->
        <div
          v-if="showTabs && (effectiveTabs?.length || $slots.tabs || $slots.actions)"
          ref="stickyRef"
          class="sticky -top-px z-50 transition-all duration-200 min-h-16 flex items-center justify-between"
          :class="[
            isStuck ? 'bg-card/25 border-b border-border backdrop-blur-lg' : 'bg-transparent border-b-transparent',
            transparent ? 'bg-transparent backdrop-blur-none' : '',
          ]">
          <div class="px-0 w-full">
            <div class="flex items-center justify-between py-0">
              <!-- Tabs -->
              <div class="flex items-center gap-1">
                <slot name="tabs">
                  <div v-if="effectiveTabs?.length" class="flex items-center gap-1">
                    <component
                      :is="tab.to?.startsWith('#') ? 'a' : NuxtLink"
                      v-for="tab in effectiveTabs"
                      :key="tab.to"
                      :to="tab.to?.startsWith('#') ? undefined : tab.to"
                      :href="tab.to?.startsWith('#') ? tab.to : undefined"
                      class="flex items-center gap-2 px-3 py-3 text-sm font-medium rounded-none transition-colors border-b-3 -mb-px cursor-pointer min-h-16"
                      :class="
                        isTabActive(tab.to)
                          ? 'text-foreground border-primary '
                          : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-foreground/5'
                      "
                      @click="tab.to?.startsWith('#') && handleHashClick(tab.to)">
                      <Icon v-if="tab.icon" :name="tab.icon" class="h-4 w-4" />
                      {{ tab.label }}
                    </component>
                  </div>
                </slot>
              </div>

              <!-- CTA Buttons -->
              <div
                v-if="$slots.actions || primaryAction || secondaryAction || tertiaryAction"
                class="flex items-center gap-2">
                <slot name="actions">
                  <template v-for="action in [tertiaryAction, secondaryAction, primaryAction]" :key="action?.label">
                    <UiButton
                      v-if="action"
                      :variant="action.variant || (action === primaryAction ? 'default' : 'outline')"
                      size="xs"
                      :disabled="action.disabled"
                      :loading="action.isLoading"
                      class="gap-2"
                      :class="action.variant === 'default' ? 'bg-accent!' : ''"
                      @click="handleActionClick(action)">
                      <Icon v-if="action.icon" :name="action.icon" class="h-4 w-4" />
                      <span>{{ action.label }}</span>
                    </UiButton>
                  </template>
                </slot>
              </div>
            </div>
          </div>
        </div>

        <!-- Browse Toolbar (browse variant) -->
        <div
          v-if="variantConfig.showToolbar"
          ref="stickyRef"
          class="sticky -top-px z-40 transition-all duration-0"
          :class="[
            isStuck
              ? 'bg-transparent border-b border-border/0 backdrop-blur-lg'
              : 'bg-transparent border-b-transparent',
            transparent ? 'bg-transparent backdrop-blur-none' : '',
          ]">
          <div :class="isFeed ? 'mx-4' : 'mx-8'" class="py-4">
            <div class="flex justify-between items-center gap-3 w-full">
              <!-- View Mode Switcher (hidden for feed variant) -->
              <div
                v-if="showViewSwitcher && !isFeed"
                class="flex items-center rounded-lg border border-border bg-card/25 p-0.5 shrink-0">
                <slot name="viewSwitcher">
                  <button
                    v-for="option in effectiveViewModeOptions"
                    :key="option.mode"
                    type="button"
                    class="relative flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors"
                    :class="[
                      browse?.viewMode.value === option.mode
                        ? 'bg-foreground/8 text-foreground hover:bg-sidebar-background/15 '
                        : 'text-muted-foreground/50 hover:bg-transparent hover:text-foreground',
                      option.disabled
                        ? 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground'
                        : '',
                    ]"
                    :title="option.reason || option.tooltip || `${option.label} view`"
                    :disabled="option.disabled"
                    @click="setViewMode(option.mode, option.disabled)">
                    <Icon :name="option.icon" class="h-4 w-4" />
                    <span v-if="browse?.viewMode.value === option.mode" class="hidden sm:inline">{{ option.label }}</span>
                    <span
                      v-if="option.suggested && browse?.viewMode.value !== option.mode"
                      class="h-1.5 w-1.5 rounded-full bg-primary/60 absolute -top-0.5 -right-0.5" />
                  </button>
                </slot>
              </div>

              <!-- Search Input -->
              <div class="relative flex-1 w-full rounded-lg">
                <Icon
                  name="lucide:search"
                  class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <slot name="search" :placeholder="effectiveSearchPlaceholder" class="w-full">
                  <input
                    v-if="browse"
                    v-model="searchQuery"
                    type="text"
                    :placeholder="effectiveSearchPlaceholder"
                    class="w-full rounded-lg border border-border bg-card/0 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input
                    v-else
                    type="text"
                    :placeholder="effectiveSearchPlaceholder"
                    class="w-full rounded-lg border border-border bg-card/0 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </slot>
              </div>

              <!-- Filters -->
              <div class="flex items-center gap-2 shrink-0">
                <slot name="filters">
                  <!-- Advanced Filters (Notion-style) -->
                  <UiPopover v-if="advancedFilters">
                    <UiPopoverTrigger as-child>
                      <UiButton
                        variant="outline"
                        size="sm"
                        class="gap-1.5 bg-card max-w-[480px]"
                        :class="advancedFilters.hasActiveFilters.value ? 'border-primary/50 text-primary' : ''">
                        <Icon name="lucide:filter" class="h-4 w-4 shrink-0" />
                        <template v-if="advancedFilters.hasActiveFilters.value">
                          <span
                            v-for="(pill, pIdx) in advancedFilters.activeFilterSummary.value.slice(0, 3)"
                            :key="pIdx"
                            class="inline-flex items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap">
                            <span class="text-primary/70">{{ pill.fieldLabel }}</span>
                            <span v-if="pill.displayValue" class="text-primary">{{ pill.displayValue }}</span>
                          </span>
                          <span
                            v-if="advancedFilters.activeFilterSummary.value.length > 3"
                            class="text-[11px] text-primary/60 whitespace-nowrap">
                            +{{ advancedFilters.activeFilterSummary.value.length - 3 }}
                          </span>
                        </template>
                        <span v-else>Filter</span>
                      </UiButton>
                    </UiPopoverTrigger>
                    <UiPopoverContent align="start" :side-offset="8" class="w-auto p-3">
                      <FilterBuilder :filters="advancedFilters" />
                    </UiPopoverContent>
                  </UiPopover>

                  <!-- Simple dropdown filters (only shown when no advanced filters) -->
                  <template v-if="browse?.filters?.length && !advancedFilters">
                    <UiDropdownMenu v-for="filter in browse.filters" :key="filter.id">
                      <UiDropdownMenuTrigger as-child>
                        <UiButton variant="outline" size="sm" class="gap-2 bg-card/0">
                          <Icon v-if="filter.icon" :name="filter.icon" class="h-4 w-4" />
                          <span>{{ filter.label }}</span>
                          <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-50" />
                        </UiButton>
                      </UiDropdownMenuTrigger>
                      <UiDropdownMenuContent align="start" class="w-48">
                        <UiDropdownMenuRadioGroup
                          :model-value="filter.currentValue.value"
                          @update:model-value="filter.setFilter">
                          <UiDropdownMenuRadioItem
                            v-for="option in filter.options"
                            :key="option.value"
                            :value="option.value">
                            {{ option.label }}
                          </UiDropdownMenuRadioItem>
                        </UiDropdownMenuRadioGroup>
                      </UiDropdownMenuContent>
                    </UiDropdownMenu>
                  </template>
                </slot>

                <!-- Automatic Sort Control -->
                <template v-if="browse && browse.sortOptions.length > 0">
                  <UiDropdownMenu>
                    <UiDropdownMenuTrigger as-child>
                      <UiButton variant="outline" size="sm" class="gap-2 bg-card">
                        <Icon name="lucide:arrow-up-down" class="h-4 w-4" />
                        <span>{{ browse.currentSortLabel.value }}</span>
                        <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-50" />
                      </UiButton>
                    </UiDropdownMenuTrigger>
                    <UiDropdownMenuContent align="end" class="w-48">
                      <UiDropdownMenuRadioGroup
                        :model-value="browse.sortBy.value"
                        @update:model-value="(value) => value != null && browse?.setSort(String(value))">
                        <UiDropdownMenuRadioItem
                          v-for="option in browse.sortOptions"
                          :key="option.value"
                          :value="option.value">
                          {{ option.label }}
                        </UiDropdownMenuRadioItem>
                      </UiDropdownMenuRadioGroup>
                      <UiDropdownMenuSeparator />
                      <UiDropdownMenuItem class="gap-2" @click="browse.toggleSortDirection">
                        <Icon
                          :name="browse.sortDirection.value === 'asc' ? 'lucide:sort-asc' : 'lucide:sort-desc'"
                          class="h-4 w-4" />
                        <span>{{ browse.sortDirection.value === 'asc' ? 'Ascending' : 'Descending' }}</span>
                      </UiDropdownMenuItem>
                    </UiDropdownMenuContent>
                  </UiDropdownMenu>
                </template>
              </div>

              <!-- Actions -->
              <div
                v-if="$slots.toolbarActions || primaryAction || secondaryAction || tertiaryAction"
                class="flex items-center gap-2 shrink-0">
                <slot name="toolbarActions">
                  <template v-for="action in [tertiaryAction, secondaryAction, primaryAction]" :key="action?.label">
                    <UiButton
                      v-if="action"
                      :variant="action.variant || (action === primaryAction ? 'default' : 'outline')"
                      size="sm"
                      :disabled="action.disabled"
                      :loading="action.isLoading"
                      class="gap-2"
                      @click="handleActionClick(action)">
                      <Icon v-if="action.icon" :name="action.icon" class="h-4 w-4" />
                      <span>{{ action.label }}</span>
                    </UiButton>
                  </template>
                </slot>
              </div>
            </div>
          </div>
        </div>

        <!-- Feed Source Bar (feed variant) -->
        <div v-if="isFeed && $slots.sourceBar" class="shrink-0 px-4">
          <div :class="variantConfig.maxWidth">
            <slot name="sourceBar" />
          </div>
        </div>

        <!-- Folders Variant Layout -->
        <template v-if="isFolders">
          <UiSplitter direction="horizontal" class="flex-1 min-h-0">
            <UiSplitterPanel :default-size="30" :min-size="20" :max-size="50">
              <div class="h-full flex flex-col border-r border-border bg-card/50">
                <!-- Folder Tree Header -->
                <div class="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span class="text-sm font-medium text-foreground">Folders</span>
                  <div class="flex items-center gap-1">
                    <UiButton
                      v-if="onAddFolder"
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7"
                      title="Add folder"
                      @click="onAddFolder(selectedFolderPath || '/')">
                      <Icon name="lucide:folder-plus" class="h-4 w-4" />
                    </UiButton>
                    <UiButton
                      v-if="onAddItem"
                      variant="ghost"
                      size="icon"
                      class="h-7 w-7"
                      title="Add item"
                      @click="onAddItem(selectedFolderPath || '/')">
                      <Icon name="lucide:plus" class="h-4 w-4" />
                    </UiButton>
                  </div>
                </div>

                <!-- Folder Tree -->
                <UiScrollArea class="flex-1">
                  <div class="p-2">
                    <UiTree
                      v-if="folderItems?.length"
                      v-slot="{ flattenItems }"
                      :items="folderItems"
                      :get-key="(item) => item.id"
                      :default-expanded="folderItems?.map((f) => f.id) || []"
                      class="flex flex-col gap-0.5">
                      <template v-for="item in flattenItems" :key="item._id">
                        <UiTreeItem
                          v-slot="{ isExpanded, isSelected }"
                          v-bind="item.bind"
                          :style="{ 'padding-left': `${item.level * 16}px` }"
                          class="group z-10 outline-hidden select-none focus:z-20"
                          @click="
                            item.value.type === 'folder'
                              ? onFolderSelect?.(item.value.path)
                              : onItemSelect?.(item.value.id)
                          ">
                          <div
                            :class="[
                              isSelected || selectedItemId === item.value.id || selectedFolderPath === item.value.path
                                ? 'bg-accent text-accent-foreground'
                                : 'hover:bg-muted',
                            ]"
                            class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer">
                            <!-- Expand/Collapse for folders -->
                            <template v-if="item.hasChildren">
                              <Icon
                                name="lucide:chevron-right"
                                class="size-3.5 text-muted-foreground shrink-0 transition-transform duration-200"
                                :class="[isExpanded ? 'rotate-90' : '']" />
                            </template>
                            <span v-else class="w-3.5 shrink-0" />

                            <!-- Icon -->
                            <template v-if="item.value.type === 'folder'">
                              <Icon
                                :name="
                                  isExpanded
                                    ? item.value.openIcon || 'lucide:folder-open'
                                    : item.value.icon || 'lucide:folder'
                                "
                                class="size-4 text-muted-foreground shrink-0" />
                            </template>
                            <template v-else>
                              <Icon
                                :name="item.value.icon || 'lucide:file-text'"
                                class="size-4 text-muted-foreground shrink-0" />
                            </template>

                            <!-- Name -->
                            <span class="truncate flex-1">{{ item.value.name }}</span>

                            <!-- Context menu trigger -->
                            <UiDropdownMenu>
                              <UiDropdownMenuTrigger as-child>
                                <button
                                  class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-background/50 transition-opacity"
                                  @click.stop>
                                  <Icon name="lucide:more-horizontal" class="size-3.5 text-muted-foreground" />
                                </button>
                              </UiDropdownMenuTrigger>
                              <UiDropdownMenuContent align="end" class="w-40">
                                <template v-if="item.value.type === 'folder'">
                                  <UiDropdownMenuItem v-if="onAddFolder" @click="onAddFolder(item.value.path)">
                                    <Icon name="lucide:folder-plus" class="mr-2 h-4 w-4" />
                                    Add subfolder
                                  </UiDropdownMenuItem>
                                  <UiDropdownMenuItem v-if="onAddItem" @click="onAddItem(item.value.path)">
                                    <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
                                    Add item
                                  </UiDropdownMenuItem>
                                </template>
                                <template v-else>
                                  <UiDropdownMenuItem v-if="onMoveItem" @click="emit('moveItem', item.value.id)">
                                    <Icon name="lucide:move" class="mr-2 h-4 w-4" />
                                    Move to...
                                  </UiDropdownMenuItem>
                                </template>
                                <UiDropdownMenuSeparator />
                                <UiDropdownMenuItem class="text-destructive">
                                  <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                                  Delete
                                </UiDropdownMenuItem>
                              </UiDropdownMenuContent>
                            </UiDropdownMenu>
                          </div>
                        </UiTreeItem>
                      </template>
                    </UiTree>

                    <!-- Empty folders state -->
                    <div v-else class="flex flex-col items-center justify-center py-8 px-4 text-center">
                      <Icon name="lucide:folder" class="h-10 w-10 text-muted-foreground/40 mb-3" />
                      <p class="text-sm text-muted-foreground">No folders yet</p>
                      <UiButton
                        v-if="onAddFolder"
                        variant="outline"
                        size="sm"
                        class="mt-3 gap-2"
                        @click="onAddFolder('/')">
                        <Icon name="lucide:folder-plus" class="h-4 w-4" />
                        Create folder
                      </UiButton>
                    </div>
                  </div>
                </UiScrollArea>
              </div>
            </UiSplitterPanel>

            <UiSplitterHandle />

            <UiSplitterPanel :default-size="70">
              <div class="h-full flex flex-col overflow-hidden bg-muted/30">
                <!-- Preview Header (when item selected) -->
                <div
                  v-if="selectedItemId && $slots.folderPreviewHeader"
                  class="shrink-0 border-b border-border bg-card px-6 py-4">
                  <slot name="folderPreviewHeader" :selected-item-id="selectedItemId" />
                </div>

                <!-- Preview Content -->
                <div class="flex-1 overflow-y-auto">
                  <template v-if="selectedItemId && $slots.folderPreview">
                    <slot name="folderPreview" :selected-item-id="selectedItemId" />
                  </template>

                  <!-- Empty Preview State -->
                  <template v-else>
                    <div class="h-full flex flex-col items-center justify-center p-8 text-center">
                      <div class="rounded-full bg-muted p-4 mb-4">
                        <Icon name="lucide:mouse-pointer-click" class="h-8 w-8 text-muted-foreground/60" />
                      </div>
                      <h3 class="text-lg font-medium text-foreground mb-2">
                        {{ folderEmptyTitle || 'Select an item' }}
                      </h3>
                      <p class="text-sm text-muted-foreground max-w-sm">
                        {{ folderEmptyDescription || 'Choose an item from the folder tree to view its details here.' }}
                      </p>
                    </div>
                  </template>
                </div>
              </div>
            </UiSplitterPanel>
          </UiSplitter>
        </template>

        <!-- Main Content -->
        <div v-else :class="mainContentClass">
          <!-- Loading State -->
          <div v-if="isLoading" class="flex items-center justify-center py-16">
            <div class="flex flex-col items-center gap-3 text-muted-foreground">
              <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin" />
              <span class="text-sm">Loading {{ countLabel }}...</span>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
            <Icon name="lucide:alert-circle" class="mx-auto h-10 w-10 text-destructive" />
            <h3 class="mt-4 text-lg font-medium text-destructive">Something went wrong</h3>
            <p class="mt-2 text-sm text-muted-foreground">{{ error }}</p>
            <UiButton variant="outline" size="sm" class="mt-4" @click="emit('retry')">
              <Icon name="lucide:refresh-cw" class="mr-2 h-4 w-4" />
              Try Again
            </UiButton>
          </div>

          <!-- Search Results Empty State -->
          <div
            v-else-if="browse?.hasSearch?.value && filteredCount === 0"
            class="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
            <Icon name="lucide:search-x" class="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <h3 class="mt-4 text-lg font-medium">No Matches Found</h3>
            <p class="mt-2 text-sm text-muted-foreground">
              No results match "{{ browse.searchQuery.value }}". Try a different search term.
            </p>
            <UiButton variant="outline" size="sm" class="mt-4" @click="browse.clearSearch">Clear Search</UiButton>
          </div>

          <!-- Default Content -->
          <template v-else-if="$slots.default">
            <div
              v-if="browse?.viewMode.value === 'table' && $slots.table"
              class="overflow-hidden rounded-xl border border-border bg-card mb-8">
              <slot
                name="table"
                :items="browse.filteredItems.value"
                :is-full-width="isFullWidth"
                :browse-variant="browseVariant" />
            </div>
            <div v-else-if="browse?.viewMode.value === 'calendar' && $slots.calendar" class="h-full w-full">
              <slot name="calendar" :items="browse.filteredItems.value" />
            </div>
            <div v-else-if="browse?.viewMode.value === 'kanban' && $slots.kanban" class="h-full w-full">
              <slot name="kanban" :items="browse.filteredItems.value" />
            </div>
            <div v-else-if="browse?.viewMode.value === 'timeline' && $slots.timeline" class="h-full w-full">
              <slot name="timeline" :items="browse.filteredItems.value" />
            </div>
            <div v-show="browse?.viewMode.value !== 'table' || !$slots.table" class="h-full w-full">
              <slot
                :is-full-width="isFullWidth"
                :is-section-highlighted="isSectionHighlighted"
                :browse-variant="browseVariant" />
            </div>
          </template>

          <!-- Empty State -->
          <template v-else>
            <AppEmptyState
              :title="emptyTitle || title || 'No Data'"
              :description="emptyDescription || description || 'There is nothing to show here yet.'"
              :icon="emptyIcon || icon || 'lucide:folder-code'" />
          </template>
        </div>
      </div>
    </div>

    <!-- Secondary Sidebar (optional) -->
    <aside v-if="secondarySidebar && $slots.secondarySidebar" class="w-64 shrink-0 border-l border-border bg-card/50">
      <slot name="secondarySidebar" />
    </aside>
    <!-- Global Action Dialog -->
    <UiDialog v-model:open="isDialogOpen">
      <template v-if="hasActionDialogSlot">
        <slot v-if="dialogSlotName" :name="dialogSlotName" :close="closeActionDialog" :open="isDialogOpen" />
      </template>
      <UiDialogContent v-else class="sm:max-w-[600px]">
        <slot v-if="dialogSlotName" :name="dialogSlotName" :close="closeActionDialog" :open="isDialogOpen" />
      </UiDialogContent>
    </UiDialog>
  </div>
</template>
