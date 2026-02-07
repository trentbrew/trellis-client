<script setup lang="ts">
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem, TaskItem } from '~/types/calendarItem'
  import { createDefaultItem } from '~/types/calendarItem'
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import { useAdvancedFilters } from '~/composables/useAdvancedFilters'

  definePageMeta({ layout: 'default' })

  // ---------------------------------------------------------------------------
  // Live data from instant-local
  // ---------------------------------------------------------------------------

  const { items: allItems, create: createItem, update: updateItem, remove: _removeItem } = useCalendarItems()

  const taskItems = computed(() => allItems.value.filter((i): i is TaskItem => i.type === 'task'))

  // Derive a simplified task list for the existing template
  const tasks = computed(() =>
    taskItems.value.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.taskStatus === 'in-progress' ? 'due soon' : t.taskStatus === 'pending' ? 'on track' : t.taskStatus,
      assignee: 'You',
      dueDate: t.startDate,
      priority: t.priority,
    })),
  )

  // ---------------------------------------------------------------------------
  // Browse (search, simple filters, sort)
  // ---------------------------------------------------------------------------

  const { browseState, filteredItems } = useBrowse({
    items: tasks,
    searchFields: ['title'] as (keyof (typeof tasks.value)[0])[],
    defaultViewMode: 'kanban' as BrowseViewMode,
    sortOptions: [
      { value: 'dueDate', label: 'Due Date' },
      { value: 'priority', label: 'Priority' },
      { value: 'title', label: 'Title' },
    ],
    filters: [
      {
        id: 'priority', label: 'Priority', icon: 'lucide:signal',
        options: [
          { value: 'all', label: 'All' },
          { value: 'critical', label: 'Critical' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ],
        fn: (item: any, val: string) => item.priority === val,
      },
      {
        id: 'status', label: 'Status', icon: 'lucide:circle-dot',
        options: [
          { value: 'all', label: 'All' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'due soon', label: 'Due Soon' },
          { value: 'on track', label: 'On Track' },
          { value: 'completed', label: 'Completed' },
        ],
        fn: (item: any, val: string) => item.status === val,
      },
    ],
  })

  const viewMode = computed(() => browseState.viewMode.value)

  // ---------------------------------------------------------------------------
  // Advanced filters
  // ---------------------------------------------------------------------------

  const advancedFilters = useAdvancedFilters({
    fields: [
      { key: 'title', label: 'Title', type: 'text', icon: 'lucide:type' },
      {
        key: 'priority', label: 'Priority', type: 'select', icon: 'lucide:signal',
        options: [
          { value: 'critical', label: 'Critical' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ],
      },
      {
        key: 'status', label: 'Status', type: 'select', icon: 'lucide:circle-dot',
        options: [
          { value: 'overdue', label: 'Overdue' },
          { value: 'due soon', label: 'Due Soon' },
          { value: 'on track', label: 'On Track' },
          { value: 'completed', label: 'Completed' },
        ],
      },
      { key: 'dueDate', label: 'Due Date', type: 'date', icon: 'lucide:calendar' },
      { key: 'assignee', label: 'Assignee', type: 'text', icon: 'lucide:user' },
    ],
  })

  // Compose: useBrowse filtered items → advanced filters on top
  const finalFilteredItems = computed(() => advancedFilters.filterItems(filteredItems.value))

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  const statusStyles: Record<string, string> = {
    overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    'due soon': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'on track': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  }

  const priorityIcons: Record<string, string> = {
    critical: 'lucide:alert-octagon',
    high: 'lucide:alert-circle',
    medium: 'lucide:minus-circle',
    low: 'lucide:arrow-down-circle',
  }

  const priorityColors: Record<string, string> = {
    critical: 'text-red-500',
    high: 'text-rose-500',
    medium: 'text-amber-500',
    low: 'text-blue-500',
  }

  // ---------------------------------------------------------------------------
  // Kanban
  // ---------------------------------------------------------------------------

  const kanbanColumns = computed(() => {
    const items = finalFilteredItems.value
    return [
      { id: 'overdue', label: 'Overdue', borderClass: 'border-red-500', bgClass: 'bg-red-500/2.5', tasks: items.filter((t) => t.status === 'overdue') },
      { id: 'due soon', label: 'Due Soon', borderClass: 'border-amber-500', bgClass: 'bg-amber-500/2.5', tasks: items.filter((t) => t.status === 'due soon') },
      { id: 'on track', label: 'On Track', borderClass: 'border-emerald-500', bgClass: 'bg-emerald-500/2.5', tasks: items.filter((t) => t.status === 'on track') },
      { id: 'completed', label: 'Completed', borderClass: 'border-blue-500', bgClass: 'bg-blue-500/2.5', tasks: items.filter((t) => t.status === 'completed') },
    ]
  })

  // ---------------------------------------------------------------------------
  // Dialog
  // ---------------------------------------------------------------------------

  const createTaskOpen = ref(false)
  const viewTaskOpen = ref(false)
  const viewingTask = ref<CalendarItem | null>(null)

  const taskOwners = [{ id: 'you', name: 'You' }]

  function openTaskCreate() {
    createTaskOpen.value = true
  }

  function openTaskDetail(task: any) {
    const item = createDefaultItem('task')
    viewingTask.value = {
      ...item,
      id: task.id,
      title: task.title,
      startDate: task.dueDate,
      priority: task.priority as 'low' | 'medium' | 'high' | 'critical',
      owner: 'you',
    }
    viewTaskOpen.value = true
  }

  const viewingTaskIndex = computed(() => {
    if (!viewingTask.value) return -1
    return finalFilteredItems.value.findIndex((t) => t.id === viewingTask.value?.id)
  })

  const canNavigatePrev = computed(() => viewingTaskIndex.value > 0)
  const canNavigateNext = computed(() => viewingTaskIndex.value < finalFilteredItems.value.length - 1)

  function navigatePrev() {
    if (canNavigatePrev.value) {
      const task = finalFilteredItems.value[viewingTaskIndex.value - 1]
      if (task) openTaskDetail(task)
    }
  }

  function navigateNext() {
    if (canNavigateNext.value) {
      const task = finalFilteredItems.value[viewingTaskIndex.value + 1]
      if (task) openTaskDetail(task)
    }
  }

  async function handleCreateTask(item: CalendarItem) {
    await createItem({ ...item, type: 'task' } as TaskItem)
    createTaskOpen.value = false
  }

  async function handleUpdateTask(item: CalendarItem) {
    await updateItem(item)
    viewTaskOpen.value = false
  }
</script>

<template>
  <Page
    variant="browse"
    title="Tasks"
    subtitle="Personal"
    description="Tasks assigned to you across all facilities."
    icon="lucide:check-square"
    icon-class="text-emerald-300"
    search-placeholder="Search tasks..."
    :show-view-switcher="true"
    :browse="browseState"
    :advanced-filters="advancedFilters"
    :primary-action="{
      label: 'New Task',
      icon: 'lucide:plus',
      type: 'click',
      onClick: openTaskCreate,
    }">

    <!-- View Switcher -->
    <template #viewSwitcher>
      <div class="flex items-center gap-1">
        <button
          v-for="mode in (['kanban', 'list'] as BrowseViewMode[])"
          :key="mode"
          type="button"
          class="flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors"
          :class="viewMode === mode ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'"
          @click="browseState.setViewMode(mode)">
          <Icon :name="mode === 'kanban' ? 'lucide:layout-grid' : 'lucide:list'" class="h-4 w-4" />
          {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
        </button>
      </div>
    </template>

    <template #toolbarActions>
      <UiButton @click="openTaskCreate">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New Task
      </UiButton>
    </template>

    <!-- List View -->
    <div v-if="viewMode === 'list'" class="space-y-3">
      <div
        v-for="task in finalFilteredItems"
        :key="task.id"
        class="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer"
        @click="openTaskDetail(task)">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <Icon
              :name="priorityIcons[task.priority] || 'lucide:circle'"
              :class="['h-4 w-4', priorityColors[task.priority]]" />
            <p class="text-sm font-medium text-foreground">{{ task.title }}</p>
          </div>
          <p class="text-xs text-muted-foreground">{{ task.assignee }} · {{ task.dueDate }}</p>
        </div>
        <div class="flex items-center gap-2">
          <span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', statusStyles[task.status]]">
            {{ task.status }}
          </span>
          <UiButton variant="ghost" size="icon">
            <Icon name="lucide:arrow-right" class="h-4 w-4" />
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Kanban View -->
    <div v-else-if="viewMode === 'kanban'" class="flex gap-4 overflow-x-auto pb-4">
      <div
        v-for="column in kanbanColumns"
        :key="column.id"
        class="shrink-0 w-72 rounded-lg border-t-2 flex flex-col sticky top-24"
        :class="[column.borderClass, column.bgClass]">
        <div class="p-3 border-b border-border/0 sticky top-0 z-10 backdrop-blur-sm" :class="column.bgClass">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-sm">{{ column.label }}</h3>
            <span class="text-xs text-foreground bg-foreground/15 px-2 py-0.5 rounded-full">
              {{ column.tasks.length }}
            </span>
          </div>
        </div>
        <div class="p-2 space-y-2  overflow-y-auto flex-1">
          <div
            v-for="task in column.tasks"
            :key="task.id"
            class="rounded-lg border border-border bg-foreground/5 p-3 hover:bg-accent/30 transition-colors cursor-pointer"
            @click="openTaskDetail(task)">
            <div class="flex items-start gap-2 mb-2">
              <Icon
                :name="priorityIcons[task.priority] || 'lucide:circle'"
                :class="['h-4 w-4 mt-0.5 shrink-0', priorityColors[task.priority] || '']" />
              <p class="text-sm font-medium leading-tight">{{ task.title }}</p>
            </div>
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ task.assignee }}</span>
              <span>{{ task.dueDate }}</span>
            </div>
          </div>
          <div
            v-if="column.tasks.length === 0"
            class="flex items-center justify-center h-20 text-sm text-muted-foreground">
            No tasks
          </div>
        </div>
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ finalFilteredItems.length }} {{ finalFilteredItems.length === 1 ? 'task' : 'tasks' }}
    </div>

    <!-- Create Task Dialog -->
    <CalendarItemDialog
      v-model:open="createTaskOpen"
      mode="create"
      item-type="task"
      :item="null"
      :owners="taskOwners"
      @save="handleCreateTask"
      @close="createTaskOpen = false" />

    <!-- View/Edit Task Dialog -->
    <CalendarItemDialog
      v-model:open="viewTaskOpen"
      mode="edit"
      :item="viewingTask"
      :can-navigate-prev="canNavigatePrev"
      :can-navigate-next="canNavigateNext"
      :owners="taskOwners"
      @navigate-prev="navigatePrev"
      @navigate-next="navigateNext"
      @save="handleUpdateTask"
      @close="viewTaskOpen = false" />
  </Page>
</template>
