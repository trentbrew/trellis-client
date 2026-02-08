/**
 * Dashboard Data Composable
 *
 * Computes real data for dashboard widgets from useCalendarItems.
 * Each widget's dataSource config is resolved into display-ready values.
 */

import type { TaskItem, EventItem } from '~/types/calendarItem'

interface GroupedCount {
  label: string
  value: number
  color?: string
}

interface ScheduleEntry {
  id: string
  title: string
  time?: string
  endTime?: string
  category?: string
  type: string
}

interface ListEntry {
  id: string
  title: string
  status?: string
  priority?: string
  date?: string
  type: string
  category?: string
}

export function useDashboardData() {
  const { items: allItems } = useCalendarItems()

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]!

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const daysFromNow = (n: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + n)
    return d.toISOString().split('T')[0]!
  }

  // ── Filtered item sets ───────────────────────────────────────────────────

  const tasks = computed(() => allItems.value.filter((i): i is TaskItem => i.type === 'task'))
  const events = computed(() => allItems.value.filter((i): i is EventItem => i.type === 'event'))

  const overdueTasks = computed(() =>
    tasks.value.filter((t) => t.taskStatus !== 'completed' && t.startDate < todayStr),
  )

  const dueTodayTasks = computed(() =>
    tasks.value.filter((t) => t.taskStatus !== 'completed' && t.startDate === todayStr),
  )

  const completedTasks = computed(() =>
    tasks.value.filter((t) => t.taskStatus === 'completed'),
  )

  const completedToday = computed(() =>
    tasks.value.filter((t) => t.taskStatus === 'completed' && t.startDate === todayStr),
  )

  const todayEvents = computed(() =>
    events.value
      .filter((e) => e.startDate === todayStr)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
  )

  const upcomingTasks = computed(() =>
    tasks.value
      .filter((t) => t.taskStatus !== 'completed' && t.startDate > todayStr && t.startDate <= daysFromNow(7))
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
  )

  const upcomingEvents = computed(() =>
    events.value
      .filter((e) => e.startDate > todayStr && e.startDate <= daysFromNow(7))
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
  )

  // ── Stat computations ────────────────────────────────────────────────────

  const statDueToday = computed(() => dueTodayTasks.value.length)
  const statOverdue = computed(() => overdueTasks.value.length)
  const statTodayEvents = computed(() => todayEvents.value.length)
  const statCompleted = computed(() => completedToday.value.length)
  const statTotalTasks = computed(() => tasks.value.length)
  const statCompletionRate = computed(() => {
    if (tasks.value.length === 0) return 0
    return Math.round((completedTasks.value.length / tasks.value.length) * 100)
  })

  // ── Grouped distributions (for charts) ────────────────────────────────

  const priorityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
  }

  const categoryColors: Record<string, string> = {
    work: '#3b82f6',
    personal: '#10b981',
    health: '#f43f5e',
    meeting: '#8b5cf6',
    general: '#6b7280',
  }

  const statusColors: Record<string, string> = {
    pending: '#94a3b8',
    'in-progress': '#3b82f6',
    'on-track': '#10b981',
    'due-soon': '#f59e0b',
    overdue: '#ef4444',
    completed: '#10b981',
  }

  const tasksByPriority = computed<GroupedCount[]>(() => {
    const counts: Record<string, number> = {}
    for (const t of tasks.value) {
      const p = t.priority || 'medium'
      counts[p] = (counts[p] || 0) + 1
    }
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      color: priorityColors[label],
    }))
  })

  const tasksByStatus = computed<GroupedCount[]>(() => {
    const counts: Record<string, number> = {}
    for (const t of tasks.value) {
      const s = t.taskStatus || 'pending'
      counts[s] = (counts[s] || 0) + 1
    }
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      color: statusColors[label],
    }))
  })

  const tasksByCategory = computed<GroupedCount[]>(() => {
    const counts: Record<string, number> = {}
    for (const t of tasks.value) {
      const c = t.category || 'general'
      counts[c] = (counts[c] || 0) + 1
    }
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      color: categoryColors[label],
    }))
  })

  const itemsByType = computed<GroupedCount[]>(() => {
    const counts: Record<string, number> = {}
    for (const item of allItems.value) {
      counts[item.type] = (counts[item.type] || 0) + 1
    }
    const typeColors: Record<string, string> = {
      task: '#3b82f6',
      event: '#8b5cf6',
      note: '#eab308',
      payment: '#10b981',
      trip: '#06b6d4',
    }
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      color: typeColors[label] || '#6b7280',
    }))
  })

  // ── Week activity (for sparklines / bar charts) ────────────────────────

  const weekActivity = computed(() => {
    const days: { label: string; tasks: number; events: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]!
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
      days.push({
        label: dayLabel,
        tasks: tasks.value.filter((t) => t.startDate === dateStr).length,
        events: events.value.filter((e) => e.startDate === dateStr).length,
      })
    }
    return days
  })

  // ── Schedule entries ──────────────────────────────────────────────────

  const todaySchedule = computed<ScheduleEntry[]>(() =>
    todayEvents.value.map((e) => ({
      id: e.id,
      title: e.title,
      time: e.startTime,
      endTime: e.endTime,
      category: e.category,
      type: 'event',
    })),
  )

  // ── List entries ──────────────────────────────────────────────────────

  const overdueList = computed<ListEntry[]>(() =>
    overdueTasks.value.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.taskStatus,
      priority: t.priority,
      date: t.startDate,
      type: 'task',
      category: t.category,
    })),
  )

  const dueTodayList = computed<ListEntry[]>(() =>
    dueTodayTasks.value.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.taskStatus,
      priority: t.priority,
      date: t.startDate,
      type: 'task',
      category: t.category,
    })),
  )

  const upcomingList = computed<ListEntry[]>(() => {
    const combined: ListEntry[] = [
      ...upcomingTasks.value.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.taskStatus,
        priority: t.priority,
        date: t.startDate,
        type: 'task' as const,
        category: t.category,
      })),
      ...upcomingEvents.value.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.startDate,
        type: 'event' as const,
        category: e.category,
      })),
    ]
    return combined.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  })

  return {
    // Raw data
    allItems,
    tasks,
    events,

    // Stats
    statDueToday,
    statOverdue,
    statTodayEvents,
    statCompleted,
    statTotalTasks,
    statCompletionRate,

    // Grouped distributions
    tasksByPriority,
    tasksByStatus,
    tasksByCategory,
    itemsByType,
    weekActivity,

    // Schedule
    todaySchedule,

    // Lists
    overdueList,
    dueTodayList,
    upcomingList,

    // Helpers
    todayStr,
    formatRelDate: (d: string) => {
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
      } catch {
        return d
      }
    },
    formatTime: (t?: string) => {
      if (!t) return ''
      try {
        const [h, m] = t.split(':').map(Number)
        const ampm = h! >= 12 ? 'PM' : 'AM'
        const hour = h! % 12 || 12
        return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
      } catch {
        return t
      }
    },
  }
}
