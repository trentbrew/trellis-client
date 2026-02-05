<script lang="ts" setup>
  import type {
    CalendarItem,
    CalendarItemType,
    Priority,
    Urgency,
    TaskStatus,
    EventType,
    TripStatus,
    PaymentStatus,
    TransportMode,
    Attachment,
    RecurrenceRule,
  } from '~/types/calendarItem'
  import {
    CALENDAR_ITEM_TYPES,
    PRIORITY_OPTIONS,
    URGENCY_OPTIONS,
    TASK_STATUS_OPTIONS,
    EVENT_TYPE_OPTIONS,
    TRIP_STATUS_OPTIONS,
    PAYMENT_STATUS_OPTIONS,
    TRANSPORT_OPTIONS,
    CATEGORY_OPTIONS,
    createDefaultItem,
    isTask,
    isEvent,
    isTrip,
    isPayment,
    isNote,
  } from '~/types/calendarItem'
  import { useCalendarItemFormulas } from '~/composables/useCalendarItemFormulas'

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
      item: CalendarItem | null
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
      activity?: ActivityItem[]
      owners?: { id: string; name: string }[]
      folders?: string[]
    }>(),
    {
      mode: 'edit',
      itemType: 'task',
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

  watch(
    () => props.item,
    (newItem) => {
      if (newItem) {
        const defaults = createDefaultItem(newItem.type)
        Object.assign(editableItem, { ...defaults, ...newItem })
      } else if (isCreateMode.value) {
        const defaults = createDefaultItem(props.itemType || 'task')
        Object.assign(editableItem, { ...defaults, id: `${props.itemType || 'task'}-${Date.now()}` })
      }
    },
    { immediate: true, deep: true },
  )

  watch(
    () => [editableItem.startDate, editableItem.category, editableItem.type],
    () => applyFormulas(editableItem),
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
  const tagsOpen = ref(false)
  const tagInput = ref('')
  const schedulePopoverOpen = ref(false)
  const ownerSearch = ref('')
  const folderSearch = ref('')
  const involvedSearch = ref('')
  const taskStatusOpen = ref(false)
  const eventTypeOpen = ref(false)
  const tripStatusOpen = ref(false)
  const transportOpen = ref(false)
  const paymentStatusOpen = ref(false)
  const fileUploadOpen = ref(false)

  const owners = computed(() => props.owners ?? [])
  const folders = computed(() => props.folders ?? [])
  const isOwnerUnset = computed(() => !editableItem.owner)
  const isFolderUnset = computed(() => !editableItem.folder)
  const isInvolvedUnset = computed(() => !editableItem.involved?.length)

  const filteredOwners = computed(() => {
    if (!ownerSearch.value) return owners.value
    const s = ownerSearch.value.toLowerCase()
    return owners.value.filter((o) => o.name.toLowerCase().includes(s))
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

  const isFormValid = computed(() => !!editableItem.title?.trim() && !!editableItem.startDate)

  // Recurrence
  type RepeatPreset = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays' | 'custom' | 'none'
  const selectedRepeat = ref<RepeatPreset>('none')
  const repeatPresets: { value: RepeatPreset; label: string; sub?: string }[] = [
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
  type ReminderPreset = 'on-the-day' | '1-day-early' | '2-days-early' | '1-week-early' | 'custom'
  const selectedReminder = ref<ReminderPreset>('on-the-day')
  const reminderPresets: { value: ReminderPreset; label: string; time?: string }[] = [
    { value: 'on-the-day', label: 'On the day', time: '09:00' },
    { value: '1-day-early', label: '1 day early', time: '09:00' },
    { value: '2-days-early', label: '2 days early', time: '09:00' },
    { value: '1-week-early', label: '1 week early', time: '09:00' },
    { value: 'custom', label: 'Custom' },
  ]
  const reminderCustom = reactive({ daysInAdvance: 1, time: '09:00' })

  // Schedule display
  const scheduleDescription = computed(() => {
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

  // Tags
  const addTag = () => {
    const t = tagInput.value.trim()
    if (t && !editableItem.tags.includes(t)) editableItem.tags.push(t)
    tagInput.value = ''
  }
  const removeTag = (t: string) => {
    editableItem.tags = editableItem.tags.filter((x: string) => x !== t)
  }

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

  // Attachment helpers
  const getAttachmentIcon = (type: Attachment['type']) => {
    const m: Record<Attachment['type'], string> = {
      pdf: 'lucide:file-text',
      spreadsheet: 'lucide:file-spreadsheet',
      image: 'lucide:image',
      document: 'lucide:file',
      other: 'lucide:file',
    }
    return m[type] || 'lucide:file'
  }
  const getAttachmentColor = (type: Attachment['type']) => {
    const m: Record<Attachment['type'], string> = {
      pdf: 'text-rose-600 bg-rose-500/10',
      spreadsheet: 'text-green-600 bg-green-500/10',
      image: 'text-violet-600 bg-violet-500/10',
      document: 'text-blue-600 bg-blue-500/10',
      other: 'text-gray-600 bg-gray-500/10',
    }
    return m[type] || 'text-gray-600 bg-gray-500/10'
  }

  // Actions
  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }
  const handleSave = () => {
    applyFormulas(editableItem)
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
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :hide-close="true"
      class="w-[min(1100px,calc(100vw-4rem))]! max-w-[min(1100px,calc(100vw-4rem))]! h-[min(720px,calc(100vh-4rem))] max-h-[min(720px,calc(100vh-4rem))] p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col gap-0">
      <UiDialogTitle class="sr-only">
        {{ isCreateMode ? `New ${currentType?.label || 'Item'}` : editableItem.title || currentType?.label || 'Item' }}
      </UiDialogTitle>
      <UiDialogDescription class="sr-only">
        {{ isCreateMode ? `Create a new ${currentType?.label?.toLowerCase()}.` : `View and edit ${currentType?.label?.toLowerCase()} details.` }}
      </UiDialogDescription>

      <!-- Header -->
      <div class="shrink-0 border-b border-border">
        <div class="px-4 pt-4 pb-3">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-2 min-w-0">
              <span v-if="currentType" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                <Icon :name="currentType.icon" class="h-3 w-3" />
                {{ currentType.label }}
              </span>
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
                  <div class="space-y-1">
                    <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Repeat</p>
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
                  <div class="space-y-1 pt-2 border-t border-border">
                    <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Reminder</p>
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
                </UiPopoverContent>
              </UiPopover>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <template v-if="!isCreateMode">
                <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="!canNavigatePrev" @click="emit('navigatePrev')">
                  <Icon name="lucide:chevron-up" class="h-4 w-4" />
                </UiButton>
                <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="!canNavigateNext" @click="emit('navigateNext')">
                  <Icon name="lucide:chevron-down" class="h-4 w-4" />
                </UiButton>
              </template>
              <UiButton variant="ghost" size="icon" class="h-7 w-7" @click="closeDialog">
                <Icon name="lucide:x" class="h-4 w-4" />
              </UiButton>
            </div>
          </div>
          <input
            v-if="!isViewMode"
            v-model="editableItem.title"
            type="text"
            :placeholder="`${currentType?.label || 'Item'} name...`"
            class="w-full text-xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0 -mx-1 transition-all" />
          <h2 v-else class="text-xl font-semibold px-1">{{ editableItem.title }}</h2>
        </div>
      </div>

      <!-- Properties Row -->
      <div class="sticky top-0 z-10 bg-card px-4 py-2.5 border-b border-border space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Properties</p>
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <UiPopover v-if="isCreateMode" v-model:open="typeOpen">
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

          <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
            <Icon name="lucide:calendar" class="h-3.5 w-3.5" />
            <input v-if="!isViewMode" v-model="editableItem.startDate" type="date" class="bg-transparent border-none outline-none text-xs w-28" />
            <span v-else>{{ editableItem.startDate }}</span>
          </div>

          <div v-if="editableItem.endDate || !isViewMode" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
            <Icon name="lucide:calendar-range" class="h-3.5 w-3.5" />
            <input v-if="!isViewMode" v-model="editableItem.endDate" type="date" class="bg-transparent border-none outline-none text-xs w-28" />
            <span v-else>{{ editableItem.endDate }}</span>
          </div>

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

          <template v-if="!editableItem.allDay">
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

          <UiPopover v-model:open="priorityOpen">
            <UiPopoverTrigger as-child>
              <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors" :class="currentPriority?.color || 'bg-muted/50 hover:bg-muted'">
                <Icon :name="currentPriority?.icon || 'lucide:minus'" class="h-3.5 w-3.5" />
                <span>{{ currentPriority?.label || 'Priority' }}</span>
                <span v-if="!editableItem.priorityOverride" class="text-[9px] opacity-60">(auto)</span>
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

          <UiPopover v-model:open="urgencyOpen">
            <UiPopoverTrigger as-child>
              <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors" :class="currentUrgency?.color || 'bg-muted/50 hover:bg-muted'">
                <Icon :name="currentUrgency?.icon || 'lucide:clock'" class="h-3.5 w-3.5" />
                <span>{{ currentUrgency?.label || 'Urgency' }}</span>
                <span v-if="!editableItem.urgencyOverride" class="text-[9px] opacity-60">(auto)</span>
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

          <UiPopover v-model:open="categoryOpen">
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

          <UiPopover v-model:open="ownerOpen">
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

          <UiPopover v-model:open="involvedOpen">
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

          <UiPopover v-model:open="folderOpen">
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

          <UiPopover v-model:open="tagsOpen">
            <UiPopoverTrigger as-child>
              <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Icon name="lucide:hash" class="h-3.5 w-3.5" />
                <span>{{ editableItem.tags.length ? `Tags (${editableItem.tags.length})` : 'Tags' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-56 p-2 space-y-2">
              <div v-if="editableItem.tags.length" class="flex flex-wrap gap-1">
                <span
                  v-for="tag in editableItem.tags"
                  :key="tag"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px]">
                  {{ tag }}
                  <button v-if="!isViewMode" class="hover:text-destructive" @click="removeTag(tag)">
                    <Icon name="lucide:x" class="h-2.5 w-2.5" />
                  </button>
                </span>
              </div>
              <div v-if="!isViewMode" class="flex items-center gap-1.5">
                <input
                  v-model="tagInput"
                  type="text"
                  placeholder="Add tag..."
                  class="flex-1 bg-transparent text-xs outline-none border border-border rounded-md px-2 py-1 placeholder:text-muted-foreground/60"
                  @keydown.enter.prevent="addTag" />
                <UiButton size="sm" variant="ghost" class="h-7 px-2 text-xs" :disabled="!tagInput.trim()" @click="addTag">
                  Add
                </UiButton>
              </div>
            </UiPopoverContent>
          </UiPopover>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 flex min-h-0 overflow-hidden">
        <aside v-if="isCreateMode" class="w-60 shrink-0 border-r border-border overflow-y-auto">
          <div class="p-3 space-y-3">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Schedule</p>
            <div class="rounded-md border border-border bg-card p-1">
              <ClientOnly>
                <VCalendar
                  v-model="editableItem.startDate"
                  :is-dark="false"
                  borderless
                  transparent
                  expanded
                  title-position="left"
                  class="text-xs [&_.vc-header]:!px-2" />
              </ClientOnly>
            </div>
            <div class="space-y-1.5">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Repeat</p>
              <div class="space-y-0.5">
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
            <div class="space-y-1.5">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Reminder</p>
              <div class="space-y-0.5">
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
          <div class="p-4 space-y-5">
            <div class="space-y-1.5">
              <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
              <UiTextarea v-if="!isViewMode" v-model="editableItem.description" placeholder="Add a description..." :rows="3" class="text-sm" />
              <p v-else class="text-sm text-foreground whitespace-pre-wrap">{{ editableItem.description || 'No description.' }}</p>
            </div>

            <template v-if="isTask(editableItem)">
              <div class="space-y-1.5">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Task Status</p>
                <UiPopover v-model:open="taskStatusOpen">
                  <UiPopoverTrigger as-child>
                    <button
                      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                      :class="TASK_STATUS_OPTIONS.find((s) => s.value === editableItem.taskStatus)?.color || 'bg-muted/50'">
                      <Icon :name="TASK_STATUS_OPTIONS.find((s) => s.value === editableItem.taskStatus)?.icon || 'lucide:circle'" class="h-3.5 w-3.5" />
                      {{ TASK_STATUS_OPTIONS.find((s) => s.value === editableItem.taskStatus)?.label || 'Status' }}
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
              </div>
              <div v-if="editableItem.checklist?.length || !isViewMode" class="space-y-1.5">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Checklist</p>
                <div class="space-y-1">
                  <div v-for="(ci, idx) in editableItem.checklist" :key="ci.id" class="flex items-center gap-2">
                    <button
                      class="h-4 w-4 rounded border border-border flex items-center justify-center transition-colors"
                      :class="ci.completed ? 'bg-primary border-primary' : 'hover:border-primary/50'"
                      @click="ci.completed = !ci.completed">
                      <Icon v-if="ci.completed" name="lucide:check" class="h-3 w-3 text-primary-foreground" />
                    </button>
                    <input
                      v-if="!isViewMode"
                      v-model="ci.label"
                      type="text"
                      placeholder="Checklist item..."
                      class="flex-1 bg-transparent text-sm outline-none border-none"
                      :class="ci.completed ? 'line-through text-muted-foreground' : ''" />
                    <span v-else class="flex-1 text-sm" :class="ci.completed ? 'line-through text-muted-foreground' : ''">{{ ci.label }}</span>
                    <button v-if="!isViewMode" class="text-muted-foreground hover:text-destructive" @click="editableItem.checklist?.splice(idx, 1)">
                      <Icon name="lucide:x" class="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <button
                  v-if="!isViewMode"
                  class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  @click="editableItem.checklist = [...(editableItem.checklist || []), { id: `cl-${Date.now()}`, label: '', completed: false, order: editableItem.checklist?.length || 0 }]">
                  <Icon name="lucide:plus" class="h-3 w-3" />
                  Add item
                </button>
              </div>
            </template>

            <template v-if="isEvent(editableItem)">
              <div class="space-y-1.5">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Event Type</p>
                <UiPopover v-model:open="eventTypeOpen">
                  <UiPopoverTrigger as-child>
                    <button
                      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                      :class="EVENT_TYPE_OPTIONS.find((e) => e.value === editableItem.eventType)?.color || 'bg-muted/50'">
                      <Icon :name="EVENT_TYPE_OPTIONS.find((e) => e.value === editableItem.eventType)?.icon || 'lucide:calendar'" class="h-3.5 w-3.5" />
                      {{ EVENT_TYPE_OPTIONS.find((e) => e.value === editableItem.eventType)?.label || 'Type' }}
                    </button>
                  </UiPopoverTrigger>
                  <UiPopoverContent align="start" class="w-44 p-1">
                    <button
                      v-for="opt in EVENT_TYPE_OPTIONS"
                      :key="opt.value"
                      class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                      @click="editableItem.eventType = opt.value as EventType; eventTypeOpen = false">
                      <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                      <span class="flex-1">{{ opt.label }}</span>
                      <Icon v-if="editableItem.eventType === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
                    </button>
                  </UiPopoverContent>
                </UiPopover>
              </div>
              <div class="space-y-1.5">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>
                <UiInput v-if="!isViewMode" v-model="editableItem.location" placeholder="e.g. Conference Room A" class="text-sm" />
                <p v-else class="text-sm">{{ editableItem.location || '—' }}</p>
              </div>
              <div class="space-y-1.5">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conference Link</p>
                <UiInput v-if="!isViewMode" v-model="editableItem.conferenceLink" placeholder="https://..." class="text-sm" />
                <a v-else-if="editableItem.conferenceLink" :href="editableItem.conferenceLink" target="_blank" class="text-sm text-primary underline">
                  {{ editableItem.conferenceLink }}
                </a>
                <p v-else class="text-sm text-muted-foreground">—</p>
              </div>
            </template>

            <template v-if="isTrip(editableItem)">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Origin</p>
                  <UiInput v-if="!isViewMode" v-model="editableItem.origin" placeholder="Departure city" class="text-sm" />
                  <p v-else class="text-sm">{{ editableItem.origin || '—' }}</p>
                </div>
                <div class="space-y-1.5">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Destination</p>
                  <UiInput v-if="!isViewMode" v-model="editableItem.destination" placeholder="Arrival city" class="text-sm" />
                  <p v-else class="text-sm">{{ editableItem.destination || '—' }}</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transportation</p>
                  <UiPopover v-model:open="transportOpen">
                    <UiPopoverTrigger as-child>
                      <button class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-muted/50 hover:bg-muted transition-colors">
                        <Icon :name="TRANSPORT_OPTIONS.find((t) => t.value === editableItem.transportation)?.icon || 'lucide:navigation'" class="h-3.5 w-3.5" />
                        {{ TRANSPORT_OPTIONS.find((t) => t.value === editableItem.transportation)?.label || 'Mode' }}
                      </button>
                    </UiPopoverTrigger>
                    <UiPopoverContent align="start" class="w-40 p-1">
                      <button
                        v-for="opt in TRANSPORT_OPTIONS"
                        :key="opt.value"
                        class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                        @click="editableItem.transportation = opt.value as TransportMode; transportOpen = false">
                        <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                        <span class="flex-1">{{ opt.label }}</span>
                        <Icon v-if="editableItem.transportation === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
                      </button>
                    </UiPopoverContent>
                  </UiPopover>
                </div>
                <div class="space-y-1.5">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trip Status</p>
                  <UiPopover v-model:open="tripStatusOpen">
                    <UiPopoverTrigger as-child>
                      <button
                        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                        :class="TRIP_STATUS_OPTIONS.find((s) => s.value === editableItem.tripStatus)?.color || 'bg-muted/50'">
                        <Icon :name="TRIP_STATUS_OPTIONS.find((s) => s.value === editableItem.tripStatus)?.icon || 'lucide:map'" class="h-3.5 w-3.5" />
                        {{ TRIP_STATUS_OPTIONS.find((s) => s.value === editableItem.tripStatus)?.label || 'Status' }}
                      </button>
                    </UiPopoverTrigger>
                    <UiPopoverContent align="start" class="w-44 p-1">
                      <button
                        v-for="opt in TRIP_STATUS_OPTIONS"
                        :key="opt.value"
                        class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                        @click="editableItem.tripStatus = opt.value as TripStatus; tripStatusOpen = false">
                        <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                        <span class="flex-1">{{ opt.label }}</span>
                        <Icon v-if="editableItem.tripStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
                      </button>
                    </UiPopoverContent>
                  </UiPopover>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</p>
                  <UiInput v-if="!isViewMode" v-model.number="editableItem.budget" type="number" placeholder="0.00" class="text-sm" />
                  <p v-else class="text-sm">{{ editableItem.budget ? `${editableItem.currency || '$'}${editableItem.budget}` : '—' }}</p>
                </div>
                <div class="space-y-1.5">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirmation #</p>
                  <UiInput v-if="!isViewMode" v-model="editableItem.confirmationNumber" placeholder="ABC123" class="text-sm" />
                  <p v-else class="text-sm">{{ editableItem.confirmationNumber || '—' }}</p>
                </div>
              </div>
            </template>

            <template v-if="isPayment(editableItem)">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</p>
                  <UiInput v-if="!isViewMode" v-model.number="editableItem.amount" type="number" placeholder="0.00" class="text-sm" />
                  <p v-else class="text-sm font-medium">{{ editableItem.currency }} {{ editableItem.amount.toFixed(2) }}</p>
                </div>
                <div class="space-y-1.5">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Status</p>
                  <UiPopover v-model:open="paymentStatusOpen">
                    <UiPopoverTrigger as-child>
                      <button
                        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                        :class="PAYMENT_STATUS_OPTIONS.find((s) => s.value === editableItem.paymentStatus)?.color || 'bg-muted/50'">
                        <Icon :name="PAYMENT_STATUS_OPTIONS.find((s) => s.value === editableItem.paymentStatus)?.icon || 'lucide:clock'" class="h-3.5 w-3.5" />
                        {{ PAYMENT_STATUS_OPTIONS.find((s) => s.value === editableItem.paymentStatus)?.label || 'Status' }}
                      </button>
                    </UiPopoverTrigger>
                    <UiPopoverContent align="start" class="w-44 p-1">
                      <button
                        v-for="opt in PAYMENT_STATUS_OPTIONS"
                        :key="opt.value"
                        class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                        @click="editableItem.paymentStatus = opt.value as PaymentStatus; paymentStatusOpen = false">
                        <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                        <span class="flex-1">{{ opt.label }}</span>
                        <Icon v-if="editableItem.paymentStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
                      </button>
                    </UiPopoverContent>
                  </UiPopover>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payee</p>
                  <UiInput v-if="!isViewMode" v-model="editableItem.payee" placeholder="Who to pay" class="text-sm" />
                  <p v-else class="text-sm">{{ editableItem.payee || '—' }}</p>
                </div>
                <div class="space-y-1.5">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Invoice #</p>
                  <UiInput v-if="!isViewMode" v-model="editableItem.invoiceNumber" placeholder="INV-001" class="text-sm" />
                  <p v-else class="text-sm">{{ editableItem.invoiceNumber || '—' }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button
                  v-if="!isViewMode"
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
                  :class="editableItem.recurring ? 'bg-primary/10 text-primary' : 'bg-muted/50 hover:bg-muted text-muted-foreground'"
                  @click="editableItem.recurring = !editableItem.recurring">
                  <Icon name="lucide:repeat" class="h-3.5 w-3.5" />
                  <span>Recurring</span>
                </button>
                <span v-else-if="editableItem.recurring" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs">
                  <Icon name="lucide:repeat" class="h-3.5 w-3.5" /> Recurring
                </span>
              </div>
            </template>

            <template v-if="isNote(editableItem)">
              <div class="space-y-1.5">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content</p>
                <UiTextarea v-if="!isViewMode" v-model="editableItem.content" placeholder="Write your note..." :rows="8" class="text-sm" />
                <div v-else class="text-sm text-foreground whitespace-pre-wrap min-h-[120px] rounded-md border border-border bg-muted/10 p-3">
                  {{ editableItem.content || 'Empty note.' }}
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button
                  v-if="!isViewMode"
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
                  :class="editableItem.pinned ? 'bg-primary/10 text-primary' : 'bg-muted/50 hover:bg-muted text-muted-foreground'"
                  @click="editableItem.pinned = !editableItem.pinned">
                  <Icon name="lucide:pin" class="h-3.5 w-3.5" />
                  <span>{{ editableItem.pinned ? 'Pinned' : 'Pin' }}</span>
                </button>
                <span v-else-if="editableItem.pinned" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs">
                  <Icon name="lucide:pin" class="h-3.5 w-3.5" /> Pinned
                </span>
              </div>
            </template>

            <div v-if="editableItem.attachments.length || !isViewMode" class="space-y-1.5">
              <div class="flex items-center justify-between">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attachments</p>
                <button v-if="!isViewMode" class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" @click="fileUploadOpen = true">
                  <Icon name="lucide:plus" class="h-3 w-3" /> Add
                </button>
              </div>
              <div v-if="editableItem.attachments.length" class="space-y-1">
                <div
                  v-for="att in editableItem.attachments"
                  :key="att.id"
                  class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
                  <div :class="['w-7 h-7 rounded flex items-center justify-center', getAttachmentColor(att.type)]">
                    <Icon :name="getAttachmentIcon(att.type)" class="h-3.5 w-3.5" />
                  </div>
                  <span class="flex-1 text-xs truncate">{{ att.name }}</span>
                </div>
              </div>
              <p v-else class="text-xs text-muted-foreground italic">No attachments</p>
            </div>

            <div v-if="!isNote(editableItem)" class="space-y-1.5">
              <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
              <UiTextarea v-if="!isViewMode" v-model="editableItem.notes" placeholder="Additional notes..." :rows="2" class="text-sm" />
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
      </div>

      <!-- Footer -->
      <div class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between">
        <div class="flex items-center gap-3 text-xs text-muted-foreground">
          <div class="flex items-center gap-2">
            <Icon name="lucide:info" class="h-3.5 w-3.5" />
            <span v-if="editableItem.id && !isCreateMode">ID: {{ editableItem.id }}</span>
            <span v-else>New {{ currentType?.label?.toLowerCase() || 'item' }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
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
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
