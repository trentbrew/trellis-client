<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem, TaskItem, EventItem, NoteItem } from '~/types/calendarItem'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Today | Personal' })

  // ---------------------------------------------------------------------------
  // Date helpers
  // ---------------------------------------------------------------------------

  const now = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]!
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const todayStr = fmt(now)

  const daysFromNow = (n: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + n)
    return fmt(d)
  }

  // ---------------------------------------------------------------------------
  // Seed data — aggregated from tasks, events, reminders, notes
  // ---------------------------------------------------------------------------

  const tasks = ref<TaskItem[]>([
    {
      id: 'today-t1', type: 'task', title: 'Finish quarterly review slides',
      description: 'Prepare the slide deck for Q1 review with stakeholders.',
      startDate: daysFromNow(-2), allDay: true,
      priority: 'high', urgency: 'urgent', priorityOverride: false, urgencyOverride: false,
      category: 'work', tags: ['presentation'], owner: 'you', involved: [],
      attachments: [], reminders: [], taskStatus: 'in-progress', checklist: [
        { id: 'cl-1', label: 'Draft outline', completed: true, order: 0 },
        { id: 'cl-2', label: 'Add financial charts', completed: false, order: 1 },
      ],
    },
    {
      id: 'today-t2', type: 'task', title: 'Call dentist to confirm appointment',
      description: 'Confirm the cleaning scheduled for next week.',
      startDate: daysFromNow(0), allDay: true,
      priority: 'medium', urgency: 'urgent', priorityOverride: false, urgencyOverride: false,
      category: 'health', tags: ['appointment'], owner: 'you', involved: [],
      attachments: [], reminders: [{ id: 'r1', timing: '1-hour-before', method: 'push' }],
      taskStatus: 'pending', checklist: [],
    },
    {
      id: 'today-t3', type: 'task', title: 'Submit expense report',
      description: 'January expenses — receipts already uploaded.',
      startDate: daysFromNow(1), allDay: true,
      priority: 'high', urgency: 'urgent', priorityOverride: false, urgencyOverride: false,
      category: 'work', tags: ['finance'], owner: 'you', involved: [],
      attachments: [], reminders: [{ id: 'r2', timing: '1-day-before', method: 'push' }],
      taskStatus: 'pending', checklist: [],
    },
    {
      id: 'today-t4', type: 'task', title: 'Read chapter 5 — Replication',
      description: 'Continue "Designing Data-Intensive Applications".',
      startDate: daysFromNow(0), allDay: true,
      priority: 'low', urgency: 'not-urgent', priorityOverride: false, urgencyOverride: false,
      category: 'personal', tags: ['reading'], owner: 'you', involved: [],
      attachments: [], reminders: [], taskStatus: 'in-progress', checklist: [],
    },
    {
      id: 'today-t5', type: 'task', title: 'Water the plants',
      startDate: daysFromNow(0), allDay: true,
      priority: 'low', urgency: 'not-urgent', priorityOverride: false, urgencyOverride: false,
      category: 'personal', tags: ['home'], owner: 'you', involved: [],
      attachments: [], reminders: [{ id: 'r3', timing: '1-day-before', method: 'push' }],
      recurrence: { frequency: 'weekly', weekdays: [1, 4] },
      taskStatus: 'completed', checklist: [],
    },
    {
      id: 'today-t6', type: 'task', title: 'Back up laptop',
      description: 'Full Time Machine backup — last one was 3 weeks ago.',
      startDate: daysFromNow(-1), allDay: true,
      priority: 'medium', urgency: 'urgent', priorityOverride: false, urgencyOverride: true,
      category: 'personal', tags: ['tech'], owner: 'you', involved: [],
      attachments: [], reminders: [],
      taskStatus: 'overdue', checklist: [],
    },
    {
      id: 'today-t7', type: 'task', title: 'Pick up dry cleaning',
      startDate: daysFromNow(2), allDay: true,
      priority: 'low', urgency: 'not-urgent', priorityOverride: false, urgencyOverride: false,
      category: 'personal', tags: ['errands'], owner: 'you', involved: [],
      attachments: [], reminders: [{ id: 'r4', timing: '15-min-before', method: 'push' }],
      taskStatus: 'pending', checklist: [],
    },
    {
      id: 'today-t8', type: 'task', title: 'Send birthday card to Sam',
      description: 'Birthday is on the 15th — mail by the 12th.',
      startDate: daysFromNow(7), allDay: true,
      priority: 'medium', urgency: 'not-urgent', priorityOverride: false, urgencyOverride: false,
      category: 'personal', tags: ['birthday'], owner: 'you', involved: [],
      attachments: [], reminders: [{ id: 'r5', timing: '2-days-before', method: 'push' }],
      taskStatus: 'pending', checklist: [],
    },
  ])

  const events = ref<EventItem[]>([
    {
      id: 'today-e1', type: 'event', title: 'Team standup',
      description: 'Daily sync with the product team.',
      startDate: daysFromNow(0), allDay: false, startTime: '09:30', endTime: '09:45',
      priority: 'medium', urgency: 'not-urgent', priorityOverride: false, urgencyOverride: false,
      category: 'meeting', tags: ['recurring'], owner: 'you', involved: ['alex', 'jordan'],
      attachments: [], reminders: [], eventType: 'meeting',
      recurrence: { frequency: 'weekdays' },
    },
    {
      id: 'today-e2', type: 'event', title: 'Design review — new dashboard',
      description: 'Present wireframes and get feedback.',
      startDate: daysFromNow(0), allDay: false, startTime: '14:00', endTime: '15:00',
      priority: 'high', urgency: 'urgent', priorityOverride: false, urgencyOverride: false,
      category: 'meeting', tags: ['design'], owner: 'you', involved: ['maya'],
      attachments: [], reminders: [{ id: 'r6', timing: '15-min-before', method: 'push' }],
      eventType: 'meeting',
    },
    {
      id: 'today-e3', type: 'event', title: 'Dentist appointment',
      description: 'Cleaning & checkup at Bright Smiles.',
      startDate: daysFromNow(3), allDay: false, startTime: '14:00', endTime: '15:00',
      priority: 'medium', urgency: 'not-urgent', priorityOverride: false, urgencyOverride: false,
      category: 'appointment', tags: ['health'], owner: 'you', involved: [],
      location: '123 Main St, Suite 200',
      attachments: [], reminders: [{ id: 'r7', timing: '1-day-before', method: 'push' }],
      eventType: 'appointment',
    },
  ])

  const recentNotes = ref<NoteItem[]>([
    {
      id: 'today-n1', type: 'note', title: 'Gratitude journal — week 5',
      description: 'Weekly reflection.',
      startDate: daysFromNow(0), allDay: true,
      priority: 'low', urgency: 'not-urgent', priorityOverride: false, urgencyOverride: false,
      category: 'personal', tags: ['journal', 'gratitude'], owner: 'you', involved: [],
      attachments: [], reminders: [],
      content: 'Grateful for: good health, a productive week, a long walk in the park.',
      pinned: false, linkedItems: [],
    },
    {
      id: 'today-n2', type: 'note', title: 'Meeting notes — roadmap planning',
      description: 'Key takeaways from the Q1 planning session.',
      startDate: daysFromNow(-1), allDay: true,
      priority: 'medium', urgency: 'not-urgent', priorityOverride: false, urgencyOverride: false,
      category: 'work', tags: ['meeting-notes'], owner: 'you', involved: ['alex', 'maya'],
      attachments: [], reminders: [],
      content: '- Ship v2 by end of March\n- Hire 1 more frontend engineer\n- Migrate auth to new provider',
      pinned: false, linkedItems: [],
    },
  ])

  // ---------------------------------------------------------------------------
  // Computed sections
  // ---------------------------------------------------------------------------

  const isToday = (d: string) => d === todayStr
  const isPast = (d: string) => d < todayStr

  const overdueTasks = computed(() =>
    tasks.value.filter((t) => t.taskStatus !== 'completed' && isPast(t.startDate)),
  )

  const dueTodayTasks = computed(() =>
    tasks.value.filter((t) => t.taskStatus !== 'completed' && isToday(t.startDate)),
  )

  const todayEvents = computed(() =>
    events.value.filter((e) => isToday(e.startDate)).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
  )

  const upcomingTasks = computed(() =>
    tasks.value
      .filter((t) => t.taskStatus !== 'completed' && t.startDate > todayStr && t.startDate <= daysFromNow(3))
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
  )

  const upcomingEvents = computed(() =>
    events.value
      .filter((e) => e.startDate > todayStr && e.startDate <= daysFromNow(3))
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
  )

  const completedToday = computed(() =>
    tasks.value.filter((t) => t.taskStatus === 'completed' && isToday(t.startDate)),
  )

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const stats = computed<PageStat[]>(() => [
    { label: 'Due Today', value: dueTodayTasks.value.length, icon: 'lucide:target', color: 'text-amber-500' },
    { label: 'Overdue', value: overdueTasks.value.length, icon: 'lucide:alert-circle', color: 'text-rose-500' },
    { label: 'Events', value: todayEvents.value.length, icon: 'lucide:calendar', color: 'text-blue-500' },
    { label: 'Done', value: completedToday.value.length, icon: 'lucide:check-circle', color: 'text-emerald-500' },
  ])

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

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

  const statusColors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    completed: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    health: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    meeting: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    appointment: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const formatRelDate = (d: string) => {
    try {
      const due = startOfDay(new Date(d + 'T00:00:00'))
      const today = startOfDay(new Date())
      const diff = Math.floor((due.getTime() - today.getTime()) / 86400000)
      if (diff === 0) return 'Today'
      if (diff === 1) return 'Tomorrow'
      if (diff === -1) return 'Yesterday'
      if (diff < -1) return `${Math.abs(diff)} days ago`
      if (diff <= 7) return `In ${diff} days`
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch { return d }
  }

  const formatTime = (t?: string) => {
    if (!t) return ''
    try {
      const [h, m] = t.split(':').map(Number)
      const ampm = h! >= 12 ? 'PM' : 'AM'
      const hour = h! % 12 || 12
      return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
    } catch { return t }
  }

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
  // Dialog
  // ---------------------------------------------------------------------------

  const createOpen = ref(false)
  const viewOpen = ref(false)
  const viewingItem = ref<CalendarItem | null>(null)
  const taskOwners = [{ id: 'you', name: 'You' }]

  function openDetail(item: CalendarItem) {
    viewingItem.value = item
    viewOpen.value = true
  }

  function toggleComplete(item: TaskItem, e: Event) {
    e.stopPropagation()
    const idx = tasks.value.findIndex((i) => i.id === item.id)
    if (idx !== -1) {
      tasks.value[idx] = { ...tasks.value[idx]!, taskStatus: item.taskStatus === 'completed' ? 'pending' : 'completed' }
    }
  }

  function handleCreate(item: CalendarItem) {
    if (item.type === 'task') {
      tasks.value.unshift({ ...item, id: item.id || `today-t-${Date.now()}` } as TaskItem)
    } else if (item.type === 'event') {
      events.value.unshift({ ...item, id: item.id || `today-e-${Date.now()}` } as EventItem)
    } else if (item.type === 'note') {
      recentNotes.value.unshift({ ...item, id: item.id || `today-n-${Date.now()}` } as NoteItem)
    }
    createOpen.value = false
  }

  function handleUpdate(item: CalendarItem) {
    if (item.type === 'task') {
      const idx = tasks.value.findIndex((t) => t.id === item.id)
      if (idx !== -1) tasks.value[idx] = { ...item } as TaskItem
    } else if (item.type === 'event') {
      const idx = events.value.findIndex((e) => e.id === item.id)
      if (idx !== -1) events.value[idx] = { ...item } as EventItem
    } else if (item.type === 'note') {
      const idx = recentNotes.value.findIndex((n) => n.id === item.id)
      if (idx !== -1) recentNotes.value[idx] = { ...item } as NoteItem
    }
    viewOpen.value = false
  }

  function handleDelete(item: CalendarItem) {
    tasks.value = tasks.value.filter((t) => t.id !== item.id)
    events.value = events.value.filter((e) => e.id !== item.id)
    recentNotes.value = recentNotes.value.filter((n) => n.id !== item.id)
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

    <div class="max-w-3xl mx-auto space-y-8 pb-16">
      <!-- Greeting -->
      <div class="pt-2">
        <h2 class="text-2xl font-semibold tracking-tight">{{ greeting }}</h2>
        <p class="text-sm text-muted-foreground mt-1">
          Here's what's on your plate today.
        </p>
      </div>

      <!-- =================== OVERDUE =================== -->
      <section v-if="overdueTasks.length" class="space-y-3">
        <div class="flex items-center gap-2">
          <Icon name="lucide:alert-circle" class="h-4 w-4 text-red-500" />
          <h3 class="text-xs font-semibold uppercase tracking-wide text-red-500">Overdue</h3>
          <span class="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full px-2 py-0.5 font-medium">
            {{ overdueTasks.length }}
          </span>
        </div>
        <div class="space-y-1">
          <div
            v-for="item in overdueTasks"
            :key="item.id"
            class="flex items-center gap-3 rounded-lg border border-red-200 dark:border-red-900/30 bg-card px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
            @click="openDetail(item)">
            <button
              type="button"
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 hover:border-primary transition-colors"
              @click="toggleComplete(item, $event)" />
            <Icon :name="priorityIcons[item.priority] || 'lucide:minus'" :class="['h-4 w-4 shrink-0', priorityColors[item.priority]]" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm truncate">{{ item.title }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ formatRelDate(item.startDate) }}</p>
            </div>
            <span class="rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              overdue
            </span>
          </div>
        </div>
      </section>

      <!-- =================== TODAY'S EVENTS =================== -->
      <section v-if="todayEvents.length" class="space-y-3">
        <div class="flex items-center gap-2">
          <Icon name="lucide:calendar" class="h-4 w-4 text-blue-500" />
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule</h3>
        </div>
        <div class="space-y-1">
          <div
            v-for="event in todayEvents"
            :key="event.id"
            class="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
            @click="openDetail(event)">
            <div class="w-16 shrink-0 text-center">
              <p class="text-sm font-semibold text-foreground">{{ formatTime(event.startTime) }}</p>
              <p v-if="event.endTime" class="text-[10px] text-muted-foreground">{{ formatTime(event.endTime) }}</p>
            </div>
            <div class="w-px h-8 bg-blue-400 dark:bg-blue-500 shrink-0 rounded-full" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm truncate">{{ event.title }}</p>
              <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[event.category] || 'bg-muted text-muted-foreground']">
                  {{ event.category }}
                </span>
                <span v-if="event.location" class="flex items-center gap-0.5 truncate">
                  <Icon name="lucide:map-pin" class="h-3 w-3" />
                  {{ event.location }}
                </span>
                <span v-if="event.involved?.length" class="flex items-center gap-0.5">
                  <Icon name="lucide:users" class="h-3 w-3" />
                  {{ event.involved.length }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- =================== DUE TODAY =================== -->
      <section v-if="dueTodayTasks.length" class="space-y-3">
        <div class="flex items-center gap-2">
          <Icon name="lucide:target" class="h-4 w-4 text-amber-500" />
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due Today</h3>
          <span class="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full px-2 py-0.5 font-medium">
            {{ dueTodayTasks.length }}
          </span>
        </div>
        <div class="space-y-1">
          <div
            v-for="item in dueTodayTasks"
            :key="item.id"
            class="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
            @click="openDetail(item)">
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
            <Icon :name="priorityIcons[item.priority] || 'lucide:minus'" :class="['h-4 w-4 shrink-0', priorityColors[item.priority]]" />
            <div class="flex-1 min-w-0">
              <p :class="['font-medium text-sm truncate', item.taskStatus === 'completed' ? 'line-through text-muted-foreground' : '']">
                {{ item.title }}
              </p>
              <div class="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[item.category] || 'bg-muted text-muted-foreground']">
                  {{ item.category }}
                </span>
                <span v-if="item.reminders.length" class="flex items-center gap-0.5">
                  <Icon name="lucide:bell" class="h-3 w-3" />
                  {{ item.reminders.length }}
                </span>
              </div>
            </div>
            <span :class="['rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 capitalize', statusColors[item.taskStatus]]">
              {{ item.taskStatus }}
            </span>
          </div>
        </div>
      </section>

      <!-- =================== UPCOMING (next 3 days) =================== -->
      <section v-if="upcomingTasks.length || upcomingEvents.length" class="space-y-3">
        <div class="flex items-center gap-2">
          <Icon name="lucide:clock" class="h-4 w-4 text-muted-foreground" />
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</h3>
        </div>
        <div class="space-y-1">
          <!-- Upcoming events -->
          <div
            v-for="event in upcomingEvents"
            :key="event.id"
            class="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
            @click="openDetail(event)">
            <Icon name="lucide:calendar-days" class="h-4 w-4 shrink-0 text-blue-500" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm truncate">{{ event.title }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">
                {{ formatRelDate(event.startDate) }}
                <template v-if="event.startTime"> · {{ formatTime(event.startTime) }}</template>
              </p>
            </div>
            <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[event.category] || 'bg-muted text-muted-foreground']">
              {{ event.category }}
            </span>
          </div>
          <!-- Upcoming tasks -->
          <div
            v-for="item in upcomingTasks"
            :key="item.id"
            class="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
            @click="openDetail(item)">
            <button
              type="button"
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 hover:border-primary transition-colors"
              @click="toggleComplete(item, $event)" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm truncate">{{ item.title }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ formatRelDate(item.startDate) }}</p>
            </div>
            <Icon :name="priorityIcons[item.priority] || 'lucide:minus'" :class="['h-4 w-4 shrink-0', priorityColors[item.priority]]" />
          </div>
        </div>
      </section>

      <!-- =================== RECENT NOTES =================== -->
      <section v-if="recentNotes.length" class="space-y-3">
        <div class="flex items-center gap-2">
          <Icon name="lucide:sticky-note" class="h-4 w-4 text-purple-500" />
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Notes</h3>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div
            v-for="note in recentNotes"
            :key="note.id"
            class="rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            @click="openDetail(note)">
            <div class="flex items-start justify-between gap-2 mb-2">
              <p class="font-medium text-sm truncate">{{ note.title }}</p>
              <span :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0', categoryColors[note.category] || 'bg-muted text-muted-foreground']">
                {{ note.category }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground line-clamp-2">{{ note.content }}</p>
            <p class="text-[10px] text-muted-foreground/60 mt-2">{{ formatRelDate(note.startDate) }}</p>
          </div>
        </div>
      </section>

      <!-- =================== COMPLETED =================== -->
      <section v-if="completedToday.length" class="space-y-3">
        <div class="flex items-center gap-2">
          <Icon name="lucide:check-circle" class="h-4 w-4 text-emerald-500" />
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completed</h3>
        </div>
        <div class="space-y-1">
          <div
            v-for="item in completedToday"
            :key="item.id"
            class="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 opacity-60 hover:opacity-80 transition cursor-pointer"
            @click="openDetail(item)">
            <button
              type="button"
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500 text-white transition-colors"
              @click="toggleComplete(item, $event)">
              <Icon name="lucide:check" class="h-3 w-3" />
            </button>
            <p class="font-medium text-sm truncate line-through text-muted-foreground">{{ item.title }}</p>
          </div>
        </div>
      </section>

      <!-- =================== EMPTY STATE =================== -->
      <div
        v-if="!overdueTasks.length && !dueTodayTasks.length && !todayEvents.length && !upcomingTasks.length && !upcomingEvents.length && !recentNotes.length"
        class="flex flex-col items-center justify-center py-20 text-center">
        <Icon name="lucide:sparkles" class="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p class="text-lg font-medium text-muted-foreground">All clear!</p>
        <p class="text-sm text-muted-foreground/60 mt-1">Nothing on your plate today. Enjoy the free time.</p>
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
