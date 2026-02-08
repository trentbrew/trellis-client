<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem, CalendarItemType, TaskItem } from '~/types/calendarItem'
  import { createDefaultItem, CALENDAR_ITEM_TYPES } from '~/types/calendarItem'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Today | Personal' })

  // ---------------------------------------------------------------------------
  // Dashboard data
  // ---------------------------------------------------------------------------

  const {
    statDueToday,
    statOverdue,
    statTodayEvents,
    statCompleted,
    statTotalTasks,
    statCompletionRate,
    tasksByPriority,
    tasksByStatus,
    tasksByCategory,
    itemsByType,
    weekActivity,
    todaySchedule,
    overdueList,
    dueTodayList,
    upcomingList,
    formatTime,
  } = useDashboardData()

  const { items: allItems, create, update, remove } = useCalendarItems()

  // ---------------------------------------------------------------------------
  // Stats (Page header)
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [
    { label: 'Due Today', value: statDueToday.value, icon: 'lucide:target', color: 'text-amber-500' },
    { label: 'Overdue', value: statOverdue.value, icon: 'lucide:alert-circle', color: 'text-rose-500' },
    { label: 'Events', value: statTodayEvents.value, icon: 'lucide:calendar', color: 'text-blue-500' },
    { label: 'Done', value: statCompleted.value, icon: 'lucide:check-circle', color: 'text-emerald-500' },
  ])

  // ---------------------------------------------------------------------------
  // Greeting
  // ---------------------------------------------------------------------------

  const now = new Date()

  const greeting = computed(() => {
    const h = now.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })

  const todayFormatted = computed(() =>
    now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  )

  // ---------------------------------------------------------------------------
  // Chart data (computed from dashboard data)
  // ---------------------------------------------------------------------------

  const priorityChartLabels = computed(() => tasksByPriority.value.map((d) => d.label))
  const priorityChartValues = computed(() => tasksByPriority.value.map((d) => d.value))
  const priorityChartColors = computed(() => tasksByPriority.value.map((d) => d.color || '#6b7280'))

  const statusChartLabels = computed(() => tasksByStatus.value.map((d) => d.label))
  const statusChartValues = computed(() => tasksByStatus.value.map((d) => d.value))
  const statusChartColors = computed(() => tasksByStatus.value.map((d) => d.color || '#6b7280'))

  const categoryChartLabels = computed(() => tasksByCategory.value.map((d) => d.label))
  const categoryChartValues = computed(() => tasksByCategory.value.map((d) => d.value))
  const categoryChartColors = computed(() => tasksByCategory.value.map((d) => d.color || '#6b7280'))

  const typeChartLabels = computed(() => itemsByType.value.map((d) => d.label))
  const typeChartValues = computed(() => itemsByType.value.map((d) => d.value))
  const typeChartColors = computed(() => itemsByType.value.map((d) => d.color || '#6b7280'))

  const weekLabels = computed(() => weekActivity.value.map((d) => d.label))
  const weekTaskSeries = computed(() => weekActivity.value.map((d) => d.tasks))
  const weekEventSeries = computed(() => weekActivity.value.map((d) => d.events))

  // ---------------------------------------------------------------------------
  // Quick Capture
  // ---------------------------------------------------------------------------

  const quickTitle = ref('')
  const quickType = ref<CalendarItemType>('task')

  async function quickCapture() {
    const title = quickTitle.value.trim()
    if (!title) return
    const item = createDefaultItem(quickType.value)
    await create({ ...item, title, type: quickType.value })
    quickTitle.value = ''
  }

  function captureTypeIcon(type: CalendarItemType) {
    return CALENDAR_ITEM_TYPES.find((t) => t.value === type)?.icon ?? 'lucide:circle'
  }

  function captureTypeLabel(type: CalendarItemType) {
    return CALENDAR_ITEM_TYPES.find((t) => t.value === type)?.label ?? type
  }

  // ---------------------------------------------------------------------------
  // Dialog
  // ---------------------------------------------------------------------------

  const createOpen = ref(false)
  const viewOpen = ref(false)
  const viewingItem = ref<CalendarItem | null>(null)
  const taskOwners = [{ id: 'you', name: 'You' }]

  function openDetail(itemId: string) {
    const item = allItems.value.find((i) => i.id === itemId)
    if (item) {
      viewingItem.value = item
      viewOpen.value = true
    }
  }

  function handleToggleComplete(itemId: string) {
    const item = allItems.value.find((i) => i.id === itemId) as TaskItem | undefined
    if (!item) return
    const newStatus = item.taskStatus === 'completed' ? 'pending' : 'completed'
    void update({ ...item, taskStatus: newStatus })
  }

  async function handleCreate(item: CalendarItem) {
    await create(item)
    createOpen.value = false
  }

  async function handleUpdate(item: CalendarItem) {
    await update(item)
    viewOpen.value = false
  }

  async function handleDelete(item: CalendarItem) {
    await remove(item.id)
    viewOpen.value = false
  }
</script>

<template>
  <Page
    variant="default"
    title="Today"
    subtitle="Personal"
    :description="todayFormatted"
    icon="lucide:sun"
    icon-class="text-amber-300"
    :stats="stats"
    :fill-height="true"
    :primary-action="{
      label: 'Quick Add',
      icon: 'lucide:plus',
      type: 'click',
      onClick: () => (createOpen = true),
    }">

    <div class="pb-16 space-y-6">
      <!-- Greeting + Quick Capture Row -->
      <div class="flex items-end justify-between gap-6 pt-2">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight">{{ greeting }}</h2>
          <p class="text-sm text-muted-foreground mt-1">Here's what's on your plate today.</p>
        </div>
        <!-- Inline Quick Capture -->
        <div class="hidden md:flex items-center gap-2">
          <div class="relative">
            <Icon name="lucide:plus" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              v-model="quickTitle"
              type="text"
              placeholder="Add something..."
              class="w-64 rounded-lg border border-border bg-card pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              @keydown.enter.exact="quickCapture" />
          </div>
          <UiDropdownMenu>
            <UiDropdownMenuTrigger as-child>
              <UiButton variant="outline" size="sm" class="gap-1.5 text-xs h-9">
                <Icon :name="captureTypeIcon(quickType)" class="h-3.5 w-3.5" />
                <span>{{ captureTypeLabel(quickType) }}</span>
                <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-50" />
              </UiButton>
            </UiDropdownMenuTrigger>
            <UiDropdownMenuContent align="end" class="w-40">
              <UiDropdownMenuItem
                v-for="t in CALENDAR_ITEM_TYPES.filter((ct) => ct.value !== 'trip')"
                :key="t.value"
                @click="quickType = t.value">
                <Icon :name="t.icon" class="h-4 w-4 mr-2" />
                {{ t.label }}
              </UiDropdownMenuItem>
            </UiDropdownMenuContent>
          </UiDropdownMenu>
        </div>
      </div>

      <!-- =================== ROW 1: Stats + Completion Progress =================== -->
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-span-3">
          <DashboardStatCard
            title="Due Today"
            :value="statDueToday"
            icon="lucide:target"
            color="text-amber-500" />
        </div>
        <div class="col-span-12 lg:col-span-3">
          <DashboardStatCard
            title="Overdue"
            :value="statOverdue"
            icon="lucide:alert-circle"
            color="text-rose-500" />
        </div>
        <div class="col-span-12 lg:col-span-3">
          <DashboardStatCard
            title="Events Today"
            :value="statTodayEvents"
            icon="lucide:calendar"
            color="text-blue-500" />
        </div>
        <div class="col-span-12 lg:col-span-3">
          <DashboardProgressCard
            title="Completion Rate"
            :current="statCompleted"
            :target="statTotalTasks || 1"
            icon="lucide:check-circle"
            color="text-emerald-500"
            :label="`${statCompletionRate}% of ${statTotalTasks} tasks`" />
        </div>
      </div>

      <!-- =================== ROW 2: Charts Row =================== -->
      <div class="grid grid-cols-12 gap-4">
        <!-- Weekly Activity (bar chart, 8 cols) -->
        <div class="col-span-12 lg:col-span-8 h-72">
          <DashboardChartCard
            title="Weekly Activity"
            chart-type="bar"
            :labels="weekLabels"
            :series="[
              { name: 'Tasks', data: weekTaskSeries },
              { name: 'Events', data: weekEventSeries },
            ]"
            :colors="['#3b82f6', '#8b5cf6']"
            :show-legend="true"
            :stacked="true" />
        </div>

        <!-- Items by Type (donut, 4 cols) -->
        <div class="col-span-12 lg:col-span-4 h-72">
          <DashboardChartCard
            title="Items by Type"
            chart-type="donut"
            :labels="typeChartLabels"
            :series="typeChartValues"
            :colors="typeChartColors"
            :show-legend="true" />
        </div>
      </div>

      <!-- =================== ROW 3: Lists + Schedule =================== -->
      <div class="grid grid-cols-12 gap-4">
        <!-- Overdue Tasks -->
        <div class="col-span-12 md:col-span-6 lg:col-span-4 min-h-64">
          <DashboardListCard
            title="Overdue"
            icon="lucide:alert-circle"
            icon-color="text-red-500"
            :badge="overdueList.length"
            badge-color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            :items="overdueList"
            :show-checkbox="true"
            :show-priority="true"
            :show-date="true"
            empty-message="No overdue tasks"
            empty-icon="lucide:party-popper"
            @item-click="openDetail"
            @toggle-complete="handleToggleComplete" />
        </div>

        <!-- Today's Schedule -->
        <div class="col-span-12 md:col-span-6 lg:col-span-4 min-h-64">
          <DashboardScheduleCard
            title="Today's Schedule"
            :items="todaySchedule"
            :format-time="formatTime"
            empty-message="No events today"
            @item-click="openDetail" />
        </div>

        <!-- Due Today -->
        <div class="col-span-12 md:col-span-6 lg:col-span-4 min-h-64">
          <DashboardListCard
            title="Due Today"
            icon="lucide:target"
            icon-color="text-amber-500"
            :badge="dueTodayList.length"
            badge-color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            :items="dueTodayList"
            :show-checkbox="true"
            :show-priority="true"
            empty-message="Nothing due today"
            empty-icon="lucide:check-circle"
            @item-click="openDetail"
            @toggle-complete="handleToggleComplete" />
        </div>
      </div>

      <!-- =================== ROW 4: More Charts + Upcoming =================== -->
      <div class="grid grid-cols-12 gap-4">
        <!-- Priority Breakdown (bar chart) -->
        <div class="col-span-12 md:col-span-6 lg:col-span-4 h-64">
          <DashboardChartCard
            title="Priority Breakdown"
            chart-type="bar"
            :labels="priorityChartLabels"
            :series="priorityChartValues"
            :colors="priorityChartColors" />
        </div>

        <!-- Status Distribution (donut) -->
        <div class="col-span-12 md:col-span-6 lg:col-span-4 h-64">
          <DashboardChartCard
            title="Task Status"
            chart-type="donut"
            :labels="statusChartLabels"
            :series="statusChartValues"
            :colors="statusChartColors"
            :show-legend="true" />
        </div>

        <!-- Category Distribution (bar) -->
        <div class="col-span-12 md:col-span-6 lg:col-span-4 h-64">
          <DashboardChartCard
            title="By Category"
            chart-type="bar"
            :labels="categoryChartLabels"
            :series="categoryChartValues"
            :colors="categoryChartColors" />
        </div>
      </div>

      <!-- =================== ROW 5: Upcoming =================== -->
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 min-h-48">
          <DashboardListCard
            title="Upcoming (Next 7 Days)"
            icon="lucide:clock"
            icon-color="text-muted-foreground"
            :items="upcomingList"
            :show-date="true"
            :show-priority="true"
            empty-message="Nothing coming up this week"
            empty-icon="lucide:sparkles"
            @item-click="openDetail"
            @toggle-complete="handleToggleComplete" />
        </div>
      </div>
    </div>

    <!-- View/Edit Dialog -->
    <CalendarItemDialog
      v-model:open="viewOpen"
      mode="edit"
      :item="viewingItem"
      :owners="taskOwners"
      @save="handleUpdate"
      @delete="handleDelete"
      @close="viewOpen = false" />

    <!-- Create Dialog -->
    <CalendarItemDialog
      v-model:open="createOpen"
      mode="create"
      item-type="task"
      :item="null"
      :owners="taskOwners"
      @save="handleCreate"
      @close="createOpen = false" />
  </Page>
</template>
