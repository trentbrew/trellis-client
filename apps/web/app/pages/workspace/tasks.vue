<script setup lang="ts">
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import type { Entity, TaskItem } from '~/types/entity'
  import { createDefaultItem } from '~/types/entity'
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import { useAdvancedFilters } from '~/composables/useAdvancedFilters'
  import { formatYmdLocal } from '~/utils/date'
  import {
    GanttProvider,
    GanttTimeline,
    GanttHeader,
    GanttSidebar,
    GanttSidebarItem,
    GanttSidebarGroup,
    GanttFeatureList,
    GanttFeatureListGroup,
    GanttFeatureItem,
    GanttMarker,
    GanttToday,
    GanttCreateMarkerTrigger,
  } from '~/components/data/Gantt/index.vue'
  import type { GanttFeature, GanttStatus, GanttScheduleItemChange } from '~/components/data/Gantt/ganttContext'
  import GanttDependencyArrows from '~/components/data/Gantt/GanttDependencyArrows.vue'

  definePageMeta({ layout: 'default' })

  // ---------------------------------------------------------------------------
  // Live data from instant-local
  // ---------------------------------------------------------------------------

  const { items: allItems, create: createItem, update: updateItem, remove: _removeItem } = useEntities()

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

  const viewTaskOpen = ref(false)
  const _viewingTaskId = ref<string | null>(null)
  const _pendingCreateItem = ref<Entity | null>(null)

  // Resolve viewingTask from the live store by ID so it stays in sync
  // when items are re-hydrated (e.g. after SSE link mutations).
  // Falls back to _pendingCreateItem for Gantt create-mode items.
  const viewingTask = computed<Entity | null>(() => {
    if (_pendingCreateItem.value) return _pendingCreateItem.value
    if (!_viewingTaskId.value) return null
    return allItems.value.find((i) => i.id === _viewingTaskId.value) ?? null
  })

  const taskOwners = [{ id: 'you', name: 'You' }]

  async function handleNewTask(defaultStartDate?: string) {
    const defaults = createDefaultItem('task')
    if (defaultStartDate) (defaults as any).startDate = defaultStartDate
    const newId = await createItem({ ...defaults, type: 'task', title: '' } as TaskItem)
    _pendingCreateItem.value = { ...defaults, id: newId } as Entity
    _viewingTaskId.value = newId
    viewTaskOpen.value = true
  }

  function openTaskDetail(task: any) {
    _pendingCreateItem.value = null
    const full = taskItems.value.find((t) => t.id === task.id)
    if (full) {
      _viewingTaskId.value = full.id
    } else {
      const item = createDefaultItem('task')
      _pendingCreateItem.value = { ...item, id: task.id, title: task.title } as Entity
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


  async function handleUpdateTask(item: Entity) {
    await updateItem(item)
    viewTaskOpen.value = false
  }

  // ---------------------------------------------------------------------------
  // Gantt
  // ---------------------------------------------------------------------------

  const ganttStatuses: Record<string, GanttStatus> = {
    pending: { id: 'pending', name: 'Pending', color: '#6B7280' },
    'in-progress': { id: 'in-progress', name: 'In Progress', color: '#3B82F6' },
    'on-track': { id: 'on-track', name: 'On Track', color: '#10B981' },
    'due-soon': { id: 'due-soon', name: 'Due Soon', color: '#F59E0B' },
    overdue: { id: 'overdue', name: 'Overdue', color: '#EF4444' },
    completed: { id: 'completed', name: 'Completed', color: '#6366F1' },
  }

  const parseDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y!, m! - 1, d!)
  }

  const isMilestoneTask = (t: TaskItem) => t.tags?.includes('milestone')

  const ganttMilestones = computed(() =>
    taskItems.value
      .filter(isMilestoneTask)
      .map((t) => ({
        id: t.id,
        date: parseDate(t.startDate),
        label: t.title.replace(/^\ud83c\udfc1\s*/, '').replace(/^Milestone:\s*/i, ''),
      })),
  )

  const ganttDependencyEdges = computed(() => {
    const edges: { fromId: string; toId: string }[] = []
    for (const t of taskItems.value) {
      if (t.dependsOn?.length) {
        for (const depId of t.dependsOn) {
          edges.push({ fromId: depId, toId: t.id })
        }
      }
    }
    return edges
  })

  const ganttStatusGroups = [
    { key: 'overdue', label: 'Overdue' },
    { key: 'due-soon', label: 'Due Soon' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'on-track', label: 'On Track' },
    { key: 'pending', label: 'Not Started' },
    { key: 'completed', label: 'Completed' },
  ]

  const ganttGroupedFeatures = computed(() => {
    const groups: Record<string, GanttFeature[]> = {}
    for (const g of ganttStatusGroups) groups[g.label] = []
    for (const t of taskItems.value) {
      if (isMilestoneTask(t)) continue
      const statusKey = t.taskStatus || 'pending'
      const groupDef = ganttStatusGroups.find((g) => g.key === statusKey) ?? ganttStatusGroups.find((g) => g.key === 'pending')!
      groups[groupDef.label]!.push({
        id: t.id,
        name: t.title,
        startAt: parseDate(t.startDate),
        endAt: t.endDate ? parseDate(t.endDate) : parseDate(t.startDate),
        status: ganttStatuses[statusKey] ?? ganttStatuses.pending!,
      })
    }
    return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length > 0))
  })

  const ganttFlatFeatures = computed(() => {
    const flat: GanttFeature[] = []
    for (const features of Object.values(ganttGroupedFeatures.value)) {
      flat.push(...features)
    }
    return flat
  })

  const handleGanttScheduleChange = async (payload: GanttScheduleItemChange) => {
    const task = taskItems.value.find((t) => t.id === payload.feature.id)
    if (!task) return

    await updateItem({
      ...task,
      startDate: formatYmdLocal(payload.startAt),
      endDate: payload.endAt ? formatYmdLocal(payload.endAt) : undefined,
    })
  }

  const handleGanttAddItem = (date: Date) => {
    handleNewTask(formatYmdLocal(date))
  }

  function openGanttTaskDetail(id: string) {
    _pendingCreateItem.value = null
    _viewingTaskId.value = id
    viewTaskOpen.value = true
  }
</script>

<template>
  <Page
    variant="browse"
    title="Tasks"
    subtitle="Personal"
    data-source="task"
    description="Tasks assigned to you across all facilities."
    icon="lucide:check-square"
    icon-class="text-emerald-300"
    search-placeholder="Search tasks..."
    :show-view-switcher="true"
    :browse="browseState"
    :advanced-filters="advancedFilters"
    :view-mode-options="[
      { mode: 'kanban', label: 'Kanban', icon: 'lucide:layout-grid' },
      { mode: 'list', label: 'List', icon: 'lucide:list' },
      { mode: 'table', label: 'Table', icon: 'lucide:table' },
      { mode: 'gantt', label: 'Gantt', icon: 'lucide:gantt-chart' },
    ]"
    :primary-action="{
      label: 'New Task',
      icon: 'lucide:plus',
      type: 'click',
      onClick: handleNewTask,
    }">

    <template #toolbarActions>
      <UiButton @click="handleNewTask()">
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

    <!-- Gantt View -->
    <div v-else-if="viewMode === 'gantt'" class="-mx-8 -mb-8 h-[calc(100vh-220px)] border-t border-border">
      <GanttProvider range="monthly" :zoom="400" :on-add-item="handleGanttAddItem">
        <GanttSidebar>
          <GanttSidebarGroup
            v-for="(groupFeatures, groupName) in ganttGroupedFeatures"
            :key="groupName"
            :name="String(groupName)">
            <GanttSidebarItem
              v-for="feature in groupFeatures"
              :key="feature.id"
              :feature="feature"
              :on-select-item="openGanttTaskDetail" />
          </GanttSidebarGroup>
        </GanttSidebar>

        <GanttTimeline>
          <GanttHeader />

          <GanttFeatureList>
            <GanttFeatureListGroup
              v-for="(groupFeatures, groupName) in ganttGroupedFeatures"
              :key="groupName">
              <div v-for="feature in groupFeatures" :key="feature.id" class="flex">
                <button type="button" class="flex-1" @click="openGanttTaskDetail(feature.id)">
                  <GanttFeatureItem
                    :feature="feature"
                    @schedule-item-change="handleGanttScheduleChange" />
                </button>
              </div>
            </GanttFeatureListGroup>
          </GanttFeatureList>

          <GanttDependencyArrows :features="ganttFlatFeatures" :edges="ganttDependencyEdges" />

          <GanttMarker
            v-for="milestone in ganttMilestones"
            :id="milestone.id"
            :key="milestone.id"
            :date="milestone.date"
            :label="milestone.label"
            class-name="bg-orange-500 text-white" />

          <GanttToday />
          <GanttCreateMarkerTrigger :on-create-marker="(date: Date) => handleGanttAddItem(date)" />
        </GanttTimeline>
      </GanttProvider>
    </div>

    <!-- Table View -->
    <div v-else-if="viewMode === 'table'" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Title</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Priority</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Assignee</th>
            <th class="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Due</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="task in finalFilteredItems"
            :key="task.id"
            class="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition"
            @click="openTaskDetail(task)">
            <td class="py-2 px-3">
              <div class="flex items-center gap-2">
                <Icon name="lucide:check-square" class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="font-medium truncate">{{ task.title || 'Untitled' }}</span>
              </div>
            </td>
            <td class="py-2 px-3">
              <span :class="['rounded-full px-2 py-0.5 text-xs font-semibold', statusStyles[task.status]]">
                {{ task.status }}
              </span>
            </td>
            <td class="py-2 px-3">
              <div class="flex items-center gap-1">
                <Icon
                  :name="priorityIcons[task.priority] || 'lucide:circle'"
                  :class="['h-3 w-3', priorityColors[task.priority]]" />
                <span class="text-muted-foreground text-xs">{{ task.priority }}</span>
              </div>
            </td>
            <td class="py-2 px-3 text-muted-foreground">{{ task.assignee }}</td>
            <td class="py-2 px-3 text-muted-foreground">{{ task.dueDate || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!finalFilteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No tasks found
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
    <div v-if="viewMode !== 'gantt'" class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ finalFilteredItems.length }} {{ finalFilteredItems.length === 1 ? 'task' : 'tasks' }}
    </div>

    <!-- View/Edit Task Dialog -->
    <EntityDialog
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
