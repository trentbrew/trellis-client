<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import type { PropertyFieldId } from '~/types/entity'
  import { useBrowsePage } from '~/composables/useBrowsePage'
  import { useBrowseSelection } from '~/composables/useBrowseSelection'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Projects | Personal' })

  // ---------------------------------------------------------------------------
  // Browse page (data + browse + dialog + CRUD)
  // ---------------------------------------------------------------------------

  const {
    items, filteredItems, browseState, viewMode,
    viewOpen, viewingItem, openDetail, handleNewItem,
    canPrev, canNext, navPrev, navNext,
    handleUpdate, handleDelete,
  } = useBrowsePage({
    entityType: 'project',
    searchFields: ['title', 'description'],
    defaultViewMode: 'grid',
    sortOptions: [
      { value: 'startDate', label: 'Start Date' },
      { value: 'title', label: 'Name' },
    ],
    filters: [
      {
        id: 'category', label: 'Category', icon: 'lucide:tag',
        options: [
          { value: 'all', label: 'All' },
          { value: 'work', label: 'Work' },
          { value: 'personal', label: 'Personal' },
          { value: 'travel', label: 'Travel' },
        ],
        fn: (item: any, val: string) => item.category === val,
      },
    ],
  })

  // ---------------------------------------------------------------------------
  // Stats (type-specific — stays in page)
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => {
    const all = items.value as any[]
    return [
      { label: 'Projects', value: all.length, icon: 'lucide:folder-kanban' },
      { label: 'Active', value: all.filter((p) => p.containerStatus === 'active').length, icon: 'lucide:play', color: 'text-green-500' },
      { label: 'Work', value: all.filter((p) => p.category === 'work').length, icon: 'lucide:briefcase', color: 'text-blue-500' },
      { label: 'Personal', value: all.filter((p) => p.category === 'personal' || p.category === 'travel').length, icon: 'lucide:user', color: 'text-emerald-500' },
    ]
  })

  // ---------------------------------------------------------------------------
  // UI helpers (type-specific — stays in page)
  // ---------------------------------------------------------------------------

  const _categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    travel: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  }

  const _priorityColors: Record<string, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-muted-foreground',
  }

  const _formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }]

  const {
    isSelected, toggle: toggleSelection, clearSelection,
    selectedItems, selectionCount,
    handleFieldUpdate, handleBatchDelete, handleBatchDuplicate, handleBatchSetField,
  } = useBrowseSelection(filteredItems)
</script>

<template>
  <Page
    variant="browse"
    title="Projects"
    subtitle="Personal"
    data-source="project"
    description="Your projects and initiatives."
    icon="lucide:folder-kanban"
    icon-class="text-orange-300"
    search-placeholder="Search projects..."
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
        New Project
      </UiButton>
    </template>

    <!-- ================= GRID VIEW ================= -->
    <div v-if="viewMode === 'grid' || !['grid', 'list', 'table'].includes(viewMode)" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item, fieldId, value)" />
      <div v-if="!filteredItems.length" class="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:folder-kanban" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No projects yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Create a project to organize related tasks, notes, and files together.</p>
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
        @field-update="(fieldId: PropertyFieldId, value: unknown) => handleFieldUpdate(item, fieldId, value)" />
      <div v-if="!filteredItems.length" class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:folder-kanban" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 class="text-lg font-medium text-foreground mb-1">No projects yet</h3>
        <p class="text-sm text-muted-foreground max-w-sm">Create a project to organize related tasks, notes, and files together.</p>
      </div>
    </div>

    <!-- ================= TABLE VIEW ================= -->
    <div v-else-if="viewMode === 'table'" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Name</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Category</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Start</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredItems"
            :key="item.id"
            class="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition"
            @click="openDetail(item)">
            <td class="py-2 px-3">
              <div class="flex items-center gap-2">
                <Icon name="lucide:folder-kanban" class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="font-medium truncate">{{ item.title || 'Untitled' }}</span>
              </div>
            </td>
            <td class="py-2 px-3 text-muted-foreground">{{ (item as any).containerStatus || '—' }}</td>
            <td class="py-2 px-3 text-muted-foreground">{{ (item as any).category || '—' }}</td>
            <td class="py-2 px-3 text-muted-foreground">{{ item.startDate ? new Date(item.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No projects found
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'project' : 'projects' }}
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
    <ProjectDialog
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
