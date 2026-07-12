<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import type { DynamicEntityTypeConfig } from '~/composables/useOntologyRegistry'
  import { useBrowsePage } from '~/composables/useBrowsePage'
  import { useBrowseAdvancedFilters } from '~/composables/useBrowseAdvancedFilters'
  import { useBrowseSelection } from '~/composables/useBrowseSelection'
  import DynamicEntityDialog from '~/components/dialogs/DynamicEntityDialog.vue'
  import GraphView from '~/components/views/GraphView.vue'
  import EntityCard from '~/components/entity/cards/EntityCard.vue'
  import BrowseSpreadsheetView from '~/components/views/BrowseSpreadsheetView.vue'
  import BrowseKanbanView from '~/components/views/BrowseKanbanView.vue'
  import BrowseFormView from '~/components/browse/BrowseFormView.vue'
  import BrowseImportExportActions from '~/components/browse/BrowseImportExportActions.vue'
  import { ontologyToFormSpec } from '~/lib/ontology-form-spec'
  import { schemaFieldToPropertyFieldId } from '~/lib/ontology-sidebar-fields'

  definePageMeta({ layout: 'default' })

  const route = useRoute()
  const { wp } = useWorkspacePath()
  const entityType = computed(() => route.params.entityType as string)

  const { getEntityConfig, getBrowseConfig, getRoutedSurface, initialized } = useOntologyRegistry()

  watch(
    [entityType, initialized],
    ([type, ready]) => {
      if (!import.meta.client || !ready || !type) return
      const routed = getRoutedSurface(type)
      if (routed) {
        void navigateTo(wp(routed), { replace: true })
      }
    },
    { immediate: true },
  )

  const typeConfig = computed(() => getEntityConfig(entityType.value))
  const browseConfig = computed(() => getBrowseConfig(entityType.value))

  const dynamicTypeConfig = computed((): DynamicEntityTypeConfig | null => {
    const cfg = typeConfig.value
    if (cfg && 'dynamic' in cfg && cfg.dynamic) return cfg as DynamicEntityTypeConfig
    return null
  })

  const formPresentation = computed(() => dynamicTypeConfig.value?.formPresentation)

  const showFormTab = computed(() => {
    const cfg = dynamicTypeConfig.value
    if (!cfg) return false
    const spec = ontologyToFormSpec(
      {
        '@id': cfg.schemaId,
        label: cfg.label,
        fields: cfg.fields,
        formPresentation: cfg.formPresentation,
      },
      { includeTitle: true },
    )
    return spec.fields.length > 0
  })

  const supportsKanban = computed(() =>
    dynamicTypeConfig.value?.fields?.some(
      (field) => field.valueType === 'select' || field.valueType === 'status',
    ),
  )

  const viewModeOptions = computed(() => {
    const options = [
      { mode: 'table' as const, label: 'Table', icon: 'lucide:table' },
      { mode: 'grid' as const, label: 'Grid', icon: 'lucide:grid-3x3' },
    ]
    if (supportsKanban.value) {
      options.splice(1, 0, { mode: 'kanban', label: 'Kanban', icon: 'lucide:square-kanban' })
    }
    if (showFormTab.value) {
      options.push({ mode: 'form', label: 'Form', icon: 'lucide:clipboard-list' })
    }
    return options
  })

  const pageTitle = computed(
    () => (typeConfig.value as any)?.labelPlural || (typeConfig.value as any)?.label || entityType.value,
  )
  const pageIcon = computed(() => (typeConfig.value as any)?.icon || 'lucide:database')
  const pageColor = computed(() => (typeConfig.value as any)?.color || 'violet')

  useHead({ title: () => `${pageTitle.value} | Browse` })

  // ---------------------------------------------------------------------------
  // Browse page (data + browse + dialog + CRUD)
  // ---------------------------------------------------------------------------

  const {
    items,
    filteredItems: browseFilteredItems,
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
    entityType,
    searchFields: computed(() => browseConfig.value.searchFields).value,
    defaultViewMode: 'list',
    sortOptions: computed(() => browseConfig.value.sortOptions).value,
    formPresentation,
  })

  const browseEntityTypes = computed(() => [entityType.value])

  const { advancedFilters, applyAdvancedFilters } = useBrowseAdvancedFilters({
    entityTypes: browseEntityTypes,
  })

  const displayItems = computed(() => applyAdvancedFilters(browseFilteredItems.value))

  onMounted(() => {
    if (route.query.view === 'form' && showFormTab.value) {
      browseState.setViewMode('form')
    }
  })

  function handleViewResponses() {
    browseState.setViewMode('table')
  }

  // ---------------------------------------------------------------------------
  // Multi-select + batch operations
  // ---------------------------------------------------------------------------

  const {
    isSelected,
    toggle: toggleSelection,
    clearSelection,
    selectedItems,
    selectionCount,
    handleFieldUpdate,
    handleBatchDelete,
    handleBatchDuplicate,
  } = useBrowseSelection(displayItems)

  const { update: updateEntity } = useEntities()

  const handleSpreadsheetCellUpdate = async (item: any, column: string, value: unknown) => {
    if (column === 'title') {
      await updateEntity({ ...item, title: String(value ?? '').trim() || 'Untitled' })
      return
    }
    if (column === 'startDate') {
      const patch = value as { startDate: string; startTime?: string; allDay?: boolean }
      await updateEntity({
        ...item,
        startDate: patch.startDate || null,
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
    else {
      for (const item of displayItems.value) {
        if (!isSelected(item.id)) toggleSelection(item.id)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [{ label: 'Total', value: items.value.length, icon: pageIcon.value }])

  // ---------------------------------------------------------------------------
  // Table columns from schema
  // ---------------------------------------------------------------------------

  const tableColumns = computed(() => browseConfig.value.tableColumns)

  /** Build the fields prop for EntityCard from non-title table columns */
  function cardFields(item: any) {
    return tableColumns.value
      .filter((c) => !c.isTitle)
      .map((c) => ({ key: c.key, label: c.label, value: item[c.key] ?? null }))
  }
</script>

<template>
  <Page
    v-if="typeConfig"
    variant="browse"
    :title="pageTitle"
    subtitle="Custom Type"
    :data-source="entityType"
    :icon="pageIcon"
    :icon-class="`text-${pageColor}-400`"
    :search-placeholder="`Search ${pageTitle.toLowerCase()}...`"
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :hide-search="viewMode === 'form'"
    :browse="browseState"
    :advanced-filters="advancedFilters ?? undefined"
    :view-mode-options="viewModeOptions">
    <template #toolbarActions>
      <BrowseImportExportActions
        v-if="viewMode !== 'form'"
        :items="displayItems"
        :selected-items="selectedItems"
        :filename-slug="`browse-${entityType}`" />

      <UiButton v-if="viewMode !== 'form'" size="sm" @click="handleNewItem()">
        <Icon name="lucide:plus" class="h-4 w-4 sm:mr-2" />
        <span class="hidden sm:inline">New</span>
      </UiButton>
    </template>

    <!-- ================= LIST VIEW ================= -->
    <div v-if="viewMode === 'list'" class="flex flex-col gap-2">
      <EntityCard
        v-for="item in displayItems"
        :key="item.id"
        :item="item as any"
        layout="list"
        :selected="isSelected(item.id)"
        :fields="cardFields(item)"
        @click="openDetail(item)"
        @select="toggleSelection(item.id, $event)" />
      <div
        v-if="!displayItems.length"
        class="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <Icon :name="pageIcon" class="h-8 w-8 text-muted-foreground/30" />
        <p class="text-sm">No {{ pageTitle.toLowerCase() }} yet</p>
        <UiButton size="sm" variant="outline" @click="handleNewItem()">
          <Icon name="lucide:plus" class="mr-2 h-3.5 w-3.5" />
          New
        </UiButton>
      </div>
    </div>

    <!-- ================= GRID VIEW ================= -->
    <div v-else-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <EntityCard
        v-for="item in displayItems"
        :key="item.id"
        :item="item as any"
        layout="grid"
        :selected="isSelected(item.id)"
        :fields="cardFields(item)"
        @click="openDetail(item)"
        @select="toggleSelection(item.id, $event)" />
      <div
        v-if="!displayItems.length"
        class="col-span-full flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <Icon :name="pageIcon" class="h-8 w-8 text-muted-foreground/30" />
        <p class="text-sm">No {{ pageTitle.toLowerCase() }} yet</p>
        <UiButton size="sm" variant="outline" @click="handleNewItem()">
          <Icon name="lucide:plus" class="mr-2 h-3.5 w-3.5" />
          New
        </UiButton>
      </div>
    </div>

    <!-- ================= KANBAN VIEW ================= -->
    <div v-else-if="viewMode === 'kanban'" class="flex h-full min-h-0 flex-1 flex-col">
      <BrowseKanbanView
        class="min-h-0 flex-1"
        :items="displayItems"
        :entity-type="entityType"
        @open-detail="openDetail"
        @field-update="handleFieldUpdate" />
    </div>

    <!-- ================= TABLE VIEW ================= -->
    <div v-else-if="viewMode === 'table'" class="flex min-h-0 flex-1 flex-col">
      <BrowseSpreadsheetView
        class="min-h-0 flex-1"
        :items="displayItems"
        :is-selected="isSelected"
        :entity-type="entityType"
        :storage-key="`browse:table:${entityType}`"
        @toggle-select="toggleSelection"
        @toggle-select-all="toggleSelectAll"
        @open-detail="openDetail"
        @cell-update="handleSpreadsheetCellUpdate" />
    </div>

    <!-- ================= GRAPH VIEW ================= -->
    <div
      v-else-if="viewMode === 'graph'"
      class="h-[calc(100vh-200px)] -mx-4 -mb-4 rounded-lg border border-border/50 bg-card/30 overflow-hidden">
      <GraphView :entities="displayItems" @open-entity="openDetail" />
    </div>

    <!-- ================= FORM VIEW ================= -->
    <div v-else-if="viewMode === 'form' && dynamicTypeConfig" class="py-6">
      <BrowseFormView
        :type-config="dynamicTypeConfig"
        :response-count="items.length"
        @view-responses="handleViewResponses" />
    </div>

    <!-- Results count -->
    <div
      v-if="viewMode !== 'graph' && viewMode !== 'form' && viewMode !== 'kanban'"
      class="text-xs text-muted-foreground mt-4 border-t border-border pt-4 pb-20 sm:pb-10">
      Showing {{ displayItems.length }}
      {{
        displayItems.length === 1
          ? (typeConfig as any)?.label || entityType
          : (typeConfig as any)?.labelPlural || pageTitle.toLowerCase()
      }}
    </div>

    <!-- Selection Bar -->
    <EntitySelectionBar
      v-if="viewMode !== 'form'"
      :selected-items="selectedItems"
      :selection-count="selectionCount"
      @batch-delete="handleBatchDelete"
      @batch-duplicate="handleBatchDuplicate"
      @clear-selection="clearSelection" />

    <!-- View/Edit Dialog -->
    <DynamicEntityDialog
      v-if="viewOpen && viewingItem && typeConfig && 'dynamic' in typeConfig"
      :open="viewOpen"
      :item="viewingItem"
      :type-config="typeConfig as any"
      :can-navigate-prev="canPrev"
      :can-navigate-next="canNext"
      @navigate-prev="navPrev"
      @navigate-next="navNext"
      @save="handleUpdate"
      @delete="handleDelete"
      @close="viewOpen = false" />
  </Page>

  <div v-else class="flex h-full items-center justify-center">
    <UiCard class="max-w-md">
      <UiCardContent class="p-6 text-center">
        <Icon name="lucide:alert-circle" class="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h2 class="mt-4 text-lg font-semibold">Type Not Found</h2>
        <p class="mt-2 text-sm text-muted-foreground">The entity type "{{ entityType }}" is not registered.</p>
        <UiButton class="mt-4" variant="outline" @click="$router.back()">
          <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
          Go Back
        </UiButton>
      </UiCardContent>
    </UiCard>
  </div>
</template>
