<script setup lang="ts">
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem } from '~/types/calendarItem'
  import { createDefaultItem } from '~/types/calendarItem'

  definePageMeta({
    layout: 'default',
  })

  const tasks = ref([
    {
      id: 'p-1',
      title: 'Review facility inspection notes',
      status: 'due soon',
      assignee: 'You',
      dueDate: '2025-01-28',
      priority: 'medium',
    },
    {
      id: 'p-2',
      title: 'Submit weekly compliance update',
      status: 'on track',
      assignee: 'You',
      dueDate: '2025-02-05',
      priority: 'low',
    },
    {
      id: 'p-3',
      title: 'Confirm permit renewal schedule',
      status: 'overdue',
      assignee: 'You',
      dueDate: '2025-01-15',
      priority: 'high',
    },
  ])

  const statusStyles: Record<string, string> = {
    overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    'due soon': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'on track': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  const priorityIcons: Record<string, string> = {
    high: 'lucide:alert-circle',
    medium: 'lucide:minus-circle',
    low: 'lucide:arrow-down-circle',
  }

  const priorityColors: Record<string, string> = {
    high: 'text-rose-500',
    medium: 'text-amber-500',
    low: 'text-blue-500',
  }

  const kanbanColumns = computed(() => [
    {
      id: 'overdue',
      label: 'Overdue',
      color: 'border-red-500',
      tasks: tasks.value.filter((t) => t.status === 'overdue'),
    },
    {
      id: 'due soon',
      label: 'Due Soon',
      color: 'border-amber-500',
      tasks: tasks.value.filter((t) => t.status === 'due soon'),
    },
    {
      id: 'on track',
      label: 'On Track',
      color: 'border-emerald-500',
      tasks: tasks.value.filter((t) => t.status === 'on track'),
    },
  ])

  const viewMode = ref('list')

  // Dialog state
  const createTaskOpen = ref(false)
  const viewTaskOpen = ref(false)
  const viewingTask = ref<CalendarItem | null>(null)
  const dialogMode = ref<'create' | 'edit'>('create')

  const taskOwners = [{ id: 'you', name: 'You' }]

  function openTaskCreate() {
    dialogMode.value = 'create'
    viewingTask.value = null
    createTaskOpen.value = true
  }

  function openTaskDetail(task: any) {
    dialogMode.value = 'edit'
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
    return tasks.value.findIndex((t) => t.id === viewingTask.value?.id)
  })

  const canNavigatePrev = computed(() => viewingTaskIndex.value > 0)
  const canNavigateNext = computed(() => viewingTaskIndex.value < tasks.value.length - 1)

  function navigatePrev() {
    if (canNavigatePrev.value) {
      const task = tasks.value[viewingTaskIndex.value - 1]
      if (task) openTaskDetail(task)
    }
  }

  function navigateNext() {
    if (canNavigateNext.value) {
      const task = tasks.value[viewingTaskIndex.value + 1]
      if (task) openTaskDetail(task)
    }
  }

  function handleCreateTask(item: CalendarItem) {
    tasks.value.unshift({
      id: item.id || `p-${Math.random().toString(36).slice(2, 8)}`,
      title: item.title,
      status: 'on track',
      assignee: 'You',
      dueDate: item.startDate || 'TBD',
      priority: item.priority || 'medium',
    })
    createTaskOpen.value = false
  }

  function handleUpdateTask(item: CalendarItem) {
    const idx = tasks.value.findIndex((t) => t.id === item.id)
    if (idx !== -1) {
      tasks.value[idx] = {
        ...tasks.value[idx]!,
        title: item.title,
        dueDate: item.startDate || tasks.value[idx]!.dueDate,
        priority: item.priority || tasks.value[idx]!.priority,
      }
    }
    viewTaskOpen.value = false
  }
</script>

<template>
  <Page
    variant="browse"
    title="My Tasks"
    subtitle="Personal"
    description="Tasks assigned to you across all facilities."
    icon="lucide:check-square"
    icon-class="text-emerald-300"
    :show-view-switcher="true"
    :primary-action="{
      label: 'New Task',
      icon: 'lucide:plus',
      type: 'click',
      onClick: openTaskCreate,
      variant: 'outline',
    }">
    <template #viewSwitcher>
      <div class="flex items-center gap-2">
        <button
          v-for="mode in ['list', 'kanban']"
          :key="mode"
          type="button"
          class="flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors"
          :class="
            viewMode === mode
              ? 'bg-foreground/10 text-foreground'
              : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
          "
          @click="viewMode = mode">
          <Icon :name="mode === 'kanban' ? 'lucide:layout-grid' : 'lucide:list'" class="h-4 w-4" />
          {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
        </button>
      </div>
    </template>

    <!-- List View -->
    <div v-if="viewMode === 'list'" class="space-y-3">
      <div
        v-for="task in tasks"
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
        class="shrink-0 w-72 rounded-lg border-t-4 bg-muted/30"
        :class="column.color">
        <div class="p-3 border-b border-border">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-sm">{{ column.label }}</h3>
            <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {{ column.tasks.length }}
            </span>
          </div>
        </div>
        <div class="p-2 space-y-2 min-h-[200px]">
          <div
            v-for="task in column.tasks"
            :key="task.id"
            class="rounded-lg border border-border bg-card p-3 hover:bg-accent/30 transition-colors cursor-pointer"
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
