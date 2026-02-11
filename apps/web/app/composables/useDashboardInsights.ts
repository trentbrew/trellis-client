/**
 * Dashboard Insights Composable
 *
 * Decision-in rather than data-out. Computes anomalies, trends,
 * a 14-day timeline ribbon, and a time-aware "next up" list.
 * The dashboard surface stays calm when everything is fine and
 * self-surfaces problems when they appear.
 */

import type { CalendarItem, TaskItem, EventItem, PaymentItem } from '~/types/calendarItem'

// ── Public Types ────────────────────────────────────────────────────────────

export type InsightType =
  | 'overdue'
  | 'due-today'
  | 'due-soon'
  | 'stale'
  | 'payment-due'
  | 'busy-day'
  | 'streak'

export type InsightSeverity = 'info' | 'warning' | 'urgent'
export type TrendDirection = 'rising' | 'falling' | 'stable'
export type PulseState = 'calm' | 'active' | 'attention' | 'urgent'

export interface DashboardInsight {
  id: string
  type: InsightType
  severity: InsightSeverity
  title: string
  description: string
  items: CalendarItem[]
  sparkline: number[]
  trend: TrendDirection
}

export interface TimelineDay {
  date: string
  label: string
  weekday: string
  isToday: boolean
  isPast: boolean
  tasks: number
  events: number
  payments: number
  total: number
  density: number
  items: CalendarItem[]
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: Date) => d.toISOString().split('T')[0]!

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function daysBetween(a: string, b: string): number {
  const da = startOfDay(new Date(a + 'T00:00:00'))
  const db = startOfDay(new Date(b + 'T00:00:00'))
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

function computeTrend(values: number[]): TrendDirection {
  if (values.length < 3) return 'stable'
  const recent = values.slice(-3)
  const earlier = values.slice(0, 3)
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
  const diff = recentAvg - earlierAvg
  if (diff > 0.5) return 'rising'
  if (diff < -0.5) return 'falling'
  return 'stable'
}

// ── Composable ──────────────────────────────────────────────────────────────

export function useDashboardInsights() {
  const { items: allItems } = useCalendarItems()

  const now = new Date()
  const todayStr = fmtDate(now)
  const currentHour = now.getHours()

  // ── Filtered sets ───────────────────────────────────────────────────────

  const tasks = computed(() =>
    allItems.value.filter((i): i is TaskItem => i.type === 'task'),
  )

  const events = computed(() =>
    allItems.value.filter((i): i is EventItem => i.type === 'event'),
  )

  const payments = computed(() =>
    allItems.value.filter((i): i is PaymentItem => i.type === 'payment'),
  )

  // ── Timeline (14 days: -7 to +6) ───────────────────────────────────────

  const timeline = computed<TimelineDay[]>(() => {
    const days: TimelineDay[] = []
    let maxTotal = 0

    for (let i = -7; i <= 6; i++) {
      const d = addDays(now, i)
      const dateStr = fmtDate(d)
      const dayItems = allItems.value.filter((item) => {
        if (item.startDate === dateStr) return true
        if (item.endDate && item.startDate <= dateStr && item.endDate >= dateStr) return true
        return false
      })

      const taskCount = dayItems.filter((x) => x.type === 'task').length
      const eventCount = dayItems.filter((x) => x.type === 'event').length
      const paymentCount = dayItems.filter((x) => x.type === 'payment').length
      const total = dayItems.length

      if (total > maxTotal) maxTotal = total

      days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: i === 0,
        isPast: i < 0,
        tasks: taskCount,
        events: eventCount,
        payments: paymentCount,
        total,
        density: 0,
        items: dayItems,
      })
    }

    // Normalize density to 0-1
    if (maxTotal > 0) {
      for (const day of days) {
        day.density = day.total / maxTotal
      }
    }

    return days
  })

  const todayIndex = computed(() => timeline.value.findIndex((d) => d.isToday))

  // ── Sparkline helpers ───────────────────────────────────────────────────

  function overdueSpark(): number[] {
    // For the past 7 days, how many tasks were overdue on that day
    const spark: number[] = []
    for (let i = -6; i <= 0; i++) {
      const d = fmtDate(addDays(now, i))
      const count = tasks.value.filter(
        (t) => t.taskStatus !== 'completed' && t.startDate < d,
      ).length
      spark.push(count)
    }
    return spark
  }

  function dueTodaySpark(): number[] {
    const spark: number[] = []
    for (let i = -6; i <= 0; i++) {
      const d = fmtDate(addDays(now, i))
      const count = tasks.value.filter(
        (t) => t.taskStatus !== 'completed' && t.startDate === d,
      ).length
      spark.push(count)
    }
    return spark
  }

  function paymentSpark(): number[] {
    const spark: number[] = []
    for (let i = -6; i <= 0; i++) {
      const d = fmtDate(addDays(now, i))
      const count = payments.value.filter(
        (p) => p.paymentStatus === 'pending' && p.startDate <= d,
      ).length
      spark.push(count)
    }
    return spark
  }

  // ── Insights (anomaly detection) ────────────────────────────────────────

  const insights = computed<DashboardInsight[]>(() => {
    const result: DashboardInsight[] = []

    // 1. Overdue tasks
    const overdueTasks = tasks.value.filter(
      (t) => t.taskStatus !== 'completed' && t.startDate < todayStr,
    )
    if (overdueTasks.length > 0) {
      const spark = overdueSpark()
      result.push({
        id: 'overdue',
        type: 'overdue',
        severity: overdueTasks.length >= 3 ? 'urgent' : 'warning',
        title: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}`,
        description: overdueTasks.map((t) => t.title).join(', '),
        items: overdueTasks,
        sparkline: spark,
        trend: computeTrend(spark),
      })
    }

    // 2. Due today
    const dueToday = tasks.value.filter(
      (t) => t.taskStatus !== 'completed' && t.startDate === todayStr,
    )
    if (dueToday.length > 0) {
      const spark = dueTodaySpark()
      result.push({
        id: 'due-today',
        type: 'due-today',
        severity: dueToday.length >= 4 ? 'warning' : 'info',
        title: `${dueToday.length} task${dueToday.length === 1 ? '' : 's'} due today`,
        description: dueToday.map((t) => t.title).join(', '),
        items: dueToday,
        sparkline: spark,
        trend: computeTrend(spark),
      })
    }

    // 3. Payments due within 48h
    const urgentPayments = payments.value.filter((p) => {
      if (p.paymentStatus !== 'pending') return false
      const diff = daysBetween(todayStr, p.startDate)
      return diff >= 0 && diff <= 2
    })
    if (urgentPayments.length > 0) {
      const spark = paymentSpark()
      const totalAmount = urgentPayments.reduce((s, p) => s + (p.amount || 0), 0)
      result.push({
        id: 'payment-due',
        type: 'payment-due',
        severity: urgentPayments.some((p) => p.priority === 'critical') ? 'urgent' : 'warning',
        title: `${urgentPayments.length} payment${urgentPayments.length === 1 ? '' : 's'} due soon`,
        description: totalAmount > 0
          ? `$${totalAmount.toLocaleString()} — ${urgentPayments.map((p) => p.title).join(', ')}`
          : urgentPayments.map((p) => p.title).join(', '),
        items: urgentPayments,
        sparkline: spark,
        trend: computeTrend(spark),
      })
    }

    // 4. Stale tasks (in-progress for 5+ days)
    const staleTasks = tasks.value.filter((t) => {
      if (t.taskStatus !== 'in-progress') return false
      const diff = daysBetween(t.startDate, todayStr)
      return diff >= 5
    })
    if (staleTasks.length > 0) {
      result.push({
        id: 'stale',
        type: 'stale',
        severity: 'info',
        title: `${staleTasks.length} stale task${staleTasks.length === 1 ? '' : 's'}`,
        description: `In progress for 5+ days: ${staleTasks.map((t) => t.title).join(', ')}`,
        items: staleTasks,
        sparkline: [],
        trend: 'stable',
      })
    }

    // 5. Busy day ahead (6+ items tomorrow)
    const tomorrowStr = fmtDate(addDays(now, 1))
    const tomorrowItems = allItems.value.filter((i) => i.startDate === tomorrowStr)
    if (tomorrowItems.length >= 6) {
      result.push({
        id: 'busy-day',
        type: 'busy-day',
        severity: 'info',
        title: `Busy day tomorrow`,
        description: `${tomorrowItems.length} items scheduled`,
        items: tomorrowItems,
        sparkline: [],
        trend: 'stable',
      })
    }

    return result
  })

  const hasInsights = computed(() => insights.value.length > 0)

  // ── Pulse state (single gestalt) ────────────────────────────────────────

  const pulseState = computed<PulseState>(() => {
    const severities = insights.value.map((i) => i.severity)
    if (severities.includes('urgent')) return 'urgent'
    if (severities.includes('warning')) return 'attention'
    if (severities.length > 0) return 'active'
    return 'calm'
  })

  const pulseMessage = computed(() => {
    switch (pulseState.value) {
      case 'calm':
        return 'All clear — nothing needs your attention.'
      case 'active':
        return `${insights.value.length} thing${insights.value.length === 1 ? '' : 's'} to be aware of.`
      case 'attention':
        return `${insights.value.length} item${insights.value.length === 1 ? '' : 's'} need${insights.value.length === 1 ? 's' : ''} attention.`
      case 'urgent':
        return 'Urgent items require action.'
    }
  })

  // ── Next Up (time-aware) ────────────────────────────────────────────────

  const nextUpLabel = computed(() => {
    if (currentHour < 12) return 'This morning'
    if (currentHour < 17) return 'This afternoon'
    return 'This evening'
  })

  const nextUp = computed<CalendarItem[]>(() => {
    const result: CalendarItem[] = []

    // Today's remaining events (that haven't passed yet)
    const todayEvents = events.value
      .filter((e) => {
        if (e.startDate !== todayStr) return false
        if (!e.startTime) return true
        const [h] = e.startTime.split(':').map(Number)
        return (h ?? 0) >= currentHour
      })
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

    // Today's incomplete tasks
    const todayTasks = tasks.value
      .filter((t) => t.startDate === todayStr && t.taskStatus !== 'completed')
      .sort((a, b) => {
        const prio: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
        return (prio[a.priority] ?? 2) - (prio[b.priority] ?? 2)
      })

    // Today's pending payments
    const todayPayments = payments.value.filter(
      (p) => p.startDate === todayStr && p.paymentStatus === 'pending',
    )

    // Interleave: events by time, then tasks by priority, then payments
    result.push(...todayEvents, ...todayTasks, ...todayPayments)

    // If it's evening or today is sparse, add tomorrow preview
    if (currentHour >= 17 || result.length < 3) {
      const tomorrowStr = fmtDate(addDays(now, 1))
      const tomorrowItems = allItems.value
        .filter((i) => i.startDate === tomorrowStr)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      result.push(...tomorrowItems)
    }

    return result.slice(0, 8)
  })

  // ── Greeting ────────────────────────────────────────────────────────────

  const greeting = computed(() => {
    if (currentHour < 12) return 'Good morning'
    if (currentHour < 17) return 'Good afternoon'
    return 'Good evening'
  })

  const greetingIcon = computed(() => {
    if (currentHour < 6) return 'lucide:moon'
    if (currentHour < 12) return 'lucide:sun'
    if (currentHour < 17) return 'lucide:cloud-sun'
    if (currentHour < 21) return 'lucide:sunset'
    return 'lucide:moon'
  })

  // ── Live clock (reactive, updates every second) ─────────────────────────

  const liveClock = ref(formatLiveClock())
  const liveDate = ref(formatLiveDate())

  let clockInterval: ReturnType<typeof setInterval> | null = null

  function formatLiveClock(): string {
    const d = new Date()
    return [
      String(d.getHours()).padStart(2, '0'),
      String(d.getMinutes()).padStart(2, '0'),
      String(d.getSeconds()).padStart(2, '0'),
    ].join(':')
  }

  function formatLiveDate(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (import.meta.client) {
    clockInterval = setInterval(() => {
      liveClock.value = formatLiveClock()
      liveDate.value = formatLiveDate()
    }, 1000)

    onScopeDispose(() => {
      if (clockInterval) clearInterval(clockInterval)
    })
  }

  const dateFormatted = computed(() =>
    now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  )

  // ── Helpers ─────────────────────────────────────────────────────────────

  const formatTime = (t?: string) => {
    if (!t) return ''
    try {
      const [h, m] = t.split(':').map(Number)
      const ampm = (h ?? 0) >= 12 ? 'PM' : 'AM'
      const hour = (h ?? 0) % 12 || 12
      return `${hour}:${String(m ?? 0).padStart(2, '0')} ${ampm}`
    } catch {
      return t
    }
  }

  return {
    // Greeting
    greeting,
    greetingIcon,
    dateFormatted,
    liveClock,
    liveDate,

    // Anomaly-driven insights
    insights,
    hasInsights,

    // Pulse
    pulseState,
    pulseMessage,

    // Timeline
    timeline,
    todayIndex,

    // Next Up
    nextUp,
    nextUpLabel,

    // Helpers
    formatTime,

    // Raw data (for dialog interactions)
    allItems,
  }
}
