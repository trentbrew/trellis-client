<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowse } from '~/composables/useBrowse'
  import { useGlobalDetailSheet } from '~/composables/useGlobalDetailSheet'

  interface CalendarEvent {
    id: string
    title: string
    date: string
    type: string
    category: string
  }

  definePageMeta({
    layout: 'default',
  })

  const { currentFacility } = useFacilities()
  const { currentOrganization } = useOrganizations()

  useHead(() => ({
    title: `Facility Calendar | ${currentFacility.value?.name || 'Facility'}`,
  }))

  const { open: openDetail } = useGlobalDetailSheet()

  // Demo calendar events
  const events = ref([
    { id: '1', title: 'Air Permit Renewal Deadline', date: '2025-02-15', type: 'deadline', category: 'permits' },
    { id: '2', title: 'Quarterly Stormwater Inspection', date: '2025-02-01', type: 'inspection', category: 'tasks' },
    { id: '3', title: 'SPCC Training Session', date: '2025-02-10', type: 'training', category: 'training' },
    { id: '4', title: 'Hazardous Waste Pickup', date: '2025-02-20', type: 'event', category: 'waste' },
    { id: '5', title: 'Monthly Safety Meeting', date: '2025-02-05', type: 'meeting', category: 'safety' },
    { id: '6', title: 'Tier II Report Due', date: '2025-03-01', type: 'deadline', category: 'permits' },
    { id: '7', title: 'Underground Tank Inspection', date: '2025-02-08', type: 'inspection', category: 'tasks' },
    { id: '8', title: 'Emergency Response Drill', date: '2025-02-12', type: 'training', category: 'safety' },
    { id: '9', title: 'Waste Manifest Review', date: '2025-02-18', type: 'meeting', category: 'waste' },
    { id: '10', title: 'Air Quality Monitor Calibration', date: '2025-02-22', type: 'event', category: 'permits' },
    { id: '11', title: 'Quarterly Groundwater Sampling', date: '2025-02-25', type: 'inspection', category: 'tasks' },
    { id: '12', title: 'RCRA Compliance Training', date: '2025-02-28', type: 'training', category: 'training' },
    { id: '13', title: 'Fire Extinguisher Inspection', date: '2025-02-03', type: 'inspection', category: 'safety' },
    { id: '14', title: 'Chemical Inventory Audit', date: '2025-02-14', type: 'event', category: 'waste' },
    { id: '15', title: 'EPA Site Visit', date: '2025-02-26', type: 'inspection', category: 'permits' },
  ])

  const stats = computed<PageStat[]>(() => [
    { label: 'This Month', value: events.value.length, icon: 'lucide:calendar-days' },
    {
      label: 'Deadlines',
      value: events.value.filter((e) => e.type === 'deadline').length,
      icon: 'lucide:alert-circle',
      color: 'text-rose-500',
    },
    {
      label: 'Inspections',
      value: events.value.filter((e) => e.type === 'inspection').length,
      icon: 'lucide:clipboard-check',
      color: 'text-blue-500',
    },
  ])

  const _currentMonth = ref(new Date())

  const typeColors: Record<string, string> = {
    deadline: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    inspection: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    training: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    event: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    meeting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }

  const { browseState, filteredItems: filteredEvents } = useBrowse({
    items: events,
    searchFields: ['title', 'category'],
    defaultViewMode: 'month',
    sortOptions: [
      { value: 'date', label: 'Date' },
      { value: 'title', label: 'Title' },
    ],
    filters: [
      {
        id: 'type',
        label: 'Type',
        icon: 'lucide:filter',
        options: [
          { value: 'all', label: 'All Types' },
          { value: 'deadline', label: 'Deadline' },
          { value: 'inspection', label: 'Inspection' },
          { value: 'training', label: 'Training' },
          { value: 'event', label: 'Event' },
          { value: 'meeting', label: 'Meeting' },
        ],
        fn: (item, val) => item.type === val,
      },
    ],
  })

  const viewMode = computed(() => browseState.viewMode.value)

  // Listen for global detail sheet events
  onMounted(() => {
    const handleSave = (e: any) => {
      const { node, formData, mode, entityType } = e.detail
      if (entityType !== 'event') return

      if (mode === 'create') {
        events.value.push({ ...formData, id: crypto.randomUUID() })
      } else {
        const index = events.value.findIndex((ev: any) => ev.id === node.id)
        if (index !== -1) events.value[index] = { ...events.value[index], ...formData }
      }
    }

    const handleDelete = (e: any) => {
      const { node, entityType } = e.detail
      if (entityType !== 'event') return
      events.value = events.value.filter((ev: any) => ev.id !== node.id)
    }

    window.addEventListener('global-detail-sheet:save', handleSave)
    window.addEventListener('global-detail-sheet:delete', handleDelete)

    onUnmounted(() => {
      window.removeEventListener('global-detail-sheet:save', handleSave)
      window.removeEventListener('global-detail-sheet:delete', handleDelete)
    })
  })
</script>

<template>
  <Page
    variant="browse"
    title="Facility Calendar"
    :subtitle="currentOrganization?.name"
    description="View and manage compliance deadlines, inspections, and scheduled events."
    icon="lucide:calendar"
    icon-class="text-blue-300"
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :browse="browseState">
    <template #filters>
      <UiButton variant="outline" size="sm" class="gap-1 bg-card">
        <Icon name="lucide:chevron-left" class="h-4 w-4" />
      </UiButton>
      <span class="font-medium text-sm px-2">February 2025</span>
      <UiButton variant="outline" size="sm" class="gap-1 bg-card">
        <Icon name="lucide:chevron-right" class="h-4 w-4" />
      </UiButton>
    </template>

    <!-- Page handles #viewSwitcher and automatic filters/sort via :browse prop -->

    <template #toolbarActions>
      <UiButton @click="openDetail({}, { entityType: 'event', mode: 'create' })">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Add Event
      </UiButton>
    </template>

    <!-- Month View -->
    <div v-if="viewMode === 'month'" class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <UiCard>
          <UiCardContent class="p-6">
            <div
              class="flex h-96 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <div class="text-center">
                <Icon name="lucide:calendar" class="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p class="mt-4 text-sm text-muted-foreground">Month calendar view</p>
                <p class="mt-1 text-xs text-muted-foreground/70">Integration with a calendar component</p>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
      <div>
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="text-base">Upcoming Events</UiCardTitle>
            <UiCardDescription>Next 30 days</UiCardDescription>
          </UiCardHeader>
          <UiCardContent class="space-y-3">
            <div
              v-for="event in filteredEvents"
              :key="event.id"
              class="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 cursor-pointer transition-colors"
              @click="openDetail(event, { entityType: 'event' })">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <span class="text-xs font-bold text-muted-foreground">{{ event.date.split('-')[2] }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ event.title }}</p>
                <div class="mt-1 flex items-center gap-2">
                  <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', typeColors[event.type]]">
                    {{ event.type }}
                  </span>
                </div>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </div>

    <!-- Week View -->
    <div v-else-if="viewMode === 'week'">
      <UiCard>
        <UiCardContent class="p-6">
          <div
            class="flex h-[500px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
            <div class="text-center">
              <Icon name="lucide:calendar-days" class="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p class="mt-4 text-sm text-muted-foreground">Week view with time slots</p>
              <p class="mt-1 text-xs text-muted-foreground/70">7-day view with hourly breakdown</p>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Agenda View -->
    <div v-else-if="viewMode === 'agenda'" class="space-y-3">
      <div
        v-for="event in filteredEvents"
        :key="event.id"
        class="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-accent/50 cursor-pointer transition-colors"
        @click="openDetail(event, { entityType: 'event' })">
        <div class="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
          <span class="text-lg font-bold text-foreground">{{ event.date.split('-')[2] }}</span>
          <span class="text-xs text-muted-foreground">Feb</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ event.title }}</p>
          <p class="text-sm text-muted-foreground">{{ event.category }}</p>
        </div>
        <span :class="['rounded-full px-2 py-1 text-xs font-medium shrink-0', typeColors[event.type]]">
          {{ event.type }}
        </span>
        <UiButton variant="ghost" size="icon" class="shrink-0">
          <Icon name="lucide:more-horizontal" class="h-4 w-4" />
        </UiButton>
      </div>
      <div v-if="filteredEvents.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <Icon name="lucide:calendar-x" class="h-12 w-12 text-muted-foreground" />
        <h3 class="mt-4 text-lg font-medium">No events</h3>
        <p class="mt-2 text-sm text-muted-foreground">No events scheduled for this period.</p>
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing all {{ filteredEvents.length }} events
    </div>
  </Page>
</template>
