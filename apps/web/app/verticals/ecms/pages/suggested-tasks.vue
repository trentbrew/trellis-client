<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowse } from '~/composables/useBrowse'
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem } from '~/types/calendarItem'
  import { createDefaultItem } from '~/types/calendarItem'

  definePageMeta({
    layout: 'default',
  })

  const { currentFacility } = useFacilities()
  const { currentOrganization } = useOrganizations()

  useHead(() => ({
    title: `Suggested Tasks | ${currentFacility.value?.name || 'Facility'}`,
  }))

  // Task dialog state
  const viewTaskOpen = ref(false)
  const viewingTask = ref<CalendarItem | null>(null)

  function openTaskDetail(task: any) {
    const item = createDefaultItem('task')
    viewingTask.value = {
      ...item,
      id: task.id,
      title: task.title,
      description: task.reason || '',
      priority: task.priority as 'low' | 'medium' | 'high' | 'critical',
      startDate: new Date().toISOString().split('T')[0]!,
      category: task.category,
    }
    viewTaskOpen.value = true
  }

  const suggestedTasks = ref([
    {
      id: '1',
      title: 'Update Emergency Response Plan',
      reason: 'Last updated over 12 months ago',
      priority: 'high',
      category: 'safety',
    },
    {
      id: '2',
      title: 'Review Stormwater Permit Limits',
      reason: 'New EPA guidelines released',
      priority: 'medium',
      category: 'permits',
    },
    {
      id: '3',
      title: 'Schedule Hazardous Waste Training',
      reason: 'Employee certifications expiring soon',
      priority: 'high',
      category: 'training',
    },
    {
      id: '4',
      title: 'Audit Chemical Inventory',
      reason: 'Quarterly review recommended',
      priority: 'medium',
      category: 'inventory',
    },
    {
      id: '5',
      title: 'Update Air Emissions Calculations',
      reason: 'Production volume changed significantly',
      priority: 'low',
      category: 'emissions',
    },
    {
      id: '6',
      title: 'Review Spill Prevention Procedures',
      reason: 'Recent near-miss incident reported',
      priority: 'high',
      category: 'safety',
    },
    {
      id: '7',
      title: 'Update Noise Monitoring Protocol',
      reason: 'Equipment changes may affect readings',
      priority: 'low',
      category: 'emissions',
    },
    {
      id: '8',
      title: 'Verify Waste Manifest Records',
      reason: 'Annual audit approaching',
      priority: 'medium',
      category: 'inventory',
    },
    {
      id: '9',
      title: 'Schedule Fire Safety Inspection',
      reason: 'Due within 30 days',
      priority: 'high',
      category: 'safety',
    },
    {
      id: '10',
      title: 'Review Tank Inspection Results',
      reason: 'Recent inspection completed',
      priority: 'medium',
      category: 'permits',
    },
    {
      id: '11',
      title: 'Update Chemical SDS Library',
      reason: 'New chemicals added to inventory',
      priority: 'medium',
      category: 'inventory',
    },
    {
      id: '12',
      title: 'Prepare Tier II Reporting Data',
      reason: 'Annual deadline in 60 days',
      priority: 'high',
      category: 'permits',
    },
  ])

  const stats = computed<PageStat[]>(() => [
    { label: 'Suggestions', value: suggestedTasks.value.length, icon: 'lucide:lightbulb' },
    {
      label: 'High Priority',
      value: suggestedTasks.value.filter((t) => t.priority === 'high').length,
      icon: 'lucide:alert-triangle',
      color: 'text-rose-500',
    },
  ])

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
    ],
    filters: [
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
    ],
  })

  const viewMode = computed(() => 'grid')

  function handleTaskSave(item: CalendarItem) {
    const index = suggestedTasks.value.findIndex((t) => t.id === item.id)
    if (index !== -1) {
      suggestedTasks.value[index] = {
        ...suggestedTasks.value[index]!,
        title: item.title,
        priority: item.priority || suggestedTasks.value[index]!.priority,
      }
    }
    viewTaskOpen.value = false
  }
</script>

<template>
  <Page
    variant="browse"
    title="Suggested Tasks"
    :subtitle="currentOrganization?.name"
    description="AI-powered recommendations based on your compliance history and regulatory updates."
    icon="lucide:lightbulb"
    icon-class="text-amber-300"
    :stats="stats"
    :show-view-switcher="false"
    :fill-height="true"
    :browse="browseState">
    <!-- Filters and Sort are now handled automatically by Page.vue via browseState -->

    <!-- Page handles #viewSwitcher via :browse prop -->

    <!-- Grid View -->
    <div v-if="viewMode === 'grid'" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <UiCard
        v-for="task in filteredSuggestedTasks"
        :key="task.id"
        class="relative overflow-hidden cursor-pointer"
        @click="openTaskDetail(task)">
        <div class="absolute top-0 left-0 w-1 h-full" :class="(priorityColors[task.priority] || '').split(' ')[0]" />
        <UiCardHeader class="pb-3">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon :name="categoryIcons[task.category] || 'lucide:clipboard'" class="h-5 w-5 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <UiCardTitle class="text-base">{{ task.title }}</UiCardTitle>
              <span
                :class="[
                  'rounded-full px-2 py-0.5 text-xs font-medium mt-1 inline-block',
                  priorityColors[task.priority],
                ]">
                {{ task.priority }} priority
              </span>
            </div>
          </div>
        </UiCardHeader>
        <UiCardContent class="pt-0 space-y-3">
          <div class="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <Icon name="lucide:sparkles" class="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p class="text-xs text-muted-foreground">{{ task.reason }}</p>
          </div>
        </UiCardContent>
        <UiCardFooter class="pt-0 gap-2">
          <UiButton size="sm" class="flex-1" @click="acceptTask(task.id)">
            <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
            Add to Tasks
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="dismissTask(task.id)">
            <Icon name="lucide:x" class="h-4 w-4" />
          </UiButton>
        </UiCardFooter>
      </UiCard>
    </div>

    <div v-if="filteredSuggestedTasks.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <Icon name="lucide:check-circle" class="h-12 w-12 text-emerald-500" />
      <h3 class="mt-4 text-lg font-medium">All caught up!</h3>
      <p class="mt-2 text-sm text-muted-foreground">No new suggestions at this time. Check back later.</p>
    </div>
    <!-- Task Detail Dialog -->
    <CalendarItemDialog
      v-model:open="viewTaskOpen"
      mode="edit"
      :item="viewingTask"
      @save="handleTaskSave"
      @close="viewTaskOpen = false" />
  </Page>
</template>
