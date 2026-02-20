<script setup lang="ts">
  import type { DatabaseField, DatabaseSchema } from '~/types/database'
  import type { AttributeConfig } from '~/components/Ui/Calendar.vue'
  import type { RecurrenceRule } from '~/types/entity'
  import { createDefaultTrellisContext } from '~/lib/trellis'
  import { extractNodeValue, fieldKeyAliases, getStatusBadgeClass, getPriorityDisplay } from '~/lib/ontology'
  import { useGlobalDetailSheet } from '~/composables/useGlobalDetailSheet'

  type CalendarViewMode = 'day' | 'week' | 'month' | 'year'

  interface CalendarEvent {
    id: string
    sourceId: string
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
    description?: string
    isRecurringInstance?: boolean
    recurrenceIndex?: number
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
    'create-request': [date: Date, typeLabel: string]
    'event-reschedule': [eventId: string, newDate: Date]
  }>()

  // Calendar view mode state
  const calendarViewMode = ref<CalendarViewMode>('month')
  const currentDate = ref(new Date())
  const _hasAutoNavigated = ref(false)
  const isTransitioning = ref(false)
  const transitionDirection = ref<'left' | 'right'>('right')

  const viewModeOptions: Array<{ value: CalendarViewMode; label: string; icon: string }> = [
    { value: 'day', label: 'Today', icon: 'lucide:calendar-days' },
    { value: 'week', label: 'Week', icon: 'lucide:calendar-range' },
    { value: 'month', label: 'Month', icon: 'lucide:calendar' },
    { value: 'year', label: 'Year', icon: 'lucide:calendar-check' },
  ]

  const rootEl = ref<HTMLElement | null>(null)

  // ── Container-width responsive tiers ───────────────────────────────
  const containerWidth = ref(9999)
  const isCompact = computed(() => containerWidth.value < 480)
  const isMedium = computed(() => containerWidth.value >= 480 && containerWidth.value < 760)

  let _containerRO: ResizeObserver | null = null
  onMounted(() => {
    if (!rootEl.value) return
    _containerRO = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) containerWidth.value = entry.contentRect.width
    })
    _containerRO.observe(rootEl.value)
    containerWidth.value = rootEl.value.getBoundingClientRect().width
  })
  onUnmounted(() => { _containerRO?.disconnect() })

  // Weekday label sets: full / medium / compact
  const weekDaysFull = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekDaysMed  = ['Su',  'Mo',  'Tu',  'We',  'Th',  'Fr',  'Sa']
  const weekDaysSingle = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const weekDays = computed(() =>
    isCompact.value ? weekDaysSingle : isMedium.value ? weekDaysMed : weekDaysFull,
  )

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
  const activeDayPopoverFilter = ref<string | null>(null)
  const _isDayPopoverOpen = (date: Date): boolean =>
    !!(activeDayPopover.value && isSameDay(activeDayPopover.value, date))
  const openDayPopover = (date: Date, typeFilter?: string) => {
    activeDayPopover.value = date
    activeDayPopoverFilter.value = typeFilter ?? null
  }
  const closeDayPopover = () => {
    activeDayPopover.value = null
    activeDayPopoverFilter.value = null
  }

  // Multi-day hover highlight state
  const hoveredMultiDayEventId = ref<string | null>(null)

  // Add menu state ('+' button in cells)
  const addMenuDate = ref<Date | null>(null)
  const isAddMenuOpen = (date: Date): boolean =>
    !!(addMenuDate.value && isSameDay(addMenuDate.value, date))

  // Temporal types for the add menu
  const temporalTypeOptions = computed(() =>
    Object.entries(typeColorMap).map(([key, val]) => ({ typeLabel: key, ...val }))
  )

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
    if (typeof value === 'string') {
      // Date-only strings (YYYY-MM-DD) must be parsed as local midnight, not UTC
      // new Date("2026-02-17") → UTC midnight → wrong .getDate() in western timezones
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number) as [number, number, number]
        const local = new Date(y, m - 1, d)
        return isNaN(local.getTime()) ? null : local
      }
      const parsedDate = new Date(value)
      return isNaN(parsedDate.getTime()) ? null : parsedDate
    }
    if (typeof value === 'number') {
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

  const parseRecurrenceRule = (value: any): RecurrenceRule | null => {
    const unwrapped = unwrapLdValue(value)
    if (!unwrapped || typeof unwrapped !== 'object' || Array.isArray(unwrapped)) return null

    const frequency = String((unwrapped as any).frequency || '').toLowerCase()
    if (!frequency) return null

    const validFrequencies = new Set(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'weekdays', 'custom'])
    if (!validFrequencies.has(frequency)) return null

    const parseNum = (input: any): number | undefined => {
      const n = Number(input)
      return Number.isFinite(n) && n > 0 ? n : undefined
    }

    const weekdaysRaw = (unwrapped as any).weekdays
    const weekdays = Array.isArray(weekdaysRaw)
      ? weekdaysRaw
          .map((d) => Number(d))
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      : undefined

    return {
      frequency: frequency as RecurrenceRule['frequency'],
      interval: parseNum((unwrapped as any).interval),
      weekdays: weekdays?.length ? weekdays : undefined,
      endDate: typeof (unwrapped as any).endDate === 'string' ? (unwrapped as any).endDate : undefined,
      occurrences: parseNum((unwrapped as any).occurrences),
    }
  }

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

  const addDays = (date: Date, days: number) => {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next
  }

  const addMonths = (date: Date, months: number) => {
    const next = new Date(date)
    next.setMonth(next.getMonth() + months)
    return next
  }

  const addYears = (date: Date, years: number) => {
    const next = new Date(date)
    next.setFullYear(next.getFullYear() + years)
    return next
  }

  const getViewRange = (): { start: Date; end: Date } => {
    const base = new Date(currentDate.value)
    base.setHours(0, 0, 0, 0)

    switch (calendarViewMode.value) {
      case 'day':
        return { start: startOfDay(base), end: endOfDay(base) }
      case 'week': {
        const start = new Date(base)
        start.setDate(start.getDate() - start.getDay())
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        return { start: startOfDay(start), end: endOfDay(end) }
      }
      case 'month': {
        const firstDay = new Date(base.getFullYear(), base.getMonth(), 1)
        const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0)
        const start = new Date(firstDay)
        start.setDate(firstDay.getDate() - firstDay.getDay())
        const totalDays = Math.ceil((start.getDay() + lastDay.getDate()) / 7) * 7
        const end = new Date(start)
        end.setDate(start.getDate() + totalDays - 1)
        return { start: startOfDay(start), end: endOfDay(end) }
      }
      case 'year': {
        const start = new Date(base.getFullYear(), 0, 1)
        const end = new Date(base.getFullYear(), 11, 31)
        return { start: startOfDay(start), end: endOfDay(end) }
      }
      default:
        return { start: startOfDay(base), end: endOfDay(base) }
    }
  }

  const toWeekAnchor = (date: Date) => {
    const anchor = startOfDay(date)
    anchor.setDate(anchor.getDate() - anchor.getDay())
    return anchor
  }

  const getCustomRecurrenceFrequency = (rule: RecurrenceRule): 'daily' | 'weekly' | 'monthly' | 'yearly' => {
    if (rule.weekdays?.length) return 'weekly'
    return 'daily'
  }

  const generateRecurringDates = (
    baseDate: Date,
    recurrence: RecurrenceRule,
    rangeStart: Date,
    rangeEnd: Date,
  ): Date[] => {
    const interval = Math.max(1, recurrence.interval || 1)
    const parsedEndDate = recurrence.endDate ? parseDateValue(recurrence.endDate) : null
    const endDateBound = parsedEndDate ? endOfDay(parsedEndDate) : rangeEnd
    const hardEnd = endDateBound < rangeEnd ? endDateBound : rangeEnd
    const maxOccurrences = Math.max(1, recurrence.occurrences || 200)

    const results: Date[] = []
    let generated = 0

    const pushIfInRange = (candidate: Date) => {
      if (candidate <= baseDate) return
      if (candidate > hardEnd) return
      if (candidate >= rangeStart) results.push(new Date(candidate))
      generated += 1
    }

    const base = new Date(baseDate)

    const frequency = recurrence.frequency === 'custom'
      ? getCustomRecurrenceFrequency(recurrence)
      : recurrence.frequency

    if (frequency === 'weekdays') {
      let cursor = addDays(base, 1)
      while (cursor <= hardEnd && generated < maxOccurrences) {
        const day = cursor.getDay()
        if (day >= 1 && day <= 5) {
          pushIfInRange(cursor)
        }
        cursor = addDays(cursor, 1)
      }
      return results
    }

    if ((frequency === 'weekly' || recurrence.weekdays?.length) && recurrence.weekdays?.length) {
      const weekdays = [...new Set(recurrence.weekdays)].sort((a, b) => a - b)
      const anchor = toWeekAnchor(base)
      let weekOffset = 0

      while (generated < maxOccurrences) {
        const weekStart = addDays(anchor, weekOffset * 7 * interval)
        if (weekStart > hardEnd) break

        for (const weekday of weekdays) {
          const candidate = new Date(weekStart)
          candidate.setDate(weekStart.getDate() + weekday)
          candidate.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds())
          pushIfInRange(candidate)
          if (generated >= maxOccurrences) break
        }

        weekOffset += 1
      }

      return results.sort((a, b) => a.getTime() - b.getTime())
    }

    let cursor = new Date(base)
    while (generated < maxOccurrences) {
      if (frequency === 'daily') cursor = addDays(cursor, interval)
      else if (frequency === 'weekly') cursor = addDays(cursor, interval * 7)
      else if (frequency === 'monthly') cursor = addMonths(cursor, interval)
      else if (frequency === 'quarterly') cursor = addMonths(cursor, interval * 3)
      else if (frequency === 'yearly') cursor = addYears(cursor, interval)
      else break

      if (cursor > hardEnd) break
      pushIfInRange(cursor)
    }

    return results
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
    GoogleCalendar: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      dot: '#3b82f6',
      icon: 'simple-icons:googlecalendar',
      label: 'google-calendar',
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

  // Convert PascalCase type keys to readable display strings (e.g. 'GoogleCalendar' → 'Google Calendar')
  const getTypeDisplayLabel = (typeLabel?: string): string => {
    if (!typeLabel) return 'Item'
    // Use the label from typeColorMap if available (already human-readable)
    const style = typeColorMap[typeLabel]
    if (style) {
      // Capitalize each word of the label
      return style.label.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }
    // Fallback: split PascalCase into words
    return typeLabel.replace(/([A-Z])/g, ' $1').trim()
  }

  interface TypeGroup {
    typeLabel: string
    style: typeof defaultTypeColor
    items: CalendarEvent[]
    urgentCount: number
  }

  const _getTypeGroupsForDay = (date: Date): TypeGroup[] => {
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

  // ── Drag-to-reschedule ──────────────────────────────────────────────
  const draggedEvent = ref<CalendarEvent | null>(null)
  const dragOverDate = ref<Date | null>(null)

  const onDragStart = (e: DragEvent, event: CalendarEvent) => {
    if (!e.dataTransfer) return
    draggedEvent.value = event
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', event.id)
  }

  const onDragEnd = () => {
    draggedEvent.value = null
    dragOverDate.value = null
  }

  const onCellDragOver = (e: DragEvent, date: Date) => {
    if (!draggedEvent.value) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    dragOverDate.value = date
  }

  const onCellDragLeave = () => {
    dragOverDate.value = null
  }

  const onCellDrop = (e: DragEvent, date: Date) => {
    e.preventDefault()
    if (!draggedEvent.value) return
    if (!isSameDay(draggedEvent.value.date, date)) {
      emit('event-reschedule', draggedEvent.value.id, date)
    }
    draggedEvent.value = null
    dragOverDate.value = null
  }

  const isDragOver = (date: Date): boolean =>
    !!(dragOverDate.value && isSameDay(dragOverDate.value, date))

  const isDayInPast = (date: Date): boolean => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    return d < today.value
  }

  const _handleEmptyCellClick = (date: Date) => {
    if (getEventsForDay(date).length === 0) {
      emit('cell-click', date)
    }
  }

  // ── Multi-day spanning bar logic ────────────────────────────────────
  // Max visible lanes/items are dynamic — see maxVisibleLanesPerRow/maxCellContentSlots computeds

  interface MultiDayLane {
    event: CalendarEvent
    startCol: number
    endCol: number
    continuesFromPrev: boolean
    continuesToNext: boolean
    style: typeof defaultTypeColor
    laneIndex: number
  }

  interface LaneSlot {
    event: CalendarEvent
    style: typeof defaultTypeColor
    isStart: boolean
    isEnd: boolean
    isWrapStart: boolean
    isWrapEnd: boolean
  }

  interface WeekRow {
    days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean }>
    lanes: MultiDayLane[]
    overflowPerCol: number[]
  }

  const isMultiDayEvent = (event: CalendarEvent): boolean => {
    if (!event.range) return false
    const s = new Date(event.range.start.getFullYear(), event.range.start.getMonth(), event.range.start.getDate())
    const e = new Date(event.range.end.getFullYear(), event.range.end.getMonth(), event.range.end.getDate())
    return e.getTime() > s.getTime()
  }

  const multiDayEvents = computed(() => events.value.filter(isMultiDayEvent))

  const getMultiDayLanes = (
    weekDays: Array<{ date: Date }>,
    globalLaneMap: Map<string, number>,
    maxLanes: number,
  ): { lanes: MultiDayLane[]; overflowPerCol: number[] } => {
    if (!weekDays.length) return { lanes: [], overflowPerCol: Array(7).fill(0) }
    const weekStart = new Date(weekDays[0]!.date.getFullYear(), weekDays[0]!.date.getMonth(), weekDays[0]!.date.getDate())
    const weekEnd = new Date(weekDays[6]!.date.getFullYear(), weekDays[6]!.date.getMonth(), weekDays[6]!.date.getDate())

    // Calendar-day difference (immune to DST): normalize both to UTC noon then divide
    const daysBetween = (a: Date, b: Date): number => {
      const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
      const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
      return Math.round((utcB - utcA) / 86400000)
    }

    const relevant = multiDayEvents.value.filter((ev) => {
      const s = new Date(ev.range!.start.getFullYear(), ev.range!.start.getMonth(), ev.range!.start.getDate())
      const e = new Date(ev.range!.end.getFullYear(), ev.range!.end.getMonth(), ev.range!.end.getDate())
      return e >= weekStart && s <= weekEnd
    })

    if (!relevant.length) return { lanes: [], overflowPerCol: Array(7).fill(0) }

    // Sort by start date, then by span length (longer first for better packing)
    const sorted = [...relevant].sort((a, b) => {
      const aStart = a.range!.start.getTime()
      const bStart = b.range!.start.getTime()
      if (aStart !== bStart) return aStart - bStart
      const aLen = a.range!.end.getTime() - a.range!.start.getTime()
      const bLen = b.range!.end.getTime() - b.range!.start.getTime()
      return bLen - aLen
    })

    // Process reserved events (continuing from previous row) first for lane consistency
    const reserved = sorted.filter((ev) => globalLaneMap.has(ev.id))
    const fresh = sorted.filter((ev) => !globalLaneMap.has(ev.id))
    const processingOrder = [...reserved, ...fresh]

    // Greedy lane assignment — track lane index per event
    const laneOccupancy: number[][] = [] // laneOccupancy[lane] = array of occupied columns
    const allLanes: MultiDayLane[] = []

    for (const ev of processingOrder) {
      const evStart = new Date(ev.range!.start.getFullYear(), ev.range!.start.getMonth(), ev.range!.start.getDate())
      const evEnd = new Date(ev.range!.end.getFullYear(), ev.range!.end.getMonth(), ev.range!.end.getDate())

      const startCol = Math.max(0, daysBetween(weekStart, evStart))
      const endCol = Math.min(6, daysBetween(weekStart, evEnd))

      const continuesFromPrev = evStart < weekStart
      const continuesToNext = evEnd > weekEnd

      let assignedLane = -1

      // Try to reuse lane from a previous row
      if (globalLaneMap.has(ev.id)) {
        const preferred = globalLaneMap.get(ev.id)!
        while (laneOccupancy.length <= preferred) laneOccupancy.push([])
        const conflict = laneOccupancy[preferred]!.some((c) => c >= startCol && c <= endCol)
        if (!conflict) assignedLane = preferred
      }

      // Greedy fallback: find first free lane
      if (assignedLane === -1) {
        for (let l = 0; l < laneOccupancy.length; l++) {
          const conflict = laneOccupancy[l]!.some((c) => c >= startCol && c <= endCol)
          if (!conflict) {
            assignedLane = l
            break
          }
        }
        if (assignedLane === -1) {
          assignedLane = laneOccupancy.length
          laneOccupancy.push([])
        }
      }

      // Persist lane assignment globally
      globalLaneMap.set(ev.id, assignedLane)

      // Mark columns as occupied
      for (let c = startCol; c <= endCol; c++) {
        laneOccupancy[assignedLane]!.push(c)
      }

      allLanes.push({
        event: ev,
        startCol,
        endCol,
        continuesFromPrev,
        continuesToNext,
        style: getTypeStyle(ev.typeLabel),
        laneIndex: assignedLane,
      })
    }

    const visible = allLanes.filter((l) => l.laneIndex < maxLanes)
    const overflowLanes = allLanes.filter((l) => l.laneIndex >= maxLanes)
    const overflowPerCol = Array(7).fill(0) as number[]
    for (const lane of overflowLanes) {
      for (let c = lane.startCol; c <= lane.endCol; c++) {
        overflowPerCol[c] = (overflowPerCol[c] ?? 0) + 1
      }
    }

    return { lanes: visible, overflowPerCol }
  }

  const weekRows = computed<WeekRow[]>(() => {
    const days = monthDays.value
    const rows: WeekRow[] = []
    const globalLaneMap = new Map<string, number>()
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7)
      const { lanes, overflowPerCol } = getMultiDayLanes(weekDays, globalLaneMap, maxVisibleLanesPerRow.value)
      rows.push({ days: weekDays, lanes, overflowPerCol })
    }
    return rows
  })

  // Dynamic row heights: proportional fr values based on content density
  const _monthGridTemplateRows = computed(() => {
    const rows = weekRows.value
    if (!rows.length) return ''
    const weights = rows.map((row) => {
      // Multi-day lane count for this row
      const laneCount = row.lanes.length ? Math.max(...row.lanes.map((l) => l.laneIndex)) + 1 : 0
      // Max visible single-day items across all 7 days in this row
      let maxItems = 0
      for (const day of row.days) {
        const visible = getVisibleSingleDayItems(day.date, row).length
        const hasOverflow = getOverflowDayGroup(day.date, row) ? 1 : 0
        const total = visible + hasOverflow
        if (total > maxItems) maxItems = total
      }
      // Weight = lanes + single-day items + 1 base (for header/padding)
      return Math.max(laneCount + maxItems + 1, 2)
    })
    return weights.map((w) => `${w}fr`).join(' ')
  })

  const getLaneSlotsForDay = (row: WeekRow, colIdx: number): Array<LaneSlot | null> => {
    if (!row.lanes.length) return []
    const maxLane = Math.max(...row.lanes.map((l) => l.laneIndex))
    const slotCount = maxLane + 1
    const slots: Array<LaneSlot | null> = Array(slotCount).fill(null)
    for (const lane of row.lanes) {
      if (colIdx >= lane.startCol && colIdx <= lane.endCol) {
        slots[lane.laneIndex] = {
          event: lane.event,
          style: lane.style,
          isStart: colIdx === lane.startCol && !lane.continuesFromPrev,
          isEnd: colIdx === lane.endCol && !lane.continuesToNext,
          isWrapStart: colIdx === lane.startCol && lane.continuesFromPrev,
          isWrapEnd: colIdx === lane.endCol && lane.continuesToNext,
        }
      }
    }
    // Trim trailing nulls so empty lanes at the bottom don't create stray gaps
    while (slots.length > 0 && slots[slots.length - 1] === null) slots.pop()
    return slots.length > 0 ? slots : []
  }

  // Multi-day event IDs set for quick lookup (to exclude from single-day rendering)
  const multiDayEventIds = computed(() => new Set(multiDayEvents.value.map((e) => e.id)))

  // Check if a hovered multi-day event spans a specific date
  const isHoveredMultiDayCell = (date: Date): boolean => {
    const id = hoveredMultiDayEventId.value
    if (!id) return false
    const ev = multiDayEvents.value.find((e) => e.id === id)
    if (!ev?.range) return false
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    const s = new Date(ev.range.start.getFullYear(), ev.range.start.getMonth(), ev.range.start.getDate()).getTime()
    const e = new Date(ev.range.end.getFullYear(), ev.range.end.getMonth(), ev.range.end.getDate()).getTime()
    return d >= s && d <= e
  }

  // Format date range for hover preview
  const formatEventDateRange = (event: CalendarEvent): string => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    if (event.range) {
      const s = event.range.start.toLocaleDateString('en-US', opts)
      const e = event.range.end.toLocaleDateString('en-US', opts)
      return s === e ? s : `${s} — ${e}`
    }
    return event.date.toLocaleDateString('en-US', opts)
  }

  // Get type groups for a day, excluding multi-day events (those render as spanning bars)
  const getSingleDayTypeGroups = (date: Date): TypeGroup[] => {
    const dayEvents = getEventsForDay(date).filter((e) => !multiDayEventIds.value.has(e.id))
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

  // ── Cross-type unified day group ─────────────────────────────────────
  interface TypeSegment {
    label: string
    icon: string
    color: string
    count: number
  }

  interface DayGroup {
    items: CalendarEvent[]
    urgentCount: number
    typeSegments: TypeSegment[]
  }

  const getDayGroup = (date: Date): DayGroup | null => {
    const dayEvents = getEventsForDay(date).filter((e) => !multiDayEventIds.value.has(e.id))
    if (!dayEvents.length) return null
    const grouped = new Map<string, CalendarEvent[]>()
    for (const ev of dayEvents) {
      const key = ev.typeLabel || 'Item'
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(ev)
    }
    const typeSegments: TypeSegment[] = []
    let urgentCount = 0
    for (const [typeLabel, items] of grouped) {
      const style = getTypeStyle(typeLabel)
      typeSegments.push({ label: typeLabel, icon: style.icon, color: style.dot, count: items.length })
      urgentCount += items.filter((i) => {
        const u = i.urgency?.toLowerCase()
        const p = i.priority?.toLowerCase()
        return u === 'urgent' || u === 'high' || p === 'urgent' || p === 'high'
      }).length
    }
    return { items: dayEvents, urgentCount, typeSegments }
  }

  // ── Visible / overflow split for individual item pills ───────────────
  const getMaxSingleDayItems = (row: WeekRow): number => {
    const laneCount = row.lanes.length ? Math.max(...row.lanes.map((l) => l.laneIndex)) + 1 : 0
    const available = maxCellContentSlots.value - laneCount
    return Math.max(available, 1)
  }

  const getVisibleSingleDayItems = (date: Date, row: WeekRow): CalendarEvent[] => {
    const group = getDayGroup(date)
    if (!group) return []
    const max = getMaxSingleDayItems(row)
    if (group.items.length <= max) return group.items
    return group.items.slice(0, max - 1) // leave room for overflow pill
  }

  const getOverflowDayGroup = (date: Date, row: WeekRow): DayGroup | null => {
    const group = getDayGroup(date)
    if (!group) return null
    const max = getMaxSingleDayItems(row)
    if (group.items.length <= max) return null
    const overflowItems = group.items.slice(max - 1)
    const grouped = new Map<string, CalendarEvent[]>()
    for (const ev of overflowItems) {
      const key = ev.typeLabel || 'Item'
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(ev)
    }
    const typeSegments: TypeSegment[] = []
    let urgentCount = 0
    for (const [typeLabel, items] of grouped) {
      const style = getTypeStyle(typeLabel)
      typeSegments.push({ label: typeLabel, icon: style.icon, color: style.dot, count: items.length })
      urgentCount += items.filter((i) => {
        const u = i.urgency?.toLowerCase()
        const p = i.priority?.toLowerCase()
        return u === 'urgent' || u === 'high' || p === 'urgent' || p === 'high'
      }).length
    }
    return { items: overflowItems, urgentCount, typeSegments }
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

    const { start: viewStart, end: viewEnd } = getViewRange()

    const out: CalendarEvent[] = []
    recordNodes.value.forEach((node, nodeIndex) => {
      const values = normalizeDateValues(getFieldValue(node, field))
      const recurrence = parseRecurrenceRule(
        getFieldValue(node, { id: 'recurrence', name: 'recurrence', type: 'text', order: 0, required: false } as DatabaseField)
        ?? (node as any)['user:recurrence']
        ?? (node as any).recurrence,
      )

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

      const description = getNodeStringValue(node, ['user:description', 'description', 'trellis:description'])
      const baseId = getNodeId(node) || 'record'

      values.forEach((val, valueIndex) => {
        const baseEventId = `${baseId}-${nodeIndex}-${valueIndex}`
        const baseRange = val.range
        const baseStart = baseRange?.start ? new Date(baseRange.start) : new Date(val.date)
        const baseEnd = baseRange?.end ? new Date(baseRange.end) : new Date(val.date)
        const durationMs = Math.max(0, baseEnd.getTime() - baseStart.getTime())

        out.push({
          id: baseEventId,
          sourceId: baseEventId,
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
          description,
          isRecurringInstance: false,
        })

        if (!recurrence) return

        const recurringDates = generateRecurringDates(baseStart, recurrence, viewStart, viewEnd)
        recurringDates.forEach((occurrenceStart, recurrenceIndex) => {
          const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs)
          const occurrenceRange = durationMs > 0
            ? { start: occurrenceStart, end: occurrenceEnd }
            : undefined

          out.push({
            id: `${baseEventId}-repeat-${recurrenceIndex + 1}`,
            sourceId: baseEventId,
            title: nodeTitle(node),
            date: occurrenceStart,
            range: occurrenceRange,
            typeLabel: nodeType,
            badgeClass,
            dotColor: typeStyle.dot,
            status: status || 'on-track',
            assignee,
            priority: priority?.toLowerCase(),
            urgency: urgency?.toLowerCase(),
            description,
            isRecurringInstance: true,
            recurrenceIndex: recurrenceIndex + 1,
          })
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

    // Next month padding (fill to complete week rows only)
    const totalNeeded = Math.ceil(days.length / 7) * 7
    const remaining = totalNeeded - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ date, isCurrentMonth: false, isToday: isSameDay(date, today.value) })
    }

    return days
  })

  // Dynamic cell content limits based on month row count and view mode
  const weekRowCount = computed(() => Math.ceil(monthDays.value.length / 7))

  const maxVisibleLanesPerRow = computed(() => {
    const rows = weekRowCount.value
    const base = rows <= 4 ? 3 : 2
    return isCompact.value ? Math.max(1, base - 1) : base
  })

  const maxCellContentSlots = computed(() => {
    if (calendarViewMode.value === 'week') {
      return isCompact.value ? 4 : isMedium.value ? 6 : 8
    }
    const rows = weekRowCount.value
    let base: number
    if (rows <= 4) base = 6
    else if (rows <= 5) base = 5
    else base = 4
    if (isCompact.value) return Math.max(2, base - 2)
    if (isMedium.value) return Math.max(3, base - 1)
    return base
  })

  // Get week days for week view
  const weekViewDays = computed(() => {
    const days: Array<{ date: Date; isToday: boolean; isCurrentMonth: boolean; dayName: string; dayNum: number }> = []
    const start = new Date(currentWeekStart.value)
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      days.push({
        date,
        isToday: isSameDay(date, today.value),
        isCurrentMonth: true,
        dayName: weekDays.value[i] ?? '',
        dayNum: date.getDate(),
      })
    }
    return days
  })

  // Week view: single WeekRow for multi-day lane computation
  const weekViewRow = computed<WeekRow>(() => {
    const days = weekViewDays.value
    const globalLaneMap = new Map<string, number>()
    const { lanes, overflowPerCol } = getMultiDayLanes(days, globalLaneMap, 6)
    return { days, lanes, overflowPerCol }
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
      hasRecurring: boolean
      eventCount: number
      recurringCount: number
    }> = []

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i)
      const dayEvents = events.value.filter((e) => isDateInEventRange(date, e))
      const recurringCount = dayEvents.filter((e) => hasRecurringInstance(e)).length
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: isSameDay(date, today.value),
        hasEvents: dayEvents.length > 0,
        hasRecurring: recurringCount > 0,
        eventCount: dayEvents.length,
        recurringCount,
      })
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i)
      const dayEvents = events.value.filter((e) => isDateInEventRange(date, e))
      const recurringCount = dayEvents.filter((e) => hasRecurringInstance(e)).length
      days.push({
        day: i,
        isCurrentMonth: true,
        isToday: isSameDay(date, today.value),
        hasEvents: dayEvents.length > 0,
        hasRecurring: recurringCount > 0,
        eventCount: dayEvents.length,
        recurringCount,
      })
    }

    // Next month padding (fill to 42 days = 6 weeks)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      const dayEvents = events.value.filter((e) => isDateInEventRange(date, e))
      const recurringCount = dayEvents.filter((e) => hasRecurringInstance(e)).length
      days.push({
        day: i,
        isCurrentMonth: false,
        isToday: isSameDay(date, today.value),
        hasEvents: dayEvents.length > 0,
        hasRecurring: recurringCount > 0,
        eventCount: dayEvents.length,
        recurringCount,
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

  const hasRecurringInstance = (event: CalendarEvent) => event.isRecurringInstance === true

  const recurringItemClasses = (event: CalendarEvent) =>
    hasRecurringInstance(event)
      ? 'ring-1 ring-primary/20 border border-dashed border-primary/25'
      : ''

  // currentDate defaults to new Date() (today) — no auto-navigation needed

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
      'w-full h-full flex-1 bg-transparent flex flex-col overflow-hidden',
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
        <!-- Mini Calendar Sidebar (hidden at compact widths) -->
        <div
          v-show="!isCompact"
          class="shrink-0 border-r border-border bg-background/25 flex flex-col h-full relative"
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
                    day.isToday ? 'bg-primary-foreground' : day.hasRecurring ? 'bg-violet-500' : 'bg-primary',
                  ]" />
              </button>
            </div>
          </div>

          <!-- Sidebar Sections (collapsible accordion) -->
          <div class="flex-1 flex flex-col min-h-0 border-t border-border mt-4 overflow-auto">
            <UiAccordion type="multiple" :default-value="['sources', 'filter', 'attention']" class="px-4">
              <!-- Sources Section -->
              <UiAccordionItem v-if="$slots['sidebar-sources']" value="sources" class="border-b border-border/30">
                <UiAccordionHeader class="py-0">
                  <UiAccordionTrigger class="py-3 text-xs hover:no-underline">
                    <span class="font-semibold text-muted-foreground uppercase tracking-wide">Sources</span>
                  </UiAccordionTrigger>
                </UiAccordionHeader>
                <UiAccordionContent class="pb-3 pt-0">
                  <slot name="sidebar-sources" />
                </UiAccordionContent>
              </UiAccordionItem>

              <!-- Filter Section -->
              <UiAccordionItem v-if="$slots['sidebar-filters']" value="filter" class="border-b border-border/30">
                <UiAccordionHeader class="py-0">
                  <UiAccordionTrigger class="py-3 text-xs hover:no-underline">
                    <span class="font-semibold text-muted-foreground uppercase tracking-wide">Filter</span>
                  </UiAccordionTrigger>
                </UiAccordionHeader>
                <UiAccordionContent class="pb-3 pt-0">
                  <slot name="sidebar-filters" />
                </UiAccordionContent>
              </UiAccordionItem>

              <!-- Attention Required Section -->
              <UiAccordionItem value="attention" class="border-none">
                <UiAccordionHeader class="py-0">
                  <UiAccordionTrigger class="py-3 text-xs hover:no-underline">
                    <span class="font-semibold text-muted-foreground uppercase tracking-wide">Attention Required</span>
                  </UiAccordionTrigger>
                </UiAccordionHeader>
                <UiAccordionContent class="pb-3 pt-0">
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
                </UiAccordionContent>
              </UiAccordionItem>
            </UiAccordion>
          </div>

          <!-- Sidebar Resize Handle -->
          <div
            class="absolute top-0 right-0 w-1.5 h-full cursor-ew-resize z-10 hover:bg-primary/20 active:bg-primary/30 transition-colors"
            @pointerdown="startSidebarResize" />
        </div>

        <!-- Main Calendar Area -->
        <div class="flex-1 min-w-0 h-full overflow-hidden">
                <!-- Calendar Header -->
        <div
          class="shrink-0 border-b border-border bg-transparent"
          :class="isCompact ? 'px-3 py-2' : isMedium ? 'px-4 py-3' : 'px-6 py-4'"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <!-- Left: Navigation + Title -->
            <div class="flex items-center" :class="isCompact ? 'gap-2' : 'gap-3'">
              <div class="flex items-center">
                <UiButton variant="outline" size="icon" class="h-8 w-8 rounded-r-none border-r-0" @click="navigatePrev">
                  <Icon name="lucide:chevron-left" class="h-4 w-4" />
                </UiButton>
                <UiButton variant="outline" size="sm" class="h-8 rounded-none border-x-0" @click="navigateToday">
                  {{ isCompact ? '·' : 'Today' }}
                </UiButton>
                <UiButton variant="outline" size="icon" class="h-8 w-8 rounded-l-none border-l-0" @click="navigateNext">
                  <Icon name="lucide:chevron-right" class="h-4 w-4" />
                </UiButton>
              </div>
              <h2
                class="font-semibold truncate"
                :class="isCompact ? 'text-sm' : 'text-lg'"
              >
                {{ headerTitle }}
              </h2>
            </div>

            <!-- Right: View Mode Switcher + Slot -->
            <div class="flex items-center gap-2 shrink-0">
              <!-- View Mode Switcher -->
              <div class="flex items-center rounded-lg border border-border p-0.5">
                <UiTooltip v-for="option in viewModeOptions" :key="option.value">
                  <UiTooltipTrigger as-child>
                    <button
                      :class="[
                        'rounded-md transition-all duration-200 text-xs font-medium',
                        isCompact ? 'h-7 w-7 flex items-center justify-center' : 'px-3 py-1.5',
                        calendarViewMode === option.value
                          ? 'bg-foreground/10 shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                      ]"
                      @click="calendarViewMode = option.value"
                    >
                      <Icon v-if="isCompact" :name="option.icon" class="h-3.5 w-3.5" />
                      <span v-else>{{ option.label }}</span>
                    </button>
                  </UiTooltipTrigger>
                  <UiTooltipContent v-if="isCompact" side="bottom">{{ option.label }}</UiTooltipContent>
                </UiTooltip>
              </div>

              <!-- Header Actions Slot -->
              <slot name="header-actions" />
            </div>
          </div>
        </div>

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
                    'px-1 text-center border-r border-border/30 last:border-r-0',
                    isCompact ? 'py-1.5' : isMedium ? 'py-2' : 'py-3',
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
                      'font-semibold',
                      isCompact ? 'mt-0.5 text-sm' : 'mt-1 text-lg',
                      day.isToday
                        ? 'mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center'
                        + (isCompact ? ' w-6 h-6 text-xs' : ' w-8 h-8')
                        : 'text-foreground',
                    ]">
                    {{ day.dayNum }}
                  </div>
                </div>
              </div>
              <!-- Week Body -->
              <div class="flex-1 overflow-auto">
                <div class="grid grid-cols-7 min-h-full">
                  <div
                    v-for="(day, dayIdx) in weekViewDays"
                    :key="day.date.toISOString()"
                    :class="[
                      'px-2 py-1.5 border-r border-border/30 last:border-r-0 relative group/cell flex flex-col overflow-hidden transition-colors',
                      day.isToday ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' :
                        isDayInPast(day.date) ? '' : 'bg-card/40',
                      isDragOver(day.date) ? 'bg-primary/10 ring-2 ring-inset ring-primary/50' : '',
                      isHoveredMultiDayCell(day.date) ? 'bg-primary/5' : '',
                    ]"
                    @dragover="(e: DragEvent) => onCellDragOver(e, day.date)"
                    @dragleave="onCellDragLeave"
                    @drop="(e: DragEvent) => onCellDrop(e, day.date)">
                    <!-- Hover '+' button with type picker -->
                    <div class="flex items-center justify-end mb-1 shrink-0">
                      <UiPopover
                        :open="isAddMenuOpen(day.date)"
                        @update:open="(open: boolean) => { addMenuDate = open ? day.date : null }">
                        <UiPopoverTrigger as-child>
                          <button
                            class="h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover/cell:opacity-100 hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                            @click.stop="() => { addMenuDate = day.date }">
                            <Icon name="lucide:plus" class="h-3 w-3" />
                          </button>
                        </UiPopoverTrigger>
                        <UiPopoverContent align="start" side="top" class="w-36 p-1">
                          <button
                            v-for="t in temporalTypeOptions"
                            :key="t.typeLabel"
                            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted/50 transition-colors"
                            @click="() => { addMenuDate = null; emit('create-request', day.date, t.typeLabel) }">
                            <Icon :name="t.icon" :class="['h-3.5 w-3.5', t.text]" />
                            <span>{{ t.typeLabel }}</span>
                          </button>
                        </UiPopoverContent>
                      </UiPopover>
                    </div>
                    <!-- Multi-day spanning bars -->
                    <div v-if="getLaneSlotsForDay(weekViewRow, dayIdx).length > 0" class="space-y-0.5 mb-1 shrink-0">
                      <div
                        v-for="(slot, laneIdx) in getLaneSlotsForDay(weekViewRow, dayIdx)"
                        :key="laneIdx"
                        class="h-5">
                        <template v-if="slot">
                          <UiHoverCard :open-delay="400" :close-delay="100">
                            <UiHoverCardTrigger as-child>
                              <button
                                :class="[
                                  'h-full w-full text-[10px] font-medium truncate transition-all duration-150',
                                  'hover:brightness-110 hover:shadow-sm',
                                  slot.style.bg, slot.style.text,
                                  slot.isStart ? 'rounded-l-md pl-1.5' : 'pl-0.5',
                                  slot.isEnd ? 'rounded-r-md pr-1.5' : 'pr-0.5',
                                  slot.isWrapStart ? 'rounded-l-sm border-l-2 border-l-dashed pl-1' : '',
                                  slot.isWrapEnd ? 'rounded-r-sm border-r-2 border-r-dashed pr-1' : '',
                                  hoveredMultiDayEventId === slot.event.id ? 'brightness-110 shadow-sm' : '',
                                ]"
                                @mouseenter="hoveredMultiDayEventId = slot.event.id"
                                @mouseleave="hoveredMultiDayEventId = null"
                                @click.stop="openEventDetail(slot.event)">
                                <span v-if="slot.isStart || slot.isWrapStart" class="flex items-center gap-1">
                                  <Icon :name="slot.style.icon" class="h-3 w-3 shrink-0" />
                                  <span class="truncate">{{ slot.event.title }}</span>
                                </span>
                              </button>
                            </UiHoverCardTrigger>
                            <UiHoverCardContent class="w-64 p-3" side="top" :side-offset="4">
                              <div class="space-y-1.5">
                                <h4 class="text-sm font-semibold leading-tight truncate">{{ slot.event.title }}</h4>
                                <div class="flex items-center gap-1.5">
                                  <Icon :name="slot.style.icon" :class="['h-3 w-3 shrink-0', slot.style.text]" />
                                  <span class="text-xs text-muted-foreground capitalize">{{ slot.event.typeLabel || 'Item' }}</span>
                                  <span class="text-xs text-muted-foreground">·</span>
                                  <Icon name="lucide:calendar-days" class="h-3 w-3 opacity-50" />
                                  <span class="text-[11px] text-muted-foreground">{{ formatEventDateRange(slot.event) }}</span>
                                </div>
                                <p v-if="slot.event.description" class="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                                  {{ slot.event.description }}
                                </p>
                                <div v-if="slot.event.status || slot.event.priority" class="flex items-center gap-1.5 pt-0.5">
                                  <span v-if="slot.event.status" :class="['text-[10px] px-1.5 py-0.5 rounded font-medium', slot.event.badgeClass]">
                                    {{ slot.event.status?.replace('-', ' ') }}
                                  </span>
                                  <span v-if="slot.event.priority" class="text-[10px] text-muted-foreground capitalize">
                                    {{ slot.event.priority }}
                                  </span>
                                </div>
                              </div>
                            </UiHoverCardContent>
                          </UiHoverCard>
                        </template>
                        <div v-else class="h-full" />
                      </div>
                    </div>
                    <!-- Single-day items: individual pills with overflow grouping -->
                    <div
                      v-if="getVisibleSingleDayItems(day.date, weekViewRow).length > 0"
                      :class="['flex-1 min-h-0 overflow-hidden space-y-0.5', isDayInPast(day.date) ? 'opacity-50' : '']">
                      <UiHoverCard
                        v-for="item in getVisibleSingleDayItems(day.date, weekViewRow)"
                        :key="item.id"
                        :open-delay="400"
                        :close-delay="100">
                        <UiHoverCardTrigger as-child>
                          <button
                            :draggable="item.typeLabel !== 'GoogleCalendar'"
                            :class="[
                              'w-full flex items-center gap-1 rounded-md text-[11px] font-medium transition-all duration-150',
                              isCompact ? 'px-1 py-0.5 justify-center' : 'px-1.5 py-0.5',
                              'hover:ring-1 hover:ring-primary/30',
                              item.typeLabel !== 'GoogleCalendar' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                              getTypeStyle(item.typeLabel || '').bg,
                              getTypeStyle(item.typeLabel || '').text,
                              recurringItemClasses(item),
                            ]"
                            @dragstart="item.typeLabel !== 'GoogleCalendar' ? onDragStart($event as DragEvent, item) : undefined"
                            @dragend="onDragEnd"
                            @click.stop="openEventDetail(item)">
                            <Icon :name="getTypeStyle(item.typeLabel || '').icon" class="h-3 w-3 shrink-0" />
                            <template v-if="!isCompact">
                              <Icon v-if="hasRecurringInstance(item)" name="lucide:repeat" class="h-2.5 w-2.5 shrink-0 opacity-60" />
                              <span v-if="item.recurrenceIndex" class="text-[9px] opacity-50 shrink-0">#{{ item.recurrenceIndex }}</span>
                              <span class="truncate">{{ item.title }}</span>
                              <Icon v-if="item.typeLabel === 'GoogleCalendar'" name="simple-icons:googlecalendar" class="ml-auto h-2.5 w-2.5 shrink-0 opacity-70" />
                            </template>
                          </button>
                        </UiHoverCardTrigger>
                        <UiHoverCardContent class="w-64 p-3" side="top" :side-offset="4">
                          <div class="space-y-1.5">
                            <h4 class="text-sm font-semibold leading-tight truncate">{{ item.title }}</h4>
                            <div class="flex items-center gap-1.5">
                              <Icon :name="getTypeStyle(item.typeLabel || '').icon" :class="['h-3 w-3 shrink-0', getTypeStyle(item.typeLabel || '').text]" />
                              <span class="text-xs text-muted-foreground">{{ getTypeDisplayLabel(item.typeLabel) }}</span>
                              <template v-if="hasRecurringInstance(item)">
                                <span class="text-xs text-muted-foreground">·</span>
                                <Icon name="lucide:repeat" class="h-3 w-3 opacity-60" />
                                <span class="text-[11px] text-muted-foreground">Occurrence #{{ item.recurrenceIndex }}</span>
                              </template>
                              <span class="text-xs text-muted-foreground">·</span>
                              <Icon name="lucide:calendar-days" class="h-3 w-3 opacity-50" />
                              <span class="text-[11px] text-muted-foreground">{{ formatEventDateRange(item) }}</span>
                            </div>
                            <p v-if="item.description" class="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                              {{ item.description }}
                            </p>
                            <div v-if="item.status || item.priority" class="flex items-center gap-1.5 pt-0.5">
                              <span v-if="item.status" :class="['text-[10px] px-1.5 py-0.5 rounded font-medium', item.badgeClass]">
                                {{ item.status?.replace('-', ' ') }}
                              </span>
                              <span v-if="item.priority" class="text-[10px] text-muted-foreground capitalize">
                                {{ item.priority }}
                              </span>
                            </div>
                          </div>
                        </UiHoverCardContent>
                      </UiHoverCard>
                      <!-- Overflow pill -->
                      <div v-if="getOverflowDayGroup(day.date, weekViewRow)">
                        <button
                          :class="[
                            'w-full flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium transition-all duration-150',
                            'hover:ring-1 hover:ring-primary/30 bg-muted/60 text-foreground',
                          ]"
                          @click.stop="openDayPopover(day.date)">
                          <span class="truncate">{{ getOverflowDayGroup(day.date, weekViewRow)!.items.length }} more</span>
                          <span
                            v-if="getOverflowDayGroup(day.date, weekViewRow)!.urgentCount > 0"
                            class="ml-auto shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                            {{ getOverflowDayGroup(day.date, weekViewRow)!.urgentCount }}
                          </span>
                        </button>
                        <div class="flex h-[3px] rounded-full overflow-hidden mt-0.5 mx-0.5">
                          <div
                            v-for="seg in getOverflowDayGroup(day.date, weekViewRow)!.typeSegments"
                            :key="seg.label"
                            :style="{ flex: seg.count, backgroundColor: seg.color }" />
                        </div>
                      </div>
                    </div>
                    <!-- Per-cell overflow indicator for hidden multi-day events -->
                    <button
                      v-if="(weekViewRow.overflowPerCol[dayIdx] ?? 0) > 0"
                      type="button"
                      class="mt-0.5 text-[10px] text-muted-foreground font-medium hover:text-foreground transition-colors cursor-pointer"
                      @click.stop="openDayPopover(day.date)">
                      +{{ weekViewRow.overflowPerCol[dayIdx] ?? 0 }} more
                    </button>
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
                  class="px-1 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  :class="isCompact ? 'py-1.5' : isMedium ? 'py-2' : 'py-3'">
                  {{ day }}
                </div>
              </div>

              <!-- Month Grid: week-row sub-grids -->
              <div
                class="flex-1 grid min-h-0 overflow-hidden"
                :style="{ gridTemplateRows: `repeat(${weekRows.length}, minmax(0, 1fr))` }">
                <div
                  v-for="(row, rowIdx) in weekRows"
                  :key="rowIdx"
                  class="min-h-0 overflow-hidden">
                  <!-- Day cells grid -->
                  <div class="grid grid-cols-7 h-full">
                    <div
                      v-for="(day, dayIdx) in row.days"
                      :key="dayIdx"
                      :class="[
                        'px-2 py-1.5 border-b border-r border-border/30 relative group/cell flex flex-col overflow-hidden transition-colors',
                        'last:border-r-0 nth-[7n]:border-r-0',
                        !day.isCurrentMonth ? 'bg-muted/20' :
                          day.isToday ? 'bg-primary/5 ring-2 ring-inset ring-primary/30' :
                          isDayInPast(day.date) ? '' : 'bg-card/40',
                        isDragOver(day.date) ? 'bg-primary/10 ring-2 ring-inset ring-primary/50' : '',
                        isHoveredMultiDayCell(day.date) ? 'bg-primary/5' : '',
                      ]"
                      @dragover="(e: DragEvent) => onCellDragOver(e, day.date)"
                      @dragleave="onCellDragLeave"
                      @drop="(e: DragEvent) => onCellDrop(e, day.date)">
                      <!-- Day header: number + hover add button -->
                      <div class="flex items-center justify-between mb-1 shrink-0">
                        <div
                          :class="[
                            day.isToday
                              ? 'w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-semibold'
                              : day.isCurrentMonth
                                ? 'text-[11px] text-muted-foreground font-medium'
                                : 'text-[11px] text-muted-foreground/30',
                          ]">
                          {{ day.date.getDate() }}
                        </div>
                        <!-- Hover '+' button with type picker -->
                        <UiPopover
                          v-if="day.isCurrentMonth"
                          :open="isAddMenuOpen(day.date)"
                          @update:open="(open: boolean) => { addMenuDate = open ? day.date : null }">
                          <UiPopoverTrigger as-child>
                            <button
                              class="h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover/cell:opacity-100 hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                              @click.stop="() => { addMenuDate = day.date }">
                              <Icon name="lucide:plus" class="h-3 w-3" />
                            </button>
                          </UiPopoverTrigger>
                          <UiPopoverContent align="end" side="top" class="w-44 p-1">
                            <button
                              v-for="t in temporalTypeOptions"
                              :key="t.typeLabel"
                              class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted/50 transition-colors"
                              @click="() => { addMenuDate = null; emit('create-request', day.date, t.typeLabel) }">
                              <Icon :name="t.icon" :class="['h-3.5 w-3.5', t.text]" />
                              <span>{{ t.typeLabel }}</span>
                            </button>
                          </UiPopoverContent>
                        </UiPopover>
                      </div>
                      <!-- Multi-day lane slots (bar segments inside each cell) -->
                      <div
                        v-if="getLaneSlotsForDay(row, dayIdx).length"
                        class="-mx-2 mb-1 shrink-0">
                        <div
                          v-for="(slot, li) in getLaneSlotsForDay(row, dayIdx)"
                          :key="`lane-${li}`"
                          class="h-5 mt-0.5">
                          <UiHoverCard v-if="slot" :open-delay="400" :close-delay="100">
                            <UiHoverCardTrigger as-child>
                              <button
                                class="w-full h-full flex items-center gap-1 px-1.5 text-[10px] font-medium truncate cursor-pointer transition-all duration-150 hover:brightness-110 hover:shadow-sm"
                                :class="[
                                  slot.style.bg,
                                  slot.style.text,
                                  slot.isStart ? 'rounded-l-md ml-0.5' : '',
                                  slot.isEnd ? 'rounded-r-md mr-0.5' : '',
                                  hoveredMultiDayEventId === slot.event.id ? 'brightness-110 shadow-sm' : '',
                                ]"
                                :style="{
                                  maskImage: slot.isWrapStart && slot.isWrapEnd
                                    ? 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)'
                                    : slot.isWrapStart
                                      ? 'linear-gradient(to right, transparent, black 16px)'
                                      : slot.isWrapEnd
                                        ? 'linear-gradient(to left, transparent, black 16px)'
                                        : undefined,
                                }"
                                @mouseenter="hoveredMultiDayEventId = slot.event.id"
                                @mouseleave="hoveredMultiDayEventId = null"
                                @click.stop="openEventDetail(slot.event)">
                                <Icon v-if="slot.isStart || slot.isWrapStart" :name="slot.style.icon" class="h-3 w-3 shrink-0" />
                                <span v-if="slot.isStart || slot.isWrapStart" class="truncate">{{ slot.event.title }}</span>
                              </button>
                            </UiHoverCardTrigger>
                            <UiHoverCardContent class="w-64 p-3" side="top" :side-offset="4">
                              <div class="space-y-1.5">
                                <h4 class="text-sm font-semibold leading-tight truncate">{{ slot.event.title }}</h4>
                                <div class="flex items-center gap-1.5">
                                  <Icon :name="slot.style.icon" :class="['h-3 w-3 shrink-0', slot.style.text]" />
                                  <span class="text-xs text-muted-foreground capitalize">{{ slot.event.typeLabel || 'Item' }}</span>
                                  <span class="text-xs text-muted-foreground">·</span>
                                  <Icon name="lucide:calendar-days" class="h-3 w-3 opacity-50" />
                                  <span class="text-[11px] text-muted-foreground">{{ formatEventDateRange(slot.event) }}</span>
                                </div>
                                <p v-if="slot.event.description" class="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                                  {{ slot.event.description }}
                                </p>
                                <div v-if="slot.event.status || slot.event.priority" class="flex items-center gap-1.5 pt-0.5">
                                  <span v-if="slot.event.status" :class="['text-[10px] px-1.5 py-0.5 rounded font-medium', slot.event.badgeClass]">
                                    {{ slot.event.status?.replace('-', ' ') }}
                                  </span>
                                  <span v-if="slot.event.priority" class="text-[10px] text-muted-foreground capitalize">
                                    {{ slot.event.priority }}
                                  </span>
                                </div>
                              </div>
                            </UiHoverCardContent>
                          </UiHoverCard>
                        </div>
                      </div>
                      <!-- Single-day items: individual pills with overflow grouping -->
                      <div
                        v-if="getVisibleSingleDayItems(day.date, row).length > 0"
                        :class="['flex-1 min-h-0 overflow-hidden space-y-0.5', isDayInPast(day.date) ? 'opacity-50' : '']">
                        <!-- Individual item pills -->
                        <UiHoverCard
                          v-for="item in getVisibleSingleDayItems(day.date, row)"
                          :key="item.id"
                          :open-delay="400"
                          :close-delay="100">
                          <UiHoverCardTrigger as-child>
                            <button
                              :draggable="item.typeLabel !== 'GoogleCalendar'"
                              :class="[
                                'w-full flex items-center gap-1 rounded-md text-[11px] font-medium transition-all duration-150',
                                isCompact ? 'px-1 py-0.5 justify-center' : 'px-1.5 py-0.5',
                                'hover:ring-1 hover:ring-primary/30',
                                item.typeLabel !== 'GoogleCalendar' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                                getTypeStyle(item.typeLabel || '').bg,
                                getTypeStyle(item.typeLabel || '').text,
                                recurringItemClasses(item),
                              ]"
                              @dragstart="item.typeLabel !== 'GoogleCalendar' ? onDragStart($event as DragEvent, item) : undefined"
                              @dragend="onDragEnd"
                              @click.stop="openEventDetail(item)">
                              <Icon :name="getTypeStyle(item.typeLabel || '').icon" class="h-3 w-3 shrink-0" />
                              <template v-if="!isCompact">
                                <Icon v-if="hasRecurringInstance(item)" name="lucide:repeat" class="h-2.5 w-2.5 shrink-0 opacity-60" />
                                <span v-if="item.recurrenceIndex" class="text-[9px] opacity-50 shrink-0">#{{ item.recurrenceIndex }}</span>
                                <span class="truncate">{{ item.title }}</span>
                                <Icon v-if="item.typeLabel === 'GoogleCalendar'" name="simple-icons:googlecalendar" class="ml-auto h-2.5 w-2.5 shrink-0 opacity-70" />
                              </template>
                            </button>
                          </UiHoverCardTrigger>
                          <UiHoverCardContent class="w-64 p-3" side="top" :side-offset="4">
                            <div class="space-y-1.5">
                              <h4 class="text-sm font-semibold leading-tight truncate">{{ item.title }}</h4>
                              <div class="flex items-center gap-1.5">
                                <Icon :name="getTypeStyle(item.typeLabel || '').icon" :class="['h-3 w-3 shrink-0', getTypeStyle(item.typeLabel || '').text]" />
                                <span class="text-xs text-muted-foreground">{{ getTypeDisplayLabel(item.typeLabel) }}</span>
                                <template v-if="hasRecurringInstance(item)">
                                  <span class="text-xs text-muted-foreground">·</span>
                                  <Icon name="lucide:repeat" class="h-3 w-3 opacity-60" />
                                  <span class="text-[11px] text-muted-foreground">Occurrence #{{ item.recurrenceIndex }}</span>
                                </template>
                                <span class="text-xs text-muted-foreground">·</span>
                                <Icon name="lucide:calendar-days" class="h-3 w-3 opacity-50" />
                                <span class="text-[11px] text-muted-foreground">{{ formatEventDateRange(item) }}</span>
                              </div>
                              <p v-if="item.description" class="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                                {{ item.description }}
                              </p>
                              <div v-if="item.status || item.priority" class="flex items-center gap-1.5 pt-0.5">
                                <span v-if="item.status" :class="['text-[10px] px-1.5 py-0.5 rounded font-medium', item.badgeClass]">
                                  {{ item.status?.replace('-', ' ') }}
                                </span>
                                <span v-if="item.priority" class="text-[10px] text-muted-foreground capitalize">
                                  {{ item.priority }}
                                </span>
                              </div>
                            </div>
                          </UiHoverCardContent>
                        </UiHoverCard>
                        <!-- Overflow: unified "N more" pill with segmented color bar + rich hover preview -->
                        <UiHoverCard
                          v-if="getOverflowDayGroup(day.date, row)"
                          :open-delay="300"
                          :close-delay="150">
                          <UiHoverCardTrigger as-child>
                            <div class="w-full">
                              <button
                                :class="[
                                  'w-full flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium transition-all duration-150',
                                  'hover:ring-1 hover:ring-primary/30 bg-muted/60 text-foreground',
                                ]"
                                @click.stop="openDayPopover(day.date)">
                                <span class="truncate">{{ getOverflowDayGroup(day.date, row)!.items.length }} more</span>
                                <span
                                  v-if="getOverflowDayGroup(day.date, row)!.urgentCount > 0"
                                  class="ml-auto shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                                  {{ getOverflowDayGroup(day.date, row)!.urgentCount }}
                                </span>
                              </button>
                              <!-- Segmented color bar -->
                              <div class="flex h-[3px] rounded-full overflow-hidden mt-0.5 mx-0.5">
                                <div
                                  v-for="seg in getOverflowDayGroup(day.date, row)!.typeSegments"
                                  :key="seg.label"
                                  :style="{ flex: seg.count, backgroundColor: seg.color }" />
                              </div>
                            </div>
                          </UiHoverCardTrigger>
                          <UiHoverCardContent class="w-72 p-0 max-h-80 overflow-hidden" side="top" :side-offset="4">
                            <!-- Header -->
                            <div class="px-3 py-2 border-b border-border bg-muted/30">
                              <p class="text-xs font-semibold">{{ formatDate(day.date) }}</p>
                              <p class="text-[10px] text-muted-foreground">
                                {{ getDayGroup(day.date)?.items.length || 0 }}
                                {{ (getDayGroup(day.date)?.items.length || 0) === 1 ? 'item' : 'items' }}
                              </p>
                            </div>
                            <!-- Type-grouped items -->
                            <div class="overflow-y-auto max-h-64 p-1">
                              <template
                                v-for="group in getSingleDayTypeGroups(day.date)"
                                :key="group.typeLabel">
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
                                    <p class="text-xs font-medium truncate group-hover/item:text-primary transition-colors">
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
                          </UiHoverCardContent>
                        </UiHoverCard>
                      </div>
                      <!-- Per-cell overflow indicator for hidden multi-day events -->
                      <button
                        v-if="(row.overflowPerCol[dayIdx] ?? 0) > 0"
                        type="button"
                        class="mt-0.5 text-[10px] text-muted-foreground font-medium hover:text-foreground transition-colors cursor-pointer"
                        @click.stop="openDayPopover(day.date)">
                        +{{ row.overflowPerCol[dayIdx] ?? 0 }} more
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Year View -->
            <div v-else-if="calendarViewMode === 'year'" :key="`year-${currentYear}`" class="h-full overflow-auto">
              <div
                class="grid gap-4 p-6 h-full"
                :style="{ gridTemplateColumns: `repeat(${isCompact ? 2 : isMedium ? 3 : 4}, minmax(0, 1fr))` }">
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
                              ? day.hasRecurring
                                ? 'text-violet-700 dark:text-violet-300 font-semibold ring-1 ring-violet-500/40'
                                : 'text-foreground font-medium'
                              : 'text-foreground/70'
                            : 'text-muted-foreground/30',
                      ]">
                      {{ day.day }}
                      <!-- Event indicator dot -->
                      <span
                        v-if="day.hasEvents && day.isCurrentMonth && !day.isToday"
                        :class="[
                          'absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
                          day.hasRecurring ? 'bg-violet-500' : 'bg-primary',
                        ]" />
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
