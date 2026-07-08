<script setup lang="ts">
import type { PageStat } from '~/components/layout/Page.vue'
import type { Entity, EntityType } from '~/types/entity'
import { getEntityTypeConfig } from '~/config/entityRegistry'
import { useOntologyRegistry, type DynamicEntityTypeConfig } from '~/composables/useOntologyRegistry'
import { useBrowsePage } from '~/composables/useBrowsePage'
import { useBrowseAdvancedFilters } from '~/composables/useBrowseAdvancedFilters'
import { useBrowseSelection } from '~/composables/useBrowseSelection'
import ResolvedEntityDialog from '~/components/dialogs/ResolvedEntityDialog.vue'
import ProjectionOutlet from '~/components/views/ProjectionOutlet.vue'
import EntityCardCollection from '~/components/views/EntityCardCollection.vue'
import BrowseImportExportActions from '~/components/browse/BrowseImportExportActions.vue'
import CardPropertiesPopover from '~/components/browse/CardPropertiesPopover.vue'
import FileCategoryPills from '~/components/browse/FileCategoryPills.vue'
import { useViewFields } from '~/composables/useViewFields'
import {
  countFilesByCategory,
  fileMatchesBrowseCategory,
  getFileBrowseFacet,
  parseFileCategoryParam,
  shouldStripFileCategoryParam,
  type FileBrowseCategory,
} from '~/lib/file-browse-categories'
import { normalizeBrowseViewMode } from '~/lib/trellis-projection-registry/browse-view-mode'
import { deduplicateRecurringEntities } from '~/utils/recurrence'
import { createDefaultItem } from '~/types/entity'
import { schemaFieldToPropertyFieldId } from '~/lib/ontology-sidebar-fields'

definePageMeta({ layout: 'default' })
useHead({ title: 'Browse | Workspace' })

// ── Routing ──────────────────────────────────────────────────────────────

const route = useRoute()
const router = useRouter()
const { wp } = useWorkspacePath()

const activeTypeParam = computed(() => (route.query.type as string) || 'all')
const isAllMode = computed(() => activeTypeParam.value === 'all')
const isFileBrowse = computed(() => activeTypeParam.value === 'file')
const { getEntityConfig, browseableTypes } = useOntologyRegistry()

const rawCategoryParam = computed(() => {
  const c = route.query.category
  return typeof c === 'string' ? c : undefined
})

const activeFileCategory = computed<FileBrowseCategory>(() => {
  if (!isFileBrowse.value) return 'all'
  return parseFileCategoryParam(rawCategoryParam.value)
})

// Browse-visible types (static registry + live user ontologies)
const browseEntityTypes = computed(() => browseableTypes.value)
const ALL_TYPE_IDS = computed(() => browseEntityTypes.value.map((t) => t.type) as EntityType[])

// The type(s) fed into useBrowsePage
const activeTypes = computed<string[]>(() => (isAllMode.value ? ALL_TYPE_IDS.value : [activeTypeParam.value]))

const fileCategoryFilterKey = computed(
  () => `${activeTypeParam.value}:${activeFileCategory.value}`,
)

function selectType(type: string) {
  const q = type === 'all' ? {} : { type }
  router.replace({ query: q })
}

function selectFileCategory(category: FileBrowseCategory) {
  if (!isFileBrowse.value) return
  const query: Record<string, string> = { type: 'file' }
  if (category !== 'all') query.category = category
  router.replace({ query })
}

watch([activeTypeParam, rawCategoryParam], ([type, rawCat]) => {
  if (type === 'budget') {
    router.replace(wp('/sheets'))
    return
  }
  if (shouldStripFileCategoryParam(type, rawCat)) {
    const next = { ...route.query }
    delete next.category
    router.replace({ query: next })
  }
})

// ── Browse data ───────────────────────────────────────────────────────────

const {
  items,
  allItems,
  filteredItems,
  browseState,
  viewMode,
  viewOpen,
  viewingItem,
  openDetail,
  handleNewItem,
  canPrev,
  canNext,
  navPrev,
  navNext,
  handleUpdate,
  handleDelete,
} = useBrowsePage({
  entityType: activeTypes,
  searchFields: ['title', 'description', 'content'],
  defaultViewMode: 'grid',
  sortOptions: [
    { value: 'updatedAt', label: 'Last Updated' },
    { value: 'startDate', label: 'Date' },
    { value: 'title', label: 'Title' },
    { value: 'type', label: 'Type' },
  ],
  itemFilterKey: fileCategoryFilterKey,
  itemFilter: (item) => {
    if (activeTypeParam.value !== 'file') return true
    return fileMatchesBrowseCategory(item as unknown as Record<string, unknown>, activeFileCategory.value)
  },
})

// ── Advanced filters ────────────────────────────────────────────────────

const { advancedFilters, applyAdvancedFilters } = useBrowseAdvancedFilters({
  entityTypes: activeTypes,
})

const displayItems = computed(() => applyAdvancedFilters(filteredItems.value))

// ── Multi-select ─────────────────────────────────────────────────────────

const {
  isSelected,
  toggle: toggleSelection,
  selectAll,
  clearSelection,
  selectedItems,
  selectionCount,
  handleFieldUpdate,
  handleBatchDelete,
  handleBatchDuplicate,
} = useBrowseSelection(displayItems)

const gridColsKey = computed(() => activeTypeParam.value)
const { columns: gridColumns, gridStyle, increment: incrementGridColumns, decrement: decrementGridColumns, minCols, maxCols } =
  useBrowseGridColumns(gridColsKey)

const cardPropsKey = computed(() => activeTypeParam.value)
const {
  catalog: viewFieldCatalog,
  popoverFields: cardPopoverFields,
  visibleFields,
  showEmptyProperties,
  hiddenCount: hiddenCardPropertyCount,
  setVisible: setCardPropertyVisible,
  move: moveCardProperty,
  setShowEmpty: setCardShowEmpty,
  reset: resetCardProperties,
} = useViewFields(cardPropsKey, activeTypeParam)

const { update: updateEntity, create: createEntity } = useEntities()

const handleSpreadsheetCellUpdate = async (item: Entity, column: string, value: unknown) => {
  if (column === 'title') {
    await updateEntity({ ...item, title: String(value ?? '').trim() || 'Untitled' })
    return
  }
  if (column === 'startDate') {
    const patch = value as { startDate: string; startTime?: string; allDay?: boolean }
    await updateEntity({
      ...item,
      startDate: (patch.startDate || null) as Entity['startDate'],
      ...(patch.allDay !== undefined ? { allDay: patch.allDay } : {}),
      ...(patch.startTime !== undefined ? { startTime: patch.startTime } : {}),
    })
    return
  }
  const propertyFieldId = schemaFieldToPropertyFieldId(column)
  if (propertyFieldId) {
    await handleFieldUpdate(item, propertyFieldId, value)
    return
  }
  await updateEntity({ ...item, [column]: value })
}

const toggleSelectAll = () => {
  const all = displayItems.value.length > 0 && displayItems.value.every((item) => isSelected(item.id))
  if (all) clearSelection()
  else selectAll()
}

// ── Type filter pills ─────────────────────────────────────────────────────

// Deduplicated view of all items for accurate sidebar counts
const deduplicatedAll = computed(() => deduplicateRecurringEntities(allItems.value))

// Count entities by type — uses deduplicated list so recurring series count as 1
const typeCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const item of deduplicatedAll.value) {
    counts[item.type] = (counts[item.type] || 0) + 1
  }
  return counts
})

const totalCount = computed(() => deduplicatedAll.value.length)

const fileItemsForCounts = computed(() =>
  deduplicatedAll.value.filter((item) => item.type === 'file'),
)
const fileCategoryCounts = computed(() => countFilesByCategory(fileItemsForCounts.value))

// ── Grouping ──────────────────────────────────────────────────────────────

const groupByClass = ref(false)

const CLASS_META: Record<string, { label: string; icon: string; color: string }> = {
  temporal: { label: 'Scheduled', icon: 'lucide:calendar', color: 'text-blue-400' },
  document: { label: 'Documents', icon: 'lucide:file-text', color: 'text-purple-400' },
  actor: { label: 'People & Orgs', icon: 'lucide:users', color: 'text-emerald-400' },
  container: { label: 'Containers', icon: 'lucide:folder', color: 'text-amber-400' },
}

const classOrder = ['temporal', 'document', 'actor', 'container']

const groupedItems = computed(() => {
  if (!groupByClass.value || !isAllMode.value) return null
  const groups: Record<string, Entity[]> = {}
  for (const item of displayItems.value) {
    const cls = (getEntityTypeConfig(item.type as EntityType) as any)?.class ?? 'temporal'
    if (!groups[cls]) groups[cls] = []
    groups[cls].push(item)
  }
  return classOrder
    .filter((cls) => (groups[cls]?.length ?? 0) > 0)
    .map((cls) => ({ class: cls, ...CLASS_META[cls], items: groups[cls] ?? [] }))
})

// ── Lazy load / infinite scroll ───────────────────────────────────────────

const PAGE_SIZE = 48
const displayLimit = ref(PAGE_SIZE)
const sentinelRef = ref<HTMLElement | null>(null)

const visibleItems = computed(() => displayItems.value.slice(0, displayLimit.value))

const visibleGroupedItems = computed(() => {
  if (!groupedItems.value) return null
  let remaining = displayLimit.value
  return groupedItems.value.map((g) => {
    const take = Math.max(0, remaining)
    const slice = g.items.slice(0, take)
    remaining -= slice.length
    return { ...g, items: slice }
  })
})

const hasMore = computed(() => displayLimit.value < displayItems.value.length)

watch(
  [
    () => browseState.searchQuery.value,
    activeTypeParam,
    activeFileCategory,
    viewMode,
    groupByClass,
    () => advancedFilters.value?.activeRuleCount.value,
  ],
  () => {
    displayLimit.value = PAGE_SIZE
  },
)

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let cur = el?.parentElement || null
  while (cur) {
    const { overflowY } = getComputedStyle(cur)
    if (overflowY === 'auto' || overflowY === 'scroll') return cur
    cur = cur.parentElement
  }
  return null
}

let scrollObserver: IntersectionObserver | null = null

watch(sentinelRef, (el) => {
  scrollObserver?.disconnect()
  scrollObserver = null
  if (!el || typeof IntersectionObserver === 'undefined') return
  const root = findScrollParent(el)
  scrollObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && hasMore.value) {
          displayLimit.value += PAGE_SIZE
        }
      }
    },
    { root, rootMargin: '400px' },
  )
  scrollObserver.observe(el)
})

onUnmounted(() => {
  scrollObserver?.disconnect()
  scrollObserver = null
})

// ── Adaptive view modes ───────────────────────────────────────────────────

const activeProjectionTypeConfig = computed(() =>
  isAllMode.value ? null : getEntityConfig(activeTypeParam.value),
)

const activeProjectionSchemaFields = computed(() => {
  const cfg = activeProjectionTypeConfig.value
  if (!cfg) return undefined
  if ('fields' in cfg) return cfg.fields
  return cfg.propertyFields
})

const HIDDEN_BROWSE_PROJECTIONS = new Set(['list', 'graph', 'timeline'])

const { projectionOptions: rawProjectionOptions, defaultViewMode } = useProjectionOptions({
  activeType: activeTypeParam,
  activeTypeConfig: activeProjectionTypeConfig,
  schemaFields: activeProjectionSchemaFields,
})

const viewModeOptions = computed(() =>
  rawProjectionOptions.value.filter((option) => !HIDDEN_BROWSE_PROJECTIONS.has(option.projectionType)),
)

watch([viewModeOptions, defaultViewMode], () => {
  const currentOption = viewModeOptions.value.find((option) => option.mode === viewMode.value)
  if (!currentOption || currentOption.disabled) browseState.setViewMode(defaultViewMode.value)
}, { immediate: true })

// Legacy: spreadsheet mode merged into table
watch(viewMode, (mode) => {
  if (mode === 'spreadsheet') browseState.setViewMode('table')
}, { immediate: true })

// ── Projection dispatch ─────────────────────────────────────────────────────
// Normalize the legacy view mode to the canonical ProjectionType (+ sub-mode)
// that ProjectionOutlet renders. See docs/artifacts/view_projections_design.md.
const projection = computed(() => normalizeBrowseViewMode(viewMode.value))
const CARD_PROJECTIONS = ['card-grid', 'list', 'moodboard']
const isCardProjection = computed(() => CARD_PROJECTIONS.includes(projection.value.type))
// Card layouts paginate via displayLimit; table/graph render the full set.
const outletItems = computed(() => (isCardProjection.value ? visibleItems.value : displayItems.value))
const isTableProjection = computed(
  () => projection.value.type === 'table' || projection.value.type === 'spreadsheet',
)
const isKanbanProjection = computed(() => projection.value.type === 'kanban')
const isCalendarProjection = computed(
  () => projection.value.type === 'calendar' || projection.value.type === 'timeline',
)
const emptyMessage = computed(() => {
  if (advancedFilters.value?.hasActiveFilters.value) return 'No results match your filters'
  if (browseState.searchQuery.value) return 'No results for your search'
  if (isFileBrowse.value && activeFileCategory.value !== 'all') {
    const facet = getFileBrowseFacet(activeFileCategory.value)
    return `No ${facet?.labelPlural.toLowerCase() ?? 'files'} yet`
  }
  return 'Nothing here yet'
})
// Card layout for the class-grouped path (grouping is orthogonal to layout).
const groupedCardLayout = computed<'card-grid' | 'list' | 'moodboard'>(() =>
  isCardProjection.value ? (projection.value.type as 'card-grid' | 'list' | 'moodboard') : 'card-grid',
)

// ── Stats ─────────────────────────────────────────────────────────────────

const stats = computed<PageStat[]>(() => {
  if (isAllMode.value) {
    const classCounts = { temporal: 0, document: 0, actor: 0, container: 0 } as Record<string, number>
    for (const item of deduplicatedAll.value) {
      const cls = (getEntityTypeConfig(item.type as EntityType) as any)?.class
      if (cls) classCounts[cls] = (classCounts[cls] ?? 0) + 1
    }
    return [
      { label: 'All', value: totalCount.value, icon: 'lucide:layers' },
      { label: 'Scheduled', value: classCounts.temporal || 0, icon: 'lucide:calendar', color: 'text-blue-400' },
      { label: 'Documents', value: classCounts.document || 0, icon: 'lucide:file-text', color: 'text-purple-400' },
      { label: 'People', value: classCounts.actor || 0, icon: 'lucide:users', color: 'text-emerald-400' },
      { label: 'Containers', value: classCounts.container || 0, icon: 'lucide:folder', color: 'text-amber-400' },
    ]
  }
  const cfg = getEntityTypeConfig(activeTypeParam.value as EntityType)
  if (isFileBrowse.value && activeFileCategory.value !== 'all') {
    const facet = getFileBrowseFacet(activeFileCategory.value)
    return [
      {
        label: facet?.labelPlural ?? 'Files',
        value: displayItems.value.length,
        icon: facet?.icon ?? cfg?.icon ?? 'lucide:file',
      },
    ]
  }
  return [{ label: cfg?.labelPlural ?? 'Items', value: items.value.length, icon: cfg?.icon ?? 'lucide:layers' }]
})

// ── New item picker ───────────────────────────────────────────────────────

const newPickerOpen = ref(false)

async function handleCalendarCreate(date: Date) {
  if (isAllMode.value) return
  const type = activeTypeParam.value as EntityType
  const defaults = createDefaultItem(type)
  const newId = await createEntity({
    ...defaults,
    type,
    title: '',
    startDate: date.toISOString().slice(0, 10),
  } as Entity)
  const created = items.value.find((item) => item.id === newId)
  if (created) openDetail(created)
}

async function handleCalendarReschedule(item: Entity, patch: Partial<Entity>) {
  await updateEntity({ ...item, ...patch } as Entity)
}

async function handleNewFromPill(typeId: string) {
  newPickerOpen.value = false
  await handleNewItem(typeId)
}

// ── Page title ────────────────────────────────────────────────────────────

const pageTitle = computed(() => {
  if (isAllMode.value) return 'Browse'
  if (isFileBrowse.value && activeFileCategory.value !== 'all') {
    return getFileBrowseFacet(activeFileCategory.value)?.labelPlural ?? 'Files'
  }
  const cfg = getEntityTypeConfig(activeTypeParam.value as EntityType)
  return cfg?.labelPlural ?? activeTypeParam.value
})

const pageIcon = computed(() => {
  if (isAllMode.value) return 'lucide:layers-3'
  const cfg = getEntityTypeConfig(activeTypeParam.value as EntityType)
  return cfg?.icon ?? 'lucide:layers'
})

const pageIconClass = computed(() => {
  if (isAllMode.value) return 'text-primary/70'
  const cfg = getEntityTypeConfig(activeTypeParam.value as EntityType)
  return cfg ? `text-${cfg.color}-400` : 'text-muted-foreground'
})

// ── Active type label helpers ─────────────────────────────────────────────

const activeTypeCfg = computed(() =>
  isAllMode.value ? null : getEntityTypeConfig(activeTypeParam.value as EntityType),
)

/** Server-backed ontology for the active type — drives schema deep-link. */
const activeTypeSchema = computed((): DynamicEntityTypeConfig | null => {
  if (isAllMode.value) return null
  const cfg = getEntityConfig(activeTypeParam.value)
  if (cfg && 'schemaId' in cfg) return cfg as DynamicEntityTypeConfig
  return null
})

const schemaEditorPath = computed(() =>
  activeTypeSchema.value ? `/ontologies/${activeTypeParam.value}` : null,
)

const schemaEditorLabel = computed(() =>
  activeTypeSchema.value?.tier === 'user' ? 'Configure fields' : 'View schema',
)

const pageDescription = computed(() => {
  if (isAllMode.value) return 'Browse all entities across your workspace.'
  return activeTypeCfg.value?.description ?? ''
})

// ── Sidebar injection ─────────────────────────────────────────────────────

const pageSidebar = usePageSidebar()

watch(typeCounts, (counts) => pageSidebar.updateCounts(counts))
watch(activeTypeParam, (id) => pageSidebar.updateActiveType(id))

onMounted(() => {
  pageSidebar.activate(typeCounts.value, activeTypeParam.value, selectType)
})
onUnmounted(() => {
  pageSidebar.deactivate()
})
</script>

<template>
  <Page variant="browse" :title="pageTitle" subtitle="Workspace" :icon="pageIcon" :icon-class="pageIconClass"
    search-placeholder="Search everything..." :description="pageDescription" :hide-header="false" :stats="stats"
    :show-view-switcher="true" :fill-height="true" :browse="browseState" :advanced-filters="advancedFilters ?? undefined"
    :view-mode-options="viewModeOptions">
    <template #titleActions>
      <NuxtLink
        v-if="schemaEditorPath"
        :to="schemaEditorPath"
        class="shrink-0"
        :title="schemaEditorLabel">
        <UiButton variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Icon name="lucide:settings" class="h-4 w-4" />
          <span class="sr-only">{{ schemaEditorLabel }}</span>
        </UiButton>
      </NuxtLink>
    </template>

    <FileCategoryPills
      v-if="isFileBrowse"
      class="mb-3 shrink-0"
      :active="activeFileCategory"
      :counts="fileCategoryCounts"
      @select="selectFileCategory" />

    <!-- ── Toolbar: New button + Group toggle ── -->
    <template #toolbarActions>
      <BrowseImportExportActions
        :items="displayItems"
        :selected-items="selectedItems"
        :filename-slug="`browse-${activeTypeParam}`" />

      <!-- Single type: simple New button -->
      <UiButton size="sm" class="font-bold" v-if="!isAllMode && activeTypeCfg" @click="handleNewItem(activeTypeParam)">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New
      </UiButton>

      <!-- All mode: New with type picker dropdown -->
      <UiDropdownMenu v-else-if="isAllMode" v-model:open="newPickerOpen">
        <UiDropdownMenuTrigger as-child>
          <UiButton>
            <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
            New
            <Icon name="lucide:chevron-down" class="ml-1 h-3.5 w-3.5 opacity-70" />
          </UiButton>
        </UiDropdownMenuTrigger>
        <UiDropdownMenuContent align="end" class="w-56 max-h-80 overflow-y-auto">
          <UiDropdownMenuLabel class="text-xs text-muted-foreground uppercase tracking-wide">
            Create new…
          </UiDropdownMenuLabel>
          <UiDropdownMenuSeparator />
          <UiDropdownMenuItem v-for="t in browseEntityTypes" :key="t.type" class="gap-2"
            @click="handleNewFromPill(t.type)">
            <Icon :name="t.icon" :class="`h-4 w-4 text-${t.color}-400 shrink-0`" />
            <span>{{ t.label }}</span>
          </UiDropdownMenuItem>
        </UiDropdownMenuContent>
      </UiDropdownMenu>
    </template>

    <!-- Grid column count (grid view only) -->
    <template #beforeSearch>
      <div
        v-if="viewMode === 'grid'"
        class="flex items-center rounded-lg border border-border bg-card/0 backdrop-blur-lg shrink-0"
        title="Grid columns">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          :disabled="gridColumns <= minCols"
          aria-label="Fewer columns"
          @click="decrementGridColumns">
          <Icon name="lucide:minus" class="h-3.5 w-3.5" />
        </button>
        <div
          class="flex h-8 items-center gap-1.5 border-x border-border px-2.5 text-xs font-medium tabular-nums text-foreground">
          <Icon name="lucide:columns-3" class="h-3.5 w-3.5 text-muted-foreground" />
          {{ gridColumns }}
        </div>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          :disabled="gridColumns >= maxCols"
          aria-label="More columns"
          @click="incrementGridColumns">
          <Icon name="lucide:plus" class="h-3.5 w-3.5" />
        </button>
      </div>
    </template>

    <!-- Card properties -->
    <template #filters>
      <CardPropertiesPopover
        v-if="isCardProjection"
        :fields="cardPopoverFields"
        :visible="visibleFields"
        :show-empty="showEmptyProperties"
        :hidden-count="hiddenCardPropertyCount"
        @update:visible="setCardPropertyVisible"
        @move="moveCardProperty"
        @update:show-empty="setCardShowEmpty"
        @reset="resetCardProperties" />


    </template>

    <!-- ── Content: grouped / flat, dispatched by projection ── -->

    <!-- Grouped by class (card layouts only) — grouping is orthogonal to layout.
         Graph/table fall through to the flat outlet. -->
    <template v-if="groupByClass && visibleGroupedItems && isCardProjection">
      <div v-for="group in visibleGroupedItems" :key="group.class" class="mb-8">
        <!-- Group header -->
        <div class="flex items-center gap-2 mb-3">
          <Icon :name="group.icon || 'lucide:circle'" :class="`h-4 w-4 shrink-0 ${group.color || ''}`" />
          <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{ group.label }}</span>
          <span class="text-xs text-muted-foreground/60 tabular-nums">({{ group.items.length }})</span>
          <div class="flex-1 h-px bg-border/50 ml-2" />
        </div>

        <EntityCardCollection
          :items="group.items"
          :layout="groupedCardLayout"
          :is-selected="isSelected"
          :grid-style="gridStyle"
          :visible-fields="visibleFields"
          :field-catalog="viewFieldCatalog"
          :show-empty-properties="showEmptyProperties"
          @open-detail="openDetail"
          @toggle-select="toggleSelection"
          @field-update="handleFieldUpdate"
          @column-update="handleSpreadsheetCellUpdate" />
      </div>

      <div v-if="displayItems.length === 0"
        class="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <Icon name="lucide:search-x" class="h-8 w-8 text-muted-foreground/30" />
        <p class="text-sm">No results</p>
      </div>
    </template>

    <!-- Flat views — dispatched to the matching projection renderer -->
    <template v-else>
      <div :class="isTableProjection || isKanbanProjection || isCalendarProjection ? 'flex min-h-0 flex-1 flex-col' : ''">
        <ProjectionOutlet
          :type="projection.type"
          :sub="projection.sub"
          :items="outletItems"
          :entity-type="isAllMode ? undefined : activeTypeParam"
          :is-selected="isSelected"
          :grid-style="gridStyle"
          :storage-key="`browse:table:${activeTypeParam}`"
          :empty-message="emptyMessage"
          :visible-fields="visibleFields"
          :field-catalog="viewFieldCatalog"
          :show-empty-properties="showEmptyProperties"
          @open-detail="openDetail"
          @toggle-select="toggleSelection"
          @toggle-select-all="toggleSelectAll"
          @field-update="handleFieldUpdate"
          @column-update="handleSpreadsheetCellUpdate"
          @cell-update="handleSpreadsheetCellUpdate"
          @calendar-create="handleCalendarCreate"
          @calendar-reschedule="handleCalendarReschedule">
          <template #empty>
            <Icon name="lucide:search-x" class="h-6 w-6 text-muted-foreground/30" />
            <p class="text-sm">{{ emptyMessage }}</p>
            <UiButton v-if="!isAllMode && activeTypeCfg" size="sm" variant="outline"
              @click="handleNewItem(activeTypeParam)">
              <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
              New
            </UiButton>
          </template>
        </ProjectionOutlet>
      </div>
    </template>

    <!-- Infinite-scroll sentinel — loads next page when it enters the viewport -->
    <div
      v-if="isCardProjection && hasMore"
      ref="sentinelRef"
      class="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
      <Icon name="lucide:loader-2" class="h-3.5 w-3.5 animate-spin opacity-60" />
      Loading more…
    </div>

    <!-- Results count (hidden in graph mode since the graph has its own stats badge) -->
    <div
      v-if="projection.type !== 'graph'"
      class="text-xs text-muted-foreground shrink-0 border-t border-border"
      :class="isTableProjection ? 'px-4 py-2' : 'mt-4 pt-4 pb-10'">
      <template v-if="isTableProjection">
        {{ displayItems.length }} {{ displayItems.length === 1 ? 'item' : 'items' }}
      </template>
      <template v-else>
        Showing {{ Math.min(displayLimit, displayItems.length) }} of {{ displayItems.length }}
        {{ displayItems.length === 1 ? 'item' : 'items' }}
      </template>
      <span v-if="browseState.searchQuery.value">for "{{ browseState.searchQuery.value }}"</span>
      <span v-if="advancedFilters?.hasActiveFilters.value"> · filtered</span>
    </div>

    <!-- Selection Bar -->
    <EntitySelectionBar :selected-items="selectedItems" :selection-count="selectionCount"
      @batch-delete="handleBatchDelete" @batch-duplicate="handleBatchDuplicate" @clear-selection="clearSelection" />

    <!-- View / Edit Dialog -->
    <ResolvedEntityDialog v-model:open="viewOpen" mode="edit" :item="viewingItem" :can-navigate-prev="canPrev"
      :can-navigate-next="canNext" @navigate-prev="navPrev" @navigate-next="navNext" @save="handleUpdate"
      @delete="handleDelete" @close="viewOpen = false" />
  </Page>
</template>
