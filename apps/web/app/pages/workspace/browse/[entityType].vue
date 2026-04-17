<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowsePage } from '~/composables/useBrowsePage'
  import { useBrowseSelection } from '~/composables/useBrowseSelection'
  import DynamicEntityDialog from '~/components/dialogs/DynamicEntityDialog.vue'
  import GraphView from '~/components/views/GraphView.vue'
  import EntityCard from '~/components/entity/cards/EntityCard.vue'

  definePageMeta({ layout: 'default' })

  const route = useRoute()
  const entityType = computed(() => route.params.entityType as string)

  const { getEntityConfig, getBrowseConfig } = useOntologyRegistry()

  const typeConfig = computed(() => getEntityConfig(entityType.value))
  const browseConfig = computed(() => getBrowseConfig(entityType.value))

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
    entityType,
    searchFields: computed(() => browseConfig.value.searchFields).value,
    defaultViewMode: 'list',
    sortOptions: computed(() => browseConfig.value.sortOptions).value,
  })

  // ---------------------------------------------------------------------------
  // Multi-select + batch operations
  // ---------------------------------------------------------------------------

  const {
    isSelected,
    toggle: toggleSelection,
    clearSelection,
    selectedItems,
    selectionCount,
    handleBatchDelete,
    handleBatchDuplicate,
  } = useBrowseSelection(filteredItems)

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [{ label: 'Total', value: items.value.length, icon: pageIcon.value }])

  // ---------------------------------------------------------------------------
  // Table columns from schema
  // ---------------------------------------------------------------------------

  const tableColumns = computed(() => browseConfig.value.tableColumns)

  function cellValue(item: any, key: string): string {
    const val = item[key]
    if (val === null || val === undefined) return '—'
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

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
    :browse="browseState"
    :view-mode-options="[
      { mode: 'list', label: 'List', icon: 'lucide:list' },
      { mode: 'table', label: 'Table', icon: 'lucide:table' },
      { mode: 'grid', label: 'Grid', icon: 'lucide:grid-3x3' },
      { mode: 'graph', label: 'Graph', icon: 'lucide:git-fork' },
    ]">
    <!-- Toolbar Actions -->
    <template #toolbarActions>
      <UiButton @click="handleNewItem()">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New {{ (typeConfig as any)?.label || entityType }}
      </UiButton>
    </template>

    <!-- ================= LIST VIEW ================= -->
    <div v-if="viewMode === 'list'" class="flex flex-col gap-2">
      <EntityCard
        v-for="item in filteredItems"
        :key="item.id"
        :item="item as any"
        layout="list"
        :selected="isSelected(item.id)"
        :fields="cardFields(item)"
        @click="openDetail(item)"
        @select="toggleSelection(item.id, $event)" />
      <div
        v-if="!filteredItems.length"
        class="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <Icon :name="pageIcon" class="h-8 w-8 text-muted-foreground/30" />
        <p class="text-sm">No {{ pageTitle.toLowerCase() }} yet</p>
        <UiButton size="sm" variant="outline" @click="handleNewItem()">
          <Icon name="lucide:plus" class="mr-2 h-3.5 w-3.5" />
          New {{ (typeConfig as any)?.label || entityType }}
        </UiButton>
      </div>
    </div>

    <!-- ================= GRID VIEW ================= -->
    <div v-else-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <EntityCard
        v-for="item in filteredItems"
        :key="item.id"
        :item="item as any"
        layout="grid"
        :selected="isSelected(item.id)"
        :fields="cardFields(item)"
        @click="openDetail(item)"
        @select="toggleSelection(item.id, $event)" />
      <div
        v-if="!filteredItems.length"
        class="col-span-full flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <Icon :name="pageIcon" class="h-8 w-8 text-muted-foreground/30" />
        <p class="text-sm">No {{ pageTitle.toLowerCase() }} yet</p>
        <UiButton size="sm" variant="outline" @click="handleNewItem()">
          <Icon name="lucide:plus" class="mr-2 h-3.5 w-3.5" />
          New {{ (typeConfig as any)?.label || entityType }}
        </UiButton>
      </div>
    </div>

    <!-- ================= TABLE VIEW ================= -->
    <div v-else-if="viewMode === 'table'" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="w-8 py-2 px-3"></th>
            <th
              v-for="col in tableColumns"
              :key="col.key"
              class="py-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap"
              :class="col.align === 'right' ? 'text-right' : 'text-left'">
              {{ col.label }}
            </th>
            <th class="py-2 px-3 text-xs font-medium text-muted-foreground text-right">Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredItems"
            :key="item.id"
            class="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
            @click="openDetail(item)">
            <td class="py-2 px-3">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-border"
                :checked="isSelected(item.id)"
                @click.stop="toggleSelection(item.id)" />
            </td>
            <td
              v-for="col in tableColumns"
              :key="col.key"
              class="py-2 px-3"
              :class="col.align === 'right' ? 'text-right tabular-nums' : ''">
              <span v-if="col.isTitle" class="font-medium">{{ item.title || 'Untitled' }}</span>
              <span v-else class="text-muted-foreground">{{ cellValue(item, col.key) }}</span>
            </td>
            <td class="py-2 px-3 text-right text-muted-foreground text-xs whitespace-nowrap">
              {{
                item.updatedAt
                  ? new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—'
              }}
            </td>
          </tr>
        </tbody>
      </table>
      <div
        v-if="!filteredItems.length"
        class="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <Icon :name="pageIcon" class="h-8 w-8 text-muted-foreground/30" />
        <p class="text-sm">No {{ pageTitle.toLowerCase() }} yet</p>
        <UiButton size="sm" variant="outline" @click="handleNewItem()">
          <Icon name="lucide:plus" class="mr-2 h-3.5 w-3.5" />
          New {{ (typeConfig as any)?.label || entityType }}
        </UiButton>
      </div>
    </div>

    <!-- ================= GRAPH VIEW ================= -->
    <div
      v-else-if="viewMode === 'graph'"
      class="h-[calc(100vh-200px)] -mx-4 -mb-4 rounded-lg border border-border/50 bg-card/30 overflow-hidden">
      <GraphView :entities="filteredItems" @open-entity="openDetail" />
    </div>

    <!-- Results count -->
    <div v-if="viewMode !== 'graph'" class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }}
      {{
        filteredItems.length === 1
          ? (typeConfig as any)?.label || entityType
          : (typeConfig as any)?.labelPlural || pageTitle.toLowerCase()
      }}
    </div>

    <!-- Selection Bar -->
    <EntitySelectionBar
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
