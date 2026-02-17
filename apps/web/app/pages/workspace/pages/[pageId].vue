<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import type { Entity, PropertyFieldId } from '~/types/entity'
  import type { BrowseViewMode } from '~/composables/useBrowse'
  import type { PageConfig } from '~/composables/usePages'
  import type { GridView, GridPreset } from '~/types/grid'
  import type { ProjectionType } from '~/types/database'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import { useBrowse } from '~/composables/useBrowse'
  import { useBrowseSelection } from '~/composables/useBrowseSelection'
  import { useDialogUrl } from '~/composables/useDialogUrl'
  import { useHashDialogRestore } from '~/composables/useHashDialogRestore'
  import { useGridLayout } from '~/composables/useGridLayout'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import GridEditor from '~/components/grid/GridEditor.vue'
  import GridEntityDetail from '~/components/grid/projections/GridEntityDetail.vue'
  import GridChartProjection from '~/components/grid/projections/GridChartProjection.vue'

  definePageMeta({ layout: 'default' })

  const route = useRoute()
  const pageId = computed(() => route.params.pageId as string)

  const { pages, updatePage } = usePages()
  const { items: allItems, update: updateItem, remove: removeItem } = useEntities()

  // Resolve the page config
  const pageConfig = computed<PageConfig | null>(() => {
    return (pages.value || []).find((p) => p.id === pageId.value) || null
  })

  const pageTitle = computed(() => pageConfig.value?.title || 'Untitled')
  const pageIcon = computed(() => pageConfig.value?.icon || 'lucide:file-text')
  const dataSource = computed(() => pageConfig.value?.dataSource || '')
  const isGridLayout = computed(() => pageConfig.value?.layout === 'grid')

  // ── Inline-editable title/description ──────────────────────────────────

  const editableTitle = ref('')
  const editableDescription = ref('')
  const isEditingTitle = ref(false)
  const isEditingDescription = ref(false)
  const titleInput = ref<HTMLInputElement | null>(null)
  const descriptionInput = ref<HTMLInputElement | null>(null)

  watch(pageConfig, (config) => {
    if (config) {
      editableTitle.value = config.title || ''
      editableDescription.value = config.description || ''
    }
  }, { immediate: true })

  function startEditingTitle() {
    isEditingTitle.value = true
    nextTick(() => titleInput.value?.focus())
  }

  function finishEditingTitle() {
    isEditingTitle.value = false
    const title = editableTitle.value.trim() || 'Untitled'
    editableTitle.value = title
    if (pageConfig.value && title !== pageConfig.value.title) {
      updatePage(pageConfig.value.id, { title })
    }
  }

  function startEditingDescription() {
    isEditingDescription.value = true
    nextTick(() => descriptionInput.value?.focus())
  }

  function finishEditingDescription() {
    isEditingDescription.value = false
    if (pageConfig.value && editableDescription.value !== (pageConfig.value.description || '')) {
      updatePage(pageConfig.value.id, { description: editableDescription.value })
    }
  }

  // ── Editable Icon ─────────────────────────────────────────────────────

  const iconPickerOpen = ref(false)

  function handleIconChange(icon: string) {
    if (pageConfig.value && icon) {
      updatePage(pageConfig.value.id, { icon })
    }
  }

  // ── Banner Image ─────────────────────────────────────────────────────

  const bannerImage = computed(() => pageConfig.value?.bannerImage || '')
  const showBannerInput = ref(false)
  const bannerUrlInput = ref('')

  function handleAddBanner() {
    bannerUrlInput.value = bannerImage.value
    showBannerInput.value = true
  }

  function handleSaveBanner() {
    if (pageConfig.value) {
      updatePage(pageConfig.value.id, { bannerImage: bannerUrlInput.value.trim() || undefined })
    }
    showBannerInput.value = false
  }

  function handleRemoveBanner() {
    if (pageConfig.value) {
      updatePage(pageConfig.value.id, { bannerImage: undefined })
    }
    showBannerInput.value = false
  }

  // ── Grid Layout ────────────────────────────────────────────────────────

  const {
    views: gridViews,
    gap: gridGap,
    editMode: gridEditMode,
    hasViews: gridHasViews,
    viewCount: gridViewCount,
    addView,
    addViewAt,
    addUnconfiguredView,
    removeView,
    updateView,
    resizeView,
    moveView,
    setGap,
    applyPreset,
    previewMove,
    beginBatchMutation,
    commitBatchMutation,
    undo: gridUndo,
    redo: gridRedo,
    canUndo: gridCanUndo,
    canRedo: gridCanRedo,
  } = useGridLayout(pageId)

  // Always-on edit mode (Notion-style inline editing)
  gridEditMode.value = true

  function handleAddView(dataSource: string, projection: ProjectionType, title?: string) {
    if (!dataSource) {
      // "New View" button — create unconfigured cell with inline picker
      addUnconfiguredView()
      return
    }
    addView(dataSource, projection, { title })
  }

  function handleCreateFirstView(dataSource: string, projection: ProjectionType) {
    addView(dataSource, projection, { colSpan: 6, rowSpan: 2 })
  }

  function handleUpdateView(id: string, updates: Partial<GridView>) {
    updateView(id, updates)
  }

  function handleApplyPreset(preset: GridPreset) {
    applyPreset(preset)
    gridEditMode.value = true
  }

  // ── Browse Layout (fullscreen mode) ────────────────────────────────────

  const validModes: BrowseViewMode[] = ['table', 'list', 'grid', 'kanban', 'calendar', 'timeline', 'gantt', 'moodboard']
  const defaultViewMode = computed<BrowseViewMode>(() => {
    const proj = pageConfig.value?.defaultProjection as BrowseViewMode | undefined
    if (proj && validModes.includes(proj)) return proj
    return 'table'
  })

  const sourceItems = computed<Entity[]>(() => {
    const ds = dataSource.value.toLowerCase()
    if (!ds || ds === 'all') return allItems.value
    return allItems.value.filter((item) => (item.type || '').toLowerCase() === ds)
  })

  const { browseState, filteredItems } = useBrowse<Entity>({
    items: sourceItems as Ref<Entity[]>,
    searchFields: ['title', 'description'] as (keyof Entity)[],
    defaultViewMode: defaultViewMode.value,
    sortOptions: [
      { value: 'title', label: 'Title' },
      { value: 'startDate', label: 'Date' },
      { value: 'type', label: 'Type' },
    ],
  })

  const viewMode = computed<BrowseViewMode>(() => browseState.viewMode.value)

  watch(defaultViewMode, (newMode) => {
    browseState.setViewMode(newMode)
  })

  const viewModeOptions = [
    { mode: 'table' as BrowseViewMode, label: 'Table', icon: 'lucide:table' },
    { mode: 'list' as BrowseViewMode, label: 'List', icon: 'lucide:list' },
    { mode: 'grid' as BrowseViewMode, label: 'Grid', icon: 'lucide:grid-3x3' },
    { mode: 'kanban' as BrowseViewMode, label: 'Kanban', icon: 'lucide:square-kanban' },
    { mode: 'calendar' as BrowseViewMode, label: 'Calendar', icon: 'lucide:calendar' },
    { mode: 'timeline' as BrowseViewMode, label: 'Timeline', icon: 'lucide:calendar' },
    { mode: 'gantt' as BrowseViewMode, label: 'Gantt', icon: 'lucide:gantt-chart' },
    { mode: 'moodboard' as BrowseViewMode, label: 'Moodboard', icon: 'lucide:layout-dashboard' },
  ]

  const {
    isSelected, toggle: toggleSelection, clearSelection,
    selectedItems, selectionCount,
    handleFieldUpdate, handleBatchDelete, handleBatchDuplicate, handleBatchSetField,
  } = useBrowseSelection(filteredItems as ComputedRef<Entity[]>)

  // ── Dialog state ───────────────────────────────────────────────────────

  const viewOpen = ref(false)
  const _viewingItemId = ref<string | null>(null)

  const viewingItem = computed<Entity | null>(() => {
    if (!_viewingItemId.value) return null
    return allItems.value.find((i) => i.id === _viewingItemId.value) ?? null
  })

  const viewingIndex = computed(() =>
    viewingItem.value ? filteredItems.value.findIndex((i) => i.id === viewingItem.value?.id) : -1,
  )
  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < filteredItems.value.length - 1)

  function openDetail(item: Entity) {
    _viewingItemId.value = item.id
    viewOpen.value = true
    const { setOriginHash } = useDialogUrl()
    setOriginHash(item.id)
  }

  useHashDialogRestore(allItems, (entityId, item) => {
    _viewingItemId.value = entityId
    viewOpen.value = true
    void item
  })

  watch(viewOpen, (open) => {
    if (!open) {
      const { clearHash } = useDialogUrl()
      clearHash()
      _viewingItemId.value = null
    }
  })

  function navPrev() {
    if (canPrev.value) _viewingItemId.value = filteredItems.value[viewingIndex.value - 1]!.id
  }
  function navNext() {
    if (canNext.value) _viewingItemId.value = filteredItems.value[viewingIndex.value + 1]!.id
  }

  async function handleUpdate(item: Entity) {
    await updateItem(item)
    viewOpen.value = false
    const { clearHash } = useDialogUrl()
    clearHash()
  }
  async function handleDelete(item: Entity) {
    await removeItem(item.id)
    viewOpen.value = false
    const { clearHash } = useDialogUrl()
    clearHash()
  }

  const stats = computed<PageStat[]>(() => [
    { label: 'Items', value: sourceItems.value.length, icon: 'lucide:layers' },
  ])

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  function formatRelativeTime(ts: number): string {
    const now = Date.now()
    const diffMs = now - ts
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'just now'
  }

  function entityIcon(type: string): string {
    return getEntityTypeConfig(type as any)?.icon || 'lucide:file'
  }

  // ── Kanban helpers ────────────────────────────────────────────────────────

  const KANBAN_STATUS_COLUMNS = [
    { id: 'pending', label: 'Pending', border: 'border-slate-400', bg: 'bg-slate-400/5' },
    { id: 'in-progress', label: 'In Progress', border: 'border-blue-500', bg: 'bg-blue-500/5' },
    { id: 'on-track', label: 'On Track', border: 'border-emerald-500', bg: 'bg-emerald-500/5' },
    { id: 'due-soon', label: 'Due Soon', border: 'border-amber-500', bg: 'bg-amber-500/5' },
    { id: 'overdue', label: 'Overdue', border: 'border-red-500', bg: 'bg-red-500/5' },
    { id: 'completed', label: 'Completed', border: 'border-emerald-600', bg: 'bg-emerald-600/5' },
  ]

  function getKanbanColumns(items: Entity[]) {
    // Group by taskStatus, priority, or type — whichever yields >1 group
    const byStatus = groupBy(items, (i) => (i as any).taskStatus || (i as any).status || 'none')
    if (Object.keys(byStatus).length > 1) {
      return KANBAN_STATUS_COLUMNS
        .filter((col) => byStatus[col.id]?.length)
        .map((col) => ({ ...col, items: byStatus[col.id] || [] }))
        .concat(
          Object.entries(byStatus)
            .filter(([k]) => !KANBAN_STATUS_COLUMNS.some((c) => c.id === k))
            .map(([k, v]) => ({ id: k, label: k, border: 'border-border', bg: 'bg-muted/5', items: v })),
        )
    }
    // Fallback: group by type
    const byType = groupBy(items, (i) => i.type || 'unknown')
    return Object.entries(byType).map(([key, vals]) => ({
      id: key, label: key, border: 'border-border', bg: 'bg-muted/5', items: vals,
    }))
  }

  function groupBy<T>(arr: T[], fn: (_el: T) => string): Record<string, T[]> {
    const result: Record<string, T[]> = {}
    for (const el of arr) {
      const key = fn(el)
      ;(result[key] ||= []).push(el)
    }
    return result
  }

  // ── Calendar helpers ──────────────────────────────────────────────────────

  function getCalendarMonth() {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }

  function getCalendarDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = firstDay.getDay()
    const days: { date: number; inMonth: boolean; key: string }[] = []

    // Previous month padding
    const prevLast = new Date(year, month, 0).getDate()
    for (let i = startDow - 1; i >= 0; i--) {
      days.push({ date: prevLast - i, inMonth: false, key: `prev-${prevLast - i}` })
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: d, inMonth: true, key: `cur-${d}` })
    }
    // Next month padding
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        days.push({ date: d, inMonth: false, key: `next-${d}` })
      }
    }
    return days
  }

  function getItemsForDay(items: Entity[], year: number, month: number, date: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
    return items.filter((i) => i.startDate?.startsWith(dateStr))
  }

  const calendarMonth = getCalendarMonth()
  const calendarDays = getCalendarDays(calendarMonth.year, calendarMonth.month)
  const calendarMonthLabel = new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // ── Timeline helpers ──────────────────────────────────────────────────────

  function getTimelineItems(items: Entity[]) {
    return items
      .filter((i) => i.startDate)
      .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
  }

  // ── Projection metadata ───────────────────────────────────────────────────

  const unimplementedProjections: Record<string, { icon: string; label: string }> = {
    graph: { icon: 'lucide:network', label: 'Graph View' },
    spreadsheet: { icon: 'lucide:sheet', label: 'Spreadsheet' },
    dashboard: { icon: 'lucide:layout-dashboard', label: 'Dashboard' },
    moodboard: { icon: 'lucide:image', label: 'Moodboard' },
    'slide-deck': { icon: 'lucide:presentation', label: 'Slide Deck' },
    sankey: { icon: 'lucide:git-branch', label: 'Sankey Diagram' },
  }
</script>

<template>
  <!-- ═══════════════════ PAGE NOT FOUND ═══════════════════ -->
  <Page v-if="!pageConfig" variant="default" :fill-height="true" hide-header>
    <div class="flex h-full flex-col items-center justify-center">
      <Icon name="lucide:file-x" class="text-muted-foreground mb-4 h-12 w-12" />
      <h2 class="text-lg font-semibold">Page not found</h2>
      <p class="text-muted-foreground text-sm mt-1">This page may have been deleted.</p>
      <NuxtLink to="/workspace" class="mt-4">
        <UiButton variant="outline" size="sm">
          <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
          Back to Workspace
        </UiButton>
      </NuxtLink>
    </div>
  </Page>

  <!-- ═══════════════════ GRID LAYOUT ═══════════════════ -->
  <Page v-else-if="isGridLayout" variant="grid" :fill-height="true">
    <!-- Banner image -->
    <div v-if="bannerImage" class="relative group/banner shrink-0">
      <div
        class="h-48 w-full bg-cover bg-center"
        :style="{ backgroundImage: `url(${bannerImage})` }" />
      <div class="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/banner:opacity-100 transition-opacity">
        <button
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
          @click="handleAddBanner">
          <Icon name="lucide:image" class="h-3 w-3" />
          Change cover
        </button>
        <button
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-destructive transition-colors"
          @click="handleRemoveBanner">
          <Icon name="lucide:x" class="h-3 w-3" />
        </button>
      </div>
    </div>

    <!-- Add cover button (no banner yet) -->
    <div v-else class="group/nobanner shrink-0 relative h-0">
      <button
        class="absolute top-2 right-10 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all opacity-0 group-hover/nobanner:opacity-100 z-10"
        @click="handleAddBanner">
        <Icon name="lucide:image" class="h-3 w-3" />
        Add cover
      </button>
    </div>

    <!-- Banner URL input dialog -->
    <UiDialog :open="showBannerInput" @update:open="(v) => showBannerInput = v">
      <UiDialogContent class="sm:max-w-md">
        <UiDialogTitle>Cover Image</UiDialogTitle>
        <UiDialogDescription class="text-sm text-muted-foreground">
          Paste a URL to an image to use as the page cover.
        </UiDialogDescription>
        <input
          v-model="bannerUrlInput"
          type="url"
          placeholder="https://example.com/image.jpg"
          class="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring mt-2"
          @keydown.enter="handleSaveBanner" />
        <div class="flex justify-end gap-2 mt-4">
          <UiButton v-if="bannerImage" variant="ghost" size="sm" class="text-destructive" @click="handleRemoveBanner">
            Remove
          </UiButton>
          <div class="flex-1" />
          <UiButton variant="ghost" size="sm" @click="showBannerInput = false">Cancel</UiButton>
          <UiButton size="sm" @click="handleSaveBanner">Save</UiButton>
        </div>
      </UiDialogContent>
    </UiDialog>

    <!-- Full-width header with icon above title -->
    <div class="shrink-0 w-full px-8 pt-6 pb-4 border-b border-border/60">
      <div class="flex flex-col items-start gap-3 max-w-none">
        <!-- Editable icon (above title) -->
        <button
          class="p-2 rounded-xl hover:bg-muted/50 transition-colors group"
          title="Change icon"
          @click="iconPickerOpen = true">
          <Icon :name="pageIcon" class="h-8 w-8 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
        </button>

        <div class="flex-1 min-w-0 w-full">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <!-- Inline title -->
              <input
                v-if="isEditingTitle"
                ref="titleInput"
                v-model="editableTitle"
                class="text-3xl font-semibold bg-transparent border-none outline-none w-full focus:ring-0 placeholder:text-muted-foreground/40"
                placeholder="Untitled"
                @blur="finishEditingTitle"
                @keydown.enter="finishEditingTitle"
                @keydown.escape="finishEditingTitle" />
              <h1
                v-else
                class="text-foreground text-3xl font-semibold cursor-text hover:bg-muted/30 rounded px-1 -mx-1 transition-colors truncate"
                @click="startEditingTitle">
                {{ editableTitle || 'Untitled' }}
              </h1>

              <!-- Inline description -->
              <input
                v-if="isEditingDescription"
                ref="descriptionInput"
                v-model="editableDescription"
                class="max-w-2xl text-sm text-muted-foreground bg-transparent border-none outline-none w-full focus:ring-0 placeholder:text-muted-foreground/30 mt-1"
                placeholder="Add a description..."
                @blur="finishEditingDescription"
                @keydown.enter="finishEditingDescription"
                @keydown.escape="finishEditingDescription" />
              <p
                v-else
                class="max-w-2xl text-sm text-muted-foreground/60 cursor-text hover:bg-muted/30 rounded px-1 -mx-1 transition-colors truncate mt-1"
                @click="startEditingDescription">
                {{ editableDescription || 'Add a description...' }}
              </p>
            </div>

            <!-- View count + controls -->
            <div class="flex items-center gap-2 shrink-0">
              <span v-if="gridHasViews" class="text-xs text-muted-foreground/50">
                {{ gridViewCount }} {{ gridViewCount === 1 ? 'view' : 'views' }}
              </span>

              <!-- + New View -->
              <button
                v-if="gridHasViews"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                @click="handleAddView('', '' as ProjectionType)">
                <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                New View
              </button>
            </div>
          </div>
        </div>

        <!-- Last updated + templates row -->
        <div class="flex items-center justify-between w-full mt-1">
          <div class="flex items-center gap-3">
            <!-- Last updated indicator -->
            <span v-if="pageConfig?.updatedAt" class="text-[11px] text-muted-foreground/50 flex items-center gap-1">
              <Icon name="lucide:clock" class="h-3 w-3" />
              Updated {{ formatRelativeTime(pageConfig.updatedAt) }}
            </span>

            <!-- Templates button (when views exist) -->
            <button
              v-if="gridHasViews"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Icon name="lucide:layout-template" class="h-3.5 w-3.5" />
              Templates
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Icon picker -->
    <IconPicker
      v-model:open="iconPickerOpen"
      :model-value="pageConfig?.icon || ''"
      @update:model-value="handleIconChange" />

    <!-- Grid editor content -->
    <GridEditor
      :views="gridViews"
      :gap="gridGap"
      :edit-mode="gridEditMode"
      :all-items="allItems"
      :preview-move="previewMove"
      :begin-batch-mutation="beginBatchMutation"
      :commit-batch-mutation="commitBatchMutation"
      :can-undo="gridCanUndo"
      :can-redo="gridCanRedo"
      @undo="gridUndo"
      @redo="gridRedo"
      @add-view="handleAddView"
      @add-view-at="(c, r, cs, rs) => addViewAt(c, r, cs, rs)"
      @remove-view="removeView"
      @update-view="handleUpdateView"
      @resize-view="resizeView"
      @move-view="moveView"
      @set-gap="setGap"
      @toggle-edit="gridEditMode = !gridEditMode"
      @apply-preset="handleApplyPreset"
      @create-first-view="handleCreateFirstView"
      @open-detail="openDetail">
      <!-- Cell content: render a simple projection per cell -->
      <template #cell-content="{ view: cellView, items: cellItems }">
        <div class="h-full overflow-auto" :class="['calendar', 'kanban'].includes(cellView.projection) ? '' : 'p-3'">
          <!-- Table projection -->
          <template v-if="cellView.projection === 'table'">
            <table v-if="cellItems.length" class="w-full text-xs">
              <thead>
                <tr class="border-b border-border/50">
                  <th class="text-left px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase">Title</th>
                  <th class="text-left px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase">Type</th>
                  <th class="text-left px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in cellItems"
                  :key="row.id"
                  class="border-b border-border/30 hover:bg-accent/20 cursor-pointer transition-colors"
                  @click="openDetail(row)">
                  <td class="px-2 py-1.5 font-medium truncate max-w-[200px]">{{ row.title || 'Untitled' }}</td>
                  <td class="px-2 py-1.5">
                    <span class="text-[10px] text-muted-foreground bg-muted/30 px-1 py-0.5 rounded">{{ row.type }}</span>
                  </td>
                  <td class="px-2 py-1.5 text-muted-foreground">{{ row.startDate ? formatDate(row.startDate) : '' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="flex items-center justify-center h-full text-xs text-muted-foreground">
              No items
            </div>
          </template>

          <!-- List projection -->
          <template v-else-if="cellView.projection === 'list'">
            <div class="space-y-1">
              <div
                v-for="item in cellItems"
                :key="item.id"
                class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/20 cursor-pointer transition-colors"
                @click="openDetail(item)">
                <span class="text-xs font-medium truncate flex-1">{{ item.title || 'Untitled' }}</span>
                <span class="text-[10px] text-muted-foreground shrink-0">{{ item.type }}</span>
              </div>
            </div>
            <div v-if="!cellItems.length" class="flex items-center justify-center h-full text-xs text-muted-foreground">
              No items
            </div>
          </template>

          <!-- Card grid projection -->
          <template v-else-if="cellView.projection === 'card-grid'">
            <div class="grid gap-2" style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));">
              <div
                v-for="item in cellItems"
                :key="item.id"
                class="border border-border/40 rounded-lg p-2.5 hover:bg-accent/20 cursor-pointer transition-colors"
                @click="openDetail(item)">
                <p class="text-xs font-medium truncate">{{ item.title || 'Untitled' }}</p>
                <p class="text-[10px] text-muted-foreground mt-0.5">{{ item.type }}</p>
              </div>
            </div>
            <div v-if="!cellItems.length" class="flex items-center justify-center h-full text-xs text-muted-foreground">
              No items
            </div>
          </template>

          <!-- Chart projection -->
          <template v-else-if="cellView.projection === 'chart'">
            <GridChartProjection
              :view="cellView"
              :items="cellItems"
              @update-chart-config="(config) => handleUpdateView(cellView.id, { chartConfig: config })"
              @open-config="() => {}" />
          </template>

          <!-- Kanban projection -->
          <template v-else-if="cellView.projection === 'kanban'">
            <div v-if="cellItems.length" class="flex gap-2 overflow-x-auto h-full pb-1">
              <div
                v-for="col in getKanbanColumns(cellItems)"
                :key="col.id"
                class="shrink-0 w-40 rounded-md border-t-2 flex flex-col min-h-0"
                :class="[col.border, col.bg]">
                <div class="px-2 py-1.5 flex items-center justify-between">
                  <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">{{ col.label }}</span>
                  <span class="text-[9px] text-muted-foreground/50 bg-muted/30 rounded-full px-1.5">{{ col.items.length }}</span>
                </div>
                <div class="flex-1 overflow-y-auto px-1.5 pb-1.5 space-y-1">
                  <div
                    v-for="item in col.items"
                    :key="item.id"
                    class="px-2 py-1.5 rounded bg-card border border-border/30 cursor-pointer hover:border-border/60 transition-colors"
                    @click="openDetail(item)">
                    <p class="text-[11px] font-medium truncate">{{ item.title || 'Untitled' }}</p>
                    <p v-if="item.startDate" class="text-[9px] text-muted-foreground/50 mt-0.5">{{ formatDate(item.startDate) }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="flex items-center justify-center h-full text-xs text-muted-foreground">
              No items
            </div>
          </template>

          <!-- Calendar projection -->
          <template v-else-if="cellView.projection === 'calendar'">
            <div class="flex flex-col h-full overflow-hidden">
              <!-- Month header -->
              <div class="text-center py-1.5 border-b border-border/60 shrink-0">
                <span class="text-[11px] font-medium text-muted-foreground">{{ calendarMonthLabel }}</span>
              </div>
              <!-- Day-of-week header -->
              <div class="grid grid-cols-7 shrink-0 border-b border-border/40">
                <div
                  v-for="dow in ['Su','Mo','Tu','We','Th','Fr','Sa']"
                  :key="dow"
                  class="text-[8px] font-medium text-muted-foreground/50 py-1 text-center border-r border-border/20 last:border-r-0">
                  {{ dow }}
                </div>
              </div>
              <!-- Day grid — fills remaining height -->
              <div
                class="grid grid-cols-7 flex-1 min-h-0"
                :style="{ gridTemplateRows: `repeat(${Math.ceil(calendarDays.length / 7)}, 1fr)` }">
                <div
                  v-for="day in calendarDays"
                  :key="day.key"
                  class="border-r border-b border-border/20 last:border-r-0 flex flex-col min-h-0 overflow-hidden p-0.5"
                  :class="day.inMonth ? 'bg-transparent' : 'bg-muted/10'">
                  <!-- Date number -->
                  <span
                    class="text-[9px] leading-tight shrink-0 px-0.5"
                    :class="day.inMonth ? 'text-foreground/60' : 'text-muted-foreground/20'">
                    {{ day.date }}
                  </span>
                  <!-- Items for this day -->
                  <div v-if="day.inMonth" class="flex-1 overflow-hidden flex flex-col gap-px mt-0.5">
                    <div
                      v-for="item in getItemsForDay(cellItems, calendarMonth.year, calendarMonth.month, day.date).slice(0, 3)"
                      :key="item.id"
                      class="text-[8px] leading-tight truncate rounded px-0.5 py-px cursor-pointer hover:bg-primary/15 transition-colors"
                      :class="(item as Record<string, any>).taskStatus === 'completed' ? 'text-muted-foreground/40 line-through' : 'text-foreground/70 bg-primary/8'"
                      :title="item.title"
                      @click="openDetail(item)">
                      {{ item.title }}
                    </div>
                    <span
                      v-if="getItemsForDay(cellItems, calendarMonth.year, calendarMonth.month, day.date).length > 3"
                      class="text-[7px] text-muted-foreground/50 px-0.5">
                      +{{ getItemsForDay(cellItems, calendarMonth.year, calendarMonth.month, day.date).length - 3 }} more
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Timeline projection -->
          <template v-else-if="cellView.projection === 'timeline'">
            <div v-if="getTimelineItems(cellItems).length" class="relative pl-4">
              <div class="absolute left-[7px] top-2 bottom-2 w-px bg-border/50" />
              <div
                v-for="item in getTimelineItems(cellItems)"
                :key="item.id"
                class="relative flex items-start gap-2 py-1.5 cursor-pointer hover:bg-accent/10 rounded transition-colors"
                @click="openDetail(item)">
                <div class="absolute left-[-13px] top-2.5 w-2 h-2 rounded-full bg-primary/60 border-2 border-card" />
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] font-medium truncate">{{ item.title || 'Untitled' }}</p>
                  <p class="text-[9px] text-muted-foreground/50">{{ item.startDate ? formatDate(item.startDate) : '' }}</p>
                </div>
              </div>
            </div>
            <div v-else class="flex items-center justify-center h-full text-xs text-muted-foreground">
              No dated items
            </div>
          </template>

          <!-- Entity detail projection -->
          <template v-else-if="cellView.projection === 'entity-detail'">
            <GridEntityDetail
              :view="cellView"
              :items="cellItems"
              @open-detail="openDetail" />
          </template>

          <!-- Unimplemented projection placeholder -->
          <template v-else-if="unimplementedProjections[cellView.projection]">
            <div class="flex flex-col items-center justify-center h-full gap-2 text-center p-4">
              <div class="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center">
                <Icon :name="unimplementedProjections[cellView.projection]?.icon || 'lucide:layout-grid'" class="h-4 w-4 text-muted-foreground/40" />
              </div>
              <p class="text-[11px] font-medium text-muted-foreground/60">{{ unimplementedProjections[cellView.projection]?.label || cellView.projection }}</p>
              <p class="text-[9px] text-muted-foreground/40">Coming soon</p>
              <p v-if="cellItems.length" class="text-[9px] text-muted-foreground/30">{{ cellItems.length }} items</p>
            </div>
          </template>

          <!-- Fallback: compact list for any unknown projection -->
          <template v-else>
            <div v-if="cellItems.length" class="space-y-0.5">
              <div
                v-for="item in cellItems"
                :key="item.id"
                class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/20 cursor-pointer transition-colors"
                @click="openDetail(item)">
                <Icon
                  v-if="item.type"
                  :name="entityIcon(item.type)"
                  class="h-3 w-3 text-muted-foreground/50 shrink-0" />
                <span class="text-xs font-medium truncate flex-1">{{ item.title || 'Untitled' }}</span>
                <span v-if="item.startDate" class="text-[10px] text-muted-foreground/40 shrink-0">{{ formatDate(item.startDate) }}</span>
              </div>
            </div>
            <div v-else class="flex items-center justify-center h-full text-xs text-muted-foreground">
              No items
            </div>
          </template>
        </div>
      </template>
    </GridEditor>

    <!-- Entity dialog -->
    <EntityDialog
      v-model:open="viewOpen"
      mode="edit"
      :item="viewingItem"
      @save="handleUpdate"
      @delete="handleDelete"
      @close="viewOpen = false" />
  </Page>

  <!-- ═══════════════════ FULLSCREEN / BROWSE LAYOUT ═══════════════════ -->
  <Page
    v-else
    variant="browse"
    :title="pageTitle"
    subtitle="Page"
    :icon="pageIcon"
    :data-source="dataSource || 'all'"
    search-placeholder="Search..."
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :browse="browseState"
    :view-mode-options="viewModeOptions">

    <!-- ================= GRID VIEW ================= -->
    <template v-if="viewMode === 'grid' || viewMode === 'moodboard'">
      <div :class="viewMode === 'moodboard' ? 'columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'">
        <EntityCard
          v-for="item in (filteredItems as Entity[])"
          :key="item.id"
          :item="item"
          :layout="viewMode === 'moodboard' ? 'moodboard' : 'grid'"
          editable
          :selected="isSelected(item.id)"
          @click="openDetail(item)"
          @select="toggleSelection(item.id, $event)"
          @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item, fieldId, value)" />
        <div v-if="!filteredItems.length" class="col-span-full flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
          <Icon name="lucide:inbox" class="h-6 w-6 text-muted-foreground/50" />
          <p class="text-sm">No items found</p>
        </div>
      </div>
    </template>

    <!-- ================= LIST VIEW ================= -->
    <template v-else-if="viewMode === 'list'">
      <div class="flex flex-col gap-2">
        <EntityCard
          v-for="item in (filteredItems as Entity[])"
          :key="item.id"
          :item="item"
          layout="list"
          editable
          :selected="isSelected(item.id)"
          @click="openDetail(item)"
          @select="toggleSelection(item.id, $event)"
          @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item, fieldId, value)" />
        <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
          No items found
        </div>
      </div>
    </template>

    <!-- ================= TABLE VIEW (default) ================= -->
    <template v-else>
      <div class="overflow-x-auto">
        <table v-if="filteredItems.length" class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/30">
              <th class="text-left px-6 py-2 text-xs font-medium text-muted-foreground">Title</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Type</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Priority</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in (filteredItems as Entity[])"
              :key="row.id"
              class="border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
              @click="openDetail(row)">
              <td class="px-6 py-2.5 font-medium">{{ row.title || 'Untitled' }}</td>
              <td class="px-4 py-2.5">
                <span class="text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{{ row.type }}</span>
              </td>
              <td class="px-4 py-2.5">
                <span v-if="(row as any).taskStatus || (row as any).status" class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-muted/50 text-muted-foreground">
                  {{ (row as any).taskStatus || (row as any).status }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-xs text-muted-foreground">{{ (row as any).priority || '' }}</td>
              <td class="px-4 py-2.5 text-xs text-muted-foreground">{{ row.startDate ? formatDate(row.startDate) : '' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="flex flex-col items-center justify-center py-16">
          <Icon name="lucide:inbox" class="text-muted-foreground h-10 w-10 mb-3" />
          <p class="text-sm text-muted-foreground">No items found</p>
        </div>
      </div>
    </template>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'item' : 'items' }}
    </div>

    <!-- Selection Bar -->
    <EntitySelectionBar
      :selected-items="selectedItems"
      :selection-count="selectionCount"
      @batch-delete="handleBatchDelete"
      @batch-duplicate="handleBatchDuplicate"
      @batch-set-field="handleBatchSetField"
      @clear-selection="clearSelection" />

    <!-- View/Edit Dialog -->
    <EntityDialog
      v-model:open="viewOpen"
      mode="edit"
      :item="viewingItem"
      :can-navigate-prev="canPrev"
      :can-navigate-next="canNext"
      @navigate-prev="navPrev"
      @navigate-next="navNext"
      @save="handleUpdate"
      @delete="handleDelete"
      @close="viewOpen = false" />
  </Page>
</template>
