<script setup lang="ts">
  import FolderCreateDialog, { type FolderFormData } from '~/components/dialogs/FolderCreateDialog.vue'

  interface Task {
    id: string
    name: string
    status: 'active' | 'paused' | 'completed'
    schedule: string
    nextDue: string
    assignee: string
    category: string
    description: string
  }

  interface TaskOccurrence {
    id: string
    dueDate: string
    isOverdue: boolean
  }

  interface TreeNode {
    id: string
    name: string
    icon: string
    color: string
    type: 'folder' | 'task'
    children?: TreeNode[]
    task?: Task
  }

  // Folder dialog state
  const createFolderOpen = ref(false)

  const handleCreateFolder = (data: FolderFormData) => {
    // Add the new folder to the tree
    const newFolder: TreeNode = {
      id: `folder-${Date.now()}`,
      name: data.name,
      icon: data.icon,
      color: data.color.split(' ')[1] || 'text-blue-500', // Extract text color from full color class
      type: 'folder',
      children: [],
    }
    folderTree.value.push(newFolder)
    createFolderOpen.value = false
  }

  const treeSearch = ref('')
  const expandedIds = ref<string[]>(['folder-compliance', 'folder-air-quality', 'folder-safety', 'folder-permits'])
  const selectedNode = ref<TreeNode | undefined>(undefined)

  const selectedOccurrenceIndex = ref(0)

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600',
    paused: 'bg-amber-500/10 text-amber-600',
    completed: 'bg-blue-500/10 text-blue-600',
  }

  const scheduleColors: Record<string, string> = {
    Daily: 'bg-rose-100 text-rose-700',
    Weekly: 'bg-blue-100 text-blue-700',
    Monthly: 'bg-emerald-100 text-emerald-700',
    Quarterly: 'bg-amber-100 text-amber-700',
    Annually: 'bg-violet-100 text-violet-700',
  }

  const folderTree = ref<TreeNode[]>([
    {
      id: 'folder-compliance',
      name: 'Compliance',
      icon: 'lucide:folder',
      color: 'text-blue-500',
      type: 'folder',
      children: [
        {
          id: 'folder-air-quality',
          name: 'Air Quality',
          icon: 'lucide:wind',
          color: 'text-sky-500',
          type: 'folder',
          children: [
            {
              id: 'task-1',
              name: 'Monthly Air Emissions Report',
              icon: 'lucide:file-text',
              color: 'text-muted-foreground',
              type: 'task',
              task: {
                id: 'task-1',
                name: 'Monthly Air Emissions Report',
                status: 'active',
                schedule: 'Monthly',
                nextDue: '2025-02-01',
                assignee: 'John Doe',
                category: 'Air Quality',
                description:
                  'Prepare and submit monthly air emissions data to regulatory agencies. Include stack testing results, emission calculations, and compliance verification.',
              },
            },
            {
              id: 'task-2',
              name: 'Quarterly Stack Testing',
              icon: 'lucide:file-text',
              color: 'text-muted-foreground',
              type: 'task',
              task: {
                id: 'task-2',
                name: 'Quarterly Stack Testing',
                status: 'active',
                schedule: 'Quarterly',
                nextDue: '2025-03-15',
                assignee: 'Jane Smith',
                category: 'Air Quality',
                description:
                  'Conduct quarterly stack emissions testing on all major sources. Document results and compare against permit limits.',
              },
            },
          ],
        },
        {
          id: 'folder-water',
          name: 'Water',
          icon: 'lucide:droplets',
          color: 'text-cyan-500',
          type: 'folder',
          children: [
            {
              id: 'task-3',
              name: 'Stormwater Sampling',
              icon: 'lucide:file-text',
              color: 'text-muted-foreground',
              type: 'task',
              task: {
                id: 'task-3',
                name: 'Stormwater Sampling',
                status: 'active',
                schedule: 'Quarterly',
                nextDue: '2025-03-20',
                assignee: 'Mike Johnson',
                category: 'Water',
                description:
                  'Collect stormwater samples from all discharge points during qualifying rain events. Analyze for permitted parameters.',
              },
            },
            {
              id: 'task-4',
              name: 'Wastewater Discharge Report',
              icon: 'lucide:file-text',
              color: 'text-muted-foreground',
              type: 'task',
              task: {
                id: 'task-4',
                name: 'Wastewater Discharge Report',
                status: 'paused',
                schedule: 'Monthly',
                nextDue: '2025-02-15',
                assignee: 'Sarah Wilson',
                category: 'Water',
                description:
                  'Compile monthly wastewater discharge monitoring data. Calculate daily and monthly averages for comparison with permit limits.',
              },
            },
          ],
        },
      ],
    },
    {
      id: 'folder-safety',
      name: 'Safety',
      icon: 'lucide:shield',
      color: 'text-emerald-500',
      type: 'folder',
      children: [
        {
          id: 'task-5',
          name: 'Weekly Safety Walk-through',
          icon: 'lucide:file-text',
          color: 'text-muted-foreground',
          type: 'task',
          task: {
            id: 'task-5',
            name: 'Weekly Safety Walk-through',
            status: 'active',
            schedule: 'Weekly',
            nextDue: '2025-01-29',
            assignee: 'Emily Chen',
            category: 'Safety',
            description:
              'Conduct weekly safety inspection of all operational areas. Document any hazards, near-misses, or safety concerns.',
          },
        },
        {
          id: 'task-6',
          name: 'Monthly Fire Extinguisher Check',
          icon: 'lucide:file-text',
          color: 'text-muted-foreground',
          type: 'task',
          task: {
            id: 'task-6',
            name: 'Monthly Fire Extinguisher Check',
            status: 'completed',
            schedule: 'Monthly',
            nextDue: '2025-02-28',
            assignee: 'David Park',
            category: 'Safety',
            description:
              'Inspect all fire extinguishers for proper charge, accessibility, and signage. Tag and document inspection results.',
          },
        },
        {
          id: 'task-7',
          name: 'Quarterly Emergency Drill',
          icon: 'lucide:file-text',
          color: 'text-muted-foreground',
          type: 'task',
          task: {
            id: 'task-7',
            name: 'Quarterly Emergency Drill',
            status: 'active',
            schedule: 'Quarterly',
            nextDue: '2025-03-30',
            assignee: 'Lisa Wang',
            category: 'Safety',
            description:
              'Conduct quarterly emergency response drill. Rotate between fire, spill, and evacuation scenarios. Document participation and response times.',
          },
        },
      ],
    },
    {
      id: 'folder-permits',
      name: 'Permits',
      icon: 'lucide:file-badge',
      color: 'text-purple-500',
      type: 'folder',
      children: [
        {
          id: 'task-8',
          name: 'Annual Permit Renewal Review',
          icon: 'lucide:file-text',
          color: 'text-muted-foreground',
          type: 'task',
          task: {
            id: 'task-8',
            name: 'Annual Permit Renewal Review',
            status: 'active',
            schedule: 'Annually',
            nextDue: '2025-11-01',
            assignee: 'Tom Harris',
            category: 'Permits',
            description:
              'Review all facility permits for upcoming renewal deadlines. Prepare renewal applications and supporting documentation.',
          },
        },
        {
          id: 'task-9',
          name: 'SPCC Plan Review',
          icon: 'lucide:file-text',
          color: 'text-muted-foreground',
          type: 'task',
          task: {
            id: 'task-9',
            name: 'SPCC Plan Review',
            status: 'active',
            schedule: 'Annually',
            nextDue: '2025-06-01',
            assignee: 'John Doe',
            category: 'Permits',
            description: 'Review and update Spill Prevention, Control, and Countermeasure plan.',
          },
        },
      ],
    },
    {
      id: 'folder-training',
      name: 'Training',
      icon: 'lucide:graduation-cap',
      color: 'text-indigo-500',
      type: 'folder',
      children: [
        {
          id: 'task-10',
          name: 'Annual HAZWOPER Refresher',
          icon: 'lucide:file-text',
          color: 'text-muted-foreground',
          type: 'task',
          task: {
            id: 'task-10',
            name: 'Annual HAZWOPER Refresher',
            status: 'active',
            schedule: 'Annually',
            nextDue: '2025-06-15',
            assignee: 'Emily Chen',
            category: 'Training',
            description: 'Conduct annual 8-hour HAZWOPER refresher training for qualified personnel.',
          },
        },
        {
          id: 'task-11',
          name: 'New Employee Orientation',
          icon: 'lucide:file-text',
          color: 'text-muted-foreground',
          type: 'task',
          task: {
            id: 'task-11',
            name: 'New Employee Orientation',
            status: 'active',
            schedule: 'Monthly',
            nextDue: '2025-02-05',
            assignee: 'David Park',
            category: 'Training',
            description: 'Conduct safety orientation for all new employees.',
          },
        },
      ],
    },
    {
      id: 'folder-inspections',
      name: 'Inspections',
      icon: 'lucide:clipboard-check',
      color: 'text-rose-500',
      type: 'folder',
      children: [
        {
          id: 'task-12',
          name: 'Monthly Equipment Inspection',
          icon: 'lucide:file-text',
          color: 'text-muted-foreground',
          type: 'task',
          task: {
            id: 'task-12',
            name: 'Monthly Equipment Inspection',
            status: 'active',
            schedule: 'Monthly',
            nextDue: '2025-02-10',
            assignee: 'Mike Johnson',
            category: 'Inspections',
            description: 'Inspect all environmental control equipment for proper operation.',
          },
        },
        {
          id: 'task-13',
          name: 'Weekly Tank Inspections',
          icon: 'lucide:file-text',
          color: 'text-muted-foreground',
          type: 'task',
          task: {
            id: 'task-13',
            name: 'Weekly Tank Inspections',
            status: 'active',
            schedule: 'Weekly',
            nextDue: '2025-01-30',
            assignee: 'Jane Smith',
            category: 'Inspections',
            description: 'Inspect all storage tanks for leaks, corrosion, and proper containment.',
          },
        },
      ],
    },
    {
      id: 'folder-reports',
      name: 'Reports',
      icon: 'lucide:file-bar-chart',
      color: 'text-orange-500',
      type: 'folder',
      children: [
        {
          id: 'task-14',
          name: 'Monthly Environmental Summary',
          icon: 'lucide:file-text',
          color: 'text-muted-foreground',
          type: 'task',
          task: {
            id: 'task-14',
            name: 'Monthly Environmental Summary',
            status: 'active',
            schedule: 'Monthly',
            nextDue: '2025-02-05',
            assignee: 'Sarah Wilson',
            category: 'Reports',
            description: 'Compile monthly environmental metrics and compliance summary.',
          },
        },
        {
          id: 'task-15',
          name: 'Annual Environmental Report',
          icon: 'lucide:file-text',
          color: 'text-muted-foreground',
          type: 'task',
          task: {
            id: 'task-15',
            name: 'Annual Environmental Report',
            status: 'active',
            schedule: 'Annually',
            nextDue: '2025-01-31',
            assignee: 'Tom Harris',
            category: 'Reports',
            description: 'Prepare comprehensive annual environmental performance report.',
          },
        },
      ],
    },
  ])

  const filteredTree = computed<TreeNode[]>(() => {
    const query = treeSearch.value.trim().toLowerCase()
    if (!query) return folderTree.value

    const filterNode = (node: TreeNode): TreeNode | null => {
      const nameMatch = node.name.toLowerCase().includes(query)
      if (node.type === 'task') {
        return nameMatch ? node : null
      }
      const filteredChildren = (node.children || []).map(filterNode).filter(Boolean) as TreeNode[]
      if (nameMatch || filteredChildren.length) {
        return { ...node, children: filteredChildren.length ? filteredChildren : node.children }
      }
      return null
    }

    return folderTree.value.map(filterNode).filter(Boolean) as TreeNode[]
  })

  const selectedTask = computed<Task | undefined>(() => {
    if (!selectedNode.value || selectedNode.value.type !== 'task') return undefined
    return selectedNode.value.task
  })

  watch(
    selectedTask,
    () => {
      selectedOccurrenceIndex.value = 0
    },
    { flush: 'sync' },
  )

  const _getTaskOccurrences = (task: Task): TaskOccurrence[] => {
    const occurrences: TaskOccurrence[] = []
    const startDate = new Date(task.nextDue)
    if (Number.isNaN(startDate.getTime())) return occurrences

    const scheduleMap: Record<string, number> = {
      Daily: 1,
      Weekly: 7,
      Monthly: 30,
      Quarterly: 90,
      Annually: 365,
      'Semi-annually': 182,
    }

    const interval = scheduleMap[task.schedule] || 30
    for (let i = 0; i < 12; i++) {
      const occurrence = new Date(startDate)
      occurrence.setDate(startDate.getDate() + interval * i)
      const dueDate = occurrence.toISOString().slice(0, 10)
      const isOverdue = occurrence.getTime() < new Date().getTime()
      occurrences.push({
        id: `${task.id}-occ-${i + 1}`,
        dueDate,
        isOverdue,
      })
    }

    return occurrences
  }

  const selectedTaskOccurrences = computed<TaskOccurrence[]>(() => {
    const task = selectedTask.value
    if (!task) return []
    return _getTaskOccurrences(task)
  })

  const selectedTaskOccurrence = computed<TaskOccurrence | undefined>(() => {
    const occurrences = selectedTaskOccurrences.value
    if (!occurrences.length) return undefined
    return occurrences[Math.min(selectedOccurrenceIndex.value, occurrences.length - 1)]
  })

  const getNodeKey = (node: Record<string, any>) => (node as TreeNode).id

  const _taskProperties = computed(() => {
    const task = selectedTask.value
    if (!task) return []
    return [
      {
        key: 'status',
        icon: 'lucide:circle-dot',
        label: 'Status',
        value: task.status,
        bgColor: statusColors[task.status]?.split(' ')[0] || '',
        color: statusColors[task.status]?.split(' ')[1] || '',
      },
      {
        key: 'schedule',
        icon: 'lucide:repeat',
        label: 'Schedule',
        value: task.schedule,
        bgColor: scheduleColors[task.schedule]?.split(' ')[0] || '',
        color: scheduleColors[task.schedule]?.split(' ')[1] || '',
      },
      { key: 'assignee', icon: 'lucide:user', label: 'Assignee', value: task.assignee },
      {
        key: 'nextDue',
        icon: 'lucide:calendar',
        label: 'Next Due',
        value: selectedTaskOccurrence.value?.dueDate || task.nextDue,
      },
      { key: 'category', icon: 'lucide:tag', label: 'Category', value: task.category },
    ]
  })

  const taskActivity = computed(() => [
    { id: '1', type: 'status_change', author: 'System', date: 'Jan 24, 2025', details: 'Status changed to active' },
    {
      id: '2',
      type: 'comment',
      author: 'John Doe',
      date: 'Jan 22, 2025',
      details: 'Updated documentation requirements',
    },
    { id: '3', type: 'created', author: 'Admin', date: 'Jan 15, 2025', details: 'Task created' },
  ])

  const _activityTypeColors: Record<string, string> = {
    comment: 'bg-blue-500/15 text-blue-600',
    status_change: 'bg-amber-500/15 text-amber-600',
    created: 'bg-emerald-500/15 text-emerald-600',
  }

  const totalFolders = computed(() => {
    const countFolders = (nodes: TreeNode[]): number => {
      return nodes.reduce((count, node) => {
        if (node.type === 'folder') {
          return count + 1 + countFolders(node.children || [])
        }
        return count
      }, 0)
    }
    return countFolders(folderTree.value)
  })

  const totalTasks = computed(() => {
    const countTasks = (nodes: TreeNode[]): number => {
      return nodes.reduce((count, node) => {
        if (node.type === 'task') return count + 1
        return count + countTasks(node.children || [])
      }, 0)
    }
    return countTasks(folderTree.value)
  })

  defineExpose({
    stats: computed(() => [
      { label: 'Total Folders', value: totalFolders.value, icon: 'lucide:folder' },
      { label: 'Total Tasks', value: totalTasks.value, icon: 'lucide:file-text', color: 'text-blue-500' },
    ]),
  })
</script>

<template>
  <div class="flex h-full">
    <UiSplitter auto-save-id="folders-explorer" direction="horizontal" class="h-full w-full">
      <!-- Left Panel: Folder Tree -->
      <UiSplitterPanel
        :default-size="25"
        :min-size="18"
        :max-size="35"
        class="flex h-full flex-col border-r border-border bg-card/30">
        <div class="border-b border-border bg-card/40 px-4 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Icon name="lucide:folder-tree" class="h-4 w-4 text-muted-foreground" />
              Explorer
            </div>
            <UiButton variant="ghost" size="xs" @click="createFolderOpen = true">
              <Icon name="lucide:folder-plus" class="h-4 w-4" />
            </UiButton>
          </div>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <UiTree
            v-model="selectedNode"
            v-model:expanded="expandedIds"
            :items="filteredTree"
            :get-key="getNodeKey"
            :get-children="(node) => node.children"
            selection-behavior="replace">
            <template #default="{ flattenItems }">
              <ul class="space-y-0.5">
                <UiTreeItem
                  v-for="item in flattenItems"
                  :key="item._id"
                  v-bind="item.bind"
                  class="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 data-selected:bg-accent/60 data-selected:text-foreground"
                  :style="{ paddingLeft: `${(item.level - 1) * 14 + 8}px` }">
                  <template #default="{ isExpanded }">
                    <Icon
                      v-if="item.hasChildren"
                      :name="isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                      class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span v-else class="w-3.5 shrink-0" />
                    <Icon
                      :name="
                        item.value.type === 'folder'
                          ? isExpanded
                            ? 'lucide:folder-open'
                            : 'lucide:folder'
                          : 'lucide:file-text'
                      "
                      :class="[
                        'h-4 w-4 shrink-0',
                        item.value.type === 'folder' ? item.value.color : 'text-muted-foreground',
                      ]" />
                    <span class="truncate">{{ item.value.name }}</span>
                  </template>
                </UiTreeItem>
              </ul>
            </template>
          </UiTree>
        </div>
      </UiSplitterPanel>
      <UiSplitterHandle with-handle />

      <!-- Right Panel: Task Detail View (UnifiedTaskDialog-style layout) -->
      <UiSplitterPanel :default-size="75" :min-size="50" class="flex h-full flex-col bg-card">
        <template v-if="selectedTask">
          <!-- Header (like UnifiedTaskDialog) -->
          <div class="shrink-0 px-4 pt-4 pb-2 border-b border-border space-y-2">
            <!-- Date Badge & Actions Row -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <button
                  :class="[
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    selectedTaskOccurrence?.isOverdue
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  ]">
                  <Icon name="lucide:calendar" class="h-3.5 w-3.5" />
                  {{ selectedTaskOccurrence?.dueDate || selectedTask.nextDue }}
                  <span v-if="selectedTaskOccurrence?.isOverdue" class="text-[10px] opacity-80">(overdue)</span>
                </button>
              </div>
              <div class="flex items-center gap-1">
                <UiButton variant="ghost" size="icon" class="h-7 w-7">
                  <Icon name="lucide:chevron-up" class="h-4 w-4" />
                </UiButton>
                <UiButton variant="ghost" size="icon" class="h-7 w-7">
                  <Icon name="lucide:chevron-down" class="h-4 w-4" />
                </UiButton>
              </div>
            </div>
            <!-- Title -->
            <input
              :value="selectedTask.name"
              type="text"
              placeholder="Task name..."
              readonly
              class="w-full text-xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0 -mx-1 transition-all" />
          </div>

          <!-- Main Content Area (two columns like UnifiedTaskDialog) -->
          <div class="flex flex-1 min-h-0">
            <!-- Left: Scrollable content -->
            <div class="flex-1 flex flex-col min-w-0 border-r border-border overflow-y-auto">
              <!-- Properties Row (sticky) -->
              <div class="sticky top-0 z-10 bg-card px-4 py-2.5 border-b border-border space-y-1.5">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Properties</p>
                <div class="flex flex-wrap items-center gap-1.5 text-xs">
                  <!-- Status Badge -->
                  <button
                    :class="[
                      'px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity',
                      statusColors[selectedTask.status],
                    ]">
                    {{ selectedTask.status }}
                  </button>

                  <!-- Category -->
                  <button
                    class="inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors bg-muted/50 hover:bg-muted">
                    <Icon name="lucide:tag" class="h-3.5 w-3.5" />
                    <span>{{ selectedTask.category }}</span>
                  </button>

                  <!-- Schedule -->
                  <button
                    :class="[
                      'inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
                      scheduleColors[selectedTask.schedule] || 'bg-muted/50',
                    ]">
                    <Icon name="lucide:repeat" class="h-3.5 w-3.5" />
                    <span>{{ selectedTask.schedule }}</span>
                  </button>

                  <!-- Assignee -->
                  <button
                    class="inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors bg-muted/50 hover:bg-muted">
                    <div
                      class="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium bg-primary/20 text-primary">
                      {{ selectedTask.assignee.slice(0, 2).toUpperCase() }}
                    </div>
                    <span>{{ selectedTask.assignee }}</span>
                  </button>
                </div>
              </div>

              <!-- Content Area -->
              <div class="p-4 space-y-4">
                <!-- Description -->
                <div class="space-y-1.5">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                  <div class="rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground min-h-20">
                    {{ selectedTask.description }}
                  </div>
                </div>

                <!-- Attachments -->
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attachments</p>
                    <UiButton variant="ghost" size="sm" class="h-6 text-xs gap-1">
                      <Icon name="lucide:plus" class="h-3 w-3" />
                      Add
                    </UiButton>
                  </div>
                  <p class="text-xs text-muted-foreground">No attachments yet.</p>
                </div>

                <!-- Schedule Section -->
                <div class="space-y-3 pt-3 border-t border-border">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Schedule</p>
                    <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon name="lucide:repeat" class="h-3.5 w-3.5" />
                      <span>Repeats {{ selectedTask.schedule.toLowerCase() }}</span>
                    </div>
                  </div>

                  <!-- Upcoming Occurrences -->
                  <div class="space-y-1.5">
                    <!-- Next Due (highlighted) -->
                    <div class="flex items-center gap-3 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                      <Icon name="lucide:calendar-check" class="h-4 w-4 text-primary shrink-0" />
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium">{{ selectedTask.nextDue }}</p>
                        <p class="text-[10px] text-muted-foreground">Next due</p>
                      </div>
                      <span class="text-[10px] font-medium text-primary px-2 py-0.5 rounded-full bg-primary/10">
                        {{ selectedTaskOccurrence?.isOverdue ? 'Overdue' : 'Upcoming' }}
                      </span>
                    </div>

                    <!-- Future Occurrences -->
                    <div
                      v-for="(occ, idx) in selectedTaskOccurrences.slice(1, 5)"
                      :key="occ.id"
                      class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                      @click="selectedOccurrenceIndex = idx + 1">
                      <Icon name="lucide:calendar" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-medium">{{ occ.dueDate }}</p>
                      </div>
                      <span
                        v-if="occ.isOverdue"
                        class="text-[10px] font-medium text-rose-600 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30">
                        Overdue
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Activity Sidebar -->
            <aside class="w-72 shrink-0 flex flex-col bg-muted/5">
              <div class="p-4 flex-1 overflow-y-auto">
                <!-- Comment Input -->
                <div class="flex items-start gap-2 mb-4">
                  <div
                    class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium bg-primary/20 text-primary shrink-0">
                    U
                  </div>
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 border-b border-transparent hover:border-border focus:border-primary transition-colors py-1" />
                </div>

                <!-- Activity Feed -->
                <div class="space-y-3">
                  <div v-for="activity in taskActivity" :key="activity.id" class="text-xs">
                    <span class="font-medium">{{ activity.author }}</span>
                    <span class="text-muted-foreground">{{ activity.details }}</span>
                    <span class="text-muted-foreground/60 ml-1">{{ activity.date }}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </template>

        <!-- Empty State -->
        <div v-else class="flex flex-1 flex-col items-center justify-center p-12 text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Icon name="lucide:file-text" class="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 class="text-lg font-semibold">Select a task</h3>
          <p class="mt-2 text-sm text-muted-foreground max-w-sm">
            Choose a task from the folder tree on the left to view its details here.
          </p>
        </div>
      </UiSplitterPanel>
    </UiSplitter>

    <!-- Create Folder Dialog -->
    <FolderCreateDialog v-model:open="createFolderOpen" @save="handleCreateFolder" />
  </div>
</template>
