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
  import { useGridLayout } from '~/composables/useGridLayout'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import GridEditor from '~/components/grid/GridEditor.vue'
  import GridEntityDetail from '~/components/grid/projections/GridEntityDetail.vue'

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
  }

  function navPrev() {
    if (canPrev.value) _viewingItemId.value = filteredItems.value[viewingIndex.value - 1]!.id
  }
  function navNext() {
    if (canNext.value) _viewingItemId.value = filteredItems.value[viewingIndex.value + 1]!.id
  }

  async function handleUpdate(item: Entity) {
    await updateItem(item)
    viewOpen.value = false
  }
  async function handleDelete(item: Entity) {
    await removeItem(item.id)
    viewOpen.value = false
  }

  const stats = computed<PageStat[]>(() => [
    { label: 'Items', value: sourceItems.value.length, icon: 'lucide:layers' },
  ])

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  function entityIcon(type: string): string {
    return getEntityTypeConfig(type as any)?.icon || 'lucide:file'
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

    <!-- Custom inline-editable header (matches Page.vue browse variant spacing) -->
    <div class="shrink-0 space-y-0 pb-0 p-8 pt-4">
      <div class="px-3 py-5 relative border-b border-border/60">
        <div class="relative flex items-start gap-4">
          <!-- Editable icon -->
          <button
            class="shrink-0 mt-1 p-1.5 rounded-lg hover:bg-muted/50 transition-colors group"
            title="Change icon"
            @click="iconPickerOpen = true">
            <Icon :name="pageIcon" class="h-6 w-6 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
          </button>

          <div class="flex-1 min-w-0">
            <!-- Inline title -->
            <input
              v-if="isEditingTitle"
              ref="titleInput"
              v-model="editableTitle"
              class="text-3xl font-semibold bg-transparent border-none outline-none w-full focus:ring-0 placeholder:text-muted-foreground/40 my-2"
              placeholder="Untitled"
              @blur="finishEditingTitle"
              @keydown.enter="finishEditingTitle"
              @keydown.escape="finishEditingTitle" />
            <h1
              v-else
              class="text-foreground text-3xl font-semibold my-2 cursor-text hover:bg-muted/30 rounded px-1 -mx-1 transition-colors truncate"
              @click="startEditingTitle">
              {{ editableTitle || 'Untitled' }}
            </h1>

            <!-- Inline description -->
            <input
              v-if="isEditingDescription"
              ref="descriptionInput"
              v-model="editableDescription"
              class="max-w-2xl text-sm text-muted-foreground bg-transparent border-none outline-none w-full focus:ring-0 placeholder:text-muted-foreground/30"
              placeholder="Add a description..."
              @blur="finishEditingDescription"
              @keydown.enter="finishEditingDescription"
              @keydown.escape="finishEditingDescription" />
            <p
              v-else
              class="max-w-2xl text-sm text-muted-foreground/60 cursor-text hover:bg-muted/30 rounded px-1 -mx-1 transition-colors truncate"
              @click="startEditingDescription">
              {{ editableDescription || 'Add a description...' }}
            </p>
          </div>

          <!-- View count + controls -->
          <div class="flex items-center gap-2 shrink-0 mt-3">
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

        <!-- Templates button (when views exist) -->
        <div v-if="gridHasViews" class="mt-3 pt-3 border-t border-border/30">
          <button
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Icon name="lucide:layout-template" class="h-3.5 w-3.5" />
            Templates
          </button>
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
        <div class="h-full overflow-auto p-3">
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

          <!-- Entity detail projection -->
          <template v-else-if="cellView.projection === 'entity-detail'">
            <GridEntityDetail
              :view="cellView"
              :items="cellItems"
              @open-detail="openDetail" />
          </template>

          <!-- Fallback: compact list for any other projection -->
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
