<script setup lang="ts">
  import { useGlobalDetailSheet } from '~/composables/useGlobalDetailSheet'

  definePageMeta({
    layout: 'default',
  })

  const { open: openDetail } = useGlobalDetailSheet()

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

  const priorityOptions = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]

  const statusOptions = [
    { value: 'overdue', label: 'Overdue' },
    { value: 'due soon', label: 'Due Soon' },
    { value: 'on track', label: 'On Track' },
  ]

  const createForm = reactive({
    title: '',
    dueDate: '',
    priority: 'medium',
    status: 'on track',
    assignee: 'You',
    notes: '',
  })

  const isCreateValid = computed(() => createForm.title.trim().length > 0)

  const resetCreateForm = () => {
    createForm.title = ''
    createForm.dueDate = ''
    createForm.priority = 'medium'
    createForm.status = 'on track'
    createForm.assignee = 'You'
    createForm.notes = ''
  }

  const handleCreateTask = (close: () => void) => {
    if (!isCreateValid.value) return
    const id = `p-${Math.random().toString(36).slice(2, 8)}`
    tasks.value.unshift({
      id,
      title: createForm.title.trim(),
      status: createForm.status,
      assignee: createForm.assignee,
      dueDate: createForm.dueDate || 'TBD',
      priority: createForm.priority,
    })
    resetCreateForm()
    close()
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
      type: 'dialog',
      dialogId: 'create-task',
      variant: 'outline',
    }">
    <template #dialog-create-task="{ close }">
      <UiDialogContent class="max-w-3xl p-0 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <UiDialogHeader class="border-b border-border bg-muted/30 px-6 py-5">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Icon name="lucide:clipboard-list" class="h-5 w-5" />
              </div>
              <div>
                <UiDialogTitle class="text-lg">Create a personal task</UiDialogTitle>
                <UiDialogDescription class="text-sm">
                  Capture a quick reminder or follow-up assigned to you.
                </UiDialogDescription>
              </div>
            </div>
            <UiBadge variant="outline" class="text-[11px] font-semibold uppercase tracking-[0.2em]">Personal</UiBadge>
          </div>
        </UiDialogHeader>
        <div class="grid gap-6 px-6 py-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div class="space-y-6">
            <div class="rounded-xl border border-border/60 bg-background p-4 shadow-sm">
              <div class="flex items-center justify-between">
                <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Details</p>
                <UiBadge variant="outline" class="text-[11px]">Draft</UiBadge>
              </div>
              <div class="mt-4 space-y-4">
                <div class="space-y-2">
                  <UiLabel for="task-title">Task title</UiLabel>
                  <UiInput id="task-title" v-model="createForm.title" placeholder="Follow up on inspection notes" />
                </div>
                <div class="space-y-2">
                  <UiLabel for="task-notes">Notes</UiLabel>
                  <UiTextarea
                    id="task-notes"
                    v-model="createForm.notes"
                    :rows="4"
                    placeholder="Add context, links, or reminders" />
                </div>
              </div>
            </div>
          </div>
          <div class="space-y-6">
            <div class="rounded-xl border border-border/60 bg-background p-4 shadow-sm">
              <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Schedule</p>
              <div class="mt-4 space-y-4">
                <div class="space-y-2">
                  <UiLabel for="task-due">Due date</UiLabel>
                  <UiInput id="task-due" v-model="createForm.dueDate" type="date" />
                </div>
                <div class="space-y-2">
                  <UiLabel>Status</UiLabel>
                  <UiSelect v-model="createForm.status">
                    <UiSelectTrigger>
                      <UiSelectValue placeholder="Select status" />
                    </UiSelectTrigger>
                    <UiSelectContent>
                      <UiSelectItem v-for="option in statusOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </UiSelectItem>
                    </UiSelectContent>
                  </UiSelect>
                </div>
                <div class="space-y-2">
                  <UiLabel>Priority</UiLabel>
                  <UiSelect v-model="createForm.priority">
                    <UiSelectTrigger>
                      <UiSelectValue placeholder="Select priority" />
                    </UiSelectTrigger>
                    <UiSelectContent>
                      <UiSelectItem v-for="option in priorityOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </UiSelectItem>
                    </UiSelectContent>
                  </UiSelect>
                </div>
              </div>
            </div>
            <div class="rounded-xl border border-border/60 bg-background p-4 shadow-sm">
              <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Assignment</p>
              <div class="mt-4 space-y-4">
                <div class="space-y-2">
                  <UiLabel for="task-assignee">Assignee</UiLabel>
                  <UiInput id="task-assignee" v-model="createForm.assignee" placeholder="You" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <UiDialogFooter class="border-t border-border bg-muted/20 px-6 py-4">
          <UiButton
            variant="outline"
            @click="() => {
              resetCreateForm()
              close()
            }">
            Cancel
          </UiButton>
          <UiButton :disabled="!isCreateValid" @click="handleCreateTask(close)">Create Task</UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </template>
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
        @click="openDetail(task, { entityType: 'task' })">
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
            @click="openDetail(task, { entityType: 'task' })">
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
  </Page>
</template>
