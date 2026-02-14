<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import type { PropertyFieldId, SprintItem } from '~/types/entity'
  import { useBrowsePage } from '~/composables/useBrowsePage'
  import { useBrowseSelection } from '~/composables/useBrowseSelection'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Sprints | Workspace' })

  const {
    items, filteredItems, browseState, viewMode,
    viewOpen, viewingItem, openDetail, handleNewItem,
    canPrev, canNext, navPrev, navNext,
    handleUpdate, handleDelete,
  } = useBrowsePage({
    entityType: 'sprint',
    searchFields: ['title', 'description', 'sprintGoal'],
    defaultViewMode: 'list',
    sortOptions: [
      { value: 'startDate', label: 'Date' },
      { value: 'title', label: 'Title' },
    ],
    filters: [
      {
        id: 'status', label: 'Status', icon: 'lucide:circle-dot',
        options: [
          { value: 'all', label: 'All' },
          { value: 'planning', label: 'Planning' },
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
        ],
        fn: (item: any, val: string) => item.sprintStatus === val,
      },
    ],
  })

  const stats = computed<PageStat[]>(() => [
    { label: 'Sprints', value: items.value.length, icon: 'lucide:zap' },
    { label: 'Active', value: (items.value as SprintItem[]).filter((s) => s.sprintStatus === 'active').length, icon: 'lucide:play', color: 'text-emerald-500' },
    { label: 'Planning', value: (items.value as SprintItem[]).filter((s) => s.sprintStatus === 'planning').length, icon: 'lucide:map', color: 'text-blue-500' },
    { label: 'Completed', value: (items.value as SprintItem[]).filter((s) => s.sprintStatus === 'completed').length, icon: 'lucide:check-circle', color: 'text-slate-500' },
  ])

  const _statusColors: Record<string, string> = {
    planning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    completed: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  }

  const _formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }]
  const taskFolders = ['Work', 'Personal']

  const {
    isSelected, toggle: toggleSelection, clearSelection,
    selectedItems, selectionCount,
    handleFieldUpdate, handleBatchDelete, handleBatchDuplicate, handleBatchSetField,
  } = useBrowseSelection(filteredItems)
</script>

<template>
  <Page
    variant="browse"
    title="Sprints"
    subtitle="Workspace"
    data-source="sprint"
    description="Plan and track development sprints."
    icon="lucide:zap"
    icon-class="text-violet-300"
    search-placeholder="Search sprints..."
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :browse="browseState"
    :view-mode-options="[
      { mode: 'list', label: 'List', icon: 'lucide:list' },
      { mode: 'grid', label: 'Grid', icon: 'lucide:grid-3x3' },
      { mode: 'table', label: 'Table', icon: 'lucide:table' },
    ]">

    <template #toolbarActions>
      <UiButton @click="handleNewItem()">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New Sprint
      </UiButton>
    </template>

    <!-- LIST VIEW -->
    <div v-if="viewMode === 'list' || !['list', 'grid', 'table'].includes(viewMode)" class="flex flex-col gap-2">
      <EntityCard
        v-for="item in (filteredItems as SprintItem[])"
        :key="item.id"
        :item="item"
        layout="list"
        editable
        :selected="isSelected(item.id)"
        :owners="taskOwners"
        @click="openDetail(item)"
        @select="toggleSelection(item.id, $event)"
        @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item, fieldId, value)" />
      <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No sprints found
      </div>
    </div>

    <!-- GRID VIEW -->
    <div v-else-if="viewMode === 'grid'" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <EntityCard
        v-for="item in (filteredItems as SprintItem[])"
        :key="item.id"
        :item="item"
        layout="grid"
        editable
        :selected="isSelected(item.id)"
        :owners="taskOwners"
        @click="openDetail(item)"
        @select="toggleSelection(item.id, $event)"
        @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item, fieldId, value)" />
      <div v-if="!filteredItems.length" class="col-span-full flex items-center justify-center h-40 text-sm text-muted-foreground">
        No sprints found
      </div>
    </div>

    <!-- TABLE VIEW -->
    <div v-else-if="viewMode === 'table'" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Title</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Start</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">End</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in (filteredItems as SprintItem[])"
            :key="item.id"
            class="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition"
            @click="openDetail(item)">
            <td class="py-2 px-3">
              <div class="flex items-center gap-2">
                <Icon name="lucide:zap" class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="font-medium truncate">{{ item.title || 'Untitled' }}</span>
              </div>
            </td>
            <td class="py-2 px-3 text-muted-foreground">{{ item.sprintStatus || '—' }}</td>
            <td class="py-2 px-3 text-muted-foreground">{{ item.startDate ? new Date(item.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' }}</td>
            <td class="py-2 px-3 text-muted-foreground">{{ item.endDate ? new Date(item.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No sprints found
      </div>
    </div>

    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'sprint' : 'sprints' }}
    </div>

    <EntitySelectionBar
      :selected-items="selectedItems"
      :selection-count="selectionCount"
      @batch-delete="handleBatchDelete"
      @batch-duplicate="handleBatchDuplicate"
      @batch-set-field="handleBatchSetField"
      @clear-selection="clearSelection" />

    <EntityDialog
      v-model:open="viewOpen"
      mode="edit"
      :item="viewingItem"
      :can-navigate-prev="canPrev"
      :can-navigate-next="canNext"
      :owners="taskOwners"
      :folders="taskFolders"
      @navigate-prev="navPrev"
      @navigate-next="navNext"
      @save="handleUpdate"
      @delete="handleDelete"
      @close="viewOpen = false" />

  </Page>
</template>
