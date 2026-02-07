<script lang="ts" setup>
  import type {
    CalendarItem,
    CalendarItemType,
    Priority,
    Urgency,
    RecurrenceRule,
  } from '~/types/calendarItem'
  import {
    CALENDAR_ITEM_TYPES,
    PRIORITY_OPTIONS,
    URGENCY_OPTIONS,
    CATEGORY_OPTIONS,
    createDefaultItem,
    isNote,
  } from '~/types/calendarItem'
  import { useCalendarItemFormulas } from '~/composables/useCalendarItemFormulas'
  import { typeHasField } from '~/config/entityRegistry'
  import type { PropertyFieldId } from '~/types/entity'

  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')
  const { user: currentUser } = useInstantAuth()

  export interface ActivityItem {
    id: string
    author: string
    avatar?: string
    date: string
    type: 'comment' | 'attachment' | 'status_change' | 'reminder' | 'created'
    content?: string
    filename?: string
    status?: string
  }

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'view' | 'create' | 'edit'
      itemType?: CalendarItemType
      item?: CalendarItem | null
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
      activity?: ActivityItem[]
      owners?: { id: string; name: string }[]
      folders?: string[]
    }>(),
    {
      mode: 'edit',
      itemType: 'task',
      item: null,
      canNavigatePrev: false,
      canNavigateNext: false,
      activity: () => [],
      owners: () => [],
      folders: () => [],
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
    addComment: [comment: string]
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
  const ownerSearch = ref('')
  const folderSearch = ref('')
  const involvedSearch = ref('')

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
  const selectRepeat = (p: RepeatPreset) => {
    selectedRepeat.value = p
    editableItem.recurrence = p === 'none' ? undefined : p !== 'custom' ? ({ frequency: p } as RecurrenceRule) : editableItem.recurrence
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

  const calendarModel: any = computed({
    get: () => (editableItem.startDate ? editableItem.startDate : undefined),
    set: (v) => {
      editableItem.startDate = v || ''
    },
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
      startDate: '',
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

  // Activity
  const displayActivity = computed(() => {
    if (props.activity.length > 0) return props.activity
    return [{ id: '1', author: 'System', type: 'created' as const, date: editableItem.createdAt || 'Just now', content: '' }]
  })


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
  const handleAddComment = () => {
    if (newComment.value.trim()) {
      emit('addComment', newComment.value.trim())
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
    :dialog-title="isCreateMode ? `New ${currentType?.label || 'Item'}` : editableItem.title || currentType?.label || 'Item'"
    :dialog-description="isCreateMode ? `Create a new ${currentType?.label?.toLowerCase()}.` : `View and edit ${currentType?.label?.toLowerCase()} details.`"
    @update:open="emit('update:open', $event)"
    @update:title="editableItem.title = $event"
    @update:description="editableItem.description = $event"
    @close="closeDialog"
    @navigate-prev="emit('navigatePrev')"
    @navigate-next="emit('navigateNext')">

    <!-- Schedule popover badge (edit mode header) -->
    <template #header-badges>
      <UiPopover v-if="!isCreateMode" v-model:open="schedulePopoverOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors"
            :class="scheduleDescription.isOverdue ? 'bg-destructive/15 text-destructive hover:bg-destructive/25' : 'bg-muted/50 text-muted-foreground hover:bg-muted'">
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
                  <span v-if="preset.time && preset.value !== 'custom'" class="text-muted-foreground">({{ preset.time }})</span>
                  <Icon v-if="selectedReminder === preset.value" name="lucide:check" class="h-3 w-3 text-primary" />
                </div>
              </button>
              <div v-if="selectedReminder === 'custom'" class="space-y-2 rounded-md border border-border/60 bg-muted/10 p-2">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-muted-foreground shrink-0">Days early</span>
                  <UiInput v-model.number="reminderCustom.daysInAdvance" type="number" min="1" class="w-12 h-6 text-[10px] text-center bg-muted/30" />
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
          <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
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
      <span v-else-if="hasField('pin') && editableItem.pinned" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary">
        <Icon name="lucide:pin" class="h-3.5 w-3.5" /> Pinned
      </span>

      <!-- Start Date -->
      <div v-if="hasField('startDate')" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
        <Icon name="lucide:calendar" class="h-3.5 w-3.5" />
        <input v-if="!isViewMode" v-model="editableItem.startDate" type="date" class="bg-transparent border-none outline-none text-xs w-28" />
        <span v-else>{{ editableItem.startDate }}</span>
      </div>

      <!-- End Date -->
      <div v-if="hasField('endDate') && (editableItem.endDate || !isViewMode)" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
        <Icon name="lucide:calendar-range" class="h-3.5 w-3.5" />
        <input v-if="!isViewMode" v-model="editableItem.endDate" type="date" class="bg-transparent border-none outline-none text-xs w-28" />
        <span v-else>{{ editableItem.endDate }}</span>
      </div>

      <!-- All Day toggle -->
      <template v-if="hasField('allDay')">
        <button
          v-if="!isViewMode"
          class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
          :class="editableItem.allDay ? 'bg-primary/10 text-primary' : 'bg-muted/50 hover:bg-muted text-muted-foreground'"
          @click="editableItem.allDay = !editableItem.allDay">
          <Icon name="lucide:sun" class="h-3.5 w-3.5" />
          <span>All day</span>
        </button>
        <span v-else-if="editableItem.allDay" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary">
          <Icon name="lucide:sun" class="h-3.5 w-3.5" /> All day
        </span>
      </template>

      <!-- Time Range -->
      <template v-if="hasField('timeRange') && !editableItem.allDay">
        <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
          <Icon name="lucide:clock" class="h-3.5 w-3.5" />
          <input v-if="!isViewMode" v-model="editableItem.startTime" type="time" class="bg-transparent border-none outline-none text-xs w-20" />
          <span v-else>{{ editableItem.startTime }}</span>
        </div>
        <span class="text-muted-foreground">→</span>
        <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
          <input v-if="!isViewMode" v-model="editableItem.endTime" type="time" class="bg-transparent border-none outline-none text-xs w-20" />
          <span v-else>{{ editableItem.endTime }}</span>
        </div>
      </template>

      <!-- Priority -->
      <UiPopover v-if="hasField('priority')" v-model:open="priorityOpen">
        <UiPopoverTrigger as-child>
          <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors" :class="currentPriority?.color || 'bg-muted/50 hover:bg-muted'">
            <Icon :name="currentPriority?.icon || 'lucide:minus'" class="h-3.5 w-3.5" />
            <span>{{ currentPriority?.label || 'Priority' }}</span>
            <span v-if="editableItem.priority && !editableItem.priorityOverride" class="text-[9px] opacity-60">(auto)</span>
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
          <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors" :class="currentUrgency?.color || 'bg-muted/50 hover:bg-muted'">
            <Icon :name="currentUrgency?.icon || 'lucide:clock'" class="h-3.5 w-3.5" />
            <span>{{ currentUrgency?.label || 'Urgency' }}</span>
            <span v-if="editableItem.urgency && !editableItem.urgencyOverride" class="text-[9px] opacity-60">(auto)</span>
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
          <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <Icon :name="currentCategory?.icon || 'lucide:tag'" class="h-3.5 w-3.5" />
            <span>{{ currentCategory?.label || editableItem.category || 'Category' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in CATEGORY_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="editableItem.category = opt.value; categoryOpen = false">
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
            <input v-model="ownerSearch" type="text" placeholder="Search..." class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
          </div>
          <div class="overflow-y-auto max-h-52">
            <p v-if="!owners?.length" class="px-2 py-1.5 text-xs text-muted-foreground italic">No owners available</p>
            <template v-else>
              <button
                v-if="editableItem.owner"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground"
                @click="editableItem.owner = undefined; ownerOpen = false; ownerSearch = ''">
                <Icon name="lucide:x" class="h-3.5 w-3.5" />
                No assignee
              </button>
              <button
                v-for="o in filteredOwners"
                :key="o.id"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="editableItem.owner = o.id; ownerOpen = false; ownerSearch = ''">
                <div class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary">
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
            <input v-model="involvedSearch" type="text" placeholder="Search..." class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
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
            <input v-model="folderSearch" type="text" placeholder="Search..." class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
          </div>
          <div class="overflow-y-auto max-h-52">
            <button
              v-if="editableItem.folder"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground"
              @click="editableItem.folder = undefined; folderOpen = false; folderSearch = ''">
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
              No folder
            </button>
            <button
              v-for="f in filteredFolders"
              :key="f"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="editableItem.folder = f; folderOpen = false; folderSearch = ''">
              <Icon name="lucide:folder" class="h-3.5 w-3.5 text-muted-foreground" />
              <span class="flex-1">{{ f }}</span>
              <Icon v-if="editableItem.folder === f" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
        </UiPopoverContent>
      </UiPopover>
    </template>

    <!-- Tags Row (below properties, above content) -->
    <template v-if="hasField('tags')" #tags>
      <TagsSection v-model="editableItem.tags" :readonly="isViewMode" inline />
    </template>

    <!-- Content Area (default slot) -->
    <aside v-if="isCreateMode && hasField('startDate')" class="w-60 shrink-0 border-r border-border overflow-y-auto hidden md:block">
      <div class="p-3 space-y-3">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Schedule</p>
        <div class="rounded-md border border-border bg-card p-1">
          <ClientOnly>
            <VCalendar
              v-model="calendarModel"
              :is-dark="isDark"
              borderless
              transparent
              expanded
              title-position="left"
              class="text-xs [&_.vc-header]:!px-2" />
          </ClientOnly>
        </div>
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
              <span>{{ preset.label }}</span>
              <Icon v-if="selectedRepeat === preset.value" name="lucide:check" class="h-3 w-3 text-primary" />
            </button>
          </div>
        </div>
        <div class="space-y-0.5">
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
              <Icon v-if="selectedReminder === preset.value" name="lucide:check" class="h-3 w-3 text-primary" />
            </button>
          </div>
        </div>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto" :class="isEditMode ? 'border-r border-border' : ''">
      <div class="divide-y divide-border">
        <!-- Type-specific content panel (dynamically resolved) -->
        <EntityContentPanel :model-value="editableItem" :mode="mode" />

        <!-- Attachments -->
        <AttachmentsSection v-model="editableItem.attachments" :readonly="isViewMode" />

        <!-- Notes -->
        <div v-if="!isNote(editableItem)" class="p-4 space-y-1.5">
          <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
          <UiRichTextEditor v-if="!isViewMode" v-model="editableItem.notes" placeholder="Additional notes..." compact />
          <p v-else class="text-sm text-foreground whitespace-pre-wrap">{{ editableItem.notes || '—' }}</p>
        </div>
      </div>
    </div>

    <aside v-if="isEditMode" class="w-64 shrink-0 overflow-y-auto bg-muted/5">
      <div class="p-3 space-y-3">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activity</p>
        <div class="space-y-2">
          <UiTextarea v-model="newComment" placeholder="Add a comment..." :rows="2" class="text-xs" />
          <UiButton size="sm" class="w-full text-xs" :disabled="!newComment.trim()" @click="handleAddComment">
            <Icon name="lucide:send" class="h-3 w-3 mr-1.5" /> Comment
          </UiButton>
        </div>
        <div class="space-y-3 pt-2 border-t border-border">
          <div v-for="activityItem in displayActivity" :key="activityItem.id" class="flex gap-2">
            <div class="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <Icon v-if="activityItem.type === 'created'" name="lucide:plus" class="h-3 w-3 text-muted-foreground" />
              <Icon v-else-if="activityItem.type === 'comment'" name="lucide:message-circle" class="h-3 w-3 text-muted-foreground" />
              <Icon v-else name="lucide:activity" class="h-3 w-3 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p v-if="activityItem.content" class="text-xs">{{ activityItem.content }}</p>
              <div class="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span class="font-medium">{{ activityItem.author }}</span>
                <span v-if="activityItem.type === 'created'">created this {{ currentType?.label?.toLowerCase() || 'item' }}</span>
                <span v-else-if="activityItem.type === 'comment'">commented</span>
                <span class="ml-1">{{ activityItem.date }}</span>
              </div>
            </div>
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
        <UiButton variant="outline" size="sm" @click="closeDialog">Close</UiButton>
      </template>
      <template v-else-if="isEditMode">
        <UiButton variant="outline" size="sm" class="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" @click="handleDelete">
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
</template>

<style scoped>
/* VCalendar dark mode text contrast */
:deep(.vc-container) {
  --vc-text-lg: hsl(var(--foreground));
  --vc-text-sm: hsl(var(--foreground));
  --vc-text-xs: hsl(var(--foreground));
  font-size: 0.75rem;
}

:deep(.vc-title),
:deep(.vc-weekday),
:deep(.vc-day-content),
:deep(.vc-nav-title),
:deep(.vc-nav-item) {
  color: hsl(var(--foreground));
}

:deep(.vc-arrow) {
  color: hsl(var(--muted-foreground));
}

:deep(.vc-arrow:hover) {
  color: hsl(var(--foreground));
  background: hsl(var(--muted));
}

:deep(.vc-day-content:hover) {
  background: hsl(var(--muted));
}

:deep(.vc-highlight-content-solid) {
  color: hsl(var(--primary-foreground));
}

:deep(.vc-weekday) {
  color: hsl(var(--muted-foreground));
  font-weight: 500;
}

/* Responsive: compact calendar on smaller dialogs */
@media (max-width: 768px) {
  :deep(.vc-container) {
    font-size: 0.65rem;
  }
}
</style>
