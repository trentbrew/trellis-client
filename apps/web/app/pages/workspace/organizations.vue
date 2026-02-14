<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import type { PropertyFieldId, Entity } from '~/types/entity'
  import { createDefaultItem } from '~/types/entity'
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import { useBrowseSelection } from '~/composables/useBrowseSelection'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Organizations | Personal' })

  // ---------------------------------------------------------------------------
  // Live data
  // ---------------------------------------------------------------------------

  const { items: allItems, create: createItem, update: updateItem, remove: removeItem } = useEntities()

  const items = computed(() => allItems.value.filter((i: any) => i.type === 'organization'))

  // ---------------------------------------------------------------------------
  // Browse
  // ---------------------------------------------------------------------------

  const { browseState, filteredItems } = useBrowse({
    items: items as Ref<Entity[]>,
    searchFields: ['title', 'description', 'website', 'industry'] as (keyof Entity)[],
    defaultViewMode: 'grid' as BrowseViewMode,
    sortOptions: [
      { value: 'title', label: 'Name' },
      { value: 'startDate', label: 'Date Added' },
    ],
    filters: [
      {
        id: 'category', label: 'Category', icon: 'lucide:tag',
        options: [
          { value: 'all', label: 'All' },
          { value: 'work', label: 'Work' },
          { value: 'personal', label: 'Personal' },
        ],
        fn: (item: any, val: string) => item.category === val,
      },
      {
        id: 'industry', label: 'Industry', icon: 'lucide:factory',
        options: [
          { value: 'all', label: 'All' },
          { value: 'technology', label: 'Technology' },
          { value: 'media', label: 'Media' },
          { value: 'education', label: 'Education' },
          { value: 'finance', label: 'Finance' },
        ],
        fn: (item: any, val: string) => item.industry === val,
      },
    ],
  })

  const viewMode = computed(() => browseState.viewMode.value)

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [
    { label: 'Organizations', value: items.value.length, icon: 'lucide:building-2' },
    { label: 'Work', value: items.value.filter((o: any) => o.category === 'work').length, icon: 'lucide:briefcase', color: 'text-blue-500' },
    { label: 'Personal', value: items.value.filter((o: any) => o.category === 'personal').length, icon: 'lucide:user', color: 'text-emerald-500' },
  ])

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  function getInitials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  }

  function getDomain(url?: string): string {
    if (!url) return ''
    try {
      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  // ---------------------------------------------------------------------------
  // References
  // ---------------------------------------------------------------------------

  function getRefCount(item: any): number {
    return (item.references || []).filter((r: any) => r.kind === 'entity').length
  }

  // ---------------------------------------------------------------------------
  // Dialog
  // ---------------------------------------------------------------------------

  const viewOpen = ref(false)
  const _viewingItemId = ref<string | null>(null)
  const _pendingNewItem = ref<Entity | null>(null)
  const viewingItem = computed<Entity | null>(() => {
    if (!_viewingItemId.value) return null
    return allItems.value.find((i) => i.id === _viewingItemId.value)
      ?? _pendingNewItem.value
      ?? null
  })

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }]

  function openDetail(item: any) {
    _viewingItemId.value = item.id
    viewOpen.value = true
  }

  const viewingIndex = computed(() => viewingItem.value ? filteredItems.value.findIndex((i) => (i as Entity).id === viewingItem.value?.id) : -1)
  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < filteredItems.value.length - 1)
  function navPrev() { if (canPrev.value) _viewingItemId.value = (filteredItems.value[viewingIndex.value - 1] as Entity).id }
  function navNext() { if (canNext.value) _viewingItemId.value = (filteredItems.value[viewingIndex.value + 1] as Entity).id }

  async function handleNewItem() {
    const defaults = createDefaultItem('organization')
    const newId = await createItem({ ...defaults, type: 'organization' as any, title: '' } as any)
    _pendingNewItem.value = { ...defaults, id: newId } as Entity
    _viewingItemId.value = newId
    viewOpen.value = true
  }

  async function handleUpdate(item: Entity) {
    await updateItem(item)
    viewOpen.value = false
  }

  async function handleDelete(item: Entity) {
    await removeItem(item.id)
    viewOpen.value = false
  }

  const {
    isSelected, toggle: toggleSelection, clearSelection,
    selectedItems, selectionCount,
    handleFieldUpdate, handleBatchDelete, handleBatchDuplicate, handleBatchSetField,
  } = useBrowseSelection(filteredItems as ComputedRef<Entity[]>)
</script>

<template>
  <Page
    variant="browse"
    title="Organizations"
    subtitle="Personal"
    data-source="organization"
    description="Companies, teams, and groups you work with."
    icon="lucide:building-2"
    icon-class="text-zinc-300"
    search-placeholder="Search organizations..."
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :browse="browseState"
    :view-mode-options="[
      { mode: 'grid', label: 'Grid', icon: 'lucide:grid-3x3' },
      { mode: 'list', label: 'List', icon: 'lucide:list' },
      { mode: 'table', label: 'Table', icon: 'lucide:table' },
    ]">

    <!-- Toolbar Actions -->
    <template #toolbarActions>
      <UiButton @click="handleNewItem()">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Add Organization
      </UiButton>
    </template>

    <!-- ================= GRID VIEW ================= -->
    <div v-if="viewMode === 'grid' || !['grid', 'list', 'table'].includes(viewMode)" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <EntityCard
        v-for="item in filteredItems"
        :key="item.id"
        :item="item"
        layout="grid"
        editable
        :selected="isSelected(item.id)"
        :owners="taskOwners"
        @click="openDetail(item)"
        @select="toggleSelection(item.id, $event)"
        @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item as Entity, fieldId, value)" />
      <div v-if="!filteredItems.length" class="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:building-2" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No organizations yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Add companies, teams, and groups you work with.</p>
      </div>
    </div>

    <!-- ================= LIST VIEW ================= -->
    <div v-else-if="viewMode === 'list'" class="flex flex-col gap-2">
      <EntityCard
        v-for="item in filteredItems"
        :key="item.id"
        :item="item"
        layout="list"
        editable
        :selected="isSelected(item.id)"
        :owners="taskOwners"
        @click="openDetail(item)"
        @select="toggleSelection(item.id, $event)"
        @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item as Entity, fieldId, value)" />
      <div v-if="!filteredItems.length" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:building-2" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No organizations yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Add companies, teams, and groups you work with.</p>
      </div>
    </div>

    <!-- ================= TABLE VIEW ================= -->
    <div v-else-if="viewMode === 'table'" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left">
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Name</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Industry</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Website</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Category</th>
            <th class="pb-2 pr-4 font-medium text-muted-foreground">Refs</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredItems"
            :key="item.id"
            class="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
            @click="openDetail(item)">
            <td class="py-2.5 pr-4">
              <div class="flex items-center gap-2">
                <div class="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 text-[10px] font-semibold shrink-0">
                  {{ getInitials(item.title) }}
                </div>
                <span class="font-medium truncate">{{ item.title }}</span>
              </div>
            </td>
            <td class="py-2.5 pr-4 text-muted-foreground truncate max-w-[150px] capitalize">{{ (item as any).industry || '—' }}</td>
            <td class="py-2.5 pr-4 text-muted-foreground truncate max-w-[200px]">{{ getDomain((item as any).website) || '—' }}</td>
            <td class="py-2.5 pr-4">
              <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
                {{ (item as any).category }}
              </span>
            </td>
            <td class="py-2.5 pr-4 text-muted-foreground">{{ getRefCount(item) || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filteredItems.length" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:building-2" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No organizations yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Add companies, teams, and groups you work with.</p>
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'organization' : 'organizations' }}
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
    <OrganizationDialog
      v-model:open="viewOpen"
      mode="edit"
      :item="viewingItem"
      :can-navigate-prev="canPrev"
      :can-navigate-next="canNext"
      :owners="taskOwners"
      @navigate-prev="navPrev"
      @navigate-next="navNext"
      @save="handleUpdate"
      @delete="handleDelete"
      @close="viewOpen = false" />

  </Page>
</template>
