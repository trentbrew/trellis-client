<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import CalendarView from '~/components/views/CalendarView.vue'
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem, CalendarItemType, TaskItem, EventItem, PaymentItem, NoteItem } from '~/types/calendarItem'
  import { CALENDAR_ITEM_TYPES } from '~/types/calendarItem'

  definePageMeta({
    layout: 'default',
  })

  const route = useRoute()
  const router = useRouter()

  useHead({ title: 'Calendar | Personal' })

  // ---------------------------------------------------------------------------
  // Section navigation (query-param driven, like ECMS tasks)
  // ---------------------------------------------------------------------------

  type Section = 'all' | 'tasks' | 'events' | 'payments' | 'notes'

  interface SectionConfig {
    id: Section
    label: string
    icon: string
    description: string
    viewModes: BrowseViewMode[]
    itemType?: CalendarItemType
  }

  const sections: SectionConfig[] = [
    { id: 'all', label: 'All Items', icon: 'lucide:layout-grid', description: 'Everything on your calendar', viewModes: ['calendar', 'list', 'kanban'] },
    { id: 'tasks', label: 'Tasks', icon: 'lucide:check-square', description: 'Personal to-dos and projects', viewModes: ['list', 'kanban'], itemType: 'task' },
    { id: 'events', label: 'Events', icon: 'lucide:calendar-days', description: 'Meetings, appointments & deadlines', viewModes: ['calendar', 'list'], itemType: 'event' },
    { id: 'payments', label: 'Payments', icon: 'lucide:credit-card', description: 'Bills, subscriptions & invoices', viewModes: ['list', 'kanban'], itemType: 'payment' },
    { id: 'notes', label: 'Notes', icon: 'lucide:sticky-note', description: 'Ideas, journal entries & bookmarks', viewModes: ['list', 'grid'], itemType: 'note' },
  ]

  const activeSection = computed<Section>({
    get: () => (route.query.section as Section) || 'all',
    set: (v) => router.push({ query: { ...route.query, section: v } }),
  })

  const currentSection = computed(() => sections.find((s) => s.id === activeSection.value))

  // ---------------------------------------------------------------------------
  // Live data from instant-local
  // ---------------------------------------------------------------------------

  const { items, create: createItem, update: updateItem, remove: removeItem } = useCalendarItems()

  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]!
  const daysFromNow = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d) }

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
  // Browse config per section
  // ---------------------------------------------------------------------------

  const browseConfig = computed(() => {
    switch (activeSection.value) {
      case 'tasks':
        return {
          searchFields: ['title', 'description'],
          sortOptions: [
            { value: 'startDate', label: 'Due Date' },
            { value: 'title', label: 'Title' },
            { value: 'priority', label: 'Priority' },
          ],
          filters: [
            {
              id: 'taskStatus', label: 'Status', icon: 'lucide:circle',
              options: [
                { value: 'all', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
              ],
              fn: (item: any, val: string) => item.taskStatus === val,
            },
          ],
        }
      case 'events':
        return {
          searchFields: ['title', 'location'],
          sortOptions: [
            { value: 'startDate', label: 'Date' },
            { value: 'title', label: 'Title' },
          ],
          filters: [
            {
              id: 'eventType', label: 'Type', icon: 'lucide:calendar',
              options: [
                { value: 'all', label: 'All Types' },
                { value: 'meeting', label: 'Meeting' },
                { value: 'appointment', label: 'Appointment' },
                { value: 'training', label: 'Training' },
                { value: 'social', label: 'Social' },
              ],
              fn: (item: any, val: string) => item.eventType === val,
            },
          ],
        }
      case 'payments':
        return {
          searchFields: ['title', 'payee'],
          sortOptions: [
            { value: 'startDate', label: 'Due Date' },
            { value: 'amount', label: 'Amount' },
          ],
          filters: [
            {
              id: 'paymentStatus', label: 'Status', icon: 'lucide:credit-card',
              options: [
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
                { value: 'overdue', label: 'Overdue' },
              ],
              fn: (item: any, val: string) => item.paymentStatus === val,
            },
          ],
        }
      case 'notes':
        return {
          searchFields: ['title', 'content'],
          sortOptions: [
            { value: 'startDate', label: 'Date' },
            { value: 'title', label: 'Title' },
          ],
          filters: [
            {
              id: 'category', label: 'Category', icon: 'lucide:tag',
              options: [
                { value: 'all', label: 'All' },
                { value: 'work', label: 'Work' },
                { value: 'personal', label: 'Personal' },
              ],
              fn: (item: any, val: string) => item.category === val,
            },
          ],
        }
      default:
        return {
          searchFields: ['title', 'description'],
          sortOptions: [
            { value: 'startDate', label: 'Date' },
            { value: 'title', label: 'Title' },
          ],
          filters: [
            {
              id: 'type', label: 'Type', icon: 'lucide:layers',
              options: [
                { value: 'all', label: 'All Types' },
                ...CALENDAR_ITEM_TYPES.map((t) => ({ value: t.value, label: t.label })),
              ],
              fn: (item: any, val: string) => item.type === val,
            },
          ],
        }
    }
  })

  const defaultViewMode = computed<BrowseViewMode>(() => {
    switch (activeSection.value) {
      case 'all': return 'calendar'
      case 'tasks': return 'kanban'
      case 'events': return 'calendar'
      case 'notes': return 'grid'
      default: return 'list'
    }
  })

  const { browseState, filteredItems } = useBrowse({
    items: sectionItems,
    searchFields: browseConfig.value.searchFields as (keyof CalendarItem)[],
    defaultViewMode: defaultViewMode.value as BrowseViewMode,
    sortOptions: browseConfig.value.sortOptions,
    filters: browseConfig.value.filters,
  })

  const viewMode = computed(() => browseState.viewMode.value)

  const allowedViewModes = computed(() => currentSection.value?.viewModes || ['list'])

  watch(activeSection, () => {
    const allowed = allowedViewModes.value
    if (allowed.includes(browseState.viewMode.value)) return
    const next = allowed[0] || 'list'
    browseState.setViewMode(next as BrowseViewMode)
  }, { immediate: true })

  const viewModeIcons: Record<string, string> = {
    calendar: 'lucide:calendar',
    list: 'lucide:list',
    kanban: 'lucide:layout-grid',
    grid: 'lucide:grid-3x3',
    table: 'lucide:table',
  }

  // ---------------------------------------------------------------------------
  // Calendar data transform (for CalendarView component)
  // ---------------------------------------------------------------------------

  const calendarData = computed(() => {
    const nodes = items.value.map((item) => ({
      '@id': `item:${item.id}`,
      '@type': item.type.charAt(0).toUpperCase() + item.type.slice(1),
      'trellis:title': item.title,
      'user:dueDate': item.startDate,
      'user:status': (item as any).taskStatus || (item as any).paymentStatus || (item as any).eventType || 'note',
      'user:priority': item.priority,
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
  // Stats
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => {
    const taskItems = items.value.filter((i) => i.type === 'task') as TaskItem[]
    const eventItems = items.value.filter((i) => i.type === 'event')
    const paymentItems = items.value.filter((i) => i.type === 'payment') as PaymentItem[]
    const noteItems = items.value.filter((i) => i.type === 'note')

    switch (activeSection.value) {
      case 'tasks': {
        const overdue = taskItems.filter((t) => t.taskStatus === 'overdue').length
        const inProgress = taskItems.filter((t) => t.taskStatus === 'in-progress').length
        return [
          { label: 'Tasks', value: taskItems.length, icon: 'lucide:check-square' },
          { label: 'In Progress', value: inProgress, icon: 'lucide:loader', color: 'text-blue-500' },
          { label: 'Overdue', value: overdue, icon: 'lucide:alert-circle', color: 'text-rose-500' },
        ]
      }
      case 'events':
        return [
          { label: 'Events', value: eventItems.length, icon: 'lucide:calendar-days' },
          { label: 'This Week', value: eventItems.filter((e) => new Date(e.startDate) <= new Date(daysFromNow(7))).length, icon: 'lucide:clock', color: 'text-blue-500' },
        ]
      case 'payments': {
        const total = paymentItems.reduce((s, p) => s + p.amount, 0)
        const pending = paymentItems.filter((p) => p.paymentStatus === 'pending').length
        return [
          { label: 'Payments', value: paymentItems.length, icon: 'lucide:credit-card' },
          { label: 'Total Due', value: `$${total.toLocaleString()}`, icon: 'lucide:banknote', color: 'text-amber-500' },
          { label: 'Pending', value: pending, icon: 'lucide:clock', color: 'text-blue-500' },
        ]
      }
      case 'notes':
        return [
          { label: 'Notes', value: noteItems.length, icon: 'lucide:sticky-note' },
          { label: 'Pinned', value: (noteItems as NoteItem[]).filter((n) => n.pinned).length, icon: 'lucide:pin', color: 'text-amber-500' },
        ]
      default:
        return [
          { label: 'Total', value: items.value.length, icon: 'lucide:layout-grid' },
          { label: 'Tasks', value: taskItems.length, icon: 'lucide:check-square', color: 'text-emerald-500' },
          { label: 'Events', value: eventItems.length, icon: 'lucide:calendar-days', color: 'text-blue-500' },
          { label: 'Payments', value: paymentItems.length, icon: 'lucide:credit-card', color: 'text-amber-500' },
          { label: 'Notes', value: noteItems.length, icon: 'lucide:sticky-note', color: 'text-purple-500' },
        ]
    }
  })

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  const typeIcon = (t: string) => CALENDAR_ITEM_TYPES.find((x) => x.value === t)?.icon || 'lucide:circle'
  const typeLabel = (t: string) => CALENDAR_ITEM_TYPES.find((x) => x.value === t)?.label || t

  const priorityColors: Record<string, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-amber-500',
    low: 'text-blue-500',
  }
  const _priorityIcons: Record<string, string> = {
    critical: 'lucide:alert-octagon',
    high: 'lucide:arrow-up',
    medium: 'lucide:minus',
    low: 'lucide:arrow-down',
  }

  const statusBadge = (item: CalendarItem) => {
    if (item.type === 'task') return { label: (item as TaskItem).taskStatus.replace('-', ' '), class: taskStatusColor((item as TaskItem).taskStatus) }
    if (item.type === 'payment') return { label: (item as PaymentItem).paymentStatus, class: paymentStatusColor((item as PaymentItem).paymentStatus) }
    if (item.type === 'event') return { label: (item as EventItem).eventType, class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
    if (item.type === 'note') return { label: (item as NoteItem).pinned ? 'pinned' : 'note', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' }
    return { label: item.type, class: 'bg-muted text-muted-foreground' }
  }

  const taskStatusColor = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'on-track': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      'due-soon': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      completed: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    }
    return map[s] || 'bg-muted text-muted-foreground'
  }

  const paymentStatusColor = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    }
    return map[s] || 'bg-muted text-muted-foreground'
  }

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    health: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    finance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    meeting: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    appointment: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  // ---------------------------------------------------------------------------
  // Kanban columns (due-date buckets, like ECMS)
  // ---------------------------------------------------------------------------

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  type DueBucket = 'overdue' | 'today' | 'this-week' | 'later' | 'no-date'

  const getBucket = (item: CalendarItem): DueBucket => {
    if (!item.startDate) return 'no-date'
    const due = startOfDay(new Date(item.startDate + 'T00:00:00'))
    const now = startOfDay(new Date())
    const diffDays = Math.floor((due.getTime() - now.getTime()) / 86400000)
    if (diffDays < 0) return 'overdue'
    if (diffDays === 0) return 'today'
    if (diffDays <= 7) return 'this-week'
    return 'later'
  }

  const kanbanColumns = computed(() => [
    { id: 'overdue', label: 'Overdue', color: 'border-red-500', items: filteredItems.value.filter((i) => getBucket(i as CalendarItem) === 'overdue') },
    { id: 'today', label: 'Today', color: 'border-amber-500', items: filteredItems.value.filter((i) => getBucket(i as CalendarItem) === 'today') },
    { id: 'this-week', label: 'This Week', color: 'border-blue-500', items: filteredItems.value.filter((i) => getBucket(i as CalendarItem) === 'this-week') },
    { id: 'later', label: 'Later', color: 'border-emerald-500', items: filteredItems.value.filter((i) => getBucket(i as CalendarItem) === 'later') },
    { id: 'no-date', label: 'No Date', color: 'border-gray-400', items: filteredItems.value.filter((i) => getBucket(i as CalendarItem) === 'no-date') },
  ])

  // ---------------------------------------------------------------------------
  // Dialog state
  // ---------------------------------------------------------------------------

  const createDialogOpen = ref(false)
  const viewDialogOpen = ref(false)
  const viewingItem = ref<CalendarItem | null>(null)
  const createItemType = ref<CalendarItemType>('task')

  const taskOwners = [{ id: 'you', name: 'You' }, { id: 'alex', name: 'Alex' }, { id: 'maya', name: 'Maya' }, { id: 'jordan', name: 'Jordan' }]
  const taskFolders = ['Work', 'Personal', 'Health', 'Finance', 'Projects']

  function openCreate(type?: CalendarItemType) {
    createItemType.value = type || currentSection.value?.itemType || 'task'
    createDialogOpen.value = true
  }

  function openDetail(item: CalendarItem) {
    viewingItem.value = item
    viewDialogOpen.value = true
  }

  function handleCalendarItemClick(calEvent: { id: string }) {
    const idMatch = calEvent.id.match(/^item:([^-]+)/)
    const itemId = idMatch ? idMatch[1] : calEvent.id
    const item = items.value.find((i) => i.id === itemId)
    if (item) openDetail(item)
  }

  // Navigation within dialog
  const viewingIndex = computed(() => viewingItem.value ? filteredItems.value.findIndex((i) => (i as CalendarItem).id === viewingItem.value?.id) : -1)
  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < filteredItems.value.length - 1)
  function navPrev() { if (canPrev.value) viewingItem.value = filteredItems.value[viewingIndex.value - 1] as CalendarItem }
  function navNext() { if (canNext.value) viewingItem.value = filteredItems.value[viewingIndex.value + 1] as CalendarItem }

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
</script>

<template>
  <div class="flex flex-col h-full bg-muted/50">
    <!-- Horizontal Tab Navigation -->
    <div class="border-b border-border">
      <div class="px-6">
        <div class="flex items-center gap-1 -mb-px">
          <button
            v-for="sec in sections"
            :key="sec.id"
            type="button"
            :class="[
              'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors rounded-none',
              activeSection === sec.id
                ? 'text-foreground border-b-3 border-b-primary'
                : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="activeSection = sec.id">
            <Icon :name="sec.icon" class="h-4 w-4 shrink-0" />
            <span>{{ sec.label }}</span>
            <span
              v-if="sectionCount(sec.id)"
              :class="[
                'text-xs px-1.5 py-0.5 rounded-full',
                activeSection === sec.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
              ]">
              {{ sectionCount(sec.id) }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <Page
      variant="browse"
      :title="currentSection?.label || 'My Calendar'"
      subtitle="Personal"
      :description="currentSection?.description"
      icon="lucide:calendar"
      icon-class="text-blue-300"
      :search-placeholder="`Search ${currentSection?.label.toLowerCase() || 'items'}...`"
      :stats="stats"
      :show-view-switcher="true"
      :fill-height="true"
      :browse="browseState"
      class="flex-1 min-h-0">

      <!-- View Switcher -->
      <template #viewSwitcher>
        <div class="flex items-center gap-1">
          <button
            v-for="mode in allowedViewModes"
            :key="mode"
            type="button"
            class="flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors"
            :class="viewMode === mode ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'"
            @click="browseState.setViewMode(mode as BrowseViewMode)">
            <Icon :name="viewModeIcons[mode] || 'lucide:list'" class="h-4 w-4" />
            {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
          </button>
        </div>
      </template>

      <!-- Toolbar Actions -->
      <template #toolbarActions>
        <UiButton @click="openCreate()">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          {{ currentSection?.itemType ? `New ${typeLabel(currentSection.itemType)}` : 'New Item' }}
        </UiButton>
      </template>

      <!-- ================= CALENDAR VIEW ================= -->
      <div v-if="viewMode === 'calendar'" class="h-fit min-h-125">
        <CalendarView
          collection-id="personal-items"
          :model-value="calendarData"
          :schema="calendarSchema"
          @task-click="handleCalendarItemClick" />
      </div>

      <!-- ================= LIST VIEW ================= -->
      <div v-if="viewMode === 'list'" class="space-y-2">
        <div
          v-for="item in (filteredItems as CalendarItem[])"
          :key="item.id"
          class="flex items-start gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted transition-colors cursor-pointer"
          @click="openDetail(item)">
          <Icon :name="typeIcon(item.type)" :class="['h-5 w-5 shrink-0 mt-0.5', priorityColors[item.priority]]" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <p class="font-medium truncate">{{ item.title }}</p>
              <Icon v-if="item.type === 'note' && (item as NoteItem).pinned" name="lucide:pin" class="h-3.5 w-3.5 text-amber-500 shrink-0" />
            </div>
            <div class="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[item.category] || 'bg-muted text-muted-foreground']">
                {{ item.category }}
              </span>
              <span>{{ formatDate(item.startDate) }}</span>
              <span v-if="!item.allDay && item.startTime" class="text-xs">{{ item.startTime }}{{ item.endTime ? ` - ${item.endTime}` : '' }}</span>
              <span v-if="item.type === 'payment'" class="font-medium text-foreground">${{ (item as PaymentItem).amount.toLocaleString() }}</span>
              <span v-if="item.tags.length" class="flex items-center gap-1">
                <Icon name="lucide:hash" class="h-3 w-3" />
                {{ item.tags.slice(0, 2).join(', ') }}
              </span>
            </div>
          </div>
          <span :class="['rounded-full px-2 py-0.5 text-xs font-medium shrink-0 capitalize', statusBadge(item).class]">
            {{ statusBadge(item).label }}
          </span>
        </div>
        <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
          No items found
        </div>
      </div>

      <!-- ================= GRID VIEW (Notes) ================= -->
      <div v-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiCard
          v-for="item in (filteredItems as CalendarItem[])"
          :key="item.id"
          class="relative overflow-hidden hover:bg-muted transition-colors cursor-pointer"
          @click="openDetail(item)">
          <UiCardHeader class="pb-2">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2">
                <Icon :name="typeIcon(item.type)" class="h-4 w-4 text-muted-foreground" />
                <span v-if="item.type === 'note' && (item as NoteItem).pinned" class="text-amber-500"><Icon name="lucide:pin" class="h-3.5 w-3.5" /></span>
              </div>
              <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[item.category] || 'bg-muted text-muted-foreground']">
                {{ item.category }}
              </span>
            </div>
            <UiCardTitle class="text-base mt-2">{{ item.title }}</UiCardTitle>
          </UiCardHeader>
          <UiCardContent class="pt-0 space-y-2">
            <p v-if="item.description" class="text-sm text-muted-foreground line-clamp-3">{{ item.description }}</p>
            <p v-if="item.type === 'note' && (item as NoteItem).content" class="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">{{ (item as NoteItem).content }}</p>
            <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
              <span>{{ formatDate(item.startDate) }}</span>
              <div class="flex items-center gap-1">
                <span v-for="tag in item.tags.slice(0, 2)" :key="tag" class="bg-muted px-1.5 py-0.5 rounded text-[10px]">#{{ tag }}</span>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
        <div v-if="!filteredItems.length" class="col-span-full flex items-center justify-center h-40 text-sm text-muted-foreground">
          No items found
        </div>
      </div>

      <!-- ================= KANBAN VIEW ================= -->
      <div v-if="viewMode === 'kanban'" class="flex flex-1 min-h-0 items-stretch gap-4 overflow-x-auto pb-4">
        <div
          v-for="col in kanbanColumns"
          :key="col.id"
          :class="['shrink-0 w-72 rounded-lg border-t-4 bg-muted/30 flex h-full max-h-full flex-col overflow-y-auto', col.color]">
          <div class="sticky top-0 z-10 p-3 border-b border-border bg-muted/30">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-sm">{{ col.label }}</h3>
              <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{{ col.items.length }}</span>
            </div>
          </div>
          <div class="p-2 space-y-2 min-h-[200px]">
            <div
              v-for="item in (col.items as CalendarItem[])"
              :key="item.id"
              class="rounded-lg border border-border bg-card p-3 hover:bg-muted transition-colors cursor-pointer"
              @click="openDetail(item)">
              <div class="flex items-start gap-2 mb-2">
                <Icon :name="typeIcon(item.type)" :class="['h-4 w-4 shrink-0 mt-0.5', priorityColors[item.priority]]" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium leading-tight">{{ item.title }}</p>
                  <div class="flex items-center gap-1 mt-1">
                    <span :class="['rounded-full px-1.5 py-0.5 text-[9px] font-medium', categoryColors[item.category] || 'bg-muted text-muted-foreground']">
                      {{ item.category }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span>{{ typeLabel(item.type) }}</span>
                <span>{{ formatDate(item.startDate) }}</span>
              </div>
            </div>
            <div v-if="!col.items.length" class="flex items-center justify-center h-20 text-sm text-muted-foreground">
              No items
            </div>
          </div>
        </div>
      </div>

      <!-- Results count -->
      <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
        Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'item' : 'items' }}
      </div>

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
        :owners="taskOwners"
        :folders="taskFolders"
        @save="handleCreate"
        @close="createDialogOpen = false" />
    </Page>
  </div>
</template>

<style scoped>
  .tab-fade-enter-active,
  .tab-fade-leave-active {
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
  }
  .tab-fade-enter-from {
    opacity: 0;
    transform: translateY(4px);
  }
  .tab-fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
  }
</style>
