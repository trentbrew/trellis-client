<script setup lang="ts">
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'

  const props = withDefaults(
    defineProps<{
      viewMode?: BrowseViewMode
    }>(),
    {
      viewMode: 'table',
    },
  )

  type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually' | 'custom'
  type ScheduleCategory = 'Air Quality' | 'Water' | 'Hazmat' | 'Reporting' | 'General'
  type TrackedStatus = true | 'facility' | false

  const createScheduleOpen = ref(false)
  const viewScheduleOpen = ref(false)
  const viewingTask = ref<any>(null)
  const editScheduleOpen = ref(false)
  const selectedTasks = ref<string[]>([])

  const owners = ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Emily Brown', 'Operations Team', 'Environmental Team']
  const dialogOwners = computed(() =>
    owners.map((name: string, idx: number) => ({ id: String(idx + 1), name })),
  )

  const templates = [
    {
      id: 'tpl-air-monthly',
      name: 'Monthly Air Emissions Report',
      description: 'Submit monthly emissions data to EPA via CEDRI.',
      category: 'Air Quality' as ScheduleCategory,
      frequency: 'monthly' as Frequency,
      tracked: true as TrackedStatus,
    },
    {
      id: 'tpl-water-quarterly',
      name: 'Quarterly Wastewater Sampling',
      description: 'Collect and analyze wastewater discharge samples per NPDES permit.',
      category: 'Water' as ScheduleCategory,
      frequency: 'quarterly' as Frequency,
      tracked: true as TrackedStatus,
    },
    {
      id: 'tpl-hazmat-weekly',
      name: 'Bi-Weekly Hazardous Waste Inspection',
      description: 'Inspect satellite and central accumulation areas.',
      category: 'Hazmat' as ScheduleCategory,
      frequency: 'weekly' as Frequency,
      tracked: 'facility' as TrackedStatus,
    },
    {
      id: 'tpl-spcc',
      name: 'SPCC Plan Review',
      description: 'Annual review of Spill Prevention Control and Countermeasure Plan.',
      category: 'Hazmat' as ScheduleCategory,
      frequency: 'annually' as Frequency,
      tracked: true as TrackedStatus,
    },
  ]

  const _dialogTemplates = computed(() =>
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category as string,
      frequency: t.frequency,
      tracked: (t.tracked === 'facility'
        ? 'tracked-facility'
        : t.tracked === true
          ? 'tracked-corporate'
          : 'untracked') as any,
    })),
  )

  const detailTask = computed<any | null>(() => {
    if (!viewingTask.value) return null
    return {
      id: viewingTask.value.id,
      title: viewingTask.value.title,
      status: viewingTask.value.status === 'paused' ? 'pending' : 'on-track',
      priority: 'medium',
      dueDate: viewingTask.value.nextDue,
      owner: viewingTask.value.assignee,
      schedule: viewingTask.value.schedule,
    }
  })

  const STORAGE_KEY = 'platform-sandbox-viewing-task'

  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const task = scheduledTasks.value.find((t) => t.id === parsed.taskId)
        if (task) {
          viewingTask.value = task
          viewScheduleOpen.value = true
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  })

  watch([viewScheduleOpen, viewingTask], ([isOpen, task]) => {
    if (isOpen && task) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ taskId: task.id }))
    } else if (!isOpen) {
      localStorage.removeItem(STORAGE_KEY)
    }
  })

  const folders = ['Air Quality', 'Water Compliance', 'Hazardous Materials', 'Reporting & Documentation', 'General']

  const openViewDialog = (task: any) => {
    viewingTask.value = task
    viewScheduleOpen.value = true
  }

  const scheduledTasks = ref([
    {
      id: '1',
      title: 'Monthly Air Emissions Report',
      schedule: 'Monthly',
      nextDue: '2025-02-01',
      assignee: 'John Doe',
      status: 'active',
    },
    {
      id: '2',
      title: 'Quarterly Stormwater Sampling',
      schedule: 'Quarterly',
      nextDue: '2025-03-15',
      assignee: 'Jane Smith',
      status: 'active',
    },
    {
      id: '3',
      title: 'Annual SPCC Plan Review',
      schedule: 'Annually',
      nextDue: '2025-06-01',
      assignee: 'Mike Johnson',
      status: 'active',
    },
    {
      id: '4',
      title: 'Weekly Equipment Inspection',
      schedule: 'Weekly',
      nextDue: '2025-01-27',
      assignee: 'Sarah Wilson',
      status: 'paused',
    },
    {
      id: '5',
      title: 'Bi-Annual Training Certification',
      schedule: 'Semi-annually',
      nextDue: '2025-07-01',
      assignee: 'John Doe',
      status: 'active',
    },
    {
      id: '6',
      title: 'Weekly Tank Level Monitoring',
      schedule: 'Weekly',
      nextDue: '2025-01-28',
      assignee: 'Emily Chen',
      status: 'active',
    },
    {
      id: '7',
      title: 'Monthly Wastewater Discharge Report',
      schedule: 'Monthly',
      nextDue: '2025-02-15',
      assignee: 'David Park',
      status: 'active',
    },
    {
      id: '8',
      title: 'Quarterly Groundwater Monitoring',
      schedule: 'Quarterly',
      nextDue: '2025-04-01',
      assignee: 'Lisa Wang',
      status: 'active',
    },
    {
      id: '9',
      title: 'Annual Hazmat Inventory',
      schedule: 'Annually',
      nextDue: '2025-12-31',
      assignee: 'Tom Harris',
      status: 'active',
    },
    {
      id: '10',
      title: 'Weekly Safety Walk-through',
      schedule: 'Weekly',
      nextDue: '2025-01-29',
      assignee: 'Jane Smith',
      status: 'active',
    },
    {
      id: '11',
      title: 'Monthly Fire Extinguisher Check',
      schedule: 'Monthly',
      nextDue: '2025-02-28',
      assignee: 'Mike Johnson',
      status: 'paused',
    },
    {
      id: '12',
      title: 'Quarterly Emergency Drill',
      schedule: 'Quarterly',
      nextDue: '2025-03-30',
      assignee: 'Sarah Wilson',
      status: 'active',
    },
  ])

  const { browseState, filteredItems: filteredTasks } = useBrowse({
    items: scheduledTasks,
    searchFields: ['title', 'assignee'],
    defaultViewMode: 'table',
    sortOptions: [
      { value: 'nextDue', label: 'Next Due' },
      { value: 'title', label: 'Title' },
    ],
    filters: [
      {
        id: 'schedule',
        label: 'Schedule',
        icon: 'lucide:calendar-clock',
        options: [
          { value: 'all', label: 'All Schedules' },
          { value: 'Weekly', label: 'Weekly' },
          { value: 'Monthly', label: 'Monthly' },
          { value: 'Quarterly', label: 'Quarterly' },
          { value: 'Semi-annually', label: 'Semi-annually' },
          { value: 'Annually', label: 'Annually' },
        ],
        fn: (item: any, val: any) => val === 'all' || item.schedule === val,
      },
      {
        id: 'status',
        label: 'Status',
        icon: 'lucide:circle-dot',
        options: [
          { value: 'all', label: 'All Statuses' },
          { value: 'active', label: 'Active' },
          { value: 'paused', label: 'Paused' },
        ],
        fn: (item: any, val: any) => val === 'all' || item.status === val,
      },
    ],
  })

  const effectiveViewMode = computed(() => props.viewMode)

  const scheduleColors: Record<string, string> = {
    Daily: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    Weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Monthly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Quarterly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Semi-annually': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    Annually: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    Custom: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  }

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    paused: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const viewingTaskIndex = computed(() => {
    if (!viewingTask.value) return -1
    return scheduledTasks.value.findIndex((t) => t.id === viewingTask.value?.id)
  })

  const canNavigatePrev = computed(() => viewingTaskIndex.value > 0)
  const canNavigateNext = computed(() => viewingTaskIndex.value < scheduledTasks.value.length - 1)

  const navigateToPrevTask = () => {
    if (canNavigatePrev.value) {
      viewingTask.value = scheduledTasks.value[viewingTaskIndex.value - 1] ?? null
    }
  }

  const navigateToNextTask = () => {
    if (canNavigateNext.value) {
      viewingTask.value = scheduledTasks.value[viewingTaskIndex.value + 1] ?? null
    }
  }

  const _viewingTaskAttachments = computed<any[]>(() => [
    { id: '1', name: 'Inspection_Checklist.pdf', type: 'pdf' },
    { id: '2', name: 'Air_Quality_Data.xlsx', type: 'spreadsheet' },
  ])


  const handleUpdateScheduleFromDialog = (formData: any) => {
    if (!viewingTask.value) return
    const idx = scheduledTasks.value.findIndex((t) => t.id === viewingTask.value?.id)
    if (idx === -1) return
    const current = scheduledTasks.value[idx]
    if (!current) return

    const updated = {
      id: current.id,
      status: current.status,
      title: formData.title.trim(),
      schedule: formData.schedule || 'Custom',
      nextDue: formData.dueDate,
      assignee: formData.owner || 'Unassigned',
    }
    scheduledTasks.value[idx] = updated
    viewingTask.value = updated
    editScheduleOpen.value = false
  }

  const handleCreateFromDialog = (formData: any) => {
    scheduledTasks.value.unshift({
      id: `sched-${Math.random().toString(36).slice(2, 8)}`,
      title: formData.title.trim(),
      schedule: formData.schedule || 'Custom',
      nextDue: formData.dueDate,
      assignee: formData.owner || 'Unassigned',
      status: 'active',
    })
    createScheduleOpen.value = false
  }

  defineExpose({
    browseState,
    stats: computed(() => [
      { label: 'Total Scheduled', value: scheduledTasks.value.length, icon: 'lucide:clock' },
      {
        label: 'Active',
        value: scheduledTasks.value.filter((t) => t.status === 'active').length,
        icon: 'lucide:play-circle',
        color: 'text-emerald-500',
      },
      {
        label: 'Paused',
        value: scheduledTasks.value.filter((t) => t.status === 'paused').length,
        icon: 'lucide:pause-circle',
        color: 'text-amber-500',
      },
    ]),
    createScheduleOpen,
  })
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Table View -->
    <div v-if="effectiveViewMode === 'table'" class="overflow-hidden rounded-xl border border-border bg-card">
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead class="w-12">
              <UiCheckbox
                :checked="selectedTasks.length === filteredTasks.length && filteredTasks.length > 0"
                @update:checked="selectedTasks = $event ? filteredTasks.map((t) => t.id) : []" />
            </UiTableHead>
            <UiTableHead>Task</UiTableHead>
            <UiTableHead>Schedule</UiTableHead>
            <UiTableHead>Next Due</UiTableHead>
            <UiTableHead>Assignee</UiTableHead>
            <UiTableHead>Status</UiTableHead>
            <UiTableHead class="w-12"></UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <UiTableRow
            v-for="task in filteredTasks"
            :key="task.id"
            class="cursor-pointer hover:bg-muted/50"
            @click="openViewDialog(task)">
            <UiTableCell @click.stop>
              <UiCheckbox
                :checked="selectedTasks.includes(task.id)"
                @update:checked="
                  selectedTasks = $event ? [...selectedTasks, task.id] : selectedTasks.filter((id) => id !== task.id)
                " />
            </UiTableCell>
            <UiTableCell>
              <div class="flex items-center gap-2">
                <Icon name="lucide:repeat" class="h-4 w-4 text-muted-foreground" />
                <span class="font-medium">{{ task.title }}</span>
              </div>
            </UiTableCell>
            <UiTableCell>
              <span :class="['rounded-full px-2 py-1 text-xs font-medium', scheduleColors[task.schedule]]">
                {{ task.schedule }}
              </span>
            </UiTableCell>
            <UiTableCell class="text-muted-foreground">{{ task.nextDue }}</UiTableCell>
            <UiTableCell>{{ task.assignee }}</UiTableCell>
            <UiTableCell>
              <span :class="['rounded-full px-2 py-1 text-xs font-medium', statusColors[task.status]]">
                {{ task.status }}
              </span>
            </UiTableCell>
            <UiTableCell @click.stop>
              <UiButton variant="ghost" size="icon">
                <Icon name="lucide:more-horizontal" class="h-4 w-4" />
              </UiButton>
            </UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </UiTable>
    </div>

    <!-- List View -->
    <div v-else-if="effectiveViewMode === 'list'" class="space-y-2">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors cursor-pointer"
        @click="openViewDialog(task)">
        <UiCheckbox
          :checked="selectedTasks.includes(task.id)"
          @update:checked="
            selectedTasks = $event ? [...selectedTasks, task.id] : selectedTasks.filter((id) => id !== task.id)
          " />
        <Icon name="lucide:repeat" class="h-5 w-5 text-muted-foreground shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ task.title }}</p>
          <p class="text-sm text-muted-foreground">{{ task.assignee }} · Next: {{ task.nextDue }}</p>
        </div>
        <span :class="['rounded-full px-2 py-1 text-xs font-medium shrink-0', scheduleColors[task.schedule]]">
          {{ task.schedule }}
        </span>
        <span :class="['rounded-full px-2 py-1 text-xs font-medium shrink-0', statusColors[task.status]]">
          {{ task.status }}
        </span>
      </div>
    </div>

    <!-- Grid View -->
    <div v-else-if="effectiveViewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiCard
        v-for="task in filteredTasks"
        :key="task.id"
        class="relative overflow-hidden hover:bg-accent/30 transition-colors cursor-pointer"
        @click="openViewDialog(task)">
        <div class="absolute top-0 left-0 w-1 h-full" :class="(statusColors[task.status] || '').split(' ')[0]" />
        <UiCardHeader class="pb-2">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <UiCheckbox
                :checked="selectedTasks.includes(task.id)"
                @update:checked="
                  selectedTasks = $event ? [...selectedTasks, task.id] : selectedTasks.filter((id) => id !== task.id)
                " />
              <Icon name="lucide:repeat" class="h-4 w-4 text-muted-foreground" />
            </div>
            <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', statusColors[task.status]]">
              {{ task.status }}
            </span>
          </div>
          <UiCardTitle class="text-base mt-2">{{ task.title }}</UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="pt-0 space-y-2">
          <span :class="['rounded-full px-2 py-0.5 text-xs font-medium inline-block', scheduleColors[task.schedule]]">
            {{ task.schedule }}
          </span>
          <div class="flex items-center justify-between text-sm text-muted-foreground">
            <span>{{ task.assignee }}</span>
            <span>Next: {{ task.nextDue }}</span>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Calendar View -->
    <div v-else-if="effectiveViewMode === 'calendar'" class="h-fit min-h-125">
      <div class="flex items-center justify-center h-64 text-muted-foreground">
        Calendar view for scheduled tasks coming soon
      </div>
    </div>

    <div class="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
      Showing {{ filteredTasks.length }} scheduled tasks
    </div>

    <!-- View Schedule Dialog -->
    <CalendarItemDialog
      v-model:open="viewScheduleOpen"
      :item="detailTask"
      mode="edit"
      :can-navigate-prev="canNavigatePrev"
      :can-navigate-next="canNavigateNext"
      @navigate-prev="navigateToPrevTask"
      @navigate-next="navigateToNextTask"
      @save="handleUpdateScheduleFromDialog"
      @close="viewScheduleOpen = false" />

    <!-- Edit Schedule Overlay -->
    <CalendarItemDialog
      v-model:open="editScheduleOpen"
      mode="edit"
      :item="detailTask"
      :owners="dialogOwners"
      :folders="folders"
      @save="handleUpdateScheduleFromDialog"
      @close="editScheduleOpen = false" />

    <!-- Create Schedule Dialog -->
    <CalendarItemDialog
      v-model:open="createScheduleOpen"
      mode="create"
      item-type="task"
      :owners="dialogOwners"
      :folders="folders"
      :item="null"
      @save="handleCreateFromDialog"
      @close="createScheduleOpen = false" />
  </div>
</template>
