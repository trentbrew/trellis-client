<script lang="ts" setup>
  import type {
    Entity,
    EntityType,
    TaskStatus,
    Priority,
    Urgency,
    RecurrenceRule,
    EventType,
    PropertyFieldId,
  } from '~/types/entity'
  import {
    ENTITY_TYPE_OPTIONS,
    PRIORITY_OPTIONS,
    URGENCY_OPTIONS,
    CATEGORY_OPTIONS,
    EVENT_TYPE_OPTIONS,
    TASK_STATUS_OPTIONS,
    PAYMENT_STATUS_OPTIONS,
    TRIP_STATUS_OPTIONS,
    TRANSPORT_OPTIONS,
    SPRINT_STATUS_OPTIONS,
    BUDGET_STATUS_OPTIONS,
    CURRENCY_OPTIONS,
    createDefaultItem,
  } from '~/types/entity'
  import { useEntityFormulas } from '~/composables/useEntityFormulas'
  import { typeHasField } from '~/config/entityRegistry'
  import { useComments } from '~/composables/useComments'
  import { extractYmd, formatYmdLocal, parseYmdLocal, todayYmdLocal } from '~/utils/date'

  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')
  const { user: currentUser } = useInstantAuth()

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'view' | 'create' | 'edit'
      itemType?: EntityType
      item?: Entity | null
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
      owners?: { id: string; name: string }[]
      folders?: string[]
      defaultStartDate?: string
    }>(),
    {
      mode: 'edit',
      itemType: 'task',
      item: null,
      canNavigatePrev: false,
      canNavigateNext: false,
      owners: () => [],
      folders: () => [],
      defaultStartDate: undefined,
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    save: [item: Entity]
    delete: [item: Entity]
    edit: []
    navigatePrev: []
    navigateNext: []
  }>()

  const { applyFormulas } = useEntityFormulas()

  const mode = computed(() => props.mode)
  const isViewMode = computed(() => mode.value === 'view')
  const isCreateMode = computed(() => mode.value === 'create')
  const isEditMode = computed(() => mode.value === 'edit')

  // Use `any` because Vue's Reactive wrapper doesn't support discriminated-union narrowing in templates.
  // Runtime type guards (isTask, isEvent, …) ensure correctness.
  const editableItem: any = reactive(createDefaultItem(props.itemType || 'task'))

  const hasField = (fieldId: PropertyFieldId): boolean => {
    try {
      return typeHasField(editableItem.type, fieldId)
    } catch {
      return false
    }
  }

  // Track which entity ID is currently loaded into editableItem.
  // We only do a full overwrite when the entity ID changes (switching entities)
  // or on first load. While the dialog is open in edit mode, local state is
  // authoritative — subscription echoes of our own saves must NOT clobber edits.
  const _loadedItemId = ref<string | null>(null)

  watch(
    () => props.item?.id,
    (newId, _oldId) => {
      if (newId && newId !== _loadedItemId.value) {
        // Different entity (or first load) — full hydrate
        const newItem = props.item!
        const defaults = createDefaultItem(newItem.type)
        Object.assign(editableItem, { ...defaults, ...newItem })
        _loadedItemId.value = newId
      } else if (!newId && isCreateMode.value) {
        const defaults = createDefaultItem(props.itemType || 'task')
        Object.assign(editableItem, { ...defaults })
        _loadedItemId.value = null
      }
    },
    { immediate: true },
  )

  watch(
    () => [editableItem.startDate, editableItem.category, editableItem.type],
    () => {
      if (!isCreateMode.value) applyFormulas(editableItem)
    },
    { deep: true },
  )

  // Comments composable — wired to current item's ID
  const currentEntityId = computed(() => editableItem.id || undefined)
  const {
    displayActivity,
    addComment: persistComment,
    loading: commentsLoading,
  } = useComments(currentEntityId)

  // UI State
  const newComment = ref('')
  const typeOpen = ref(false)
  const categoryOpen = ref(false)
  const ownerOpen = ref(false)
  const involvedOpen = ref(false)
  const folderOpen = ref(false)
  const priorityOpen = ref(false)
  const urgencyOpen = ref(false)
  const schedulePanelOpen = ref(true)
  const taskStatusOpen = ref(false)
  const ownerSearch = ref('')
  const folderSearch = ref('')
  const involvedSearch = ref('')
  const entityPickerOpen = ref(false)
  const entityPickerFilterType = ref<string | undefined>(undefined)

  // Sidebar state
  const rightSidebarTab = ref<'references' | 'activity'>('references')
  const leftSidebarW = ref(288)
  const rightSidebarW = ref(288)
  const isResizingSidebar = ref(false)

  const startSidebarResize = (side: 'left' | 'right', e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    isResizingSidebar.value = true
    const startX = e.clientX
    const startW = side === 'left' ? leftSidebarW.value : rightSidebarW.value
    document.body.style.cursor = 'ew-resize'
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const newW = Math.max(200, Math.min(480, startW + (side === 'left' ? dx : -dx)))
      if (side === 'left') leftSidebarW.value = newW
      else rightSidebarW.value = newW
    }
    const onUp = () => {
      isResizingSidebar.value = false
      document.body.style.cursor = ''
      el.releasePointerCapture(e.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  // Type-specific property pill popover states
  const paymentStatusOpen = ref(false)
  const amountOpen = ref(false)
  const payeeOpen = ref(false)
  const invoiceNumberOpen = ref(false)
  const tripStatusOpen = ref(false)
  const originOpen = ref(false)
  const destinationOpen = ref(false)
  const transportationOpen = ref(false)
  const tripBudgetOpen = ref(false)
  const confirmationNumberOpen = ref(false)
  const sprintStatusOpen = ref(false)
  const velocityOpen = ref(false)
  const sprintGoalOpen = ref(false)
  const projectIdOpen = ref(false)
  const budgetAmountOpen = ref(false)
  const budgetStatusOpen = ref(false)
  const metricOpen = ref(false)
  const targetDateOpen = ref(false)
  const currentValueOpen = ref(false)
  const targetValueOpen = ref(false)
  const locationOpen = ref(false)
  const eventSubtypeOpen = ref(false)

  const owners = computed(() => props.owners ?? [])
  const folders = computed(() => props.folders ?? [])
  const isOwnerUnset = computed(() => !editableItem.owner)
  const isFolderUnset = computed(() => !editableItem.folder)
  const isInvolvedUnset = computed(() => !editableItem.involved?.length)

  const filteredOwners = computed(() => {
    let list = owners.value
    if (ownerSearch.value) {
      const s = ownerSearch.value.toLowerCase()
      list = list.filter((o) => o.name.toLowerCase().includes(s))
    }
    // Sort current user first
    if (currentUser.value?.id) {
      const uid = currentUser.value.id
      list = [...list].sort((a, b) => (a.id === uid ? -1 : b.id === uid ? 1 : 0))
    }
    return list
  })

  const filteredFolders = computed(() => {
    if (!folderSearch.value) return folders.value
    const s = folderSearch.value.toLowerCase()
    return folders.value.filter((f) => f.toLowerCase().includes(s))
  })

  const filteredInvolvedOwners = computed(() => {
    if (!involvedSearch.value) return owners.value
    const s = involvedSearch.value.toLowerCase()
    return owners.value.filter((o) => o.name.toLowerCase().includes(s))
  })

  const currentType = computed(() => ENTITY_TYPE_OPTIONS.find((t) => t.value === editableItem.type))
  const currentPriority = computed(() => PRIORITY_OPTIONS.find((p) => p.value === editableItem.priority))
  const currentUrgency = computed(() => URGENCY_OPTIONS.find((u) => u.value === editableItem.urgency))
  const currentCategory = computed(() => CATEGORY_OPTIONS.find((c) => c.value === editableItem.category))

  const isFormValid = computed(() => !!editableItem.title?.trim())

  // Recurrence
  type RepeatPreset = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'weekdays' | 'custom' | 'none'
  const selectedRepeat = ref<RepeatPreset>('none')
  const repeatPresets: { value: RepeatPreset; label: string; sub?: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'weekdays', label: 'Every Weekday', sub: '(Mon-Fri)' },
    { value: 'custom', label: 'Custom' },
  ]
  const repeatCustom = reactive({
    interval: 1,
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    weekdays: [] as number[], // 0=Sun..6=Sat
    endMode: 'never' as 'never' | 'after' | 'on',
    occurrences: 10,
    endDate: '',
  })
  const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const FREQUENCY_OPTIONS = [
    { value: 'daily', label: 'day(s)' },
    { value: 'weekly', label: 'week(s)' },
    { value: 'monthly', label: 'month(s)' },
    { value: 'yearly', label: 'year(s)' },
  ]

  const selectRepeat = (p: RepeatPreset) => {
    selectedRepeat.value = p
    if (p === 'none') {
      editableItem.recurrence = undefined
    } else if (p === 'custom') {
      editableItem.recurrence = {
        frequency: 'custom',
        interval: repeatCustom.interval,
        weekdays: repeatCustom.weekdays.length ? repeatCustom.weekdays : undefined,
        endDate: repeatCustom.endMode === 'on' ? repeatCustom.endDate : undefined,
        occurrences: repeatCustom.endMode === 'after' ? repeatCustom.occurrences : undefined,
      }
    } else {
      editableItem.recurrence = { frequency: p } as RecurrenceRule
    }
  }

  // Sync repeatCustom changes back to editableItem.recurrence
  watch(
    repeatCustom,
    () => {
      if (selectedRepeat.value === 'custom') {
        editableItem.recurrence = {
          frequency: 'custom',
          interval: repeatCustom.interval,
          weekdays: repeatCustom.weekdays.length ? repeatCustom.weekdays : undefined,
          endDate: repeatCustom.endMode === 'on' ? repeatCustom.endDate : undefined,
          occurrences: repeatCustom.endMode === 'after' ? repeatCustom.occurrences : undefined,
        }
      }
    },
    { deep: true },
  )

  const toggleWeekday = (day: number) => {
    const idx = repeatCustom.weekdays.indexOf(day)
    if (idx >= 0) repeatCustom.weekdays.splice(idx, 1)
    else repeatCustom.weekdays.push(day)
  }

  // Reminder
  type ReminderPreset = 'none' | 'on-the-day' | '1-day-early' | '2-days-early' | '1-week-early' | 'custom'
  const selectedReminder = ref<ReminderPreset>('none')
  const reminderPresets: { value: ReminderPreset; label: string; time?: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'on-the-day', label: 'On the day', time: '09:00' },
    { value: '1-day-early', label: '1 day early', time: '09:00' },
    { value: '2-days-early', label: '2 days early', time: '09:00' },
    { value: '1-week-early', label: '1 week early', time: '09:00' },
    { value: 'custom', label: 'Custom' },
  ]
  const reminderCustom = reactive({ daysInAdvance: 1, time: '09:00' })

  const repeatOpen = ref(false)
  const reminderOpen = ref(false)

  // Schedule sidebar: Start/End segmented toggle
  const scheduleTab = ref<'start' | 'end'>('start')

  const combineDateAndTime = (ymd: string, time?: string): Date | null => {
    const base = parseYmdLocal(ymd)
    if (!base) return null
    if (!time) return base
    const [h, m] = time.split(':').map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return base
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m)
  }

  const calendarModel: any = computed({
    get: () => {
      const ymd = extractYmd(editableItem.startDate)
      if (!ymd) return undefined
      return editableItem.allDay
        ? parseYmdLocal(ymd) ?? undefined
        : combineDateAndTime(ymd, editableItem.startTime) ?? undefined
    },
    set: (v: Date | string | undefined) => {
      if (!v) {
        editableItem.startDate = ''
        return
      }
      const d = v instanceof Date ? v : new Date(v)
      editableItem.startDate = formatYmdLocal(d)
      // Extract time
      if (!editableItem.allDay) {
        editableItem.startTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      }
      // Auto-set end = start + 1h if no end yet
      if (!editableItem.endDate && hasField('endDate')) {
        const end = new Date(d.getTime() + 60 * 60 * 1000)
        editableItem.endDate = formatYmdLocal(end)
        if (!editableItem.allDay) {
          editableItem.endTime = end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        }
      }
    },
  })

  const endCalendarModel: any = computed({
    get: () => {
      const ymd = extractYmd(editableItem.endDate)
      if (!ymd) return undefined
      return editableItem.allDay
        ? parseYmdLocal(ymd) ?? undefined
        : combineDateAndTime(ymd, editableItem.endTime) ?? undefined
    },
    set: (v: Date | string | undefined) => {
      if (!v) {
        editableItem.endDate = undefined
        return
      }
      const d = v instanceof Date ? v : new Date(v)
      editableItem.endDate = formatYmdLocal(d)
      if (!editableItem.allDay) {
        editableItem.endTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      }
    },
  })

  // Active calendar model based on selected tab
  const activeCalendarModel = computed({
    get: () => (scheduleTab.value === 'start' ? calendarModel.value : endCalendarModel.value),
    set: (v: any) => {
      if (scheduleTab.value === 'start') calendarModel.value = v
      else endCalendarModel.value = v
    },
  })

  // Formatted summaries for the inactive tab
  const startSummary = computed(() => {
    if (!editableItem.startDate) return 'Not set'
    const d = combineDateAndTime(extractYmd(editableItem.startDate), editableItem.allDay ? undefined : editableItem.startTime)
    if (!d) return 'Not set'
    return editableItem.allDay
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + (editableItem.startTime || '')
  })
  const endSummary = computed(() => {
    if (!editableItem.endDate) return 'Not set'
    const d = combineDateAndTime(extractYmd(editableItem.endDate), editableItem.allDay ? undefined : editableItem.endTime)
    if (!d) return 'Not set'
    return editableItem.allDay
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + (editableItem.endTime || '')
  })

  // Picker mode based on allDay
  const pickerMode = computed(() => (editableItem.allDay ? 'date' : 'dateTime'))

  // ── Mini calendar attributes (today, past dimming, repeat dots, multi-day range) ──
  const datePickerAttributes = computed(() => {
    const attrs: any[] = []
    const now = new Date()
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // 1. Today indicator
    attrs.push({
      key: 'today',
      dates: [todayDate],
      dot: { color: 'blue' },
    })

    // 2. Past days dimming
    const yesterday = new Date(todayDate)
    yesterday.setDate(yesterday.getDate() - 1)
    attrs.push({
      key: 'past-days',
      dates: { end: yesterday },
      content: { style: { opacity: 0.4 } },
    })

    // 3. Multi-day range highlight (start → end)
    const start = extractYmd(editableItem.startDate) ? parseYmdLocal(extractYmd(editableItem.startDate)) : null
    const end = extractYmd(editableItem.endDate) ? parseYmdLocal(extractYmd(editableItem.endDate)) : null
    if (start && end && start.getTime() !== end.getTime()) {
      attrs.push({
        key: 'multi-day-range',
        dates: { start, end },
        highlight: {
          start: { fillMode: 'solid', color: 'orange' },
          base: { fillMode: 'light', color: 'orange' },
          end: { fillMode: 'solid', color: 'orange' },
        },
      })
    }

    // 4. Recurrence dots
    const recurrence = editableItem.recurrence
    if (recurrence && start) {
      const repeatDates: Date[] = []
      const startD = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      // Generate dots for a 90-day window from start
      const windowEnd = new Date(startD)
      windowEnd.setDate(windowEnd.getDate() + 90)

      const freq = recurrence.frequency
      if (freq === 'daily') {
        const cursor = new Date(startD)
        const interval = recurrence.interval || 1
        while (cursor <= windowEnd) {
          repeatDates.push(new Date(cursor))
          cursor.setDate(cursor.getDate() + interval)
        }
      } else if (freq === 'weekly') {
        const interval = recurrence.interval || 1
        const weekdays = recurrence.weekdays?.length ? recurrence.weekdays : [startD.getDay()]
        const cursor = new Date(startD)
        // Align to start of week (Sunday)
        cursor.setDate(cursor.getDate() - cursor.getDay())
        while (cursor <= windowEnd) {
          for (const wd of weekdays) {
            const d = new Date(cursor)
            d.setDate(d.getDate() + wd)
            if (d >= startD && d <= windowEnd) repeatDates.push(d)
          }
          cursor.setDate(cursor.getDate() + 7 * interval)
        }
      } else if (freq === 'weekdays') {
        const cursor = new Date(startD)
        while (cursor <= windowEnd) {
          const dow = cursor.getDay()
          if (dow >= 1 && dow <= 5) repeatDates.push(new Date(cursor))
          cursor.setDate(cursor.getDate() + 1)
        }
      } else if (freq === 'monthly') {
        const interval = recurrence.interval || 1
        const cursor = new Date(startD)
        while (cursor <= windowEnd) {
          repeatDates.push(new Date(cursor))
          cursor.setMonth(cursor.getMonth() + interval)
        }
      } else if (freq === 'quarterly') {
        const interval = recurrence.interval || 1
        const cursor = new Date(startD)
        while (cursor <= windowEnd) {
          repeatDates.push(new Date(cursor))
          cursor.setMonth(cursor.getMonth() + 3 * interval)
        }
      } else if (freq === 'yearly') {
        const cursor = new Date(startD)
        while (cursor <= windowEnd) {
          repeatDates.push(new Date(cursor))
          cursor.setFullYear(cursor.getFullYear() + 1)
        }
      } else if (freq === 'custom' && recurrence.weekdays?.length) {
        const interval = recurrence.interval || 1
        const cursor = new Date(startD)
        cursor.setDate(cursor.getDate() - cursor.getDay())
        while (cursor <= windowEnd) {
          for (const wd of recurrence.weekdays) {
            const d = new Date(cursor)
            d.setDate(d.getDate() + wd)
            if (d >= startD && d <= windowEnd) repeatDates.push(d)
          }
          cursor.setDate(cursor.getDate() + 7 * interval)
        }
      }

      if (repeatDates.length > 0) {
        attrs.push({
          key: 'recurrence-dots',
          dates: repeatDates,
          dot: { color: 'orange' },
        })
      }
    }

    return attrs
  })

  watch(
    () => props.item,
    (newItem) => {
      if (newItem) {
        selectedRepeat.value = (editableItem.recurrence?.frequency || 'none') as any
        selectedReminder.value = 'none'
      } else if (isCreateMode.value) {
        selectedRepeat.value = 'none'
        selectedReminder.value = 'none'
      }
      repeatOpen.value = false
      reminderOpen.value = false
    },
    { immediate: true },
  )

  const initBlankCreateItem = () => {
    const defaults = createDefaultItem(props.itemType || 'task')
    Object.assign(editableItem, {
      ...defaults,
      id: '',
      title: '',
      description: '',
      startDate: props.defaultStartDate || '',
      endDate: undefined,
      allDay: false,
      startTime: undefined,
      endTime: undefined,
      priority: undefined,
      urgency: undefined,
      priorityOverride: false,
      urgencyOverride: false,
      category: '',
      reminders: [],
      recurrence: undefined,
      owner: undefined,
      involved: [],
      tags: [],
      folder: undefined,
    })

    selectedRepeat.value = 'none'
    selectedReminder.value = 'none'
    repeatOpen.value = false
    reminderOpen.value = false
    schedulePanelOpen.value = false
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen && isCreateMode.value && !props.item) initBlankCreateItem()
      else if (isOpen) schedulePanelOpen.value = true
    },
  )

  watch(
    () => schedulePanelOpen.value,
    (isOpen) => {
      if (isOpen) {
        repeatOpen.value = false
        reminderOpen.value = false
      }
    },
  )

  // Schedule display
  const scheduleDescription = computed(() => {
    if (!editableItem.startDate) {
      return {
        scheduleText: 'Unscheduled',
        statusText: '',
        isOverdue: false,
        isRecurring: false,
      }
    }
    const start = combineDateAndTime(extractYmd(editableItem.startDate), editableItem.allDay ? undefined : editableItem.startTime)
    if (!start) {
      return {
        scheduleText: 'Unscheduled',
        statusText: '',
        isOverdue: false,
        isRecurring: false,
      }
    }
    const now = new Date()
    const diffDays = Math.ceil((start.getTime() - now.getTime()) / 86_400_000)
    const repeat = editableItem.recurrence?.frequency || 'none'

    let scheduleText = ''
    if (repeat === 'daily') scheduleText = 'Every day'
    else if (repeat === 'weekly') scheduleText = `Every ${start.toLocaleDateString('en-US', { weekday: 'long' })}`
    else if (repeat === 'monthly') {
      const d = start.getDate()
      scheduleText = `Every ${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of the month`
    } else if (repeat === 'quarterly') {
      scheduleText = 'Every quarter'
    } else if (repeat === 'yearly') {
      scheduleText = `Every year on ${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
    } else {
      scheduleText = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    let statusText = ''
    if (diffDays < 0) statusText = `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`
    else if (diffDays === 0) statusText = 'Today'
    else if (diffDays === 1) statusText = 'Tomorrow'
    else if (diffDays <= 7) statusText = `In ${diffDays} days`
    else statusText = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    return { scheduleText, statusText, isOverdue: diffDays < 0, isRecurring: repeat !== 'none' && !!repeat }
  })

  // Event temporal status (Upcoming / In progress / X days ago)
  const eventTemporalStatus = computed(() => {
    if (editableItem.type !== 'event' || !editableItem.startDate) return null
    const startDate = combineDateAndTime(extractYmd(editableItem.startDate), editableItem.allDay ? undefined : editableItem.startTime)
    if (!startDate) return null

    const now = new Date()
    const endRaw = editableItem.endDate ? extractYmd(editableItem.endDate) : null
    const endDate = endRaw ? combineDateAndTime(endRaw, editableItem.allDay ? undefined : editableItem.endTime) : null

    // Use end-of-day for all-day events
    const effectiveEnd = endDate || new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59)

    if (now < startDate) {
      return { label: 'Upcoming', icon: 'lucide:calendar-clock', colorClass: 'bg-blue-500/15 text-blue-600' }
    }
    if (now <= effectiveEnd) {
      return { label: 'In progress', icon: 'lucide:radio', colorClass: 'bg-emerald-500/15 text-emerald-600' }
    }
    const daysAgo = Math.floor((now.getTime() - effectiveEnd.getTime()) / 86_400_000)
    if (daysAgo === 0) return { label: 'Ended today', icon: 'lucide:clock', colorClass: 'bg-muted/50 text-muted-foreground' }
    if (daysAgo === 1) return { label: 'Yesterday', icon: 'lucide:clock', colorClass: 'bg-muted/50 text-muted-foreground' }
    return { label: `${daysAgo} days ago`, icon: 'lucide:clock', colorClass: 'bg-muted/50 text-muted-foreground' }
  })

  // People
  const toggleInvolvedUser = (uid: string) => {
    const i = editableItem.involved.indexOf(uid)
    if (i === -1) {
      editableItem.involved.push(uid)
    } else {
      editableItem.involved.splice(i, 1)
    }
  }

  // Priority/Urgency override
  const setPriority = (v: Priority) => {
    editableItem.priority = v
    editableItem.priorityOverride = true
    priorityOpen.value = false
  }
  const resetPriority = () => {
    editableItem.priorityOverride = false
    applyFormulas(editableItem)
    priorityOpen.value = false
  }
  const setUrgency = (v: Urgency) => {
    editableItem.urgency = v
    editableItem.urgencyOverride = true
    urgencyOpen.value = false
  }
  const resetUrgency = () => {
    editableItem.urgencyOverride = false
    applyFormulas(editableItem)
    urgencyOpen.value = false
  }

  // Format timestamps as relative time (e.g. "2m ago", "3h ago", "Jan 5")
  const formatRelativeTime = (timestamp: number): string => {
    if (!timestamp) return ''
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Actions
  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }
  const handleSave = () => {
    if (!editableItem.startDate) {
      editableItem.startDate = todayYmdLocal(new Date())
    }

    // Ensure required fields are set without auto-populating the create form UI.
    if (!editableItem.priority) editableItem.priority = 'medium'
    if (!editableItem.urgency) editableItem.urgency = 'not-urgent'

    if (!isCreateMode.value) applyFormulas(editableItem)
    emit('save', { ...editableItem } as Entity)
    closeDialog()
  }
  const handleDelete = () => {
    emit('delete', { ...editableItem } as Entity)
    closeDialog()
  }
  // Auto-save in edit mode
  const { status: saveStatus, formatLastSaved } = useAutoSave(editableItem, {
    enabled: isEditMode,
    beforeSave: (item) => {
      if (!item.startDate) item.startDate = todayYmdLocal(new Date())
      if (!item.priority) item.priority = 'medium'
      if (!item.urgency) item.urgency = 'not-urgent'
      applyFormulas(item)
    },
  })

  // Sync inline @mentions → TQL 'mentions' links
  useMentionLinks(editableItem)

  // Sync inline images → content-derived FileReference entries
  useImageLinks(editableItem)

  // Bidirectional entity references
  const { addEntityRef, removeRef: removeEntityRef, openEntityRef: handleOpenEntityRef, createAndOpenEntityRef } = useEntityReferences(editableItem)
  const handleAddEntityRef = (ref: import('~/types/entity').EntityReference) => addEntityRef(ref)
  const handleCreatedEntityRef = (ref: import('~/types/entity').EntityReference) => createAndOpenEntityRef(ref)
  const handleRemoveRef = (refId: string) => removeEntityRef(refId)
  const handleAddComment = async () => {
    if (newComment.value.trim()) {
      await persistComment(newComment.value.trim())
      newComment.value = ''
    }
  }

  const hasVisibleProperties = computed(() => {
    if (hasField('startDate')) return true
    if (hasField('status')) return true
    if (hasField('priority')) return true
    if (hasField('urgency')) return true
    if (hasField('category')) return true
    if (hasField('owner')) return true
    if (hasField('involved')) return true
    if (hasField('folder')) return true
    // Type-specific fields
    if (hasField('paymentStatus')) return true
    if (hasField('tripStatus')) return true
    if (hasField('sprintStatus')) return true
    if (hasField('budgetStatus')) return true
    if (hasField('achieved')) return true
    if (hasField('metric')) return true
    if (hasField('location')) return true
    if (hasField('eventSubtype')) return true
    return false
  })

  const switchType = (newType: EntityType) => {
    const keep = {
      id: editableItem.id,
      title: editableItem.title,
      description: editableItem.description,
      startDate: editableItem.startDate,
      endDate: editableItem.endDate,
      allDay: editableItem.allDay,
      startTime: editableItem.startTime,
      endTime: editableItem.endTime,
      priority: editableItem.priority,
      urgency: editableItem.urgency,
      priorityOverride: editableItem.priorityOverride,
      urgencyOverride: editableItem.urgencyOverride,
      reminders: Array.isArray(editableItem.reminders) ? [...editableItem.reminders] : [],
      recurrence: editableItem.recurrence,
      tags: [...editableItem.tags],
      category: editableItem.category,
      owner: editableItem.owner,
      involved: [...editableItem.involved],
    }
    const defaults = createDefaultItem(newType)
    Object.assign(editableItem, { ...defaults, ...keep })
    typeOpen.value = false
  }
</script>

<template>
  <EntityDialogShell
    :open="open"
    :title="editableItem.title"
    :description="editableItem.description"
    :mode="mode"
    :entity-id="editableItem.id || undefined"
    :type-badge="currentType ? { icon: currentType.icon, label: currentType.label } : undefined"
    :title-placeholder="`${currentType?.label || 'Item'} name...`"
    :can-navigate-prev="canNavigatePrev"
    :can-navigate-next="canNavigateNext"
    :dialog-title="
      isCreateMode ? `New ${currentType?.label || 'Item'}` : editableItem.title || currentType?.label || 'Item'
    "
    :dialog-description="
      isCreateMode
        ? `Create a new ${currentType?.label?.toLowerCase()}.`
        : `View and edit ${currentType?.label?.toLowerCase()} details.`
    "
    @update:open="emit('update:open', $event)"
    @update:title="editableItem.title = $event"
    @update:description="editableItem.description = $event"
    @close="closeDialog"
    @navigate-prev="emit('navigatePrev')"
    @navigate-next="emit('navigateNext')">
    <!-- Header badges: Pin + Event Type (for events) + Schedule badge (edit mode) -->
    <template #header-badges>
      <!-- Pin toggle -->
      <button
        v-if="hasField('pin') && !isViewMode"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
        :class="editableItem.pinned ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground hover:bg-muted'"
        @click="editableItem.pinned = !editableItem.pinned">
        <Icon name="lucide:pin" class="h-3 w-3" />
        {{ editableItem.pinned ? 'Pinned' : 'Pin' }}
      </button>
      <span
        v-else-if="hasField('pin') && editableItem.pinned"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
        <Icon name="lucide:pin" class="h-3 w-3" />
        Pinned
      </span>
      <!-- Event temporal status badge (read-only) -->
      <span
        v-if="eventTemporalStatus"
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
        :class="eventTemporalStatus.colorClass">
        <Icon :name="eventTemporalStatus.icon" class="h-3 w-3" />
        {{ eventTemporalStatus.label }}
      </span>

      <!-- Type switcher (create mode only) -->
      <UiPopover v-if="isCreateMode && hasField('type')" v-model:open="typeOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/50 hover:bg-muted transition-colors">
            <Icon :name="currentType?.icon || 'lucide:layers'" class="h-3 w-3" />
            {{ currentType?.label || 'Type' }}
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in ENTITY_TYPE_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="switchType(opt.value)">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="editableItem.type === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>

      <!-- Tags (inline in header badges) -->
      <template v-if="hasField('tags')">
        <span class="w-px h-4 bg-border/60 mx-0.5 shrink-0" />
        <TagsSection v-model="editableItem.tags" :readonly="isViewMode" inline />
      </template>
    </template>

    <!-- Schedule Sidebar (left, collapsible via date badge) -->
    <aside
      v-if="hasField('startDate')"
      class="shrink-0 border-r border-border overflow-y-auto hidden md:block transition-all duration-200 relative"
      :class="[schedulePanelOpen ? '' : 'w-0 border-r-0! overflow-hidden', isResizingSidebar ? 'select-none' : '']"
      :style="schedulePanelOpen ? { width: leftSidebarW + 'px' } : {}">
      <!-- Resize handle -->
      <div
        v-if="schedulePanelOpen"
        class="absolute inset-y-0 right-0 w-1 cursor-ew-resize z-10 hover:bg-primary/20 transition-colors"
        @pointerdown="startSidebarResize('left', $event)" />
      <div class="p-3 space-y-3">
        <!-- All Day toggle -->
        <div v-if="hasField('allDay')" class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <Icon name="lucide:sun" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="text-xs font-medium">All day</span>
          </div>
          <button
            v-if="!isViewMode"
            :class="[
              'w-8 h-4.5 rounded-full transition-colors relative',
              editableItem.allDay ? 'bg-primary/50' : 'bg-muted-foreground/30',
            ]"
            @click="editableItem.allDay = !editableItem.allDay">
            <span
              :class="[
                'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-foreground shadow-sm transition-transform',
                !editableItem.allDay ? '-translate-x-4' : 'translate-x-0.5',
              ]" />
          </button>
        </div>

        <!-- Start/End segmented toggle (only if endDate field exists) -->
        <div v-if="hasField('endDate')" class="flex rounded-lg border border-border bg-muted/0 p-1">
          <button
            type="button"
            class="flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-md text-[10px] font-medium transition-colors"
            :class="
              scheduleTab === 'start'
                ? 'bg-foreground/5 shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="scheduleTab = 'start'">
            <span class="uppercase tracking-wide">Start</span>
            <span class="text-[10px] opacity-70">{{ startSummary }}</span>
          </button>
          <button
            type="button"
            class="flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors"
            :class="
              scheduleTab === 'end'
                ? 'bg-foreground/5 shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="scheduleTab = 'end'">
            <span class="uppercase tracking-wide">End</span>
            <span class="text-[10px] opacity-70">{{ endSummary }}</span>
          </button>
        </div>

        <!-- DateTime picker (bound to active tab) -->
        <div class="flex items-center justify-center">
          <ClientOnly>
            <UiDatepicker
              v-model="activeCalendarModel"
              :is-dark="isDark"
              is-required
              :mode="pickerMode"
              :attributes="datePickerAttributes"
              borderless
              transparent
              title-position="left"
              class="text-xs" />
          </ClientOnly>
        </div>

        <!-- Repeat -->
        <div class="space-y-1.5 pt-2 border-t border-border">
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Repeat</p>
          <UiPopover v-model:open="repeatOpen">
            <UiPopoverTrigger as-child>
              <button
                class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                :class="
                  selectedRepeat !== 'none'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                ">
                <div class="flex items-center gap-1.5">
                  <Icon name="lucide:repeat" class="h-3.5 w-3.5" />
                  <span>{{ repeatPresets.find((p) => p.value === selectedRepeat)?.label || 'None' }}</span>
                </div>
                <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-50" />
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-52 p-1">
              <button
                v-for="preset in repeatPresets"
                :key="preset.value"
                type="button"
                class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs hover:bg-muted/50 transition-colors"
                :class="selectedRepeat === preset.value ? 'bg-muted/50' : ''"
                @click="() => { selectRepeat(preset.value); repeatOpen = false }">
                <div class="flex items-center gap-1.5">
                  <span>{{ preset.label }}</span>
                  <span v-if="preset.sub" class="text-muted-foreground text-[10px]">{{ preset.sub }}</span>
                </div>
                <Icon v-if="selectedRepeat === preset.value" name="lucide:check" class="h-3 w-3 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>
          <!-- Custom repeat inline form -->
          <div
            v-if="selectedRepeat === 'custom'"
            class="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-2.5">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] text-muted-foreground shrink-0">Every</span>
              <UiInput
                v-model.number="repeatCustom.interval"
                type="number"
                min="1"
                max="99"
                class="w-11 h-6 text-[10px] text-center" />
              <select
                v-model="repeatCustom.frequency"
                class="h-6 rounded-md border border-border bg-transparent text-[10px] px-1.5 outline-none">
                <option v-for="opt in FREQUENCY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div v-if="repeatCustom.frequency === 'weekly'" class="space-y-1">
              <span class="text-[10px] text-muted-foreground">On</span>
              <div class="flex gap-1">
                <button
                  v-for="(label, i) in WEEKDAY_LABELS"
                  :key="i"
                  type="button"
                  class="w-6 h-6 rounded-md text-[10px] font-medium transition-colors"
                  :class="
                    repeatCustom.weekdays.includes(i)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  "
                  @click="toggleWeekday(i)">
                  {{ label }}
                </button>
              </div>
            </div>
            <div class="space-y-1.5">
              <span class="text-[10px] text-muted-foreground">Ends</span>
              <div class="space-y-1">
                <label class="flex items-center gap-1.5 text-[10px] cursor-pointer">
                  <input v-model="repeatCustom.endMode" type="radio" value="never" class="accent-primary w-3 h-3" />
                  <span>Never</span>
                </label>
                <label class="flex items-center gap-1.5 text-[10px] cursor-pointer">
                  <input v-model="repeatCustom.endMode" type="radio" value="after" class="accent-primary w-3 h-3" />
                  <span>After</span>
                  <UiInput
                    v-if="repeatCustom.endMode === 'after'"
                    v-model.number="repeatCustom.occurrences"
                    type="number"
                    min="1"
                    class="w-11 h-5 text-[10px] text-center" />
                  <span v-if="repeatCustom.endMode === 'after'">times</span>
                </label>
                <label class="flex items-center gap-1.5 text-[10px] cursor-pointer">
                  <input v-model="repeatCustom.endMode" type="radio" value="on" class="accent-primary w-3 h-3" />
                  <span>On</span>
                  <input
                    v-if="repeatCustom.endMode === 'on'"
                    v-model="repeatCustom.endDate"
                    type="date"
                    class="h-5 rounded-md border border-border bg-transparent text-[10px] px-1.5 outline-none" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Reminder -->
        <div class="space-y-1.5">
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Reminder</p>
          <UiPopover v-model:open="reminderOpen">
            <UiPopoverTrigger as-child>
              <button
                class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                :class="
                  selectedReminder !== 'none'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                ">
                <div class="flex items-center gap-1.5">
                  <Icon name="lucide:bell" class="h-3.5 w-3.5" />
                  <span>{{ reminderPresets.find((p) => p.value === selectedReminder)?.label || 'None' }}</span>
                </div>
                <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-50" />
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-52 p-1">
              <button
                v-for="preset in reminderPresets"
                :key="preset.value"
                type="button"
                class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs hover:bg-muted/50 transition-colors"
                :class="selectedReminder === preset.value ? 'bg-muted/50' : ''"
                @click="() => { selectedReminder = preset.value; reminderOpen = false }">
                <div class="flex items-center gap-1.5">
                  <span>{{ preset.label }}</span>
                  <span v-if="preset.time && preset.value !== 'custom'" class="text-muted-foreground text-[10px]">
                    ({{ preset.time }})
                  </span>
                </div>
                <Icon v-if="selectedReminder === preset.value" name="lucide:check" class="h-3 w-3 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>
          <!-- Custom reminder inline form -->
          <div
            v-if="selectedReminder === 'custom'"
            class="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-2">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] text-muted-foreground shrink-0">Remind</span>
              <UiInput
                v-model.number="reminderCustom.daysInAdvance"
                type="number"
                min="0"
                class="w-11 h-6 text-[10px] text-center" />
              <span class="text-[10px] text-muted-foreground shrink-0">day(s) before</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] text-muted-foreground shrink-0">At</span>
              <input
                v-model="reminderCustom.time"
                type="time"
                class="h-6 flex-1 rounded-md border border-border bg-transparent text-[10px] px-1.5 outline-none" />
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Properties Row (full-width, above sidebars) -->
    <template v-if="hasVisibleProperties" #properties>
      <!-- Date badge (toggles schedule sidebar) -->
      <button
        v-if="hasField('startDate')"
        class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
        :class="[
          scheduleDescription.isOverdue
            ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
            : 'bg-muted/50 text-muted-foreground hover:bg-muted',
          schedulePanelOpen ? 'ring-1 ring-primary/30' : '',
        ]"
        @click="schedulePanelOpen = !schedulePanelOpen">
        <Icon :name="scheduleDescription.isRecurring ? 'lucide:repeat' : 'lucide:calendar'" class="h-3.5 w-3.5" />
        <span>{{ scheduleDescription.scheduleText }}</span>
        <span v-if="scheduleDescription.statusText" class="opacity-70">({{ scheduleDescription.statusText }})</span>
      </button>

      <!-- Task Status -->
          <UiPopover v-if="hasField('status')" v-model:open="taskStatusOpen">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                :class="TASK_STATUS_OPTIONS.find((s) => s.value === editableItem.taskStatus)?.color || 'bg-muted/50 hover:bg-muted'">
                <Icon :name="TASK_STATUS_OPTIONS.find((s) => s.value === editableItem.taskStatus)?.icon || 'lucide:circle'" class="h-3.5 w-3.5" />
                <span>{{ TASK_STATUS_OPTIONS.find((s) => s.value === editableItem.taskStatus)?.label || 'Status' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in TASK_STATUS_OPTIONS"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="editableItem.taskStatus = opt.value as TaskStatus; taskStatusOpen = false">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editableItem.taskStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Priority -->
          <UiPopover v-if="hasField('priority')" v-model:open="priorityOpen">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                :class="currentPriority?.color || 'bg-muted/50 hover:bg-muted'">
                <Icon :name="currentPriority?.icon || 'lucide:minus'" class="h-3.5 w-3.5" />
                <span>{{ currentPriority?.label || 'Priority' }}</span>
                <span v-if="editableItem.priority && !editableItem.priorityOverride" class="text-[9px] opacity-60">
                  (auto)
                </span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in PRIORITY_OPTIONS"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="setPriority(opt.value)">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editableItem.priority === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
              <button
                v-if="editableItem.priorityOverride"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground border-t border-border mt-1 pt-1.5"
                @click="resetPriority">
                <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5" />
                <span>Reset to auto</span>
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Urgency -->
          <UiPopover v-if="hasField('urgency')" v-model:open="urgencyOpen">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                :class="currentUrgency?.color || 'bg-muted/50 hover:bg-muted'">
                <Icon :name="currentUrgency?.icon || 'lucide:clock'" class="h-3.5 w-3.5" />
                <span>{{ currentUrgency?.label || 'Urgency' }}</span>
                <span v-if="editableItem.urgency && !editableItem.urgencyOverride" class="text-[9px] opacity-60">
                  (auto)
                </span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in URGENCY_OPTIONS"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="setUrgency(opt.value)">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editableItem.urgency === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
              <button
                v-if="editableItem.urgencyOverride"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground border-t border-border mt-1 pt-1.5"
                @click="resetUrgency">
                <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5" />
                <span>Reset to auto</span>
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Owner -->
          <UiPopover v-if="hasField('owner')" v-model:open="ownerOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  isOwnerUnset
                    ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                    : 'bg-muted/50 hover:bg-muted',
                ]">
                <div
                  :class="[
                    'w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium',
                    isOwnerUnset ? 'bg-muted-foreground/20 text-muted-foreground' : 'bg-primary/20 text-primary',
                  ]">
                  <Icon v-if="isOwnerUnset" name="lucide:user" class="h-2.5 w-2.5" />
                  <template v-else>
                    {{ (owners?.find((o) => o.id === editableItem.owner)?.name || 'U').slice(0, 2).toUpperCase() }}
                  </template>
                </div>
                <span>{{ owners?.find((o) => o.id === editableItem.owner)?.name || 'Owner' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-52 p-1 max-h-64 overflow-hidden">
              <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
                <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  v-model="ownerSearch"
                  type="text"
                  placeholder="Search..."
                  class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
              </div>
              <div class="overflow-y-auto max-h-52">
                <p v-if="!owners?.length" class="px-2 py-1.5 text-xs text-muted-foreground italic">No owners available</p>
                <template v-else>
                  <button
                    v-if="editableItem.owner"
                    class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground"
                    @click="() => { editableItem.owner = undefined; ownerOpen = false; ownerSearch = '' }">
                    <Icon name="lucide:x" class="h-3.5 w-3.5" />
                    No assignee
                  </button>
                  <button
                    v-for="o in filteredOwners"
                    :key="o.id"
                    class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                    @click="() => { editableItem.owner = o.id; ownerOpen = false; ownerSearch = '' }">
                    <div
                      class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary">
                      {{ o.name.slice(0, 2).toUpperCase() }}
                    </div>
                    <span class="flex-1">{{ o.name }}</span>
                    <Icon v-if="editableItem.owner === o.id" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
                  </button>
                </template>
              </div>
            </UiPopoverContent>
          </UiPopover>

          <!-- Involved -->
          <UiPopover v-if="hasField('involved')" v-model:open="involvedOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  isInvolvedUnset
                    ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                    : 'bg-muted/50 hover:bg-muted',
                ]">
                <Icon name="lucide:users" class="h-3.5 w-3.5" :class="isInvolvedUnset ? 'opacity-50' : ''" />
                <span>{{ editableItem.involved.length ? `Involved (${editableItem.involved.length})` : 'Involved' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-56 p-1 max-h-64 overflow-hidden">
              <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
                <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  v-model="involvedSearch"
                  type="text"
                  placeholder="Search..."
                  class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
              </div>
              <div class="overflow-y-auto max-h-52">
                <button
                  v-for="o in filteredInvolvedOwners"
                  :key="o.id"
                  class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                  @click="toggleInvolvedUser(o.id)">
                  <Icon
                    :name="editableItem.involved.includes(o.id) ? 'lucide:check-square' : 'lucide:square'"
                    class="h-3.5 w-3.5"
                    :class="editableItem.involved.includes(o.id) ? 'text-primary' : 'text-muted-foreground'" />
                  <span class="flex-1 truncate">{{ o.name }}</span>
                </button>
              </div>
            </UiPopoverContent>
          </UiPopover>

          <!-- Category -->
          <UiPopover v-if="hasField('category')" v-model:open="categoryOpen">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Icon :name="currentCategory?.icon || 'lucide:tag'" class="h-3.5 w-3.5" />
                <span>{{ currentCategory?.label || editableItem.category || 'Category' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in CATEGORY_OPTIONS"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="() => { editableItem.category = opt.value; categoryOpen = false }">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editableItem.category === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Folder -->
          <UiPopover v-if="hasField('folder')" v-model:open="folderOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  isFolderUnset
                    ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                    : 'bg-muted/50 hover:bg-muted',
                ]">
                <Icon name="lucide:folder" class="h-3.5 w-3.5" :class="isFolderUnset ? 'opacity-50' : ''" />
                <span>{{ editableItem.folder || 'Folder' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-52 p-1 max-h-64 overflow-hidden">
              <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
                <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  v-model="folderSearch"
                  type="text"
                  placeholder="Search..."
                  class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
              </div>
              <div class="overflow-y-auto max-h-52">
                <button
                  v-if="editableItem.folder"
                  class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground"
                  @click="() => { editableItem.folder = undefined; folderOpen = false; folderSearch = '' }">
                  <Icon name="lucide:x" class="h-3.5 w-3.5" />
                  No folder
                </button>
                <button
                  v-for="f in filteredFolders"
                  :key="f"
                  class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                  @click="() => { editableItem.folder = f; folderOpen = false; folderSearch = '' }">
                  <Icon name="lucide:folder" class="h-3.5 w-3.5 text-muted-foreground" />
                  <span class="flex-1">{{ f }}</span>
                  <Icon v-if="editableItem.folder === f" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
                </button>
              </div>
            </UiPopoverContent>
          </UiPopover>

          <!-- ═══════════════════════════════════════════════════════════════ -->
          <!-- Type-specific property pills (promoted from content panels)   -->
          <!-- ═══════════════════════════════════════════════════════════════ -->

          <!-- ── Payment fields ──────────────────────────────────────────── -->

          <!-- Payment Status -->
          <UiPopover v-if="hasField('paymentStatus')" v-model:open="paymentStatusOpen">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                :class="PAYMENT_STATUS_OPTIONS.find((s) => s.value === editableItem.paymentStatus)?.color || 'bg-muted/50 hover:bg-muted'">
                <Icon :name="PAYMENT_STATUS_OPTIONS.find((s) => s.value === editableItem.paymentStatus)?.icon || 'lucide:clock'" class="h-3.5 w-3.5" />
                <span>{{ PAYMENT_STATUS_OPTIONS.find((s) => s.value === editableItem.paymentStatus)?.label || 'Status' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in PAYMENT_STATUS_OPTIONS"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="editableItem.paymentStatus = opt.value; paymentStatusOpen = false">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editableItem.paymentStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Amount -->
          <UiPopover v-if="hasField('amount')" v-model:open="amountOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.amount ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:banknote" class="h-3.5 w-3.5" />
                <span>{{ editableItem.amount ? `${editableItem.currency || '$'}${editableItem.amount}` : 'Amount' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-2 space-y-2">
              <div class="flex items-center gap-2">
                <select
                  v-model="editableItem.currency"
                  class="h-7 rounded-md border border-border bg-transparent text-xs px-1.5 outline-none w-16 shrink-0">
                  <option v-for="c in CURRENCY_OPTIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
                <input
                  v-model.number="editableItem.amount"
                  type="number"
                  placeholder="0.00"
                  class="flex-1 h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                  @keydown.enter="amountOpen = false" />
              </div>
            </UiPopoverContent>
          </UiPopover>

          <!-- Payee -->
          <UiPopover v-if="hasField('payee')" v-model:open="payeeOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.payee ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:user-check" class="h-3.5 w-3.5" />
                <span>{{ editableItem.payee || 'Payee' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-2">
              <input
                v-model="editableItem.payee"
                type="text"
                placeholder="Who to pay"
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="payeeOpen = false" />
            </UiPopoverContent>
          </UiPopover>

          <!-- Invoice # -->
          <UiPopover v-if="hasField('invoiceNumber')" v-model:open="invoiceNumberOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.invoiceNumber ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:hash" class="h-3.5 w-3.5" />
                <span>{{ editableItem.invoiceNumber || 'Invoice #' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-2">
              <input
                v-model="editableItem.invoiceNumber"
                type="text"
                placeholder="INV-001"
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="invoiceNumberOpen = false" />
            </UiPopoverContent>
          </UiPopover>

          <!-- Recurring -->
          <button
            v-if="hasField('recurring') && !isViewMode"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
            :class="editableItem.recurring ? 'bg-primary/10 text-primary' : 'bg-muted/50 hover:bg-muted text-muted-foreground'"
            @click="editableItem.recurring = !editableItem.recurring">
            <Icon name="lucide:repeat" class="h-3.5 w-3.5" />
            <span>Recurring</span>
          </button>
          <span
            v-else-if="hasField('recurring') && editableItem.recurring"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-primary/10 text-primary">
            <Icon name="lucide:repeat" class="h-3.5 w-3.5" /> Recurring
          </span>

          <!-- ── Trip fields ─────────────────────────────────────────────── -->

          <!-- Trip Status -->
          <UiPopover v-if="hasField('tripStatus')" v-model:open="tripStatusOpen">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                :class="TRIP_STATUS_OPTIONS.find((s) => s.value === editableItem.tripStatus)?.color || 'bg-muted/50 hover:bg-muted'">
                <Icon :name="TRIP_STATUS_OPTIONS.find((s) => s.value === editableItem.tripStatus)?.icon || 'lucide:map'" class="h-3.5 w-3.5" />
                <span>{{ TRIP_STATUS_OPTIONS.find((s) => s.value === editableItem.tripStatus)?.label || 'Trip Status' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in TRIP_STATUS_OPTIONS"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="editableItem.tripStatus = opt.value; tripStatusOpen = false">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editableItem.tripStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Origin -->
          <UiPopover v-if="hasField('origin')" v-model:open="originOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.origin ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:map-pin" class="h-3.5 w-3.5" />
                <span>{{ editableItem.origin || 'Origin' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-2">
              <input
                v-model="editableItem.origin"
                type="text"
                placeholder="Departure city"
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="originOpen = false" />
            </UiPopoverContent>
          </UiPopover>

          <!-- Destination -->
          <UiPopover v-if="hasField('destination')" v-model:open="destinationOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.destination ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:map-pin" class="h-3.5 w-3.5" />
                <span>{{ editableItem.destination || 'Destination' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-2">
              <input
                v-model="editableItem.destination"
                type="text"
                placeholder="Arrival city"
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="destinationOpen = false" />
            </UiPopoverContent>
          </UiPopover>

          <!-- Transportation -->
          <UiPopover v-if="hasField('transportation')" v-model:open="transportationOpen">
            <UiPopoverTrigger as-child>
              <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Icon :name="TRANSPORT_OPTIONS.find((t) => t.value === editableItem.transportation)?.icon || 'lucide:navigation'" class="h-3.5 w-3.5" />
                <span>{{ TRANSPORT_OPTIONS.find((t) => t.value === editableItem.transportation)?.label || 'Transport' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-40 p-1">
              <button
                v-for="opt in TRANSPORT_OPTIONS"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="editableItem.transportation = opt.value; transportationOpen = false">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editableItem.transportation === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Trip Budget -->
          <UiPopover v-if="hasField('tripBudget')" v-model:open="tripBudgetOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.budget ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:wallet" class="h-3.5 w-3.5" />
                <span>{{ editableItem.budget ? `${editableItem.currency || '$'}${editableItem.budget}` : 'Budget' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-40 p-2">
              <input
                v-model.number="editableItem.budget"
                type="number"
                placeholder="0.00"
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="tripBudgetOpen = false" />
            </UiPopoverContent>
          </UiPopover>

          <!-- Confirmation # -->
          <UiPopover v-if="hasField('confirmationNumber')" v-model:open="confirmationNumberOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.confirmationNumber ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:ticket" class="h-3.5 w-3.5" />
                <span>{{ editableItem.confirmationNumber || 'Confirmation #' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-2">
              <input
                v-model="editableItem.confirmationNumber"
                type="text"
                placeholder="ABC123"
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="confirmationNumberOpen = false" />
            </UiPopoverContent>
          </UiPopover>

          <!-- ── Sprint fields ───────────────────────────────────────────── -->

          <!-- Sprint Status -->
          <UiPopover v-if="hasField('sprintStatus')" v-model:open="sprintStatusOpen">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                :class="SPRINT_STATUS_OPTIONS.find((s) => s.value === editableItem.sprintStatus)?.color || 'bg-muted/50 hover:bg-muted'">
                <Icon :name="SPRINT_STATUS_OPTIONS.find((s) => s.value === editableItem.sprintStatus)?.icon || 'lucide:circle'" class="h-3.5 w-3.5" />
                <span>{{ SPRINT_STATUS_OPTIONS.find((s) => s.value === editableItem.sprintStatus)?.label || 'Sprint Status' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in SPRINT_STATUS_OPTIONS"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="editableItem.sprintStatus = opt.value; sprintStatusOpen = false">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editableItem.sprintStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Velocity -->
          <UiPopover v-if="hasField('velocity')" v-model:open="velocityOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.velocity != null ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:gauge" class="h-3.5 w-3.5" />
                <span>{{ editableItem.velocity != null ? `${editableItem.velocity} pts` : 'Velocity' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-40 p-2">
              <input
                v-model.number="editableItem.velocity"
                type="number"
                placeholder="Story points"
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="velocityOpen = false" />
            </UiPopoverContent>
          </UiPopover>

          <!-- Sprint Goal -->
          <UiPopover v-if="hasField('sprintGoal')" v-model:open="sprintGoalOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors max-w-48 truncate',
                  editableItem.sprintGoal ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:target" class="h-3.5 w-3.5 shrink-0" />
                <span class="truncate">{{ editableItem.sprintGoal || 'Sprint Goal' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-64 p-2">
              <textarea
                v-model="editableItem.sprintGoal"
                placeholder="What does this sprint aim to achieve?"
                rows="3"
                class="w-full text-xs bg-transparent outline-none resize-none placeholder:text-muted-foreground/50 border border-border rounded-md px-2 py-1.5" />
            </UiPopoverContent>
          </UiPopover>

          <!-- ── Milestone fields ────────────────────────────────────────── -->

          <!-- Achieved -->
          <button
            v-if="hasField('achieved') && !isViewMode"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
            :class="editableItem.achieved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted/50 hover:bg-muted text-muted-foreground'"
            @click="editableItem.achieved = !editableItem.achieved">
            <Icon :name="editableItem.achieved ? 'lucide:check-circle' : 'lucide:circle'" class="h-3.5 w-3.5" />
            <span>{{ editableItem.achieved ? 'Achieved' : 'Not yet' }}</span>
          </button>
          <span
            v-else-if="hasField('achieved') && isViewMode"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
            :class="editableItem.achieved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted/50 text-muted-foreground'">
            <Icon :name="editableItem.achieved ? 'lucide:check-circle' : 'lucide:circle'" class="h-3.5 w-3.5" />
            {{ editableItem.achieved ? 'Achieved' : 'Not yet' }}
          </span>

          <!-- Project ID -->
          <UiPopover v-if="hasField('projectId')" v-model:open="projectIdOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.projectId ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:folder-kanban" class="h-3.5 w-3.5" />
                <span>{{ editableItem.projectId || 'Project' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-2">
              <input
                v-model="editableItem.projectId"
                type="text"
                placeholder="Link to project..."
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="projectIdOpen = false" />
            </UiPopoverContent>
          </UiPopover>

          <!-- ── Budget fields ───────────────────────────────────────────── -->

          <!-- Budget Status -->
          <UiPopover v-if="hasField('budgetStatus')" v-model:open="budgetStatusOpen">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                :class="BUDGET_STATUS_OPTIONS.find((s) => s.value === editableItem.budgetStatus)?.color || 'bg-muted/50 hover:bg-muted'">
                <Icon :name="BUDGET_STATUS_OPTIONS.find((s) => s.value === editableItem.budgetStatus)?.icon || 'lucide:circle'" class="h-3.5 w-3.5" />
                <span>{{ BUDGET_STATUS_OPTIONS.find((s) => s.value === editableItem.budgetStatus)?.label || 'Budget Status' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in BUDGET_STATUS_OPTIONS"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="editableItem.budgetStatus = opt.value; budgetStatusOpen = false">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editableItem.budgetStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Budget Amount -->
          <UiPopover v-if="hasField('budgetAmount')" v-model:open="budgetAmountOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.amount ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:banknote" class="h-3.5 w-3.5" />
                <span>{{ editableItem.amount ? `${editableItem.currency || 'USD'} ${editableItem.amount?.toLocaleString()}` : 'Amount' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-2 space-y-2">
              <div class="flex items-center gap-2">
                <select
                  v-model="editableItem.currency"
                  class="h-7 rounded-md border border-border bg-transparent text-xs px-1.5 outline-none w-16 shrink-0">
                  <option v-for="c in CURRENCY_OPTIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
                <input
                  v-model.number="editableItem.amount"
                  type="number"
                  placeholder="0.00"
                  class="flex-1 h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                  @keydown.enter="budgetAmountOpen = false" />
              </div>
            </UiPopoverContent>
          </UiPopover>

          <!-- ── Goal fields ─────────────────────────────────────────────── -->

          <!-- Metric -->
          <UiPopover v-if="hasField('metric')" v-model:open="metricOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.metric ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:bar-chart-3" class="h-3.5 w-3.5" />
                <span>{{ editableItem.metric || 'Metric' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-2">
              <input
                v-model="editableItem.metric"
                type="text"
                placeholder="e.g. Revenue, Users"
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="metricOpen = false" />
            </UiPopoverContent>
          </UiPopover>

          <!-- Target Date -->
          <UiPopover v-if="hasField('targetDate')" v-model:open="targetDateOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.targetDate ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:calendar-check" class="h-3.5 w-3.5" />
                <span>{{ editableItem.targetDate || 'Target Date' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-2">
              <input
                v-model="editableItem.targetDate"
                type="date"
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" />
            </UiPopoverContent>
          </UiPopover>

          <!-- Current Value -->
          <UiPopover v-if="hasField('currentValue')" v-model:open="currentValueOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.currentValue != null ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:trending-up" class="h-3.5 w-3.5" />
                <span>{{ editableItem.currentValue != null ? `Current: ${editableItem.currentValue}` : 'Current' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-40 p-2">
              <input
                v-model.number="editableItem.currentValue"
                type="number"
                placeholder="0"
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="currentValueOpen = false" />
            </UiPopoverContent>
          </UiPopover>

          <!-- Target Value -->
          <UiPopover v-if="hasField('targetValue')" v-model:open="targetValueOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
                  editableItem.targetValue != null ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:target" class="h-3.5 w-3.5" />
                <span>{{ editableItem.targetValue != null ? `Target: ${editableItem.targetValue}` : 'Target' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-40 p-2">
              <input
                v-model.number="editableItem.targetValue"
                type="number"
                placeholder="100"
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="targetValueOpen = false" />
            </UiPopoverContent>
          </UiPopover>

          <!-- ── Event fields ────────────────────────────────────────────── -->

          <!-- Event Subtype -->
          <UiPopover v-if="hasField('eventSubtype')" v-model:open="eventSubtypeOpen">
            <UiPopoverTrigger as-child>
              <button
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
                :class="EVENT_TYPE_OPTIONS.find((e) => e.value === editableItem.eventType)?.color || 'bg-muted/50 hover:bg-muted'">
                <Icon :name="EVENT_TYPE_OPTIONS.find((e) => e.value === editableItem.eventType)?.icon || 'lucide:calendar'" class="h-3.5 w-3.5" />
                <span>{{ EVENT_TYPE_OPTIONS.find((e) => e.value === editableItem.eventType)?.label || 'Event Type' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in EVENT_TYPE_OPTIONS"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="editableItem.eventType = opt.value as EventType; eventSubtypeOpen = false">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editableItem.eventType === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Location -->
          <UiPopover v-if="hasField('location')" v-model:open="locationOpen">
            <UiPopoverTrigger as-child>
              <button
                :class="[
                  'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors max-w-48 truncate',
                  editableItem.location ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
                ]">
                <Icon name="lucide:map-pin" class="h-3.5 w-3.5 shrink-0" />
                <span class="truncate">{{ editableItem.location || 'Location' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-64 p-2">
              <input
                v-model="editableItem.location"
                type="text"
                placeholder="Address, room, or meeting link..."
                class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none"
                @keydown.enter="locationOpen = false" />
            </UiPopoverContent>
          </UiPopover>

    </template>

    <!-- Center: type-specific content panel -->
    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <EntityContentPanel :model-value="editableItem" :mode="mode" />
    </div>

    <!-- Right sidebar: tabbed references + activity -->
    <aside
      class="shrink-0 border-l border-border overflow-hidden flex flex-col relative"
      :class="isResizingSidebar ? 'select-none' : ''"
      :style="{ width: rightSidebarW + 'px' }">
      <!-- Resize handle -->
      <div
        class="absolute inset-y-0 left-0 w-1 cursor-ew-resize z-10 hover:bg-primary/20 transition-colors"
        @pointerdown="startSidebarResize('right', $event)" />
      <!-- Tab bar -->
      <div class="flex border-b border-border shrink-0">
        <button
          class="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
          :class="rightSidebarTab === 'references' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'"
          @click="rightSidebarTab = 'references'">
          References
        </button>
        <button
          v-if="!isCreateMode"
          class="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
          :class="rightSidebarTab === 'activity' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'"
          @click="rightSidebarTab = 'activity'">
          Activity
          <span v-if="displayActivity.length" class="ml-1 text-[9px] bg-muted rounded-full px-1.5 py-0.5">{{ displayActivity.length }}</span>
        </button>
      </div>
      <!-- Tab content -->
      <div class="flex-1 overflow-y-auto">
        <!-- References tab -->
        <ReferencesSection
          v-if="rightSidebarTab === 'references'"
          v-model="editableItem.references"
          :readonly="isViewMode"
          @open-entity="handleOpenEntityRef"
          @remove-ref="handleRemoveRef"
          @add-entity="() => { entityPickerFilterType = undefined; entityPickerOpen = true }"
          @add-entity-of-type="(type) => { entityPickerFilterType = type; entityPickerOpen = true }" />
        <!-- Activity tab -->
        <div v-if="rightSidebarTab === 'activity' && !isCreateMode" class="p-4 space-y-2">
          <div v-if="commentsLoading" class="flex items-center py-2">
            <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="displayActivity.length" class="space-y-1.5 mb-2">
            <div v-for="activityItem in displayActivity" :key="activityItem.id" class="flex items-start gap-2">
              <div class="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Icon
                  v-if="activityItem.type === 'created'"
                  name="lucide:plus"
                  class="h-2.5 w-2.5 text-muted-foreground" />
                <Icon
                  v-else-if="activityItem.type === 'comment'"
                  name="lucide:message-circle"
                  class="h-2.5 w-2.5 text-muted-foreground" />
                <Icon v-else name="lucide:activity" class="h-2.5 w-2.5 text-muted-foreground" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-1 flex-wrap">
                  <span class="text-[11px] font-medium">{{ activityItem.authorName }}</span>
                  <span class="text-[10px] text-muted-foreground">
                    {{ formatRelativeTime(activityItem.createdAt) }}
                  </span>
                </div>
                <p v-if="activityItem.content" class="text-xs text-foreground/80 mt-0.5">
                  {{ activityItem.content }}
                </p>
                <p v-else-if="activityItem.type === 'created'" class="text-[10px] text-muted-foreground mt-0.5">
                  created this {{ currentType?.label?.toLowerCase() || 'item' }}
                </p>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
              <Icon name="lucide:user" class="h-2.5 w-2.5 text-muted-foreground" />
            </div>
            <input
              v-model="newComment"
              type="text"
              placeholder="Add a comment..."
              class="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
              @keydown.enter="newComment.trim() && handleAddComment()" />
            <button
              v-if="newComment.trim()"
              class="text-primary hover:text-primary/80 transition-colors"
              @click="handleAddComment">
              <Icon name="lucide:send" class="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Footer -->
    <template #footer-left>
      <div class="flex items-center gap-2">
        <Icon name="lucide:info" class="h-3.5 w-3.5" />
        <span v-if="editableItem.id && !isCreateMode">ID: {{ editableItem.id }}</span>
        <span v-else>New {{ currentType?.label?.toLowerCase() || 'item' }}</span>
      </div>
    </template>

    <template #footer-right>
      <template v-if="isViewMode">
        <UiButton size="sm" @click="emit('edit')">
          <Icon name="lucide:pencil" class="h-3.5 w-3.5 mr-1.5" />
          Edit
        </UiButton>
      </template>
      <template v-else-if="isEditMode">
        <span class="text-[11px] text-muted-foreground flex items-center gap-1 mr-2 h-4 overflow-hidden">
          <Transition name="save-fade" mode="out-in">
            <span v-if="saveStatus === 'saving'" key="saving" class="flex items-center gap-1">
              <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
              Saving…
            </span>
            <span v-else-if="saveStatus === 'error'" key="error" class="flex items-center gap-1 text-destructive">
              <Icon name="lucide:alert-circle" class="h-3 w-3" />
              Error
            </span>
            <span v-else-if="formatLastSaved" key="saved" class="flex items-center gap-1">
              <Icon name="lucide:check" class="h-3 w-3 text-emerald-500" />
              Last saved at {{ formatLastSaved }}
            </span>
          </Transition>
        </span>
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="outline" size="icon" class="h-8 w-8">
              <Icon name="lucide:more-horizontal" class="h-4 w-4" />
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end" class="w-40">
            <UiDropdownMenuItem icon="lucide:share" title="Share" />
            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem
              icon="lucide:trash-2"
              title="Delete"
              variant="destructive"
              @click="handleDelete" />
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </template>
      <template v-else-if="isCreateMode">
        <UiButton size="sm" :disabled="!isFormValid" @click="handleSave">Create</UiButton>
        <UiButton variant="ghost" size="sm" @click="closeDialog">Cancel</UiButton>
      </template>
    </template>
  </EntityDialogShell>

  <!-- Entity Reference Picker -->
  <EntityReferencePicker v-model:open="entityPickerOpen" :exclude-id="editableItem.id" :filter-type="entityPickerFilterType" @select="handleAddEntityRef" @created="handleCreatedEntityRef" />
</template>

<style scoped>
  /* Compact the datepicker within the sidebar */
  :deep(.vc-container) {
    font-size: 0.75rem;
  }

  /* Time picker: full width, transparent, seamless with sidebar */
  :deep(.vc-time-picker) {
    border-top: none;
    padding: 0;
  }
  :deep(.vc-time-header) {
    background: transparent;
  }
  :deep(.vc-time-select-group) {
    background: transparent;
    border-color: var(--color-border);
  }
  :deep(.vc-time-picker),
  :deep(.vc-time-header),
  :deep(.vc-time-select-group),
  :deep(.vc-time-content) {
    width: 100%;
  }
  :deep(.vc-date-picker-content) {
    width: 100%;
  }
</style>
