<script setup lang="ts">
  import CalendarView from '~/components/views/CalendarView.vue'
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem, CalendarItemType } from '~/types/calendarItem'

  definePageMeta({
    layout: 'default',
  })

  const route = useRoute()
  const router = useRouter()

  useHead({ title: 'Calendar | Personal' })

  // ---------------------------------------------------------------------------
  // Section filter (query-param driven)
  // ---------------------------------------------------------------------------

  type Section = 'all' | 'tasks' | 'events' | 'payments' | 'notes'

  interface SectionConfig {
    id: Section
    label: string
    icon: string
    itemType?: CalendarItemType
  }

  const sections: SectionConfig[] = [
    { id: 'all', label: 'All Items', icon: 'lucide:layout-grid' },
    { id: 'tasks', label: 'Tasks', icon: 'lucide:check-square', itemType: 'task' },
    { id: 'events', label: 'Events', icon: 'lucide:calendar-days', itemType: 'event' },
    { id: 'payments', label: 'Payments', icon: 'lucide:credit-card', itemType: 'payment' },
    { id: 'notes', label: 'Notes', icon: 'lucide:sticky-note', itemType: 'note' },
  ]

  // Color map for sidebar filter buttons (matches CalendarView typeColorMap)
  const sectionColors: Record<Section, { activeBg: string; activeText: string; activeBadge: string; iconColor: string }> = {
    all: { activeBg: 'bg-primary/10', activeText: 'text-primary', activeBadge: 'bg-primary/15 text-primary', iconColor: '' },
    tasks: { activeBg: 'bg-blue-100 dark:bg-blue-900/30', activeText: 'text-blue-700 dark:text-blue-300', activeBadge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300', iconColor: 'text-blue-600 dark:text-blue-400' },
    events: { activeBg: 'bg-purple-100 dark:bg-purple-900/30', activeText: 'text-purple-700 dark:text-purple-300', activeBadge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300', iconColor: 'text-purple-600 dark:text-purple-400' },
    payments: { activeBg: 'bg-emerald-100 dark:bg-emerald-900/30', activeText: 'text-emerald-700 dark:text-emerald-300', activeBadge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    notes: { activeBg: 'bg-yellow-100 dark:bg-yellow-900/30', activeText: 'text-yellow-700 dark:text-yellow-300', activeBadge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300', iconColor: 'text-yellow-600 dark:text-yellow-400' },
  }

  const activeSection = computed<Section>({
    get: () => (route.query.section as Section) || 'all',
    set: (v) => router.push({ query: { ...route.query, section: v } }),
  })

  const currentSection = computed(() => sections.find((s) => s.id === activeSection.value))

  // ---------------------------------------------------------------------------
  // Live data from instant-local
  // ---------------------------------------------------------------------------

  const { items, create: createItem, update: updateItem, remove: removeItem } = useCalendarItems()

  // ---------------------------------------------------------------------------
  // Filtered data per section
  // ---------------------------------------------------------------------------

  const sectionItems = computed(() => {
    const sec = activeSection.value
    if (sec === 'all') return items.value
    const cfg = sections.find((s) => s.id === sec)
    if (!cfg?.itemType) return items.value
    return items.value.filter((i) => i.type === cfg.itemType)
  })

  const sectionCount = (sec: Section) => {
    if (sec === 'all') return items.value.length
    const cfg = sections.find((s) => s.id === sec)
    if (!cfg?.itemType) return items.value.length
    return items.value.filter((i) => i.type === cfg.itemType).length
  }

  // ---------------------------------------------------------------------------
  // Calendar data transform (for CalendarView component)
  // ---------------------------------------------------------------------------

  const calendarData = computed(() => {
    const nodes = sectionItems.value.map((item) => ({
      '@id': `item:${item.id}`,
      '@type': item.type.charAt(0).toUpperCase() + item.type.slice(1),
      'trellis:title': item.title,
      'user:dueDate': item.endDate ? { start: item.startDate, end: item.endDate } : item.startDate,
      'user:status': (item as any).taskStatus || (item as any).paymentStatus || (item as any).eventType || 'note',
      'user:priority': item.priority,
      'user:urgency': item.urgency,
    }))
    return JSON.stringify({ '@graph': nodes })
  })

  const calendarSchema = computed(() => ({
    id: 'personal-calendar-schema',
    collectionId: 'personal-items',
    fields: [
      { id: 'dueDate', name: 'Date', type: 'date' as const, order: 0, required: false },
      { id: 'status', name: 'Status', type: 'select' as const, order: 1, required: false },
      { id: 'priority', name: 'Priority', type: 'select' as const, order: 2, required: false },
    ],
    views: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }))

  // ---------------------------------------------------------------------------
  // Dialog state
  // ---------------------------------------------------------------------------

  const createDialogOpen = ref(false)
  const viewDialogOpen = ref(false)
  const viewingItem = ref<CalendarItem | null>(null)
  const createItemType = ref<CalendarItemType>('task')
  const createStartDate = ref<string | undefined>(undefined)

  const taskOwners = [
    { id: 'you', name: 'You' },
    { id: 'alex', name: 'Alex' },
    { id: 'maya', name: 'Maya' },
    { id: 'jordan', name: 'Jordan' },
  ]
  const taskFolders = ['Work', 'Personal', 'Health', 'Finance', 'Projects']

  function openCreate(type?: CalendarItemType, startDate?: Date) {
    createItemType.value = type || currentSection.value?.itemType || 'task'
    createStartDate.value = startDate ? startDate.toISOString().slice(0, 10) : undefined
    createDialogOpen.value = true
  }

  function handleCellClick(date: Date) {
    openCreate(undefined, date)
  }

  function handleCreateRequest(date: Date, typeLabel: string) {
    const typeLower = typeLabel.toLowerCase() as CalendarItemType
    openCreate(typeLower, date)
  }

  function openDetail(item: CalendarItem) {
    viewingItem.value = item
    viewDialogOpen.value = true
  }

  function handleCalendarItemClick(calEvent: { id: string }) {
    // CalendarView formats IDs as "item:{uuid}-{nodeIndex}-{valueIndex}"
    // Strip the prefix and trailing index suffixes to get the original UUID
    const rawId = calEvent.id.replace(/^item:/, '').replace(/-\d+-\d+$/, '')
    const item = items.value.find((i) => i.id === rawId)
    if (item) openDetail(item)
  }

  // Navigation within dialog
  const viewingIndex = computed(() =>
    viewingItem.value ? sectionItems.value.findIndex((i) => i.id === viewingItem.value?.id) : -1,
  )
  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < sectionItems.value.length - 1)
  function navPrev() {
    if (canPrev.value) viewingItem.value = sectionItems.value[viewingIndex.value - 1] as CalendarItem
  }
  function navNext() {
    if (canNext.value) viewingItem.value = sectionItems.value[viewingIndex.value + 1] as CalendarItem
  }

  async function handleCreate(item: CalendarItem) {
    await createItem(item)
    createDialogOpen.value = false
  }

  async function handleUpdate(item: CalendarItem) {
    await updateItem(item)
    viewDialogOpen.value = false
  }

  async function handleDelete(item: CalendarItem) {
    await removeItem(item.id)
    viewDialogOpen.value = false
  }

  function handleEventReschedule(eventId: string, newDate: Date) {
    const rawId = eventId.replace(/^item:/, '').replace(/-\d+-\d+$/, '')
    const item = items.value.find((i) => i.id === rawId)
    if (!item) return
    const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`
    updateItem({ ...item, startDate: dateStr } as CalendarItem)
  }
</script>

<template>
  <Page variant="calendar" seo-title="Calendar | Personal">
    <CalendarView
      collection-id="personal-items"
      :model-value="calendarData"
      :schema="calendarSchema"
      fullscreen
      @task-click="handleCalendarItemClick"
      @cell-click="handleCellClick"
      @create-request="handleCreateRequest"
      @event-reschedule="handleEventReschedule">
      <!-- Type filter buttons under the mini calendar -->
      <template #sidebar-filters>
        <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Filter</h4>
        <div class="flex flex-col gap-1">
          <button
            v-for="sec in sections"
            :key="sec.id"
            type="button"
            :class="[
              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
              activeSection === sec.id
                ? `${sectionColors[sec.id].activeBg} ${sectionColors[sec.id].activeText}`
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ]"
            @click="activeSection = sec.id">
            <Icon
              :name="sec.icon"
              :class="[
                'h-3.5 w-3.5 shrink-0',
                activeSection !== sec.id && sectionColors[sec.id].iconColor ? sectionColors[sec.id].iconColor : '',
              ]" />
            <span class="flex-1">{{ sec.label }}</span>
            <span
              :class="[
                'text-[10px] tabular-nums px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                activeSection === sec.id
                  ? sectionColors[sec.id].activeBadge
                  : 'bg-muted text-muted-foreground',
              ]">
              {{ sectionCount(sec.id) }}
            </span>
          </button>
        </div>
      </template>

      <!-- Create button in the calendar header -->
      <template #header-actions>
        <UiButton size="sm" class="gap-1.5 h-8" @click="openCreate()">
          <Icon name="lucide:plus" class="h-3.5 w-3.5" />
          Add
        </UiButton>
      </template>
    </CalendarView>

    <!-- View/Edit Dialog -->
    <CalendarItemDialog
      v-model:open="viewDialogOpen"
      mode="edit"
      :item="viewingItem"
      :can-navigate-prev="canPrev"
      :can-navigate-next="canNext"
      :owners="taskOwners"
      :folders="taskFolders"
      @navigate-prev="navPrev"
      @navigate-next="navNext"
      @save="handleUpdate"
      @delete="handleDelete"
      @close="viewDialogOpen = false" />

    <!-- Create Dialog -->
    <CalendarItemDialog
      v-model:open="createDialogOpen"
      mode="create"
      :item-type="createItemType"
      :item="null"
      :default-start-date="createStartDate"
      :owners="taskOwners"
      :folders="taskFolders"
      @save="handleCreate"
      @close="createDialogOpen = false" />
  </Page>
</template>
