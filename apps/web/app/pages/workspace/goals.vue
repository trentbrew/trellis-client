<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowsePage } from '~/composables/useBrowsePage'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import type { GoalItem } from '~/types/entity'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Goals | Workspace' })

  const {
    items, filteredItems, browseState, viewMode,
    viewOpen, viewingItem, openDetail, handleNewItem,
    canPrev, canNext, navPrev, navNext,
    handleUpdate, handleDelete,
  } = useBrowsePage({
    entityType: 'goal',
    searchFields: ['title', 'description', 'metric'],
    defaultViewMode: 'list',
    sortOptions: [
      { value: 'startDate', label: 'Date' },
      { value: 'title', label: 'Title' },
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
    ],
  })

  const _progressPercent = (g: GoalItem) => {
    if (!g.targetValue || !g.currentValue) return 0
    return Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))
  }

  const stats = computed<PageStat[]>(() => [
    { label: 'Goals', value: items.value.length, icon: 'lucide:target' },
    { label: 'With Metric', value: (items.value as GoalItem[]).filter((g) => g.metric).length, icon: 'lucide:bar-chart-2', color: 'text-emerald-500' },
    { label: 'Work', value: (items.value as GoalItem[]).filter((g) => g.category === 'work').length, icon: 'lucide:briefcase', color: 'text-blue-500' },
    { label: 'Personal', value: (items.value as GoalItem[]).filter((g) => g.category === 'personal').length, icon: 'lucide:user', color: 'text-violet-500' },
  ])

  const _categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const _formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }]
  const taskFolders = ['Work', 'Personal']
</script>

<template>
  <Page
    variant="browse"
    title="Goals"
    subtitle="Workspace"
    data-source="goal"
    description="Track your goals and measure progress."
    icon="lucide:target"
    icon-class="text-emerald-300"
    search-placeholder="Search goals..."
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
        New Goal
      </UiButton>
    </template>

    <!-- LIST VIEW -->
    <div v-if="viewMode === 'list' || !['list', 'grid', 'table'].includes(viewMode)" class="flex flex-col gap-2">
      <EntityCard
        v-for="item in (filteredItems as GoalItem[])"
        :key="item.id"
        :item="item"
        layout="list"
        @click="openDetail(item)" />
      <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No goals found
      </div>
    </div>

    <!-- GRID VIEW -->
    <div v-else-if="viewMode === 'grid'" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <EntityCard
        v-for="item in (filteredItems as GoalItem[])"
        :key="item.id"
        :item="item"
        layout="grid"
        @click="openDetail(item)" />
      <div v-if="!filteredItems.length" class="col-span-full flex items-center justify-center h-40 text-sm text-muted-foreground">
        No goals found
      </div>
    </div>

    <!-- TABLE VIEW -->
    <div v-else-if="viewMode === 'table'" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Title</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Metric</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Category</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Date</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in (filteredItems as GoalItem[])"
            :key="item.id"
            class="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition"
            @click="openDetail(item)">
            <td class="py-2 px-3">
              <div class="flex items-center gap-2">
                <Icon name="lucide:target" class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="font-medium truncate">{{ item.title || 'Untitled' }}</span>
              </div>
            </td>
            <td class="py-2 px-3 text-muted-foreground">{{ item.metric || '—' }}</td>
            <td class="py-2 px-3 text-muted-foreground">{{ (item as any).category || '—' }}</td>
            <td class="py-2 px-3 text-muted-foreground">{{ item.startDate ? new Date(item.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No goals found
      </div>
    </div>

    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'goal' : 'goals' }}
    </div>

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
