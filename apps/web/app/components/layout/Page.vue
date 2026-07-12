<script setup lang="ts">
  import { clsx } from 'clsx'
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
    /** Hide the search input in browse toolbar (e.g. Form view) */
    hideSearch?: boolean
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
    /** Entity type slug(s) powering this page's data. Renders a clickable link to /ontologies/<type>. */
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
    isLoading: false,
    error: null,
    selectedItemId: null,
  })

  const emit = defineEmits<{
    retry: []
    moveItem: [itemId: string]
  }>()

  // Variant configuration type
  interface VariantConfig {
    showHeader: boolean
    showTabs: boolean
    contentPadding: string
    maxWidth: string
    showToolbar: boolean
  }

  // Variant configurations - single source of truth
  const VARIANT_CONFIGS: Record<PageVariant, VariantConfig> = {
    canvas: { showHeader: false, showTabs: false, contentPadding: 'p-0', maxWidth: '', showToolbar: false },
    prose: {
      showHeader: true,
      showTabs: false,
      contentPadding: 'px-8 pb-6 pt-0',
      maxWidth: 'max-w-full',
      showToolbar: false,
    },
    settings: {
      showHeader: true,
      showTabs: true,
      contentPadding: 'px-8 pb-12 pt-6',
      maxWidth: 'mx-auto w-full lg:max-w-5xl',
      showToolbar: false,
    },
    sidebar: { showHeader: false, showTabs: false, contentPadding: 'p-0', maxWidth: '', showToolbar: false },
    browse: {
      showHeader: true,
      showTabs: false,
      contentPadding: 'px-3 py-3 pt-0 sm:px-4 sm:py-4',
      maxWidth: '',
      showToolbar: true,
    },
    filesystem: { showHeader: false, showTabs: false, contentPadding: 'p-0', maxWidth: '', showToolbar: false },
    folders: { showHeader: true, showTabs: false, contentPadding: 'p-0', maxWidth: '', showToolbar: false },
    calendar: { showHeader: false, showTabs: false, contentPadding: 'p-0', maxWidth: '', showToolbar: false },
    feed: { showHeader: true, showTabs: false, contentPadding: 'px-4 py-4 pt-0', maxWidth: '', showToolbar: true },
    station: { showHeader: false, showTabs: true, contentPadding: 'p-0', maxWidth: '', showToolbar: false },
    grid: { showHeader: false, showTabs: false, contentPadding: 'p-0', maxWidth: '', showToolbar: false },
    default: { showHeader: true, showTabs: true, contentPadding: 'px-8 py-6', maxWidth: '', showToolbar: false },
  }

  // Computed variant-based settings
  const variantConfig = computed(() => VARIANT_CONFIGS[props.variant])

  // Variant flags - consolidated variant checking
  const variantFlags = computed(() => ({
    isFilesystem: props.variant === 'filesystem',
    isFolders: props.variant === 'folders',
    isCalendar: props.variant === 'calendar',
    isFeed: props.variant === 'feed',
    isBrowse: props.variant === 'browse',
    isSettings: props.variant === 'settings',
    isGrid: props.variant === 'grid',
  }))

  // Backward compatibility - keep existing computeds for template
  const isFilesystem = computed(() => variantFlags.value.isFilesystem)
  const isFolders = computed(() => variantFlags.value.isFolders)
  const isCalendar = computed(() => variantFlags.value.isCalendar)
  const isFeed = computed(() => variantFlags.value.isFeed)

  const effectiveFillHeight = computed(
    () => props.fillHeight || isFilesystem.value || isFolders.value || isCalendar.value,
  )

  const isSpreadsheetBrowseView = computed(() => props.browse?.viewMode.value === 'table')
  const isKanbanBrowseView = computed(() => props.browse?.viewMode.value === 'kanban')
  const isOverflowConstrainedBrowseView = computed(
    () => isSpreadsheetBrowseView.value || isKanbanBrowseView.value,
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

  // Debounced localStorage write for better performance
  const debouncedSaveWidth = useDebounceFn((key: string, value: string) => {
    if (import.meta.client) {
      try {
        localStorage.setItem(key, value)
      } catch {
        // Silently fail if localStorage is unavailable
      }
    }
  }, 300)

  // Toggle width and persist preference
  function _toggleWidth() {
    isFullWidth.value = !isFullWidth.value
    debouncedSaveWidth(storageKey.value, String(isFullWidth.value))
  }

  // Container class
  const finalContainerClass = computed(() =>
    clsx(props.containerClass, effectiveFillHeight.value && 'h-full flex flex-col'),
  )

  // Content wrapper class
  const contentWrapperClass = computed(() => {
    if (!effectiveFillHeight.value) return 'w-full'
    const overflow =
      isFilesystem.value || isOverflowConstrainedBrowseView.value ? 'overflow-hidden' : 'overflow-y-auto'
    return clsx('w-full flex h-full flex-col', overflow)
  })

  // Main content area class
  const mainContentClass = computed(() =>
    clsx(
      props.contentClass,
      isSpreadsheetBrowseView.value ? 'p-0' : variantConfig.value.contentPadding,
      variantConfig.value.maxWidth,
      effectiveFillHeight.value && ['min-h-0', 'flex-1'],
      isSpreadsheetBrowseView.value && ['flex', 'flex-col', 'overflow-hidden'],
      isKanbanBrowseView.value && ['flex', 'flex-col', 'overflow-hidden'],
    ),
  )

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
        const og = (globalThis as { defineOgImageComponent?: (name: string, props: Record<string, string>) => void })
          .defineOgImageComponent
        if (typeof og === 'function') {
          og('Site', {
            title: seoTitle.value,
            description: seoDesc.value,
          })
        }
      }
    }
  })

  // Hash-based tab navigation
  const { activeHash, isTabActive, handleHashClick, isSectionHighlighted } = useHashNavigation(effectiveTabs)

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
  const dataSourceTypes = computed<string[]>(() => {
    if (!props.dataSource) return []
    return Array.isArray(props.dataSource) ? props.dataSource : [props.dataSource]
  })

  const dataSourceLink = computed(() => {
    const types = dataSourceTypes.value
    if (types.length === 1 && types[0]) return `/ontologies/${types[0]}`
    return '/ontologies'
  })

  const dataSourceLabel = computed(() => {
    const types = dataSourceTypes.value
    if (types.length === 0) return ''
    if (types.length === 1 && types[0]) return types[0]
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
    return options.filter((option) => option.visible !== false && !option.disabled)
  })

  const hasCustomSort = computed(() => {
    const browse = props.browse
    if (!browse?.sortOptions.length) return false
    const defaultSort = browse.sortOptions[0]?.value
    return browse.sortBy.value !== defaultSort || browse.sortDirection.value !== 'asc'
  })

  const setViewMode = (mode: BrowseViewMode) => {
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

      const fallback = options[0]?.mode
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
          <div
            class="relative border-b border-border/60 px-3 py-3 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
            :class="variantConfig.maxWidth">
            <div class="relative flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-stretch">
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
                <div
                  v-if="subtitle || showBackButton || icon || dataSource"
                  class="inline-flex items-center gap-0.5 mb-0">
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
                    <Icon
                      name="lucide:database"
                      class="size-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    <span class="uppercase tracking-wide">{{ dataSourceLabel }}</span>
                  </NuxtLink>
                </div>

                <!-- Title -->
                <div v-if="title || $slots.title" class="my-1.5 flex items-center gap-2 sm:my-2">
                  <h1 class="text-foreground text-2xl font-semibold sm:text-3xl">
                    <slot name="title">{{ title }}</slot>
                  </h1>
                  <slot name="titleActions" />
                </div>

                <!-- Description -->
                <p
                  v-if="description || $slots.description"
                  class="hidden max-w-2xl text-sm text-muted-foreground sm:block">
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

              <!-- Stats Section -->
              <div
                v-if="(stats && stats.length > 0) || $slots.stats"
                class="grid w-full grid-cols-2 gap-2 sm:flex sm:gap-3 sm:overflow-x-auto sm:pb-0.5 sm:scrollbar-none lg:w-fit lg:max-w-[75%] lg:shrink-0 lg:self-stretch lg:overflow-visible">
                <slot name="stats">
                  <div
                    v-for="stat in stats"
                    :key="stat.label"
                    class="flex min-h-16 min-w-0 flex-col justify-between gap-1 rounded-lg border border-border bg-card/20 px-3 py-2.5 backdrop-blur-sm sm:min-h-20 sm:min-w-32 sm:shrink-0 sm:snap-start sm:px-4 sm:py-3 lg:h-[92px] lg:min-w-36 lg:px-5">
                    <div
                      class="flex min-w-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <Icon
                        v-if="stat.icon"
                        :name="stat.icon"
                        :class="['size-3 shrink-0', stat.color || 'text-muted-foreground/70']" />
                      <span class="truncate">{{ stat.label }}</span>
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
                      <span class="text-lg font-bold tracking-tight text-foreground sm:text-xl">{{ stat.value }}</span>
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
                  <PageActionButtons
                    :actions="[tertiaryAction, secondaryAction, primaryAction]"
                    size="xs"
                    :on-action-click="handleActionClick" />
                </slot>
              </div>
            </div>
          </div>
        </div>

        <!-- Browse Toolbar (browse variant) -->
        <div
          v-if="variantConfig.showToolbar"
          ref="stickyRef"
          class="sticky -top-px z-40 transition-all duration-50"
          :class="[
            !isSpreadsheetBrowseView && 'rounded-t-lg',
            transparent ? 'bg-transparent' : 'bg-surface-2',
            isStuck && !transparent && 'border-b border-border/60',
          ]">
          <div :class="isFeed ? 'mx-3 sm:mx-4' : 'mx-3 sm:mx-4'" class="py-3 sm:py-4">
            <div
              class="grid w-full gap-2.5 [grid-template-columns:minmax(0,1fr)_auto] sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <!-- View Mode Switcher -->
              <div
                v-if="showViewSwitcher && !isFeed"
                class="col-start-1 row-start-1 flex min-w-0 items-center overflow-x-auto rounded-lg border border-border bg-muted/30 p-0.5 scrollbar-none sm:shrink-0">
                <slot name="viewSwitcher">
                  <button
                    v-for="option in effectiveViewModeOptions"
                    :key="option.mode"
                    type="button"
                    class="relative flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors"
                    :class="
                      browse?.viewMode.value === option.mode
                        ? 'bg-foreground/8 text-foreground hover:bg-sidebar-background/15 '
                        : 'text-muted-foreground/50 hover:bg-transparent hover:text-foreground'
                    "
                    :title="option.reason || option.tooltip || `${option.label} view`"
                    :aria-label="option.reason || option.tooltip || `${option.label} view`"
                    :aria-current="browse?.viewMode.value === option.mode ? 'true' : undefined"
                    @click="setViewMode(option.mode)">
                    <Icon :name="option.icon" class="h-4 w-4" />
                    <span
                      v-if="option.suggested && browse?.viewMode.value !== option.mode"
                      class="h-1.5 w-1.5 rounded-full bg-primary/60 absolute -top-0.5 -right-0.5" />
                  </button>
                </slot>
              </div>

              <!-- Optional controls immediately before search (e.g. grid column count) -->
              <div class="hidden shrink-0 sm:block">
                <slot name="beforeSearch" />
              </div>

              <!-- Search -->
              <div
                v-if="!hideSearch"
                class="relative col-span-2 row-start-2 min-w-0 w-full rounded-lg sm:col-span-1 sm:row-start-1 sm:flex-1">
                <Icon
                  name="lucide:search"
                  class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <slot name="search" :placeholder="effectiveSearchPlaceholder" class="w-full">
                  <input
                    v-if="browse"
                    v-model="searchQuery"
                    type="text"
                    :placeholder="effectiveSearchPlaceholder"
                    class="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input
                    v-else
                    type="text"
                    :placeholder="effectiveSearchPlaceholder"
                    class="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </slot>
              </div>

              <!-- Filters + sort + toolbar actions -->
              <div
                class="col-start-2 row-start-1 flex shrink-0 items-center gap-1 justify-self-end sm:col-auto sm:row-auto sm:gap-2">
                <!-- Advanced Filters (outside slot so pages can extend #filters without losing this) -->
                <UiPopover v-if="advancedFilters">
                  <UiPopoverTrigger as-child>
                    <UiButton
                      variant="outline"
                      size="sm"
                      class="max-w-[40vw] bg-card sm:max-w-[480px]"
                      :class="[
                        advancedFilters.hasActiveFilters.value
                          ? 'gap-1 border-primary/50 text-primary sm:gap-1.5'
                          : 'px-2',
                      ]"
                      aria-label="Filter"
                      :title="advancedFilters.hasActiveFilters.value ? undefined : 'Filter'">
                      <Icon name="lucide:filter" class="h-4 w-4 shrink-0" />
                      <template v-if="advancedFilters.hasActiveFilters.value">
                        <span
                          class="inline-flex min-w-5 items-center justify-center rounded-sm bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary sm:hidden">
                          {{ advancedFilters.activeFilterSummary.value.length }}
                        </span>
                        <span
                          v-for="(pill, pIdx) in advancedFilters.activeFilterSummary.value.slice(0, 3)"
                          :key="pIdx"
                          class="hidden items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap sm:inline-flex">
                          <span class="text-primary/70">{{ pill.fieldLabel }}</span>
                          <span v-if="pill.displayValue" class="text-primary">{{ pill.displayValue }}</span>
                        </span>
                        <span
                          v-if="advancedFilters.activeFilterSummary.value.length > 3"
                          class="hidden text-[11px] text-primary/60 whitespace-nowrap sm:inline">
                          +{{ advancedFilters.activeFilterSummary.value.length - 3 }}
                        </span>
                      </template>
                    </UiButton>
                  </UiPopoverTrigger>
                  <UiPopoverContent align="start" :side-offset="8" class="w-auto p-3">
                    <FilterBuilder :filters="advancedFilters" />
                  </UiPopoverContent>
                </UiPopover>

                <slot name="filters">
                  <!-- Simple dropdown filters (only shown when no advanced filters) -->
                  <template v-if="browse?.filters?.length && !advancedFilters">
                    <UiDropdownMenu v-for="filter in browse.filters" :key="filter.id">
                      <UiDropdownMenuTrigger as-child>
                        <UiButton
                          variant="outline"
                          size="sm"
                          class="bg-card"
                          :class="
                            filter.currentValue.value !== filter.options[0]?.value ? 'gap-2' : 'px-2'
                          "
                          :aria-label="filter.label"
                          :title="filter.currentValue.value === filter.options[0]?.value ? filter.label : undefined">
                          <Icon v-if="filter.icon" :name="filter.icon" class="h-4 w-4" />
                          <template v-if="filter.currentValue.value !== filter.options[0]?.value">
                            <span>{{ filter.label }}</span>
                            <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-50" />
                          </template>
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
                      <UiButton
                        variant="outline"
                        size="sm"
                        class="bg-card"
                        :class="hasCustomSort ? 'gap-2' : 'px-2'"
                        aria-label="Sort"
                        :title="hasCustomSort ? undefined : 'Sort'">
                        <Icon name="lucide:arrow-up-down" class="h-4 w-4" />
                        <template v-if="hasCustomSort">
                          <span class="hidden sm:inline">{{ browse.currentSortLabel.value }}</span>
                          <Icon name="lucide:chevron-down" class="hidden h-3 w-3 opacity-50 sm:inline" />
                        </template>
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

                <!-- Toolbar actions -->
                <div
                  v-if="$slots.toolbarActions || primaryAction || secondaryAction || tertiaryAction"
                  class="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <slot name="toolbarActions">
                    <PageActionButtons
                      :actions="[tertiaryAction, secondaryAction, primaryAction]"
                      size="sm"
                      :on-action-click="handleActionClick" />
                  </slot>
                </div>
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
            <div
              v-show="browse?.viewMode.value !== 'table' || !$slots.table"
              :class="
                isSpreadsheetBrowseView
                  ? 'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden border-t'
                  : isKanbanBrowseView
                    ? 'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'
                    : 'h-full w-full'
              ">
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
