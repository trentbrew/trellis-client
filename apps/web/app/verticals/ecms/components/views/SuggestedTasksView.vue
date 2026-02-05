<script setup lang="ts">
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import UnifiedTaskDialog, {
    type TaskData,
    type Attachment,
    type ActivityItem,
  } from '~/components/dialogs/UnifiedTaskDialog.vue'

  const props = withDefaults(
    defineProps<{
      viewMode?: BrowseViewMode
    }>(),
    {
      viewMode: 'grid',
    },
  )

  type TaskSource = 'apptool' | 'ecms' | 'bolcc' | 'audit' | 'neu' | 'permit' | 'vendor' | 'manual'

  interface SuggestedTask {
    id: string
    title: string
    reason: string
    priority: string
    category: string
    type: 'compliance-issue' | 'deficient-task' | 'regulatory-update' | 'best-practice'
    source: TaskSource
  }

  // Dialog state
  const viewDialogOpen = ref(false)
  const viewingTask = ref<SuggestedTask | null>(null)

  const editTaskOpen = ref(false)

  const openViewDialog = (task: SuggestedTask) => {
    viewingTask.value = task
    viewDialogOpen.value = true
  }

  const editOwners = ref([
    { id: '1', name: 'Operations Team' },
    { id: '2', name: 'Environmental Team' },
  ])

  const editFolders = ref(['Suggested', 'General'])

  const mapSuggestedCategory = (category: string) => {
    switch (category) {
      case 'safety':
        return 'General Safety'
      case 'permits':
        return 'Corp'
      case 'training':
        return 'General Safety'
      case 'emissions':
        return 'Air'
      case 'inventory':
        return 'Waste'
      default:
        return 'General Safety'
    }
  }

  const editInitialData = computed(() => {
    if (!viewingTask.value) return {}
    return {
      title: viewingTask.value.title,
      description: viewingTask.value.reason,
      nextDue: new Date().toISOString().split('T')[0] ?? '',
      owner: editOwners.value[0]?.name || '',
      category: mapSuggestedCategory(viewingTask.value.category),
      tracked: true,
    }
  })

  const sourceLabels: Record<TaskSource, string> = {
    apptool: 'AppTool',
    ecms: 'ECMS',
    bolcc: 'BOLCC',
    audit: 'Audit',
    neu: 'NEU',
    permit: 'Permit',
    vendor: 'Vendor',
    manual: 'Manual',
  }

  const sourceColors: Record<TaskSource, string> = {
    apptool: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    ecms: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    bolcc: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    audit: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    neu: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    permit: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    vendor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    manual: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }

  const suggestedTasks = ref<SuggestedTask[]>([
    {
      id: '1',
      title: 'Update Emergency Response Plan',
      reason: 'Last updated over 12 months ago',
      priority: 'high',
      category: 'safety',
      type: 'deficient-task',
      source: 'ecms',
    },
    {
      id: '2',
      title: 'Review Stormwater Permit Limits',
      reason: 'New EPA guidelines released',
      priority: 'medium',
      category: 'permits',
      type: 'regulatory-update',
      source: 'permit',
    },
    {
      id: '3',
      title: 'Schedule Hazardous Waste Training',
      reason: 'Employee certifications expiring soon',
      priority: 'high',
      category: 'training',
      type: 'compliance-issue',
      source: 'neu',
    },
    {
      id: '4',
      title: 'Audit Chemical Inventory',
      reason: 'Quarterly review recommended',
      priority: 'medium',
      category: 'inventory',
      type: 'best-practice',
      source: 'audit',
    },
    {
      id: '5',
      title: 'Update Air Emissions Calculations',
      reason: 'Production volume changed significantly',
      priority: 'low',
      category: 'emissions',
      type: 'compliance-issue',
      source: 'apptool',
    },
    {
      id: '6',
      title: 'Review Spill Prevention Procedures',
      reason: 'Recent near-miss incident reported',
      priority: 'high',
      category: 'safety',
      type: 'compliance-issue',
      source: 'bolcc',
    },
    {
      id: '7',
      title: 'Update Noise Monitoring Protocol',
      reason: 'Equipment changes may affect readings',
      priority: 'low',
      category: 'emissions',
      type: 'best-practice',
      source: 'ecms',
    },
    {
      id: '8',
      title: 'Verify Waste Manifest Records',
      reason: 'Annual audit approaching',
      priority: 'medium',
      category: 'inventory',
      type: 'deficient-task',
      source: 'vendor',
    },
    {
      id: '9',
      title: 'Schedule Fire Safety Inspection',
      reason: 'Due within 30 days',
      priority: 'high',
      category: 'safety',
      type: 'deficient-task',
      source: 'audit',
    },
    {
      id: '10',
      title: 'Review Tank Inspection Results',
      reason: 'Recent inspection completed',
      priority: 'medium',
      category: 'permits',
      type: 'regulatory-update',
      source: 'permit',
    },
    {
      id: '11',
      title: 'Update Chemical SDS Library',
      reason: 'New chemicals added to inventory',
      priority: 'medium',
      category: 'inventory',
      type: 'best-practice',
      source: 'ecms',
    },
    {
      id: '12',
      title: 'Prepare Tier II Reporting Data',
      reason: 'Annual deadline in 60 days',
      priority: 'high',
      category: 'permits',
      type: 'compliance-issue',
      source: 'apptool',
    },
  ])

  const typeLabels: Record<string, string> = {
    'compliance-issue': 'Compliance Issue',
    'deficient-task': 'Deficient Task',
    'regulatory-update': 'Regulatory Update',
    'best-practice': 'Best Practice',
  }

  const typeColors: Record<string, string> = {
    'compliance-issue': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'deficient-task': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'regulatory-update': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'best-practice': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  }

  const categoryIcons: Record<string, string> = {
    safety: 'lucide:shield',
    permits: 'lucide:file-text',
    training: 'lucide:graduation-cap',
    inventory: 'lucide:package',
    emissions: 'lucide:wind',
  }

  function acceptTask(taskId: string) {
    suggestedTasks.value = suggestedTasks.value.filter((t) => t.id !== taskId)
  }

  function dismissTask(taskId: string) {
    suggestedTasks.value = suggestedTasks.value.filter((t) => t.id !== taskId)
  }

  const { browseState, filteredItems: filteredSuggestedTasks } = useBrowse({
    items: suggestedTasks,
    searchFields: ['title', 'reason'],
    defaultViewMode: 'grid',
    sortOptions: [
      { value: 'priority', label: 'Priority' },
      { value: 'title', label: 'Title' },
      { value: 'type', label: 'Type' },
    ],
    filters: [
      {
        id: 'type',
        label: 'Type',
        icon: 'lucide:layers',
        options: [
          { value: 'all', label: 'All Types' },
          { value: 'compliance-issue', label: 'Compliance Issue' },
          { value: 'deficient-task', label: 'Deficient Task' },
          { value: 'regulatory-update', label: 'Regulatory Update' },
          { value: 'best-practice', label: 'Best Practice' },
        ],
        fn: (item, val) => item.type === val,
      },
      {
        id: 'priority',
        label: 'Priority',
        icon: 'lucide:signal',
        options: [
          { value: 'all', label: 'All Priorities' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ],
        fn: (item, val) => item.priority === val,
      },
      {
        id: 'category',
        label: 'Category',
        icon: 'lucide:tag',
        options: [
          { value: 'all', label: 'All Categories' },
          { value: 'safety', label: 'Safety' },
          { value: 'permits', label: 'Permits' },
          { value: 'training', label: 'Training' },
          { value: 'inventory', label: 'Inventory' },
          { value: 'emissions', label: 'Emissions' },
        ],
        fn: (item, val) => item.category === val,
      },
      {
        id: 'source',
        label: 'Source',
        icon: 'lucide:database',
        options: [
          { value: 'all', label: 'All Sources' },
          { value: 'apptool', label: 'AppTool' },
          { value: 'ecms', label: 'ECMS' },
          { value: 'bolcc', label: 'BOLCC' },
          { value: 'audit', label: 'Audit' },
          { value: 'neu', label: 'NEU' },
          { value: 'permit', label: 'Permit' },
          { value: 'vendor', label: 'Vendor' },
        ],
        fn: (item, val) => item.source === val,
      },
    ],
  })

  const effectiveViewMode = computed(() => props.viewMode)

  onMounted(() => {
    window.addEventListener('global-detail-sheet:save', ((e: CustomEvent) => {
      const { node, formData, mode } = e.detail
      if (e.detail.entityType !== 'suggested-task') return

      if (mode === 'create') {
        suggestedTasks.value.push({ ...formData, id: crypto.randomUUID() })
      } else {
        const index = suggestedTasks.value.findIndex((t) => t.id === node.id)
        if (index !== -1) suggestedTasks.value[index] = { ...suggestedTasks.value[index], ...formData }
      }
    }) as EventListener)

    window.addEventListener('global-detail-sheet:delete', ((e: CustomEvent) => {
      const { node } = e.detail
      if (e.detail.entityType !== 'suggested-task') return
      suggestedTasks.value = suggestedTasks.value.filter((t) => t.id !== node.id)
    }) as EventListener)
  })

  // Navigation for dialog
  const viewingTaskIndex = computed(() => {
    if (!viewingTask.value) return -1
    return suggestedTasks.value.findIndex((t) => t.id === viewingTask.value?.id)
  })
  const canNavigatePrev = computed(() => viewingTaskIndex.value > 0)
  const canNavigateNext = computed(() => viewingTaskIndex.value < suggestedTasks.value.length - 1)
  const navigateToPrevTask = () => {
    if (canNavigatePrev.value) viewingTask.value = suggestedTasks.value[viewingTaskIndex.value - 1] ?? null
  }
  const navigateToNextTask = () => {
    if (canNavigateNext.value) viewingTask.value = suggestedTasks.value[viewingTaskIndex.value + 1] ?? null
  }

  const viewingTaskAttachments = computed<Attachment[]>(() => [])
  const viewingTaskActivity = computed<ActivityItem[]>(() => [
    { id: '1', type: 'created', author: 'AI Assistant', date: 'Just now', content: viewingTask.value?.reason },
  ])

  const handleUpdateSuggestedFromDialog = (formData: any) => {
    if (!viewingTask.value) return
    const idx = suggestedTasks.value.findIndex((t) => t.id === viewingTask.value?.id)
    if (idx === -1) return
    const current = suggestedTasks.value[idx]
    if (!current) return

    const updated: SuggestedTask = {
      ...current,
      title: formData.title,
      reason: formData.description,
    }

    suggestedTasks.value[idx] = updated
    suggestedTasks.value = [...suggestedTasks.value]
    viewingTask.value = updated
    editTaskOpen.value = false
  }

  const detailTask = computed<TaskData | null>(() => {
    if (!viewingTask.value) return null
    return {
      id: viewingTask.value.id,
      title: viewingTask.value.title,
      description: viewingTask.value.reason,
      status: 'pending',
      priority: (viewingTask.value.priority as any) || 'medium',
      dueDate: new Date().toISOString().split('T')[0] || '',
      category: viewingTask.value.category,
    }
  })

  defineExpose({
    browseState,
    stats: computed(() => [
      { label: 'Suggestions', value: suggestedTasks.value.length, icon: 'lucide:lightbulb' },
      {
        label: 'High Priority',
        value: suggestedTasks.value.filter((t) => t.priority === 'high').length,
        icon: 'lucide:alert-triangle',
        color: 'text-rose-500',
      },
      {
        label: 'Est. Total Time',
        value: '19h',
        icon: 'lucide:clock',
        color: 'text-blue-500',
      },
    ]),
  })
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Grid View -->
    <div v-if="effectiveViewMode === 'grid'" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <UiCard
        v-for="task in filteredSuggestedTasks"
        :key="task.id"
        class="relative overflow-hidden cursor-pointer"
        @click="openViewDialog(task)">
        <div class="absolute top-0 left-0 w-1 h-full" :class="(priorityColors[task.priority] || '').split(' ')[0]" />
        <UiCardHeader class="pb-3">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon :name="categoryIcons[task.category] || 'lucide:clipboard'" class="h-5 w-5 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <UiCardTitle class="text-base">{{ task.title }}</UiCardTitle>
              <div class="flex flex-wrap items-center gap-1.5 mt-1">
                <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', typeColors[task.type]]">
                  {{ typeLabels[task.type] }}
                </span>
                <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', priorityColors[task.priority]]">
                  {{ task.priority }}
                </span>
              </div>
            </div>
          </div>
        </UiCardHeader>
        <UiCardContent class="pt-0 space-y-3">
          <div class="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <Icon name="lucide:sparkles" class="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p class="text-xs text-muted-foreground">{{ task.reason }}</p>
          </div>
        </UiCardContent>
        <UiCardFooter class="pt-0">
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="lucide:sparkles" class="h-3 w-3" />
              <span>AI Suggested</span>
            </div>
            <span :class="['rounded-full px-2 py-0.5 text-[10px] font-medium', sourceColors[task.source]]">
              {{ sourceLabels[task.source] }}
            </span>
          </div>
        </UiCardFooter>
      </UiCard>
    </div>

    <!-- List View -->
    <div v-else-if="effectiveViewMode === 'list'" class="space-y-2">
      <div
        v-for="task in filteredSuggestedTasks"
        :key="task.id"
        class="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors cursor-pointer"
        @click="openViewDialog(task)">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon :name="categoryIcons[task.category] || 'lucide:clipboard'" class="h-5 w-5 text-muted-foreground" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ task.title }}</p>
          <p class="text-sm text-muted-foreground truncate">{{ task.reason }}</p>
        </div>
        <span :class="['rounded-full px-2 py-1 text-xs font-medium shrink-0', typeColors[task.type]]">
          {{ typeLabels[task.type] }}
        </span>
        <span :class="['rounded-full px-2 py-1 text-xs font-medium shrink-0', priorityColors[task.priority]]">
          {{ task.priority }}
        </span>
      </div>
    </div>

    <!-- Table View -->
    <div v-else-if="effectiveViewMode === 'table'" class="rounded-xl border border-border bg-card">
      <div class="overflow-x-auto">
        <UiTable>
          <UiTableHeader>
            <UiTableRow>
              <UiTableHead class="min-w-[250px]">Task</UiTableHead>
              <UiTableHead class="min-w-[200px]">Reason</UiTableHead>
              <UiTableHead>Type</UiTableHead>
              <UiTableHead>Priority</UiTableHead>
              <UiTableHead>Source</UiTableHead>
              <UiTableHead>Category</UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <UiTableRow
              v-for="task in filteredSuggestedTasks"
              :key="task.id"
              class="cursor-pointer hover:bg-muted/50"
              @click="openViewDialog(task)">
              <UiTableCell class="font-medium">{{ task.title }}</UiTableCell>
              <UiTableCell class="text-muted-foreground text-sm">{{ task.reason }}</UiTableCell>
              <UiTableCell>
                <span :class="['rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap', typeColors[task.type]]">
                  {{ typeLabels[task.type] }}
                </span>
              </UiTableCell>
              <UiTableCell>
                <span :class="['rounded-full px-2 py-1 text-xs font-medium', priorityColors[task.priority]]">
                  {{ task.priority }}
                </span>
              </UiTableCell>
              <UiTableCell>
                <span
                  :class="['rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap', sourceColors[task.source]]">
                  {{ sourceLabels[task.source] }}
                </span>
              </UiTableCell>
              <UiTableCell class="capitalize">{{ task.category }}</UiTableCell>
            </UiTableRow>
          </UiTableBody>
        </UiTable>
      </div>
    </div>

    <div v-if="filteredSuggestedTasks.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <Icon name="lucide:check-circle" class="h-12 w-12 text-emerald-500" />
      <h3 class="mt-4 text-lg font-medium">All caught up!</h3>
      <p class="mt-2 text-sm text-muted-foreground">No new suggestions at this time. Check back later.</p>
    </div>

    <div v-else class="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
      Showing {{ filteredSuggestedTasks.length }} suggestions
    </div>

    <!-- View Task Dialog -->
    <UnifiedTaskDialog
      v-model:open="viewDialogOpen"
      :task="detailTask"
      mode="edit"
      task-type="suggested"
      :can-navigate-prev="canNavigatePrev"
      :can-navigate-next="canNavigateNext"
      :attachments="viewingTaskAttachments"
      :activity="viewingTaskActivity"
      @navigate-prev="navigateToPrevTask"
      @navigate-next="navigateToNextTask"
      @mark-not-applicable="() => dismissTask(viewingTask?.id || '')"
      @already-resolved="() => dismissTask(viewingTask?.id || '')"
      @already-have-task="() => dismissTask(viewingTask?.id || '')"
      @create-task="() => acceptTask(viewingTask?.id || '')"
      @close="viewDialogOpen = false">
      <!-- Suggestion Reason Content -->
      <template #content>
        <div v-if="viewingTask" class="space-y-4">
          <div class="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
            <div class="flex items-start gap-3">
              <Icon name="lucide:sparkles" class="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p class="text-sm font-medium text-amber-800 dark:text-amber-200">Why this is suggested</p>
                <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">{{ viewingTask.reason }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UnifiedTaskDialog>

    <TaskCreateDialog
      v-model:open="editTaskOpen"
      mode="edit"
      overlay-class="bg-background/15"
      :is-recurring="false"
      :initial-data="editInitialData"
      :owners="editOwners"
      :folders="editFolders"
      @save="handleUpdateSuggestedFromDialog"
      @close="editTaskOpen = false" />
  </div>
</template>
