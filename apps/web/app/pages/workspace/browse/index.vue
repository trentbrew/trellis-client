<script setup lang="ts">
import type { PageStat } from '~/components/layout/Page.vue'
import type { Entity, EntityType, PropertyFieldId } from '~/types/entity'
import type { BrowseViewMode } from '~/composables/useBrowse'
import { getAllEntityTypes, getEntityTypeConfig } from '~/config/entityRegistry'
import { useBrowsePage } from '~/composables/useBrowsePage'
import { useBrowseSelection } from '~/composables/useBrowseSelection'
import EntityDialog from '~/components/dialogs/EntityDialog.vue'
import GraphView from '~/components/views/GraphView.vue'
import BrowseSpreadsheetView from '~/components/views/BrowseSpreadsheetView.vue'
import { deduplicateRecurringEntities } from '~/utils/recurrence'

definePageMeta({ layout: 'default' })
useHead({ title: 'Browse | Workspace' })

// ── Routing ──────────────────────────────────────────────────────────────

const route = useRoute()
const router = useRouter()

const activeTypeParam = computed(() => (route.query.type as string) || 'all')
const isAllMode = computed(() => activeTypeParam.value === 'all')

// All static entity type configs for pill bar
const allEntityTypes = getAllEntityTypes()
const ALL_TYPE_IDS = allEntityTypes.map((t) => t.type) as EntityType[]

// The type(s) fed into useBrowsePage
const activeTypes = computed<string[]>(() => (isAllMode.value ? ALL_TYPE_IDS : [activeTypeParam.value]))

function selectType(type: string) {
  const q = type === 'all' ? {} : { type }
  router.replace({ query: q })
}

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
})

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
} = useBrowseSelection(filteredItems)

const { update: updateEntity } = useEntities()

type SpreadsheetColumn = 'title' | 'type' | 'status' | 'date'

const handleSpreadsheetCellUpdate = async (item: Entity, column: SpreadsheetColumn, value: unknown) => {
  if (column === 'title') {
    await updateEntity({ ...item, title: String(value ?? '').trim() || 'Untitled' })
    return
  }
  if (column === 'status') {
    await handleFieldUpdate(item, 'status', value)
    return
  }
  if (column === 'date') {
    const patch = value as { startDate: string; startTime?: string; allDay?: boolean }
    await updateEntity({
      ...item,
      startDate: patch.startDate || null,
      ...(patch.allDay !== undefined ? { allDay: patch.allDay } : {}),
      ...(patch.startTime !== undefined ? { startTime: patch.startTime } : {}),
    })
  }
}

const toggleSelectAll = () => {
  const all = filteredItems.value.length > 0 && filteredItems.value.every((item) => isSelected(item.id))
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
  for (const item of filteredItems.value) {
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

const visibleItems = computed(() => filteredItems.value.slice(0, displayLimit.value))

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

const hasMore = computed(() => displayLimit.value < filteredItems.value.length)

watch([() => browseState.searchQuery.value, activeTypeParam, viewMode, groupByClass], () => {
  displayLimit.value = PAGE_SIZE
})

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

const viewModeOptions = computed(() => {
  const base: { mode: BrowseViewMode; label: string; icon: string }[] = [
    { mode: 'grid', label: 'Grid', icon: 'lucide:grid-3x3' },
    { mode: 'table', label: 'Table', icon: 'lucide:table' },
    // { mode: 'list', label: 'List', icon: 'lucide:list' },
    // { mode: 'graph', label: 'Graph', icon: 'lucide:git-fork' },
  ]
  if (isAllMode.value) return base
  const cfg = getEntityTypeConfig(activeTypeParam.value as EntityType)
  if (!cfg) return base
  const extra: { mode: BrowseViewMode; label: string; icon: string }[] = []
  // Kanban / timeline are wired on collections; browse slots not implemented yet — omit to avoid grid fallback.
  if (cfg.projections.includes('moodboard'))
    extra.push({ mode: 'moodboard', label: 'Moodboard', icon: 'lucide:layout-masonry' })
  return [...base, ...extra]
})

// Legacy: spreadsheet mode merged into table
watch(viewMode, (mode) => {
  if (mode === 'spreadsheet') browseState.setViewMode('table')
}, { immediate: true })

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
  return [{ label: cfg?.labelPlural ?? 'Items', value: items.value.length, icon: cfg?.icon ?? 'lucide:layers' }]
})

// ── New item picker ───────────────────────────────────────────────────────

const newPickerOpen = ref(false)

async function handleNewFromPill(typeId: string) {
  newPickerOpen.value = false
  await handleNewItem(typeId)
}

// ── Page title ────────────────────────────────────────────────────────────

const pageTitle = computed(() => {
  if (isAllMode.value) return 'Browse'
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
    :show-view-switcher="true" :fill-height="true" :browse="browseState" :view-mode-options="viewModeOptions">
    <!-- ── Toolbar: New button + Group toggle ── -->
    <template #toolbarActions>
      <!-- Single type: simple New button -->
      <UiButton size="sm" class="font-bold" v-if="!isAllMode && activeTypeCfg" @click="handleNewItem(activeTypeParam)">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New {{ activeTypeCfg.label }}
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
          <UiDropdownMenuItem v-for="t in allEntityTypes" :key="t.type" class="gap-2"
            @click="handleNewFromPill(t.type)">
            <Icon :name="t.icon" :class="`h-4 w-4 text-${t.color}-400 shrink-0`" />
            <span>{{ t.label }}</span>
          </UiDropdownMenuItem>
        </UiDropdownMenuContent>
      </UiDropdownMenu>
    </template>

    <!-- ── Content: graph / grouped / flat ── -->

    <!-- Graph view — takes precedence over grouping since a graph is one canvas -->
    <template v-if="viewMode === 'graph'">
      <div class="h-[calc(100vh-200px)] -mx-4 -mb-4 rounded-lg border border-border/50 bg-card/30 overflow-hidden">
        <GraphView :entities="filteredItems" @open-entity="openDetail" />
      </div>
    </template>

    <!-- Grouped by class view -->
    <template v-else-if="groupByClass && visibleGroupedItems">
      <div v-for="group in visibleGroupedItems" :key="group.class" class="mb-8">
        <!-- Group header -->
        <div class="flex items-center gap-2 mb-3">
          <Icon :name="group.icon || 'lucide:circle'" :class="`h-4 w-4 shrink-0 ${group.color || ''}`" />
          <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{{ group.label }}</span>
          <span class="text-xs text-muted-foreground/60 tabular-nums">({{ group.items.length }})</span>
          <div class="flex-1 h-px bg-border/50 ml-2" />
        </div>

        <!-- Grid view for group -->
        <div v-if="viewMode === 'grid' || !['grid', 'list', 'table'].includes(viewMode)"
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <EntityCard v-for="item in group.items" :key="item.id" :item="item" layout="grid" editable
            :selected="isSelected(item.id)" @click="openDetail(item)" @select="toggleSelection(item.id, $event)"
            @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item, fieldId, value)" />
        </div>

        <!-- List view for group -->
        <div v-else-if="viewMode === 'list'" class="flex flex-col gap-2">
          <EntityCard v-for="item in group.items" :key="item.id" :item="item" layout="list" editable
            :selected="isSelected(item.id)" @click="openDetail(item)" @select="toggleSelection(item.id, $event)"
            @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item, fieldId, value)" />
        </div>
      </div>

      <div v-if="filteredItems.length === 0"
        class="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <Icon name="lucide:search-x" class="h-8 w-8 text-muted-foreground/30" />
        <p class="text-sm">No results</p>
      </div>
    </template>

    <!-- Flat views (no grouping, or single type selected) -->
    <template v-else :class="viewMode === 'table' ? 'flex min-h-0 flex-1 flex-col' : ''">
      <!-- Grid -->
      <div v-if="viewMode === 'grid' || !['grid', 'list', 'table', 'moodboard'].includes(viewMode)"
        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <EntityCard v-for="item in visibleItems" :key="item.id" :item="item" layout="grid" editable
          :selected="isSelected(item.id)" @click="openDetail(item)" @select="toggleSelection(item.id, $event)"
          @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item, fieldId, value)" />
        <div v-if="!filteredItems.length"
          class="col-span-full flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
          <Icon name="lucide:search-x" class="h-6 w-6 text-muted-foreground/30" />
          <p class="text-sm">{{ browseState.searchQuery.value ? 'No results for your search' : 'Nothing here yet' }}</p>
          <UiButton v-if="!isAllMode && activeTypeCfg" size="sm" variant="outline"
            @click="handleNewItem(activeTypeParam)">
            <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
            New {{ activeTypeCfg.label }}
          </UiButton>
        </div>
      </div>

      <!-- Moodboard -->
      <div v-else-if="viewMode === 'moodboard'" class="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4">
        <EntityCard v-for="item in visibleItems" :key="item.id" :item="item" layout="moodboard" editable
          :selected="isSelected(item.id)" @click="openDetail(item)" @select="toggleSelection(item.id, $event)"
          @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item, fieldId, value)" />
        <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
          Nothing here yet
        </div>
      </div>

      <!-- List -->
      <div v-else-if="viewMode === 'list'" class="flex flex-col gap-2">
        <EntityCard v-for="item in visibleItems" :key="item.id" :item="item" layout="list" editable
          :selected="isSelected(item.id)" @click="openDetail(item)" @select="toggleSelection(item.id, $event)"
          @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item, fieldId, value)" />
        <div v-if="!filteredItems.length"
          class="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
          <Icon name="lucide:search-x" class="h-6 w-6 text-muted-foreground/30" />
          <p class="text-sm">{{ browseState.searchQuery.value ? 'No results for your search' : 'Nothing here yet' }}</p>
        </div>
      </div>

      <!-- Table (virtualized grid) -->
      <div v-else-if="viewMode === 'table'" class="flex min-h-0 flex-1 flex-col">
        <BrowseSpreadsheetView
          class="min-h-0 flex-1"
          :items="filteredItems"
          :is-selected="isSelected"
          :storage-key="`browse:table:${activeTypeParam}`"
          @toggle-select="toggleSelection"
          @toggle-select-all="toggleSelectAll"
          @open-detail="openDetail"
          @cell-update="handleSpreadsheetCellUpdate" />
      </div>
    </template>

    <!-- Infinite-scroll sentinel — loads next page when it enters the viewport -->
    <div
      v-if="viewMode !== 'graph' && viewMode !== 'table' && hasMore"
      ref="sentinelRef"
      class="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
      <Icon name="lucide:loader-2" class="h-3.5 w-3.5 animate-spin opacity-60" />
      Loading more…
    </div>

    <!-- Results count (hidden in graph mode since the graph has its own stats badge) -->
    <div
      v-if="viewMode !== 'graph'"
      class="text-xs text-muted-foreground shrink-0 border-t border-border"
      :class="viewMode === 'table' ? 'px-4 py-2' : 'mt-4 pt-4 pb-10'">
      <template v-if="viewMode === 'table'">
        {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'item' : 'items' }}
      </template>
      <template v-else>
        Showing {{ Math.min(displayLimit, filteredItems.length) }} of {{ filteredItems.length }}
        {{ filteredItems.length === 1 ? 'item' : 'items' }}
      </template>
      <span v-if="browseState.searchQuery.value">for "{{ browseState.searchQuery.value }}"</span>
    </div>

    <!-- Selection Bar -->
    <EntitySelectionBar :selected-items="selectedItems" :selection-count="selectionCount"
      @batch-delete="handleBatchDelete" @batch-duplicate="handleBatchDuplicate" @clear-selection="clearSelection" />

    <!-- View / Edit Dialog -->
    <EntityDialog v-model:open="viewOpen" mode="edit" :item="viewingItem" :can-navigate-prev="canPrev"
      :can-navigate-next="canNext" @navigate-prev="navPrev" @navigate-next="navNext" @save="handleUpdate"
      @delete="handleDelete" @close="viewOpen = false" />
  </Page>
</template>
