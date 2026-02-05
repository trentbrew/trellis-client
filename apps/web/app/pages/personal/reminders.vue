<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem, TaskItem } from '~/types/calendarItem'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Reminders | Personal' })

  // ---------------------------------------------------------------------------
  // Seed data — reminders modeled as tasks with due dates
  // ---------------------------------------------------------------------------

  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]!
  const daysFromNow = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d) }

  const items = ref<TaskItem[]>([
    {
      id: 'rem-1', type: 'task', title: 'Call dentist to confirm appointment',
      description: 'Confirm the cleaning scheduled for next week.',
      startDate: daysFromNow(0), allDay: true,
      priority: 'medium', urgency: 'urgent', priorityOverride: false, urgencyOverride: false,
      category: 'health', tags: ['appointment'], owner: 'you', involved: [],
      attachments: [], reminders: [{ id: 'r1', timing: '1-hour-before', method: 'push' }],
      taskStatus: 'pending', checklist: [],
    },
    {
      id: 'rem-2', type: 'task', title: 'Submit expense report',
      description: 'January expenses — receipts already uploaded.',
      startDate: daysFromNow(1), allDay: true,
      priority: 'high', urgency: 'urgent', priorityOverride: false, urgencyOverride: false,
      category: 'work', tags: ['finance', 'admin'], owner: 'you', involved: [],
      attachments: [], reminders: [{ id: 'r2', timing: '1-day-before', method: 'push' }],
      taskStatus: 'pending', checklist: [],
    },
    {
      id: 'rem-3', type: 'task', title: 'Pick up dry cleaning',
      startDate: daysFromNow(2), allDay: true,
      priority: 'low', urgency: 'not-urgent', priorityOverride: false, urgencyOverride: false,
      category: 'personal', tags: ['errands'], owner: 'you', involved: [],
      attachments: [], reminders: [{ id: 'r3', timing: '15-min-before', method: 'push' }],
      taskStatus: 'pending', checklist: [],
    },
    {
      id: 'rem-4', type: 'task', title: 'Renew domain — trellis.dev',
      description: 'Expires Feb 28. Auto-renew is off.',
      startDate: daysFromNow(5), allDay: true,
      priority: 'high', urgency: 'not-urgent', priorityOverride: false, urgencyOverride: false,
      category: 'work', tags: ['domain', 'infrastructure'], owner: 'you', involved: [],
      attachments: [], reminders: [{ id: 'r4', timing: '1-week-before', method: 'email' }],
      taskStatus: 'pending', checklist: [],
    },
    {
      id: 'rem-5', type: 'task', title: 'Water the plants',
      startDate: daysFromNow(0), allDay: true,
      priority: 'low', urgency: 'not-urgent', priorityOverride: false, urgencyOverride: false,
      category: 'personal', tags: ['home'], owner: 'you', involved: [],
      attachments: [],
      reminders: [{ id: 'r5', timing: '1-day-before', method: 'push' }],
      recurrence: { frequency: 'weekly', weekdays: [1, 4] },
      taskStatus: 'completed', checklist: [],
    },
    {
      id: 'rem-6', type: 'task', title: 'Send birthday card to Sam',
      description: 'Birthday is on the 15th — mail by the 12th.',
      startDate: daysFromNow(7), allDay: true,
      priority: 'medium', urgency: 'not-urgent', priorityOverride: false, urgencyOverride: false,
      category: 'personal', tags: ['birthday', 'family'], owner: 'you', involved: [],
      attachments: [], reminders: [{ id: 'r6', timing: '2-days-before', method: 'push' }],
      taskStatus: 'pending', checklist: [],
    },
    {
      id: 'rem-7', type: 'task', title: 'Back up laptop',
      description: 'Full Time Machine backup — last one was 3 weeks ago.',
      startDate: daysFromNow(-1), allDay: true,
      priority: 'medium', urgency: 'urgent', priorityOverride: false, urgencyOverride: true,
      category: 'personal', tags: ['tech', 'backup'], owner: 'you', involved: [],
      attachments: [], reminders: [],
      taskStatus: 'overdue', checklist: [],
    },
  ])

  // ---------------------------------------------------------------------------
  // Browse
  // ---------------------------------------------------------------------------

  const { browseState, filteredItems } = useBrowse({
    items: items as Ref<CalendarItem[]>,
    searchFields: ['title', 'description'] as (keyof CalendarItem)[],
    defaultViewMode: 'list' as BrowseViewMode,
    sortOptions: [
      { value: 'startDate', label: 'Due Date' },
      { value: 'title', label: 'Title' },
      { value: 'priority', label: 'Priority' },
    ],
    filters: [
      {
        id: 'taskStatus', label: 'Status', icon: 'lucide:circle',
        options: [
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'completed', label: 'Done' },
        ],
        fn: (item: any, val: string) => item.taskStatus === val,
      },
    ],
  })

  const viewMode = computed(() => browseState.viewMode.value)

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const stats = computed<PageStat[]>(() => {
    const pending = items.value.filter((r) => r.taskStatus === 'pending').length
    const overdue = items.value.filter((r) => r.taskStatus === 'overdue').length
    const dueToday = items.value.filter((r) => {
      if (r.taskStatus === 'completed') return false
      const due = startOfDay(new Date(r.startDate + 'T00:00:00'))
      return due.getTime() === startOfDay(new Date()).getTime()
    }).length
    return [
      { label: 'Total', value: items.value.length, icon: 'lucide:bell' },
      { label: 'Due Today', value: dueToday, icon: 'lucide:alarm-clock', color: 'text-amber-500' },
      { label: 'Overdue', value: overdue, icon: 'lucide:alert-circle', color: 'text-rose-500' },
      { label: 'Pending', value: pending, icon: 'lucide:clock', color: 'text-blue-500' },
    ]
  })

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  const statusColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    completed: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  const priorityColors: Record<string, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-amber-500',
    low: 'text-blue-500',
  }

  const priorityIcons: Record<string, string> = {
    critical: 'lucide:alert-octagon',
    high: 'lucide:arrow-up',
    medium: 'lucide:minus',
    low: 'lucide:arrow-down',
  }

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    health: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const formatDate = (d: string) => {
    try {
      const due = new Date(d + 'T00:00:00')
      const now = startOfDay(new Date())
      const diff = Math.floor((due.getTime() - now.getTime()) / 86400000)
      if (diff === 0) return 'Today'
      if (diff === 1) return 'Tomorrow'
      if (diff === -1) return 'Yesterday'
      if (diff < -1) return `${Math.abs(diff)} days ago`
      if (diff <= 7) return `In ${diff} days`
      return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch { return d }
  }

  const formatAbsoluteDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  // ---------------------------------------------------------------------------
  // Dialog
  // ---------------------------------------------------------------------------

  const createOpen = ref(false)
  const viewOpen = ref(false)
  const viewingItem = ref<CalendarItem | null>(null)

  const taskOwners = [{ id: 'you', name: 'You' }]
  const taskFolders = ['Work', 'Personal', 'Health']

  function openDetail(item: TaskItem) {
    viewingItem.value = item
    viewOpen.value = true
  }

  function toggleComplete(item: TaskItem, e: Event) {
    e.stopPropagation()
    const idx = items.value.findIndex((i) => i.id === item.id)
    if (idx !== -1) {
      items.value[idx] = { ...items.value[idx]!, taskStatus: item.taskStatus === 'completed' ? 'pending' : 'completed' }
    }
  }

  const viewingIndex = computed(() => viewingItem.value ? filteredItems.value.findIndex((i) => (i as CalendarItem).id === viewingItem.value?.id) : -1)
  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < filteredItems.value.length - 1)
  function navPrev() { if (canPrev.value) viewingItem.value = filteredItems.value[viewingIndex.value - 1] as CalendarItem }
  function navNext() { if (canNext.value) viewingItem.value = filteredItems.value[viewingIndex.value + 1] as CalendarItem }

  function handleCreate(item: CalendarItem) {
    items.value.unshift({ ...item, id: item.id || `rem-${Date.now()}` } as TaskItem)
    createOpen.value = false
  }

  function handleUpdate(item: CalendarItem) {
    const idx = items.value.findIndex((i) => i.id === item.id)
    if (idx !== -1) items.value[idx] = { ...item } as TaskItem
    viewOpen.value = false
  }

  function handleDelete(item: CalendarItem) {
    items.value = items.value.filter((i) => i.id !== item.id)
    viewOpen.value = false
  }
</script>

<template>
  <Page
    variant="browse"
    title="Reminders"
    subtitle="Personal"
    description="Quick reminders and upcoming deadlines."
    icon="lucide:bell"
    icon-class="text-amber-300"
    search-placeholder="Search reminders..."
    :stats="stats"
    :fill-height="true"
    :browse="browseState">

    <!-- Toolbar Actions -->
    <template #toolbarActions>
      <UiButton @click="createOpen = true">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New Reminder
      </UiButton>
    </template>

    <!-- ================= LIST VIEW ================= -->
    <div v-if="viewMode === 'list'" class="space-y-1">
      <div
        v-for="item in (filteredItems as TaskItem[])"
        :key="item.id"
        :class="[
          'flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted transition-colors cursor-pointer',
          item.taskStatus === 'completed' ? 'border-border/50 opacity-60' : item.taskStatus === 'overdue' ? 'border-red-200 dark:border-red-900/30' : 'border-border',
        ]"
        @click="openDetail(item)">
        <!-- Checkbox -->
        <button
          type="button"
          :class="[
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            item.taskStatus === 'completed'
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-muted-foreground/40 hover:border-primary',
          ]"
          @click="toggleComplete(item, $event)">
          <Icon v-if="item.taskStatus === 'completed'" name="lucide:check" class="h-3 w-3" />
        </button>

        <!-- Priority indicator -->
        <Icon :name="priorityIcons[item.priority] || 'lucide:minus'" :class="['h-4 w-4 shrink-0', priorityColors[item.priority]]" />

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p :class="['font-medium truncate', item.taskStatus === 'completed' ? 'line-through text-muted-foreground' : '']">
            {{ item.title }}
          </p>
          <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[item.category] || 'bg-muted text-muted-foreground']">
              {{ item.category }}
            </span>
            <span v-if="item.recurrence" class="flex items-center gap-0.5">
              <Icon name="lucide:repeat" class="h-3 w-3" />
              {{ item.recurrence.frequency }}
            </span>
            <span v-if="item.reminders.length" class="flex items-center gap-0.5">
              <Icon name="lucide:bell" class="h-3 w-3" />
              {{ item.reminders.length }}
            </span>
          </div>
        </div>

        <!-- Date -->
        <div class="text-right shrink-0">
          <p :class="[
            'text-sm font-medium',
            item.taskStatus === 'overdue' ? 'text-red-500' : item.taskStatus === 'completed' ? 'text-muted-foreground' : 'text-foreground',
          ]">
            {{ formatDate(item.startDate) }}
          </p>
          <p class="text-[10px] text-muted-foreground">{{ formatAbsoluteDate(item.startDate) }}</p>
        </div>

        <!-- Status badge -->
        <span :class="['rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 capitalize', statusColors[item.taskStatus]]">
          {{ item.taskStatus }}
        </span>
      </div>
      <div v-if="!filteredItems.length" class="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No reminders found
      </div>
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'reminder' : 'reminders' }}
    </div>

    <!-- View/Edit Dialog -->
    <CalendarItemDialog
      v-model:open="viewOpen"
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
      @close="viewOpen = false" />

    <!-- Create Dialog -->
    <CalendarItemDialog
      v-model:open="createOpen"
      mode="create"
      item-type="task"
      :item="null"
      :owners="taskOwners"
      :folders="taskFolders"
      @save="handleCreate"
      @close="createOpen = false" />
  </Page>
</template>
