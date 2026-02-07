<script setup lang="ts">
  import type { DatabaseField, DatabaseSchema } from '~/types/database'
  import type { AttributeConfig } from '~/components/Ui/Calendar.vue'
  import { createDefaultTrellisContext } from '~/lib/trellis'
  import { extractNodeValue, fieldKeyAliases, getStatusBadgeClass, getPriorityDisplay } from '~/lib/ontology'
  import { useGlobalDetailSheet } from '~/composables/useGlobalDetailSheet'

  type CalendarViewMode = 'day' | 'week' | 'month' | 'year'

  interface CalendarEvent {
    id: string
    title: string
    date: Date
    endDate?: Date
    range?: { start: Date; end: Date }
    typeLabel?: string
    badgeClass: string
    dotColor: string
    status?: string
    assignee?: string
    priority?: string
    urgency?: string
  }

  const props = defineProps<{
    collectionId: string
    modelValue?: string
    schema?: DatabaseSchema | null
    /** When true, removes border and rounding for fullscreen use */
    fullscreen?: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    'request-add-date-field': []
    'task-click': [event: CalendarEvent]
    'cell-click': [date: Date]
  }>()

  // Calendar view mode state
  const calendarViewMode = ref<CalendarViewMode>('month')
  const currentDate = ref(new Date())
  const hasAutoNavigated = ref(false)
  const isTransitioning = ref(false)
  const transitionDirection = ref<'left' | 'right'>('right')

  const viewModeOptions: Array<{ value: CalendarViewMode; label: string; icon: string }> = [
    { value: 'day', label: 'Today', icon: 'lucide:calendar-days' },
    { value: 'week', label: 'Week', icon: 'lucide:calendar-range' },
    { value: 'month', label: 'Month', icon: 'lucide:calendar' },
    { value: 'year', label: 'Year', icon: 'lucide:calendar-check' },
  ]

  const rootEl = ref<HTMLElement | null>(null)

  // ── Resizable sidebar ───────────────────────────────────────────────
  const SIDEBAR_MIN = 260
  const SIDEBAR_MAX = 420
  const SIDEBAR_DEFAULT = 320
  const sidebarWidth = ref(SIDEBAR_DEFAULT)
  const isSidebarResizing = ref(false)

  const startSidebarResize = (e: PointerEvent) => {
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    isSidebarResizing.value = true
    const startX = e.clientX
    const startW = sidebarWidth.value
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX
      sidebarWidth.value = Math.max(SIDEBAR_MIN, Math.min(startW + delta, SIDEBAR_MAX))
    }
    const onUp = () => {
      isSidebarResizing.value = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }

  // Global detail sheet for opening event details (fallback, kept for potential future use)
  const _globalDetailSheet = useGlobalDetailSheet()

  // Day popover state
  const activeDayPopover = ref<Date | null>(null)
  const isDayPopoverOpen = (date: Date): boolean =>
    !!(activeDayPopover.value && isSameDay(activeDayPopover.value, date))
  const openDayPopover = (date: Date) => {
    activeDayPopover.value = date
  }
  const closeDayPopover = () => {
    activeDayPopover.value = null
  }

  // Open event - emit to parent for UnifiedTaskDialog, fallback to global sheet
  const openEventDetail = (event: CalendarEvent) => {
    closeDayPopover()
    emit('task-click', event)
  }

  const scrollToTop = () => {
    const el = rootEl.value
    if (!el) return
    try {
      el.scrollTo({ top: 0, behavior: 'auto' })
    } catch {
      el.scrollTop = 0
    }
  }

  defineExpose({ scrollToTop })

  const stripJsoncComments = (input: string) => {
    const raw = String(input || '')
    const withoutLine = raw.replace(/^\s*\/\/.*$/gm, '')
    return withoutLine.replace(/\/\*[\s\S]*?\*\//g, '')
  }

  const toIdentifier = (label: string) => {
    const raw = String(label || '').trim()
    if (!raw) return ''
    const parts = raw.split(/[^A-Za-z0-9]+/g).filter(Boolean)
    if (!parts.length) return ''
    const first = parts[0]!
    const rest = parts.slice(1)
    return (
      first.slice(0, 1).toLowerCase() +
      first.slice(1) +
      rest.map((p) => p.slice(0, 1).toUpperCase() + p.slice(1)).join('')
    )
  }

  const extractGraphCandidates = (parsed: any): any[] => {
    if (!parsed || typeof parsed !== 'object') return []
    const candidates = ['@graph', 'items', 'records', 'data', 'nodes']
    for (const k of candidates) {
      if (Array.isArray((parsed as any)[k])) return (parsed as any)[k]
    }

    const paths: string[][] = [
      ['workspace', 'items'],
      ['workspace', 'records'],
      ['workspace', 'nodes'],
      ['collection', 'items'],
      ['collection', 'records'],
      ['collection', 'nodes'],
    ]

    for (const path of paths) {
      let cur: any = parsed
      for (const segment of path) {
        if (!cur || typeof cur !== 'object') {
          cur = null
          break
        }
        cur = cur[segment]
      }
      if (Array.isArray(cur)) return cur
    }

    return []
  }

  const buildEmptyDoc = () => ({ '@context': createDefaultTrellisContext(), '@graph': [] as any[] })

  const parsed = computed(() => {
    const emptyDoc = buildEmptyDoc()
    const raw = String(props.modelValue || '')
    const trimmed = raw.trim()

    if (!trimmed) return { doc: emptyDoc, error: null as string | null }

    try {
      const parsedValue = JSON.parse(stripJsoncComments(trimmed))

      if (Array.isArray(parsedValue)) {
        return { doc: { ...emptyDoc, '@graph': parsedValue }, error: null }
      }

      if (parsedValue && typeof parsedValue === 'object') {
        const nextDoc: any = parsedValue
        if (!nextDoc['@context'] || typeof nextDoc['@context'] !== 'object') {
          nextDoc['@context'] = createDefaultTrellisContext()
        }

        const hasGraphObj = nextDoc.graph && typeof nextDoc.graph === 'object' && !Array.isArray(nextDoc.graph)

        if (hasGraphObj) {
          if (!Array.isArray((nextDoc.graph as any).nodes)) {
            ;(nextDoc.graph as any).nodes = []
          }
        } else if (!Array.isArray(nextDoc['@graph'])) {
          const extracted = extractGraphCandidates(nextDoc)
          nextDoc['@graph'] = Array.isArray(extracted) ? extracted : []
        }

        return { doc: nextDoc, error: null }
      }

      return { doc: emptyDoc, error: null }
    } catch (error: any) {
      return { doc: emptyDoc, error: error?.message ? String(error.message) : 'Invalid JSON' }
    }
  })

  const doc = computed(() => parsed.value.doc)
  const parseError = computed(() => parsed.value.error)

  const schemaFields = computed<DatabaseField[]>(() => {
    const fields = props.schema?.fields
    if (!Array.isArray(fields)) return []
    return fields.slice().sort((a, b) => a.order - b.order)
  })

  const dateFields = computed(() => schemaFields.value.filter((field) => field.type === 'date'))
  const selectedDateFieldId = ref('')

  watch(
    dateFields,
    (fields) => {
      if (!fields.length) {
        selectedDateFieldId.value = ''
        return
      }
      if (selectedDateFieldId.value && fields.some((f) => f.id === selectedDateFieldId.value)) return
      selectedDateFieldId.value = fields[0]?.id || ''
    },
    { immediate: true },
  )

  const selectedDateField = computed(() => {
    if (!selectedDateFieldId.value) return null
    return dateFields.value.find((field) => field.id === selectedDateFieldId.value) || null
  })

  const unwrapLdValue = (value: any): any => {
    if (Array.isArray(value)) return value.map(unwrapLdValue)
    if (value && typeof value === 'object') {
      if ('@value' in value) return unwrapLdValue((value as any)['@value'])
      if ('value' in value && Object.keys(value).length === 1) return unwrapLdValue((value as any).value)
    }
    return value
  }

  const propKeyForField = (field: DatabaseField) => `user:${field.id}`

  const getFieldValue = (node: any, field: DatabaseField) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return undefined
    const preferredKey = propKeyForField(field)
    if (preferredKey in node) return unwrapLdValue(node[preferredKey])

    const alias = toIdentifier(field.name)
    if (alias) {
      const aliasKey = `user:${alias}`
      if (aliasKey in node) return unwrapLdValue(node[aliasKey])
    }

    if (field.id in node) return unwrapLdValue(node[field.id])
    if (field.name in node) return unwrapLdValue(node[field.name])
    return undefined
  }

  const getNodeId = (node: any) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return ''
    const id = (node as any)['@id'] ?? (node as any).id
    return typeof id === 'string' ? id : ''
  }

  const getNodeType = (node: any) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return ''
    const t = (node as any)['@type'] ?? (node as any).type
    return typeof t === 'string' ? t : ''
  }

  const nodeTitle = (node: any) => {
    const title = (node as any)?.['trellis:title'] ?? (node as any)?.name ?? (node as any)?.title
    return typeof title === 'string' && title.trim() ? title : 'Untitled'
  }

  const recordNodes = computed(() => {
    const root = doc.value
    let nodes: any[] = []

    if (root && typeof root === 'object') {
      const graph = (root as any).graph
      if (graph && typeof graph === 'object' && !Array.isArray(graph)) {
        const nestedCandidates = ['nodes', 'records', 'items', 'data', '@graph']
        for (const k of nestedCandidates) {
          if (Array.isArray((graph as any)[k])) {
            nodes = (graph as any)[k]
            break
          }
        }
      }

      if (!nodes.length) {
        const candidates = ['@graph', 'records', 'items', 'data', 'nodes']
        for (const k of candidates) {
          if (Array.isArray((root as any)[k])) {
            nodes = (root as any)[k]
            break
          }
        }
      }
    }

    return nodes.filter((n) => {
      if (!n || typeof n !== 'object' || Array.isArray(n)) return false
      const t = getNodeType(n)
      if (t === 'trellis:Collection') return false
      if (t === 'trellis:PropertyValueSpecification') return false
      return true
    })
  })

  const parseDateValue = (value: any): Date | null => {
    if (!value) return null
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value
    if (typeof value === 'string' || typeof value === 'number') {
      const parsedDate = new Date(value)
      return isNaN(parsedDate.getTime()) ? null : parsedDate
    }
    if (value && typeof value === 'object') {
      if ('@value' in value) return parseDateValue((value as any)['@value'])
      if ('value' in value) return parseDateValue((value as any).value)
    }
    return null
  }

  const parseDateRange = (value: any): { start: Date; end: Date } | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const start = parseDateValue((value as any).start ?? (value as any).from ?? (value as any).begin)
    const end = parseDateValue((value as any).end ?? (value as any).to ?? (value as any).until)
    if (!start || !end) return null
    return { start, end }
  }

  const normalizeDateValues = (value: any): Array<{ date: Date; range?: { start: Date; end: Date } }> => {
    if (value === null || value === undefined) return []
    if (Array.isArray(value)) return value.flatMap(normalizeDateValues)
    const range = parseDateRange(value)
    if (range) return [{ date: range.start, range }]
    const date = parseDateValue(value)
    if (!date) return []
    return [{ date }]
  }

  const _palette: Array<{ dot: string; badge: string }> = [
    { dot: '#3b82f6', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    { dot: '#10b981', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    { dot: '#f59e0b', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
    { dot: '#f43f5e', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
    { dot: '#8b5cf6', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  ]

  // ── Type-aware color & icon maps ──────────────────────────────────────
  // Maps entity type labels (as they arrive from @type in the JSON-LD graph)
  // to Tailwind color classes and Lucide icon names.
  const typeColorMap: Record<string, { bg: string; text: string; dot: string; icon: string; label: string }> = {
    Task: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      dot: '#3b82f6',
      icon: 'lucide:check-square',
      label: 'task',
    },
    Event: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-300',
      dot: '#8b5cf6',
      icon: 'lucide:calendar',
      label: 'event',
    },
    Trip: {
      bg: 'bg-cyan-100 dark:bg-cyan-900/30',
      text: 'text-cyan-700 dark:text-cyan-300',
      dot: '#06b6d4',
      icon: 'lucide:plane',
      label: 'trip',
    },
    Payment: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      dot: '#10b981',
      icon: 'lucide:credit-card',
      label: 'payment',
    },
    Appointment: {
      bg: 'bg-rose-100 dark:bg-rose-900/30',
      text: 'text-rose-700 dark:text-rose-300',
      dot: '#f43f5e',
      icon: 'lucide:stethoscope',
      label: 'appointment',
    },
    Reminder: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      dot: '#f59e0b',
      icon: 'lucide:bell',
      label: 'reminder',
    },
    Deadline: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      dot: '#ef4444',
      icon: 'lucide:alarm-clock',
      label: 'deadline',
    },
    Milestone: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-300',
      dot: '#f97316',
      icon: 'lucide:flag',
      label: 'milestone',
    },
    Note: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-300',
      dot: '#eab308',
      icon: 'lucide:sticky-note',
      label: 'note',
    },
  }

  const defaultTypeColor = {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    dot: '#6b7280',
    icon: 'lucide:circle',
    label: 'item',
  }

  const getTypeStyle = (typeLabel?: string) => {
    if (!typeLabel) return defaultTypeColor
    return typeColorMap[typeLabel] || defaultTypeColor
  }

  interface TypeGroup {
    typeLabel: string
    style: typeof defaultTypeColor
    items: CalendarEvent[]
    urgentCount: number
  }

  const getTypeGroupsForDay = (date: Date): TypeGroup[] => {
    const dayEvents = getEventsForDay(date)
    if (!dayEvents.length) return []
    const grouped = new Map<string, CalendarEvent[]>()
    for (const ev of dayEvents) {
      const key = ev.typeLabel || 'Item'
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(ev)
    }
    const result: TypeGroup[] = []
    for (const [typeLabel, items] of grouped) {
      const style = getTypeStyle(typeLabel)
      const urgentCount = items.filter((i) => {
        const u = i.urgency?.toLowerCase()
        const p = i.priority?.toLowerCase()
        return u === 'urgent' || u === 'high' || p === 'urgent' || p === 'high'
      }).length
      result.push({ typeLabel, style, items, urgentCount })
    }
    return result
  }

  const isDayInPast = (date: Date): boolean => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    return d < today.value
  }

  const handleEmptyCellClick = (date: Date) => {
    if (getEventsForDay(date).length === 0) {
      emit('cell-click', date)
    }
  }

  // Use ontology utilities for display configuration
  const getNodeStringValue = (node: any, keys: string[]): string | undefined => {
    // First try extractNodeValue from ontology, then fallback to unwrapLdValue
    const result = extractNodeValue(node, keys)
    if (result) return result
    // Fallback for legacy data format
    if (!node || typeof node !== 'object') return undefined
    for (const key of keys) {
      const val = unwrapLdValue(node[key])
      if (typeof val === 'string' && val.trim()) return val.trim()
    }
    return undefined
  }

  const events = computed<CalendarEvent[]>(() => {
    const field = selectedDateField.value
    if (!field) return []

    const out: CalendarEvent[] = []
    recordNodes.value.forEach((node, nodeIndex) => {
      const values = normalizeDateValues(getFieldValue(node, field))

      // Extract display properties using ontology field key aliases
      const status = getNodeStringValue(node, [...fieldKeyAliases.status])
      const assignee = getNodeStringValue(node, [...fieldKeyAliases.assignee])
      const priority = getNodeStringValue(node, [...fieldKeyAliases.priority])
      const urgency = getNodeStringValue(node, ['user:urgency', 'urgency', 'trellis:urgency'])

      // Get badge class from ontology utility
      const badgeClass = getStatusBadgeClass(status)

      // Use type-aware color for dot
      const nodeType = getNodeType(node) || undefined
      const typeStyle = getTypeStyle(nodeType)

      values.forEach((val, valueIndex) => {
        out.push({
          id: `${getNodeId(node) || 'record'}-${nodeIndex}-${valueIndex}`,
          title: nodeTitle(node),
          date: val.date,
          range: val.range,
          typeLabel: nodeType,
          badgeClass,
          dotColor: typeStyle.dot,
          status: status || 'on-track',
          assignee,
          priority: priority?.toLowerCase(),
          urgency: urgency?.toLowerCase(),
        })
      })
    })

    return out.sort((a, b) => a.date.getTime() - b.date.getTime())
  })

  const today = computed(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  })

  // Navigation functions
  const navigatePrev = () => {
    transitionDirection.value = 'left'
    isTransitioning.value = true
    const date = new Date(currentDate.value)
    switch (calendarViewMode.value) {
      case 'day':
        date.setDate(date.getDate() - 1)
        break
      case 'week':
        date.setDate(date.getDate() - 7)
        break
      case 'month':
        date.setMonth(date.getMonth() - 1)
        break
      case 'year':
        date.setFullYear(date.getFullYear() - 1)
        break
    }
    currentDate.value = date
    setTimeout(() => (isTransitioning.value = false), 200)
  }

  const navigateNext = () => {
    transitionDirection.value = 'right'
    isTransitioning.value = true
    const date = new Date(currentDate.value)
    switch (calendarViewMode.value) {
      case 'day':
        date.setDate(date.getDate() + 1)
        break
      case 'week':
        date.setDate(date.getDate() + 7)
        break
      case 'month':
        date.setMonth(date.getMonth() + 1)
        break
      case 'year':
        date.setFullYear(date.getFullYear() + 1)
        break
    }
    currentDate.value = date
    setTimeout(() => (isTransitioning.value = false), 200)
  }

  const navigateToday = () => {
    const wasInFuture = currentDate.value > today.value
    transitionDirection.value = wasInFuture ? 'left' : 'right'
    isTransitioning.value = true
    currentDate.value = new Date()
    setTimeout(() => (isTransitioning.value = false), 200)
  }

  // Computed date helpers
  const currentYear = computed(() => currentDate.value.getFullYear())
  const currentMonth = computed(() => currentDate.value.getMonth())
  const currentWeekStart = computed(() => {
    const date = new Date(currentDate.value)
    const day = date.getDay()
    date.setDate(date.getDate() - day)
    date.setHours(0, 0, 0, 0)
    return date
  })

  const currentWeekEnd = computed(() => {
    const date = new Date(currentWeekStart.value)
    date.setDate(date.getDate() + 6)
    date.setHours(23, 59, 59, 999)
    return date
  })

  // Title for header
  const headerTitle = computed(() => {
    const date = currentDate.value
    switch (calendarViewMode.value) {
      case 'day':
        return new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }).format(date)
      case 'week': {
        const start = currentWeekStart.value
        const end = currentWeekEnd.value
        const startMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(start)
        const endMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(end)
        if (startMonth === endMonth) {
          return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`
        }
        return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`
      }
      case 'month':
        return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)
      case 'year':
        return String(date.getFullYear())
      default:
        return ''
    }
  })

  // Week days for headers
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Get days in month grid (includes padding from prev/next month)
  const monthDays = computed(() => {
    const year = currentYear.value
    const month = currentMonth.value
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean }> = []

    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today.value) })
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i)
      days.push({ date, isCurrentMonth: true, isToday: isSameDay(date, today.value) })
    }

    // Next month padding (fill to 42 days = 6 weeks)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today.value) })
    }

    return days
  })

  // Get week days for week view
  const weekViewDays = computed(() => {
    const days: Array<{ date: Date; isToday: boolean; dayName: string; dayNum: number }> = []
    const start = new Date(currentWeekStart.value)
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      days.push({
        date,
        isToday: isSameDay(date, today.value),
        dayName: weekDays[i] || '',
        dayNum: date.getDate(),
      })
    }
    return days
  })

  // Helper to get mini calendar days for any month
  const getMiniCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const days: Array<{
      day: number
      isCurrentMonth: boolean
      isToday: boolean
      hasEvents: boolean
      eventCount: number
    }> = []

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i)
      const dayEvents = events.value.filter((e) => isDateInEventRange(date, e))
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: isSameDay(date, today.value),
        hasEvents: dayEvents.length > 0,
        eventCount: dayEvents.length,
      })
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i)
      const dayEvents = events.value.filter((e) => isDateInEventRange(date, e))
      days.push({
        day: i,
        isCurrentMonth: true,
        isToday: isSameDay(date, today.value),
        hasEvents: dayEvents.length > 0,
        eventCount: dayEvents.length,
      })
    }

    // Next month padding (fill to 42 days = 6 weeks)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      const dayEvents = events.value.filter((e) => isDateInEventRange(date, e))
      days.push({
        day: i,
        isCurrentMonth: false,
        isToday: isSameDay(date, today.value),
        hasEvents: dayEvents.length > 0,
        eventCount: dayEvents.length,
      })
    }

    return days
  }

  // Mini calendar days for sidebar (current viewed month)
  const miniCalendarDays = computed(() => getMiniCalendarDays(currentYear.value, currentMonth.value))

  // Get months for year view with mini calendar data
  const yearMonths = computed(() => {
    const months: Array<{
      month: number
      name: string
      events: CalendarEvent[]
      miniDays: ReturnType<typeof getMiniCalendarDays>
    }> = []
    for (let i = 0; i < 12; i++) {
      const monthEvents = events.value.filter((e) => {
        return e.date.getFullYear() === currentYear.value && e.date.getMonth() === i
      })
      months.push({
        month: i,
        name: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(currentYear.value, i, 1)),
        events: monthEvents,
        miniDays: getMiniCalendarDays(currentYear.value, i),
      })
    }
    return months
  })

  // Helper functions
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  const isDateInEventRange = (date: Date, event: CalendarEvent): boolean => {
    if (event.range) {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const s = new Date(event.range.start.getFullYear(), event.range.start.getMonth(), event.range.start.getDate())
      const e = new Date(event.range.end.getFullYear(), event.range.end.getMonth(), event.range.end.getDate())
      return d >= s && d <= e
    }
    return isSameDay(event.date, date)
  }

  const getEventsForDay = (date: Date) => events.value.filter((event) => isDateInEventRange(date, event))

  // Auto-navigate to first event date if events exist and we haven't navigated yet
  watch(
    events,
    (evts) => {
      if (evts.length > 0 && !hasAutoNavigated.value) {
        const firstEvent = evts[0]
        if (firstEvent?.date) {
          currentDate.value = new Date(firstEvent.date)
          hasAutoNavigated.value = true
        }
      }
    },
    { immediate: true },
  )

  const _getEventsForWeek = () =>
    events.value.filter((event) => event.date >= currentWeekStart.value && event.date <= currentWeekEnd.value)

  const _upcomingEvents = computed(() => events.value.filter((event) => event.date >= today.value).slice(0, 12))

  // Filtered events by status for accordion
  const overdueEvents = computed(() => events.value.filter((event) => event.status?.toLowerCase() === 'overdue'))

  const dueSoonEvents = computed(() =>
    events.value.filter((event) => {
      const status = event.status?.toLowerCase()
      return status === 'due soon' || status === 'due-soon'
    }),
  )

  // Keep for potential future use with UiCalendar component
  const _calendarAttributes = computed<AttributeConfig[]>(() => {
    return events.value.map((event) => ({
      key: event.id,
      dates: [event.range ? { start: event.range.start, end: event.range.end } : event.date],
      dot: { color: event.dotColor },
      popover: { label: event.title },
      customData: event,
    }))
  })

  // Time slots for potential future time-based views
  const _timeSlots = computed(() => {
    const slots: string[] = []
    for (let i = 0; i < 24; i++) {
      const hour = i % 12 || 12
      const ampm = i < 12 ? 'AM' : 'PM'
      slots.push(`${hour}:00 ${ampm}`)
    }
    return slots
  })

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)

  const formatShortDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(date)

  const _formatRange = (event: CalendarEvent) => {
    if (!event.range) return formatDate(event.date)
    return `${formatDate(event.range.start)} - ${formatDate(event.range.end)}`
  }

  const getStatusColor = (event: CalendarEvent) => {
    const status = event.status?.toLowerCase()
    if (status === 'completed') return 'bg-emerald-500'
    if (status === 'overdue') return 'bg-rose-500'
    if (status === 'due soon' || status === 'due_soon') return 'bg-amber-500'
    return 'bg-blue-500'
  }
</script>

<template>
  <div
    ref="rootEl"
    :class="[
      'min-h-full w-full h-full flex-1 bg-transparent flex flex-col',
      fullscreen ? 'h-full' : 'rounded-lg border',
    ]">
    <UiAlert
      v-if="parseError"
      variant="destructive"
      title="Calendar view unavailable"
      :description="parseError"
      icon="lucide:triangle-alert"
      class="m-4" />

    <div v-else class="flex flex-col h-full">
      <!-- Calendar Header -->
      <div class="shrink-0 px-6 py-4 border-b border-border/50 bg-card/0">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <!-- Left: Navigation -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1">
              <UiButton variant="outline" size="icon" class="h-8 w-8" @click="navigatePrev">
                <Icon name="lucide:chevron-left" class="h-4 w-4" />
              </UiButton>
              <UiButton variant="outline" size="icon" class="h-8 w-8" @click="navigateNext">
                <Icon name="lucide:chevron-right" class="h-4 w-4" />
              </UiButton>
            </div>
            <UiButton variant="ghost" size="sm" class="h-8" @click="navigateToday">Today</UiButton>
            <h2 class="text-lg font-semibold min-w-[200px]">{{ headerTitle }}</h2>
          </div>

          <!-- Right: View Mode & Date Field -->
          <div class="flex items-center gap-3">
            <!-- View Mode Switcher -->
            <div class="flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5">
              <button
                v-for="option in viewModeOptions"
                :key="option.value"
                :class="[
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                  calendarViewMode === option.value
                    ? 'bg-foreground/10 shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                ]"
                @click="calendarViewMode = option.value">
                {{ option.label }}
              </button>
            </div>

            <!-- Header Actions Slot -->
            <slot name="header-actions" />
          </div>
        </div>
      </div>

      <!-- No Date Fields Warning -->
      <div v-if="!dateFields.length" class="flex-1 flex items-center justify-center p-8">
        <div class="text-center max-w-md space-y-4">
          <div class="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
            <Icon name="lucide:calendar-x" class="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <div class="text-lg font-medium">No date fields</div>
            <div class="text-sm text-muted-foreground mt-1">
              Add a date field to unlock calendar layouts for this collection.
            </div>
          </div>
          <UiButton size="sm" variant="outline" @click="emit('request-add-date-field')">
            <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
            Add date field
          </UiButton>
        </div>
      </div>

      <!-- Calendar Content with Mini Sidebar -->
      <div v-else class="flex-1 flex min-h-0">
        <!-- Mini Calendar Sidebar -->
        <div
          class="shrink-0 border-r border-border/50 hidden lg:flex lg:flex-col h-full relative"
          :style="{ width: sidebarWidth + 'px' }">
          <!-- Mini Calendar Section -->
          <div class="shrink-0 p-4 pb-0">
            <!-- Mini Calendar Header -->
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold">
                {{ new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate) }}
              </h3>
              <div class="flex gap-1">
                <button
                  class="p-1 rounded hover:bg-muted transition-colors"
                  @click="
                    () => {
                      currentDate = new Date(currentYear, currentMonth - 1, 1)
                    }
                  ">
                  <Icon name="lucide:chevron-left" class="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  class="p-1 rounded hover:bg-muted transition-colors"
                  @click="
                    () => {
                      currentDate = new Date(currentYear, currentMonth + 1, 1)
                    }
                  ">
                  <Icon name="lucide:chevron-right" class="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <!-- Mini Calendar Grid -->
            <div class="grid grid-cols-7 gap-0.5 text-center">
              <div
                v-for="day in ['S', 'M', 'T', 'W', 'T', 'F', 'S']"
                :key="day"
                class="text-[10px] font-medium text-muted-foreground py-1">
                {{ day }}
              </div>
              <button
                v-for="(day, idx) in miniCalendarDays"
                :key="idx"
                :class="[
                  'relative w-7 h-7 text-xs rounded-md transition-all duration-150',
                  day.isToday
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : day.isCurrentMonth
                      ? 'text-foreground hover:bg-muted'
                      : 'text-muted-foreground/40',
                  day.hasEvents && !day.isToday ? 'font-medium' : '',
                ]"
                @click="
                  () => {
                    currentDate = new Date(currentYear, currentMonth, day.isCurrentMonth ? day.day : 1)
                    calendarViewMode = 'day'
                  }
                ">
                {{ day.day }}
                <span
                  v-if="day.hasEvents && day.isCurrentMonth"
                  :class="[
                    'absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
                    day.isToday ? 'bg-primary-foreground' : 'bg-primary',
                  ]" />
              </button>
            </div>
          </div>

          <!-- Sidebar Filters Slot (e.g., type filters) -->
          <div v-if="$slots['sidebar-filters']" class="shrink-0 px-4 pt-4 border-t border-border/50 my-4">
            <slot name="sidebar-filters" />
          </div>

          <!-- Upcoming Events Section - Accordion by Status -->
          <div
            class="flex-1 flex flex-col min-h-0 p-4 pt-4 border-t border-border/50"
            :class="$slots['sidebar-filters'] ? 'mt-0' : 'mt-4'">
            <h4 class="shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Attention Required
            </h4>
            <div class="flex-1 overflow-auto">
              <UiAccordion
                v-if="overdueEvents.length > 0 || dueSoonEvents.length > 0"
                type="multiple"
                :default-value="['overdue', 'due-soon']"
                class="space-y-2">
                <!-- Overdue Accordion -->
                <UiAccordionItem v-if="overdueEvents.length > 0" value="overdue" class="border-none">
                  <UiAccordionHeader class="py-0">
                    <UiAccordionTrigger class="py-2 text-xs hover:no-underline">
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-rose-500" />
                        <span class="font-semibold text-rose-600 dark:text-rose-400">Overdue</span>
                        <span class="text-muted-foreground font-normal">({{ overdueEvents.length }})</span>
                      </div>
                    </UiAccordionTrigger>
                  </UiAccordionHeader>
                  <UiAccordionContent class="pb-2 pt-0">
                    <div class="space-y-1.5">
                      <div
                        v-for="event in overdueEvents"
                        :key="event.id"
                        class="flex items-start gap-2.5 p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        @click="openEventDetail(event)">
                        <Icon
                          :name="getPriorityDisplay(event.priority).icon"
                          :class="['h-3.5 w-3.5 mt-0.5 shrink-0', getPriorityDisplay(event.priority).textClass]" />
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-medium truncate">{{ event.title }}</p>
                          <div class="flex items-center gap-2 mt-0.5">
                            <div v-if="event.assignee" class="flex items-center gap-1">
                              <div
                                class="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-medium text-primary">
                                {{
                                  event.assignee
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .slice(0, 2)
                                }}
                              </div>
                              <span class="text-[10px] text-muted-foreground truncate max-w-[60px]">
                                {{ event.assignee }}
                              </span>
                            </div>
                            <span class="text-[10px] text-muted-foreground">{{ formatShortDate(event.date) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </UiAccordionContent>
                </UiAccordionItem>

                <!-- Due Soon Accordion -->
                <UiAccordionItem v-if="dueSoonEvents.length > 0" value="due-soon" class="border-none">
                  <UiAccordionHeader class="py-0">
                    <UiAccordionTrigger class="py-2 text-xs hover:no-underline">
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-amber-500" />
                        <span class="font-semibold text-amber-600 dark:text-amber-400">Due Soon</span>
                        <span class="text-muted-foreground font-normal">({{ dueSoonEvents.length }})</span>
                      </div>
                    </UiAccordionTrigger>
                  </UiAccordionHeader>
                  <UiAccordionContent class="pb-2 pt-0">
                    <div class="space-y-1.5">
                      <div
                        v-for="event in dueSoonEvents"
                        :key="event.id"
                        class="flex items-start gap-2.5 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                        @click="openEventDetail(event)">
                        <Icon
                          :name="getPriorityDisplay(event.priority).icon"
                          :class="['h-3.5 w-3.5 mt-0.5 shrink-0', getPriorityDisplay(event.priority).textClass]" />
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-medium truncate">{{ event.title }}</p>
                          <div class="flex items-center gap-2 mt-0.5">
                            <div v-if="event.assignee" class="flex items-center gap-1">
                              <div
                                class="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-medium text-primary">
                                {{
                                  event.assignee
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .slice(0, 2)
                                }}
                              </div>
                              <span class="text-[10px] text-muted-foreground truncate max-w-[60px]">
                                {{ event.assignee }}
                              </span>
                            </div>
                            <span class="text-[10px] text-muted-foreground">{{ formatShortDate(event.date) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </UiAccordionContent>
                </UiAccordionItem>
              </UiAccordion>

              <!-- Empty State -->
              <div
                v-if="overdueEvents.length === 0 && dueSoonEvents.length === 0"
                class="flex-1 flex items-center justify-center">
                <div class="text-center py-8">
                  <Icon name="lucide:check-circle" class="h-8 w-8 mx-auto text-emerald-500/50 mb-2" />
                  <p class="text-xs text-muted-foreground/50">All caught up!</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar Resize Handle -->
          <div
            class="absolute top-0 right-0 w-1.5 h-full cursor-ew-resize z-10 hover:bg-primary/20 active:bg-primary/30 transition-colors"
            @pointerdown="startSidebarResize" />
        </div>

        <!-- Main Calendar Area -->
        <div class="flex-1 min-w-0 h-full overflow-hidden">
          <Transition :name="transitionDirection === 'right' ? 'slide-left' : 'slide-right'" mode="out-in">
            <!-- Day View -->
            <div v-if="calendarViewMode === 'day'" :key="`day-${currentDate.toISOString()}`" class="flex flex-col">
              <div class="flex-1">
                <div class="min-h-full p-6">
                  <!-- Day Events -->
                  <div class="space-y-3">
                    <div v-if="getEventsForDay(currentDate).length === 0" class="text-center py-16">
                      <Icon name="lucide:calendar-check" class="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <div class="text-sm text-muted-foreground">No events scheduled</div>
                    </div>
                    <div
                      v-for="event in getEventsForDay(currentDate)"
                      :key="event.id"
                      class="group relative flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 hover:border-border transition-all duration-200 cursor-pointer"
                      @click="openEventDetail(event)">
                      <div :class="['w-1 self-stretch rounded-full shrink-0', getStatusColor(event)]" />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-3">
                          <div>
                            <h4 class="font-medium text-sm">{{ event.title }}</h4>
                            <p v-if="event.typeLabel" class="text-xs text-muted-foreground mt-0.5">
                              {{ event.typeLabel }}
                            </p>
                          </div>
                          <span :class="['shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', event.badgeClass]">
                            {{ formatShortDate(event.date) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Week View -->
            <div
              v-else-if="calendarViewMode === 'week'"
              :key="`week-${currentWeekStart.toISOString()}`"
              class="h-full flex flex-col">
              <!-- Week Header -->
              <div class="shrink-0 grid grid-cols-7 border-b border-border/50">
                <div
                  v-for="day in weekViewDays"
                  :key="day.date.toISOString()"
                  :class="[
                    'py-3 px-2 text-center border-r border-border/30 last:border-r-0',
                    day.isToday ? 'bg-primary/10 border-b-2 border-b-primary' : '',
                  ]">
                  <div
                    :class="[
                      'text-xs uppercase tracking-wide',
                      day.isToday ? 'text-primary font-semibold' : 'text-muted-foreground',
                    ]">
                    {{ day.dayName }}
                  </div>
                  <div
                    :class="[
                      'mt-1 text-lg font-semibold',
                      day.isToday
                        ? 'w-8 h-8 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center'
                        : 'text-foreground',
                    ]">
                    {{ day.dayNum }}
                  </div>
                </div>
              </div>
              <!-- Week Body -->
              <div class="flex-1">
                <div class="grid grid-cols-7 min-h-full">
                  <div
                    v-for="day in weekViewDays"
                    :key="day.date.toISOString()"
                    :class="[
                      'min-h-[200px] p-2 border-r border-border/30 last:border-r-0',
                      day.isToday ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : '',
                    ]">
                    <div class="space-y-1.5">
                      <div
                        v-for="event in getEventsForDay(day.date)"
                        :key="event.id"
                        :class="[
                          'group relative p-2 rounded-lg text-xs cursor-pointer transition-all duration-150',
                          'hover:ring-2 hover:ring-primary/20',
                          event.badgeClass,
                        ]"
                        @click="openEventDetail(event)">
                        <div class="font-medium truncate">{{ event.title }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Month View -->
            <div
              v-else-if="calendarViewMode === 'month'"
              :key="`month-${currentYear}-${currentMonth}`"
              class="h-full flex flex-col">
              <!-- Month Header -->
              <div class="shrink-0 grid grid-cols-7 border-b border-border/50">
                <div
                  v-for="day in weekDays"
                  :key="day"
                  class="py-3 px-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {{ day }}
                </div>
              </div>
              <!-- Month Grid -->
              <div class="flex-1">
                <div class="grid grid-cols-7 h-full" style="grid-template-rows: repeat(6, minmax(100px, 1fr))">
                  <div
                    v-for="(day, idx) in monthDays"
                    :key="idx"
                    :class="[
                      'p-2 border-b border-r border-border/30 relative group cursor-pointer',
                      'last:border-r-0 nth-[7n]:border-r-0',
                      !day.isCurrentMonth ? 'bg-muted/20' : '',
                      day.isToday ? 'bg-primary/5 ring-2 ring-inset ring-primary/30' : '',
                    ]"
                    @click="handleEmptyCellClick(day.date)">
                    <div
                      :class="[
                        'text-sm font-medium mb-1',
                        day.isToday
                          ? 'w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center'
                          : day.isCurrentMonth
                            ? 'text-foreground'
                            : 'text-muted-foreground/50',
                      ]">
                      {{ day.date.getDate() }}
                    </div>
                    <!-- Type-grouped item stacks -->
                    <div
                      v-if="getTypeGroupsForDay(day.date).length > 0"
                      :class="['space-y-1', isDayInPast(day.date) ? 'opacity-50' : '']">
                      <UiPopover
                        :open="isDayPopoverOpen(day.date)"
                        @update:open="(open) => (open ? openDayPopover(day.date) : closeDayPopover())">
                        <UiPopoverTrigger as-child>
                          <button class="w-full text-left space-y-0.5" @click.stop="openDayPopover(day.date)">
                            <div
                              v-for="group in getTypeGroupsForDay(day.date)"
                              :key="group.typeLabel"
                              :class="[
                                'flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150',
                                'hover:ring-1 hover:ring-primary/30',
                                group.style.bg,
                                group.style.text,
                              ]">
                              <Icon :name="group.style.icon" class="h-3 w-3 shrink-0" />
                              <span class="truncate">
                                {{ group.items.length }} {{ group.style.label
                                }}{{ group.items.length !== 1 ? 's' : '' }}
                              </span>
                              <span
                                v-if="group.urgentCount > 0"
                                class="ml-auto shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                                {{ group.urgentCount }}
                              </span>
                            </div>
                          </button>
                        </UiPopoverTrigger>
                        <UiPopoverContent align="start" class="w-72 p-0 max-h-80 overflow-hidden">
                          <div class="px-3 py-2 border-b border-border bg-muted/30">
                            <p class="text-xs font-semibold">{{ formatDate(day.date) }}</p>
                            <p class="text-[10px] text-muted-foreground">
                              {{ getEventsForDay(day.date).length }}
                              {{ getEventsForDay(day.date).length === 1 ? 'item' : 'items' }}
                            </p>
                          </div>
                          <div class="overflow-y-auto max-h-64 p-1">
                            <template v-for="group in getTypeGroupsForDay(day.date)" :key="group.typeLabel">
                              <div class="px-2 pt-2 pb-1 flex items-center gap-1.5">
                                <Icon :name="group.style.icon" :class="['h-3 w-3', group.style.text]" />
                                <span :class="['text-[10px] font-semibold uppercase tracking-wide', group.style.text]">
                                  {{ group.typeLabel }}{{ group.items.length > 1 ? 's' : '' }}
                                </span>
                                <span class="text-[10px] text-muted-foreground">({{ group.items.length }})</span>
                              </div>
                              <button
                                v-for="event in group.items"
                                :key="event.id"
                                class="w-full text-left px-2.5 py-2 rounded-md hover:bg-muted/50 transition-colors flex items-start gap-2.5 group/item"
                                @click="openEventDetail(event)">
                                <div
                                  :style="{ backgroundColor: group.style.dot }"
                                  class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" />
                                <div class="flex-1 min-w-0">
                                  <p
                                    class="text-xs font-medium truncate group-hover/item:text-primary transition-colors">
                                    {{ event.title }}
                                  </p>
                                  <div class="flex items-center gap-2 mt-0.5">
                                    <span :class="['text-[10px] px-1.5 py-0.5 rounded font-medium', event.badgeClass]">
                                      {{ event.status?.replace('-', ' ') || 'on track' }}
                                    </span>
                                    <span v-if="event.assignee" class="text-[10px] text-muted-foreground truncate">
                                      {{ event.assignee }}
                                    </span>
                                  </div>
                                </div>
                                <Icon
                                  name="lucide:chevron-right"
                                  class="h-3.5 w-3.5 text-muted-foreground/50 group-hover/item:text-primary shrink-0 mt-0.5 transition-colors" />
                              </button>
                            </template>
                          </div>
                        </UiPopoverContent>
                      </UiPopover>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Year View -->
            <div v-else-if="calendarViewMode === 'year'" :key="`year-${currentYear}`" class="h-full overflow-auto">
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6 h-full">
                <div
                  v-for="month in yearMonths"
                  :key="month.month"
                  class="rounded-xl border border-border/50 bg-card/30 p-4 hover:bg-card/50 hover:border-border transition-all duration-200 cursor-pointer"
                  @click="
                    () => {
                      currentDate = new Date(currentYear, month.month, 1)
                      calendarViewMode = 'month'
                    }
                  ">
                  <!-- Month Header -->
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="font-semibold text-sm">{{ month.name }}</h3>
                    <span
                      v-if="month.events.length"
                      class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                      {{ month.events.length }}
                    </span>
                  </div>

                  <!-- Mini Calendar Grid -->
                  <div class="grid grid-cols-7 gap-px text-center h-full pb-4">
                    <!-- Weekday headers -->
                    <div
                      v-for="day in ['S', 'M', 'T', 'W', 'T', 'F', 'S']"
                      :key="day"
                      class="text-[8px] font-medium text-muted-foreground/60 py-0.5">
                      {{ day }}
                    </div>
                    <!-- Days -->
                    <div
                      v-for="(day, idx) in month.miniDays"
                      :key="idx"
                      :class="[
                        'relative w-5 h-5 text-[9px] flex items-center justify-center rounded-sm',
                        day.isToday
                          ? 'bg-primary text-primary-foreground font-bold'
                          : day.isCurrentMonth
                            ? day.hasEvents
                              ? 'text-foreground font-medium'
                              : 'text-foreground/70'
                            : 'text-muted-foreground/30',
                      ]">
                      {{ day.day }}
                      <!-- Event indicator dot -->
                      <span
                        v-if="day.hasEvents && day.isCurrentMonth && !day.isToday"
                        class="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: all 0.2s ease-out;
  }

  .slide-left-enter-from {
    opacity: 0;
    transform: translateX(20px);
  }

  .slide-left-leave-to {
    opacity: 0;
    transform: translateX(-20px);
  }

  .slide-right-enter-from {
    opacity: 0;
    transform: translateX(-20px);
  }

  .slide-right-leave-to {
    opacity: 0;
    transform: translateX(20px);
  }
</style>
