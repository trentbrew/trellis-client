<script lang="ts" setup>
  import type {
    CalendarItem,
    CalendarItemType,
    Priority,
    Urgency,
    RecurrenceRule,
    EventType,
  } from '~/types/calendarItem'
  import {
    CALENDAR_ITEM_TYPES,
    PRIORITY_OPTIONS,
    URGENCY_OPTIONS,
    CATEGORY_OPTIONS,
    EVENT_TYPE_OPTIONS,
    createDefaultItem,
    isNote,
  } from '~/types/calendarItem'
  import { useCalendarItemFormulas } from '~/composables/useCalendarItemFormulas'
  import { typeHasField } from '~/config/entityRegistry'
  import type { PropertyFieldId } from '~/types/entity'
  import { useComments } from '~/composables/useComments'

  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')
  const { user: currentUser } = useInstantAuth()

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'view' | 'create' | 'edit'
      itemType?: CalendarItemType
      item?: CalendarItem | null
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
    save: [item: CalendarItem]
    delete: [item: CalendarItem]
    edit: []
    navigatePrev: []
    navigateNext: []
  }>()

  const { applyFormulas } = useCalendarItemFormulas()

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

  watch(
    () => props.item,
    (newItem) => {
      if (newItem) {
        const defaults = createDefaultItem(newItem.type)
        Object.assign(editableItem, { ...defaults, ...newItem })
      } else if (isCreateMode.value) {
        const defaults = createDefaultItem(props.itemType || 'task')
        Object.assign(editableItem, { ...defaults })
      }
    },
    { immediate: true, deep: true },
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
  } = useComments(currentEntityId, 'calendarItem')

  // UI State
  const newComment = ref('')
  const typeOpen = ref(false)
  const categoryOpen = ref(false)
  const ownerOpen = ref(false)
  const involvedOpen = ref(false)
  const folderOpen = ref(false)
  const priorityOpen = ref(false)
  const urgencyOpen = ref(false)
  const schedulePopoverOpen = ref(false)
  const eventTypeOpen = ref(false)
  const ownerSearch = ref('')
  const folderSearch = ref('')
  const involvedSearch = ref('')
  const commentsOpen = ref(false)
  const fileUploadOpen = ref(false)
  const entityPickerOpen = ref(false)

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

  const currentType = computed(() => CALENDAR_ITEM_TYPES.find((t) => t.value === editableItem.type))
  const currentPriority = computed(() => PRIORITY_OPTIONS.find((p) => p.value === editableItem.priority))
  const currentUrgency = computed(() => URGENCY_OPTIONS.find((u) => u.value === editableItem.urgency))
  const currentCategory = computed(() => CATEGORY_OPTIONS.find((c) => c.value === editableItem.category))

  const isFormValid = computed(() => !!editableItem.title?.trim())

  // Recurrence
  type RepeatPreset = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays' | 'custom' | 'none'
  const selectedRepeat = ref<RepeatPreset>('none')
  const repeatPresets: { value: RepeatPreset; label: string; sub?: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
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

  const calendarModel: any = computed({
    get: () => (editableItem.startDate ? new Date(editableItem.startDate) : undefined),
    set: (v: Date | string | undefined) => {
      if (!v) {
        editableItem.startDate = ''
        return
      }
      const d = v instanceof Date ? v : new Date(v)
      editableItem.startDate = d.toISOString()
      // Extract time
      if (!editableItem.allDay) {
        editableItem.startTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      }
      // Auto-set end = start + 1h if no end yet
      if (!editableItem.endDate && hasField('endDate')) {
        const end = new Date(d.getTime() + 60 * 60 * 1000)
        editableItem.endDate = end.toISOString()
        if (!editableItem.allDay) {
          editableItem.endTime = end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        }
      }
    },
  })

  const endCalendarModel: any = computed({
    get: () => (editableItem.endDate ? new Date(editableItem.endDate) : undefined),
    set: (v: Date | string | undefined) => {
      if (!v) {
        editableItem.endDate = undefined
        return
      }
      const d = v instanceof Date ? v : new Date(v)
      editableItem.endDate = d.toISOString()
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
    const d = new Date(editableItem.startDate)
    return editableItem.allDay
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + (editableItem.startTime || '')
  })
  const endSummary = computed(() => {
    if (!editableItem.endDate) return 'Not set'
    const d = new Date(editableItem.endDate)
    return editableItem.allDay
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + (editableItem.endTime || '')
  })

  // Picker mode based on allDay
  const pickerMode = computed(() => (editableItem.allDay ? 'date' : 'dateTime'))

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
    schedulePopoverOpen.value = false
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen && isCreateMode.value && !props.item) initBlankCreateItem()
    },
  )

  watch(
    () => schedulePopoverOpen.value,
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
    const start = new Date(editableItem.startDate)
    const now = new Date()
    const diffDays = Math.ceil((start.getTime() - now.getTime()) / 86_400_000)
    const repeat = editableItem.recurrence?.frequency || 'none'

    let scheduleText = ''
    if (repeat === 'daily') scheduleText = 'Every day'
    else if (repeat === 'weekly') scheduleText = `Every ${start.toLocaleDateString('en-US', { weekday: 'long' })}`
    else if (repeat === 'monthly') {
      const d = start.getDate()
      scheduleText = `Every ${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of the month`
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
      editableItem.startDate = new Date().toISOString().split('T')[0]
    }

    // Ensure required fields are set without auto-populating the create form UI.
    if (!editableItem.priority) editableItem.priority = 'medium'
    if (!editableItem.urgency) editableItem.urgency = 'not-urgent'

    if (!isCreateMode.value) applyFormulas(editableItem)
    emit('save', { ...editableItem } as CalendarItem)
    closeDialog()
  }
  const handleDelete = () => {
    emit('delete', { ...editableItem } as CalendarItem)
    closeDialog()
  }
  const handleOpenEntityRef = (ref: import('~/types/entity').EntityReference) => {
    // TODO: open the referenced entity's dialog — for now just log
    console.log('[ReferencesSection] open entity ref:', ref.entityId, ref.entityType)
  }
  const handleAddEntityRef = (ref: import('~/types/entity').EntityReference) => {
    if (!editableItem.references) editableItem.references = []
    // Prevent duplicate references to the same entity
    const exists = editableItem.references.some((r: any) => r.kind === 'entity' && r.entityId === ref.entityId)
    if (!exists) {
      editableItem.references.push(ref)
    }
  }
  const handleAddComment = async () => {
    if (newComment.value.trim()) {
      await persistComment(newComment.value.trim())
      newComment.value = ''
    }
  }

  const switchType = (newType: CalendarItemType) => {
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
  <CalendarItemDialogShell
    :open="open"
    :title="editableItem.title"
    :description="editableItem.description"
    :mode="mode"
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
    <!-- Header badges: Event Type (for events) + Schedule badge (edit mode) -->
    <template #header-badges>
      <!-- Event Type picker (shown for event types, between type badge and schedule badge) -->
      <UiPopover v-if="editableItem.type === 'event'" v-model:open="eventTypeOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
            :class="
              EVENT_TYPE_OPTIONS.find((e) => e.value === editableItem.eventType)?.color ||
              'bg-muted/50 text-muted-foreground hover:bg-muted'
            ">
            <Icon
              :name="EVENT_TYPE_OPTIONS.find((e) => e.value === editableItem.eventType)?.icon || 'lucide:calendar'"
              class="h-3 w-3" />
            {{ EVENT_TYPE_OPTIONS.find((e) => e.value === editableItem.eventType)?.label || 'Event Type' }}
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in EVENT_TYPE_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="
              editableItem.eventType = opt.value as EventType
              eventTypeOpen = false
            ">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="editableItem.eventType === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>

      <UiPopover v-if="!isCreateMode" v-model:open="schedulePopoverOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors"
            :class="
              scheduleDescription.isOverdue
                ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            ">
            <Icon :name="scheduleDescription.isRecurring ? 'lucide:repeat' : 'lucide:calendar'" class="h-3 w-3" />
            <span>{{ scheduleDescription.scheduleText }}</span>
            <span class="opacity-70">({{ scheduleDescription.statusText }})</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-72 p-3 space-y-3 max-h-[70vh] overflow-y-auto">
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Schedule</p>
          <div class="space-y-0.5">
            <button
              type="button"
              class="w-full flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wide py-1 hover:text-foreground transition-colors"
              @click="repeatOpen = !repeatOpen">
              <span>Repeat</span>
              <Icon :name="repeatOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3 w-3" />
            </button>
            <div v-if="repeatOpen" class="space-y-0.5">
              <button
                v-for="preset in repeatPresets"
                :key="preset.value"
                type="button"
                class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] hover:bg-muted/50 transition-colors"
                :class="selectedRepeat === preset.value ? 'bg-muted/50' : ''"
                @click="selectRepeat(preset.value)">
                <div class="flex items-center gap-1.5">
                  <span>{{ preset.label }}</span>
                  <span v-if="preset.sub" class="text-muted-foreground">{{ preset.sub }}</span>
                </div>
                <Icon v-if="selectedRepeat === preset.value" name="lucide:check" class="h-3 w-3 text-primary" />
              </button>
            </div>
          </div>

          <div class="space-y-0.5 pt-2 border-t border-border">
            <button
              type="button"
              class="w-full flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wide py-1 hover:text-foreground transition-colors"
              @click="reminderOpen = !reminderOpen">
              <span>Reminder</span>
              <Icon :name="reminderOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3 w-3" />
            </button>
            <div v-if="reminderOpen" class="space-y-0.5">
              <button
                v-for="preset in reminderPresets"
                :key="preset.value"
                type="button"
                class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] hover:bg-muted/50 transition-colors"
                :class="selectedReminder === preset.value ? 'bg-muted/50' : ''"
                @click="selectedReminder = preset.value">
                <span>{{ preset.label }}</span>
                <div class="flex items-center gap-1.5">
                  <span v-if="preset.time && preset.value !== 'custom'" class="text-muted-foreground">
                    ({{ preset.time }})
                  </span>
                  <Icon v-if="selectedReminder === preset.value" name="lucide:check" class="h-3 w-3 text-primary" />
                </div>
              </button>
              <div
                v-if="selectedReminder === 'custom'"
                class="space-y-2 rounded-md border border-border/60 bg-muted/10 p-2">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-muted-foreground shrink-0">Days early</span>
                  <UiInput
                    v-model.number="reminderCustom.daysInAdvance"
                    type="number"
                    min="1"
                    class="w-12 h-6 text-[10px] text-center bg-muted/30" />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-muted-foreground shrink-0">At</span>
                  <UiInput v-model="reminderCustom.time" type="time" class="flex-1 h-6 text-[10px] bg-muted/30" />
                </div>
              </div>
            </div>
          </div>
        </UiPopoverContent>
      </UiPopover>
    </template>

    <!-- Properties Row (registry-driven) -->
    <template #properties>
      <!-- Type switcher (create mode only) -->
      <UiPopover v-if="isCreateMode && hasField('type')" v-model:open="typeOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <Icon :name="currentType?.icon || 'lucide:layers'" class="h-3.5 w-3.5" />
            <span>{{ currentType?.label || 'Type' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in CALENDAR_ITEM_TYPES"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="switchType(opt.value)">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="editableItem.type === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>

      <!-- Pin toggle (annotation) -->
      <button
        v-if="hasField('pin') && !isViewMode"
        class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
        :class="editableItem.pinned ? 'bg-primary/10 text-primary' : 'bg-muted/50 hover:bg-muted text-muted-foreground'"
        @click="editableItem.pinned = !editableItem.pinned">
        <Icon name="lucide:pin" class="h-3.5 w-3.5" />
        <span>{{ editableItem.pinned ? 'Pinned' : 'Pin' }}</span>
      </button>
      <span
        v-else-if="hasField('pin') && editableItem.pinned"
        class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary">
        <Icon name="lucide:pin" class="h-3.5 w-3.5" />
        Pinned
      </span>

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
            @click="
              editableItem.category = opt.value
              categoryOpen = false
            ">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="editableItem.category === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
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
                @click="
                  editableItem.owner = undefined
                  ownerOpen = false
                  ownerSearch = ''
                ">
                <Icon name="lucide:x" class="h-3.5 w-3.5" />
                No assignee
              </button>
              <button
                v-for="o in filteredOwners"
                :key="o.id"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="
                  editableItem.owner = o.id
                  ownerOpen = false
                  ownerSearch = ''
                ">
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
              @click="
                editableItem.folder = undefined
                folderOpen = false
                folderSearch = ''
              ">
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
              No folder
            </button>
            <button
              v-for="f in filteredFolders"
              :key="f"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="
                editableItem.folder = f
                folderOpen = false
                folderSearch = ''
              ">
              <Icon name="lucide:folder" class="h-3.5 w-3.5 text-muted-foreground" />
              <span class="flex-1">{{ f }}</span>
              <Icon v-if="editableItem.folder === f" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
        </UiPopoverContent>
      </UiPopover>
    </template>

    <!-- Tags (inline in properties row, visually grouped) -->
    <template v-if="hasField('tags')" #properties-tags>
      <span class="w-px h-4 bg-border/60 mx-0.5 shrink-0" />
      <div class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-muted/30 border border-border/40">
        <TagsSection v-model="editableItem.tags" :readonly="isViewMode" inline />
      </div>
    </template>

    <!-- Schedule Sidebar -->
    <aside v-if="hasField('startDate')" class="w-72 shrink-0 border-r border-border overflow-y-auto hidden md:block">
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
              editableItem.allDay ? 'bg-foreground/25' : 'bg-muted-foreground/30',
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
        <div v-if="hasField('endDate')" class="flex rounded-lg border border-border bg-muted/30 p-0.5">
          <button
            type="button"
            class="flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors"
            :class="
              scheduleTab === 'start'
                ? 'bg-card shadow-sm text-foreground'
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
                ? 'bg-card shadow-sm text-foreground'
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
                @click="
                  selectRepeat(preset.value)
                  repeatOpen = false
                ">
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
                @click="
                  selectedReminder = preset.value
                  reminderOpen = false
                ">
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

    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <div class="divide-y divide-border flex flex-col min-h-full">
        <!-- Type-specific content panel (dynamically resolved) -->
        <EntityContentPanel :model-value="editableItem" :mode="mode" />

        <!-- References (files + entity links) -->
        <ReferencesSection
          v-model="editableItem.references"
          :readonly="isViewMode"
          @open-entity="handleOpenEntityRef"
          @add-file="fileUploadOpen = true"
          @add-entity="entityPickerOpen = true" />

        <!-- Notes -->
        <div v-if="!isNote(editableItem)" class="p-4 space-y-1.5">
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
          <UiRichTextEditor
            v-if="!isViewMode"
            v-model="editableItem.notes"
            placeholder="Additional notes..."
            compact
            mentions />
          <p v-else class="text-sm text-foreground whitespace-pre-wrap">{{ editableItem.notes || '—' }}</p>
        </div>

        <!-- Comments / Activity (collapsible, collapsed by default) -->
        <div v-if="!isCreateMode" class="p-4 space-y-2">
          <button
            type="button"
            class="w-full flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
            @click="commentsOpen = !commentsOpen">
            <span>Comments / Activity</span>
            <Icon :name="commentsOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3 w-3" />
          </button>
          <div v-if="commentsOpen" class="space-y-2">
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
      </div>
    </div>

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
        <UiButton variant="outline" size="sm" @click="closeDialog">Close</UiButton>
      </template>
      <template v-else-if="isEditMode">
        <UiButton
          variant="outline"
          size="sm"
          class="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
          @click="handleDelete">
          <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
          Delete
        </UiButton>
        <UiButton size="sm" @click="handleSave">
          <Icon name="lucide:save" class="h-3.5 w-3.5 mr-1.5" />
          Save
        </UiButton>
        <UiButton variant="outline" size="sm" @click="closeDialog">Close</UiButton>
      </template>
      <template v-else-if="isCreateMode">
        <UiButton size="sm" :disabled="!isFormValid" @click="handleSave">Create</UiButton>
        <UiButton variant="ghost" size="sm" @click="closeDialog">Cancel</UiButton>
      </template>
    </template>
  </CalendarItemDialogShell>

  <!-- File Upload Modal -->
  <UiDialog v-model:open="fileUploadOpen">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Upload File</UiDialogTitle>
        <UiDialogDescription>Drag and drop files here or click to browse.</UiDialogDescription>
      </UiDialogHeader>
      <div class="py-4">
        <div
          class="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
          <Icon name="lucide:upload-cloud" class="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p class="text-sm font-medium">Drop files here</p>
          <p class="text-xs text-muted-foreground mt-1">or click to browse</p>
          <input type="file" class="hidden" multiple />
        </div>
      </div>
      <UiDialogFooter>
        <UiButton variant="outline" @click="fileUploadOpen = false">Cancel</UiButton>
        <UiButton @click="fileUploadOpen = false">Upload</UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>

  <!-- Entity Reference Picker -->
  <EntityReferencePicker v-model:open="entityPickerOpen" :exclude-id="editableItem.id" @select="handleAddEntityRef" />
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
