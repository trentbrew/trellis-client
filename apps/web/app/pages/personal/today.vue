<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem, TaskItem, EventItem, NoteItem } from '~/types/calendarItem'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Today | Personal' })

  // ---------------------------------------------------------------------------
  // Live data from instant-local
  // ---------------------------------------------------------------------------

  const { items: allItems, create, update, remove } = useCalendarItems()

  const tasks = computed(() => allItems.value.filter((i): i is TaskItem => i.type === 'task'))
  const events = computed(() => allItems.value.filter((i): i is EventItem => i.type === 'event'))
  const recentNotes = computed(() =>
    allItems.value
      .filter((i): i is NoteItem => i.type === 'note')
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .slice(0, 4),
  )

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
      if (!d) return 'Unscheduled'
      const parsed = new Date(d + 'T00:00:00')
      if (Number.isNaN(parsed.getTime())) return 'Unscheduled'
      const due = startOfDay(parsed)
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
