<script lang="ts" setup>
  import { buildFolderTree, type FolderTreeNode } from '~/data/mockFolders'

  export type TaskStatus = 'pending' | 'in-progress' | 'on-track' | 'due-soon' | 'overdue' | 'completed'
  export type Priority = 'low' | 'medium' | 'high'
  export type CommentType = 'comment' | 'attachment' | 'status_change' | 'reminder' | 'created'

  export interface CustomField {
    id: string
    name: string
    type: 'text' | 'long-text' | 'file' | 'task-lock' | 'repeating-group' | 'choice'
    value: string | number | boolean
    options?: string[]
  }

  export type TaskSource = 'apptool' | 'ecms' | 'bolcc' | 'audit' | 'neu' | 'permit' | 'vendor' | 'manual'

  export interface TaskData {
    id: string
    title: string
    description?: string
    status: TaskStatus
    priority: Priority
    dueDate: string
    category?: string
    inspectionType?: string
    owner?: string
    involved?: string[]
    folder?: string
    tracked?: 'tracked-corporate' | 'tracked-facility' | 'untracked'
    source?: TaskSource
    notifyGrouping?: 'digest' | 'separate' | 'escalations-separate'
    notifyOnCreate?: boolean
    notifyOnDue?: boolean
    notifyHoursBeforeDue?: number
    taskNeedsCorrectiveAction?: boolean
    notes?: string
    commentCount?: number
    fileCount?: number
    schedule?: string
    reminders?: string[]
    createdAt?: string
    updatedAt?: string
    customFields?: CustomField[]
    scheduleData?: Partial<ScheduleData>
  }

  export interface ScheduleData {
    activeTab: 'date' | 'duration'
    startDate: string
    endDate: string
    allDay: boolean
    reminder: string
    repeat: string
  }

  export interface ActivityItem {
    id: string
    author: string
    avatar?: string
    date: string
    type: CommentType
    content?: string
    filename?: string
    status?: string
  }

  export interface Attachment {
    id: string
    name: string
    type: 'pdf' | 'spreadsheet' | 'image' | 'document' | 'other'
    url?: string
  }

  export interface TaskDialogTemplate {
    id: string
    name: string
    description?: string
    category?: string
    priority?: Priority
    inspectionType?: string
    tracked?: TaskData['tracked']
  }

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'edit' | 'create'
      taskType?: 'suggested' | 'standard' | 'scheduled' | 'template'
      task: TaskData | null
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
      showScheduleSection?: boolean
      activity?: ActivityItem[]
      attachments?: Attachment[]
      categories?: string[]
      owners?: { id: string; name: string }[]
      folders?: string[]
      templates?: TaskDialogTemplate[]
    }>(),
    {
      mode: 'edit',
      taskType: 'standard',
      canNavigatePrev: false,
      canNavigateNext: false,
      showScheduleSection: false,
      activity: () => [],
      attachments: () => [],
      categories: () => ['Air', 'Water', 'Waste', 'SPCC', 'EPCRA', 'Fire Safety', 'General Safety', 'Corp'],
      owners: () => [],
      folders: () => [],
      templates: () => [],
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    save: [task: TaskData]
    edit: []
    navigatePrev: []
    navigateNext: []
    addAttachment: []
    addComment: [comment: string]
    markNotApplicable: [task: TaskData]
    alreadyResolved: [task: TaskData]
    alreadyHaveTask: [task: TaskData]
    createTask: [task: TaskData]
    createSchedule: [task: TaskData]
    saveAsTemplate: [task: TaskData]
  }>()

  const getToday = () => new Date().toISOString().split('T')[0] ?? ''

  const mode = computed(() => props.mode)
  const taskType = computed(() => props.taskType)
  const owners = computed(() => props.owners ?? [])
  const categories = computed(() => props.categories ?? [])
  const folders = computed(() => props.folders ?? [])
  const templates = computed(() => props.templates ?? [])

  const defaultTask: TaskData = {
    id: '',
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: getToday(),
    category: 'General Safety',
    owner: '',
    involved: [],
    folder: '',
    tracked: 'untracked',
    notifyGrouping: 'digest',
    notifyOnCreate: false,
    notifyOnDue: true,
    notifyHoursBeforeDue: 0,
    customFields: [],
    scheduleData: {
      activeTab: 'date',
      startDate: getToday(),
      endDate: getToday(),
      allDay: true,
      reminder: 'on-the-day',
      repeat: 'none',
    },
  }

  const editableTask = reactive<TaskData>({ ...defaultTask })

  watch(
    () => props.task,
    (newTask) => {
      if (newTask) {
        Object.assign(editableTask, {
          ...defaultTask,
          ...newTask,
          customFields: newTask.customFields || [],
          scheduleData: newTask.scheduleData || {
            activeTab: 'date',
            startDate: newTask.dueDate || getToday(),
            endDate: newTask.dueDate || getToday(),
            allDay: true,
            reminder: 'on-the-day',
            repeat: newTask.schedule ? 'weekly' : 'none',
          },
        })
      } else if (props.mode === 'create') {
        Object.assign(editableTask, { ...defaultTask, id: `task-${Date.now()}` })
      }
    },
    { immediate: true, deep: true },
  )

  // Calendar date selection
  const selectedCalendarDate = computed({
    get: () => (editableTask.dueDate ? new Date(editableTask.dueDate + 'T00:00:00') : new Date()),
    set: (val: Date | null) => {
      if (val) {
        // Use local date to avoid timezone offset issues
        const year = val.getFullYear()
        const month = String(val.getMonth() + 1).padStart(2, '0')
        const day = String(val.getDate()).padStart(2, '0')
        editableTask.dueDate = `${year}-${month}-${day}`
        if (editableTask.scheduleData) {
          editableTask.scheduleData.startDate = editableTask.dueDate
        }
      }
    },
  })
  const newComment = ref('')
  const _statusOpen = ref(false)
  const categoryOpen = ref(false)
  const ownerOpen = ref(false)
  const involvedOpen = ref(false)
  const trackedOpen = ref(false)
  const folderOpen = ref(false)
  const templateOpen = ref(false)
  const activeScheduleTab = ref<'reminder' | 'repeat'>('repeat')
  const schedulePopoverOpen = ref(false)

  // Search refs for searchable dropdowns
  const categorySearch = ref('')
  const ownerSearch = ref('')
  const folderSearch = ref('')
  const involvedSearch = ref('')

  // Computed properties for unset state detection
  const isOwnerUnset = computed(() => !editableTask.owner)
  const isFolderUnset = computed(() => !editableTask.folder)
  const isInvolvedUnset = computed(() => !editableTask.involved?.length)
  const isCategoryUnset = computed(() => !editableTask.category)

  // Filtered lists for searchable dropdowns
  const filteredCategories = computed(() => {
    if (!categorySearch.value) return categories.value
    const search = categorySearch.value.toLowerCase()
    return categories.value.filter((cat) => cat.toLowerCase().includes(search))
  })

  const filteredOwners = computed(() => {
    if (!ownerSearch.value) return owners.value
    const search = ownerSearch.value.toLowerCase()
    return owners.value.filter((owner) => owner.name.toLowerCase().includes(search))
  })

  const filteredFolders = computed(() => {
    if (!folderSearch.value) return folders.value
    const search = folderSearch.value.toLowerCase()
    return folders.value.filter((folder) => folder.toLowerCase().includes(search))
  })

  // Folder tree - use shared mock data
  const folderTree = computed<FolderTreeNode[]>(() => buildFolderTree())

  const expandedFolders = ref<Set<string>>(new Set(['folder_compliance', 'folder_air-quality', 'folder_safety']))

  // Flatten tree for rendering with depth info
  interface FlatFolderItem {
    node: FolderTreeNode
    depth: number
  }

  const flattenedFolders = computed<FlatFolderItem[]>(() => {
    const result: FlatFolderItem[] = []

    const flatten = (nodes: FolderTreeNode[], depth: number) => {
      nodes.forEach((node) => {
        result.push({ node, depth })
        if (node.children?.length && expandedFolders.value.has(node.folderID)) {
          flatten(node.children, depth + 1)
        }
      })
    }

    flatten(folderTree.value, 0)
    return result
  })

  const toggleFolderExpand = (folderId: string) => {
    if (expandedFolders.value.has(folderId)) {
      expandedFolders.value.delete(folderId)
    } else {
      expandedFolders.value.add(folderId)
    }
  }

  const filteredInvolvedOwners = computed(() => {
    if (!involvedSearch.value) return owners.value
    const search = involvedSearch.value.toLowerCase()
    return owners.value.filter((owner) => owner.name.toLowerCase().includes(search))
  })

  // Notification method (matching ecms notifyGrouping)
  type NotifyMethod = 'digest' | 'separate' | 'escalations-separate'
  const selectedNotifyMethod = ref<NotifyMethod>('digest')
  const notifyMethodOptions: { value: NotifyMethod; label: string; description: string; icon: string }[] = [
    { value: 'digest', label: 'Daily Digest', description: 'Bundled in daily summary email', icon: 'lucide:mail' },
    { value: 'separate', label: 'Standalone Email', description: 'Individual email per reminder', icon: 'lucide:send' },
    {
      value: 'escalations-separate',
      label: 'Escalations',
      description: 'Escalate through hierarchy',
      icon: 'lucide:trending-up',
    },
  ]

  // Reminder timing presets
  type ReminderPreset = 'on-the-day' | '1-day-early' | '2-days-early' | '3-days-early' | '1-week-early' | 'custom'
  const selectedReminder = ref<ReminderPreset>('on-the-day')
  const reminderPresets: { value: ReminderPreset; label: string; time?: string }[] = [
    { value: 'on-the-day', label: 'On the day', time: '09:00' },
    { value: '1-day-early', label: '1 day early', time: '09:00' },
    { value: '2-days-early', label: '2 days early', time: '09:00' },
    { value: '3-days-early', label: '3 days early', time: '09:00' },
    { value: '1-week-early', label: '1 week early', time: '09:00' },
    { value: 'custom', label: 'Custom' },
  ]
  const reminderCustom = reactive({
    unit: 'Day' as 'Day' | 'Week',
    daysInAdvance: 1,
    time: '09:00',
  })

  type SchedulePreset = { id: string; label: string; reminder: ReminderPreset; repeat: RepeatPreset }
  const baseSchedulePresets: SchedulePreset[] = [
    { id: 'weekly-1d', label: 'Weekly • 1 day early', reminder: '1-day-early', repeat: 'weekly' },
    { id: 'monthly-1w', label: 'Monthly • 1 week early', reminder: '1-week-early', repeat: 'monthly' },
    { id: 'daily-day', label: 'Daily • On the day', reminder: 'on-the-day', repeat: 'daily' },
    { id: 'weekday-1d', label: 'Weekdays • 1 day early', reminder: '1-day-early', repeat: 'every-weekday' },
  ]
  const customSchedulePresets = ref<SchedulePreset[]>([])
  const schedulePresetName = ref('')
  const selectedSchedulePresetId = ref('')
  const allSchedulePresets = computed(() => [...baseSchedulePresets, ...customSchedulePresets.value])
  const canSavePreset = computed(() => schedulePresetName.value.trim().length > 0)

  // Repeat presets (matching ScheduleConfig)
  type RepeatPreset = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'every-weekday' | 'custom' | 'none'
  const selectedRepeat = ref<RepeatPreset>('none')
  const repeatPresets: { value: RepeatPreset; label: string; subLabel?: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'every-weekday', label: 'Every Weekday', subLabel: '(Mon-Fri)' },
    { value: 'custom', label: 'Custom' },
  ]
  const repeatCustom = reactive({
    interval: 1,
    unit: 'Week' as 'Day' | 'Week' | 'Month' | 'Year',
    weekdays: [] as number[],
  })
  const weekdayShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const selectReminder = (preset: ReminderPreset) => {
    selectedReminder.value = preset
  }

  const selectRepeat = (preset: RepeatPreset) => {
    selectedRepeat.value = preset
  }

  const applySchedulePreset = (preset: SchedulePreset) => {
    selectedReminder.value = preset.reminder
    selectedRepeat.value = preset.repeat
  }

  const applySchedulePresetById = (id: string) => {
    const preset = allSchedulePresets.value.find((item) => item.id === id)
    if (preset) applySchedulePreset(preset)
  }

  const saveSchedulePreset = () => {
    const name = schedulePresetName.value.trim()
    if (!name) return
    customSchedulePresets.value.push({
      id: `custom-${Date.now()}`,
      label: name,
      reminder: selectedReminder.value,
      repeat: selectedRepeat.value,
    })
    schedulePresetName.value = ''
  }

  watch(selectedSchedulePresetId, (id) => {
    if (!id) return
    applySchedulePresetById(id)
    selectedSchedulePresetId.value = ''
  })

  const toggleWeekday = (day: number) => {
    const idx = repeatCustom.weekdays.indexOf(day)
    if (idx === -1) {
      repeatCustom.weekdays.push(day)
    } else {
      repeatCustom.weekdays.splice(idx, 1)
    }
  }

  const clearRepeat = () => {
    selectedRepeat.value = 'none'
  }

  watch(
    () => props.task,
    () => {
      const repeat = editableTask.scheduleData?.repeat
      if (repeat && repeatPresets.some((r) => r.value === repeat)) {
        selectedRepeat.value = repeat as RepeatPreset
      } else if (repeat === 'none' || !repeat) {
        selectedRepeat.value = 'none'
      }

      const reminder = editableTask.scheduleData?.reminder
      if (reminder && reminderPresets.some((r) => r.value === reminder)) {
        selectedReminder.value = reminder as ReminderPreset
      }
    },
    { immediate: true, deep: true },
  )

  watch(selectedRepeat, (val) => {
    ensureScheduleData()
    if (!editableTask.scheduleData) return
    editableTask.scheduleData.repeat = val
  })

  watch(selectedReminder, (val) => {
    ensureScheduleData()
    if (!editableTask.scheduleData) return
    editableTask.scheduleData.reminder = val
  })

  const getRepeatDisplayText = computed(() => {
    if (selectedRepeat.value === 'none') return 'None'
    if (selectedRepeat.value === 'custom') {
      if (repeatCustom.unit === 'Week' && repeatCustom.weekdays.length) {
        return `Weekly on ${repeatCustom.weekdays.map((d) => weekdayShort[d]).join(', ')}`
      }
      return `Every ${repeatCustom.interval} ${repeatCustom.unit.toLowerCase()}${repeatCustom.interval > 1 ? 's' : ''}`
    }
    return repeatPresets.find((p) => p.value === selectedRepeat.value)?.label || ''
  })

  type TrackedType = 'tracked-corporate' | 'tracked-facility' | 'untracked'
  const trackedOptions: { value: TrackedType; label: string; icon: string; color: string }[] = [
    {
      value: 'tracked-corporate',
      label: 'Tracked (Corporate)',
      icon: 'lucide:building-2',
      color: 'bg-violet-100 text-violet-700',
    },
    {
      value: 'tracked-facility',
      label: 'Tracked (Facility)',
      icon: 'lucide:warehouse',
      color: 'bg-blue-100 text-blue-700',
    },
    { value: 'untracked', label: 'Untracked', icon: 'lucide:eye-off', color: 'hover:bg-muted text-muted-foreground' },
  ]

  const notifyGroupingOptions: { value: NonNullable<TaskData['notifyGrouping']>; label: string }[] = [
    { value: 'digest', label: 'Digest' },
    { value: 'separate', label: 'Separate' },
    { value: 'escalations-separate', label: 'Escalations' },
  ]

  const ensureScheduleData = () => {
    if (editableTask.scheduleData) return
    editableTask.scheduleData = {
      activeTab: 'date',
      startDate: editableTask.dueDate || getToday(),
      endDate: editableTask.dueDate || getToday(),
      allDay: true,
      reminder: 'on-the-day',
      repeat: 'none',
    }
  }

  const autoSchedulingEnabled = computed({
    get: () => (editableTask.scheduleData?.activeTab ?? 'date') === 'duration',
    set: (val: boolean) => {
      ensureScheduleData()
      if (!editableTask.scheduleData) return
      editableTask.scheduleData.activeTab = val ? 'duration' : 'date'
    },
  })

  // Calendar attributes for mini calendar (with popover labels)
  const calendarAttributes = computed(() => {
    const attrs: any[] = []

    // Selected date highlight
    if (selectedCalendarDate.value) {
      attrs.push({
        key: 'selected',
        highlight: true,
        popover: { label: 'Selected date' },
        dates: selectedCalendarDate.value,
      })
    }

    // Task occurrences
    const occurrences = getTaskOccurrences(editableTask)
    if (occurrences.length) {
      attrs.push({
        key: 'occurrences',
        dot: 'blue',
        popover: { label: 'Task occurrence' },
        dates: occurrences,
      })
    }

    // Due date
    if (editableTask.dueDate) {
      attrs.push({
        key: 'due',
        highlight: { color: 'blue', fillMode: 'light' },
        popover: { label: `Due: ${editableTask.title || 'Task'}` },
        dates: editableTask.dueDate,
      })
    }

    return attrs
  })

  const NONE_TEMPLATE_ID = '__none__'
  const selectedTemplateId = ref<string>(NONE_TEMPLATE_ID)

  const applySelectedTemplate = () => {
    const tmpl = templates.value.find((t) => t.id === selectedTemplateId.value)
    if (tmpl) {
      editableTask.title = tmpl.name
      editableTask.description = tmpl.description || ''
      editableTask.category = tmpl.category || 'General Safety'
      editableTask.priority = tmpl.priority || 'medium'
    }
  }

  watch(selectedTemplateId, applySelectedTemplate)

  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }

  const handleSave = () => {
    emit('save', { ...editableTask })
    closeDialog()
  }

  const handleAddComment = () => {
    if (newComment.value.trim()) {
      emit('addComment', newComment.value.trim())
      newComment.value = ''
    }
  }

  const addCustomField = () => {
    editableTask.customFields = editableTask.customFields || []
    editableTask.customFields.unshift({
      id: `cf-${Date.now()}`,
      name: '',
      type: 'text',
      value: '',
    })
  }

  const removeCustomField = (id: string) => {
    editableTask.customFields = (editableTask.customFields || []).filter((f) => f.id !== id)
  }

  const _handleScheduleUpdate = (data: Partial<ScheduleData>) => {
    editableTask.scheduleData = data
    if (data.startDate) {
      editableTask.dueDate = data.startDate
    }
  }

  // Style mappings
  const _statusOptions: { value: TaskStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: 'bg-blue-100 text-blue-700' },
    { value: 'in-progress', label: 'In Progress', color: 'bg-violet-100 text-violet-700' },
    { value: 'on-track', label: 'Due Later', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'due-soon', label: 'Due Soon', color: 'bg-amber-100 text-amber-700' },
    { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-700' },
    { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-600' },
  ]

  const _statusColors: Record<string, string> = {
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'due-soon': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'on-track': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'in-progress': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  }

  const _categoryColors: Record<string, string> = {
    Air: 'bg-sky-100 text-sky-700',
    Water: 'bg-blue-100 text-blue-700',
    Waste: 'bg-amber-100 text-amber-700',
    EPCRA: 'bg-violet-100 text-violet-700',
    SPCC: 'bg-cyan-100 text-cyan-700',
    'Fire Safety': 'bg-rose-100 text-rose-700',
    'General Safety': 'bg-orange-100 text-orange-700',
    Corp: 'bg-gray-100 text-gray-700',
  }

  const _formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    if (diffDays === -1) return 'Due yesterday'
    if (diffDays > 1) return `Due in ${diffDays} days`
    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`
    return `Due ${dateStr}`
  }

  const _isOverdue = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    return date.getTime() < now.getTime()
  }

  const toggleInvolvedUser = (uid: string) => {
    editableTask.involved = editableTask.involved || []
    const idx = editableTask.involved.indexOf(uid)
    if (idx === -1) editableTask.involved.push(uid)
    else editableTask.involved.splice(idx, 1)
  }

  const getAttachmentIcon = (type: Attachment['type']) => {
    const icons: Record<Attachment['type'], string> = {
      pdf: 'lucide:file-text',
      spreadsheet: 'lucide:file-spreadsheet',
      image: 'lucide:image',
      document: 'lucide:file',
      other: 'lucide:file',
    }
    return icons[type] || 'lucide:file'
  }

  const getAttachmentColor = (type: Attachment['type']) => {
    const colors: Record<Attachment['type'], string> = {
      pdf: 'text-rose-600 bg-rose-500/10',
      spreadsheet: 'text-green-600 bg-green-500/10',
      image: 'text-violet-600 bg-violet-500/10',
      document: 'text-blue-600 bg-blue-500/10',
      other: 'text-gray-600 bg-gray-500/10',
    }
    return colors[type] || 'text-gray-600 bg-gray-500/10'
  }

  const displayAttachments = computed(() => {
    if (props.attachments.length > 0) return props.attachments
    // Mock attachments for demo
    return [
      { id: 'att-1', name: 'Inspection_Checklist.pdf', type: 'pdf' as const },
      { id: 'att-2', name: 'Air_Quality_Data.xlsx', type: 'spreadsheet' as const },
    ]
  })

  const fileUploadOpen = ref(false)
  const handleAddAttachment = () => {
    fileUploadOpen.value = true
  }

  const repeatingGroupConfigOpen = ref(false)
  const activeRepeatingGroupFieldId = ref<string | null>(null)
  const repeatingGroupConfig = reactive({
    name: '',
    helpText: '',
    groups: [] as { id: string; name: string }[],
    templateFields: [] as { id: string; name: string; type: 'choice' | 'text' | 'image' | 'file' }[],
  })

  const openRepeatingGroupConfig = (fieldId: string) => {
    activeRepeatingGroupFieldId.value = fieldId
    repeatingGroupConfigOpen.value = true
  }

  const handleRepeatingGroupSave = (config: typeof repeatingGroupConfig) => {
    Object.assign(repeatingGroupConfig, config)
  }

  const displayActivity = computed(() => {
    if (props.activity.length > 0) return props.activity
    return [
      {
        id: '1',
        author: 'System',
        type: 'created' as const,
        date: editableTask.createdAt || 'Just now',
      },
    ]
  })

  const isFormValid = computed(() => {
    return editableTask.title?.trim() && editableTask.dueDate && editableTask.owner
  })

  // Check if task is completely blank (no user edits) - used to show/hide template picker
  const _isTaskBlank = computed(() => {
    return (
      !editableTask.title?.trim() &&
      !editableTask.description?.trim() &&
      !editableTask.owner &&
      !editableTask.involved?.length &&
      !editableTask.customFields?.length
    )
  })

  const customFieldTypes = [
    { value: 'text', label: 'text', icon: 'lucide:type' },
    { value: 'long-text', label: 'long text', icon: 'lucide:align-left' },
    { value: 'choice', label: 'choice', icon: 'lucide:list' },
    { value: 'file', label: 'file upload', icon: 'lucide:upload' },
    { value: 'task-lock', label: 'task completion lock', icon: 'lucide:lock' },
    { value: 'repeating-group', label: 'repeating question group', icon: 'lucide:layers' },
  ]

  const hasTaskLock = computed(() => {
    return editableTask.customFields?.some((f) => f.type === 'task-lock')
  })

  const getTaskOccurrences = (task: TaskData) => {
    const occurrences: Date[] = []
    const startDate = new Date(task.dueDate)
    const schedule = task.schedule?.toLowerCase() || task.scheduleData?.repeat || 'none'

    if (schedule === 'none' || !schedule) {
      occurrences.push(startDate)
      return occurrences
    }

    let intervalDays = 7
    if (schedule === 'daily') intervalDays = 1
    else if (schedule === 'weekly') intervalDays = 7
    else if (schedule === 'monthly') intervalDays = 30
    else if (schedule === 'quarterly') intervalDays = 90
    else if (schedule === 'annually' || schedule === 'yearly') intervalDays = 365

    for (let i = 0; i < 12; i++) {
      const occurrence = new Date(startDate)
      occurrence.setDate(startDate.getDate() + i * intervalDays)
      occurrences.push(occurrence)
    }

    return occurrences
  }

  const hasSchedule = computed(() => {
    return editableTask.schedule || (editableTask.scheduleData?.repeat && editableTask.scheduleData.repeat !== 'none')
  })

  const scheduleLabel = computed(() => {
    if (editableTask.schedule) return editableTask.schedule
    const repeat = editableTask.scheduleData?.repeat
    if (!repeat || repeat === 'none') return null
    return repeat.charAt(0).toUpperCase() + repeat.slice(1)
  })

  const scheduleDescription = computed(() => {
    const dueDate = new Date(editableTask.dueDate)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const repeat = editableTask.schedule?.toLowerCase() || editableTask.scheduleData?.repeat || 'none'

    let scheduleText = ''
    if (repeat === 'daily') {
      scheduleText = 'Every day'
    } else if (repeat === 'weekly') {
      const dayName = dueDate.toLocaleDateString('en-US', { weekday: 'long' })
      scheduleText = `Every ${dayName}`
    } else if (repeat === 'monthly') {
      const dayOfMonth = dueDate.getDate()
      const suffix = dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th'
      scheduleText = `Every ${dayOfMonth}${suffix} of the month`
    } else if (repeat === 'quarterly') {
      scheduleText = 'Every quarter'
    } else if (repeat === 'annually' || repeat === 'yearly') {
      const monthDay = dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      scheduleText = `Every year on ${monthDay}`
    } else {
      scheduleText = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    let statusText = ''
    if (diffDays < 0) {
      statusText = `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`
    } else if (diffDays === 0) {
      statusText = 'Due today'
    } else if (diffDays === 1) {
      statusText = 'Due tomorrow'
    } else if (diffDays <= 7) {
      statusText = `Due in ${diffDays} days`
    } else {
      statusText = `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }

    return { scheduleText, statusText, isOverdue: diffDays < 0, isRecurring: repeat !== 'none' && repeat }
  })

  // Escalation schedule based on ecms data model
  interface EscalationStep {
    id: string
    role: string
    icon: string
    daysFromDue: number
    date: string
    status: 'pending' | 'active' | 'completed'
    description: string
  }

  const escalationSchedule = computed((): EscalationStep[] => {
    if (editableTask.tracked === 'untracked') return []

    const dueDate = new Date(editableTask.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const addDays = (date: Date, days: number) => {
      const result = new Date(date)
      result.setDate(result.getDate() + days)
      return result
    }

    const formatDate = (date: Date) =>
      date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

    const getStatus = (date: Date): 'pending' | 'active' | 'completed' => {
      const dateOnly = new Date(date)
      dateOnly.setHours(0, 0, 0, 0)
      if (dateOnly < today) return 'completed'
      if (dateOnly.getTime() === today.getTime()) return 'active'
      return 'pending'
    }

    const steps: EscalationStep[] = [
      {
        id: 'env-manager',
        role: 'Facility Environmental Manager',
        icon: 'lucide:leaf',
        daysFromDue: -3,
        date: formatDate(addDays(dueDate, -3)),
        status: getStatus(addDays(dueDate, -3)),
        description: '3 days before due',
      },
      {
        id: 'safety-manager',
        role: 'Facility Safety Manager',
        icon: 'lucide:hard-hat',
        daysFromDue: -3,
        date: formatDate(addDays(dueDate, -3)),
        status: getStatus(addDays(dueDate, -3)),
        description: '3 days before due',
      },
      {
        id: 'general-manager',
        role: 'Facility General Manager',
        icon: 'lucide:briefcase',
        daysFromDue: 0,
        date: formatDate(dueDate),
        status: getStatus(dueDate),
        description: 'On due date',
      },
    ]

    // Corporate escalation only for tracked-corporate
    if (editableTask.tracked === 'tracked-corporate') {
      steps.push({
        id: 'corp-env-manager',
        role: 'Corporate Environmental Manager',
        icon: 'lucide:building-2',
        daysFromDue: 1,
        date: formatDate(addDays(dueDate, 1)),
        status: getStatus(addDays(dueDate, 1)),
        description: '1 day after due',
      })
    }

    return steps
  })

  const isTracked = computed(() => editableTask.tracked !== 'untracked')
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :hide-close="true"
      class="w-[min(1180px,calc(100vw-4rem))]! max-w-[min(1180px,calc(100vw-4rem))]! h-[min(750px,calc(100vh-4rem))] max-h-[min(750px,calc(100vh-4rem))] p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col gap-0">
      <UiDialogTitle class="sr-only">{{ mode === 'create' ? 'Create Task' : (localTask?.title || 'Task Details') }}</UiDialogTitle>
      <UiDialogDescription class="sr-only">{{ mode === 'create' ? 'Create a new task' : 'View and edit task details' }}</UiDialogDescription>
      <!-- Full-Width Header: Title/Description with Date Badge -->
      <div class="shrink-0 border-b border-border">
        <div class="px-4 pt-4 pb-3">
          <!-- Top row: Date badge + Template picker + Navigation -->
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-2 min-w-0">
              <!-- Date Badge with Popover (hidden for create mode - use sidebar calendar) -->
              <UiPopover v-if="mode === 'edit'" v-model:open="schedulePopoverOpen">
                <UiPopoverTrigger as-child>
                  <button
                    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    :class="
                      scheduleDescription.isOverdue
                        ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    ">
                    <Icon
                      :name="scheduleDescription.isRecurring ? 'lucide:repeat' : 'lucide:calendar'"
                      class="h-4 w-4" />
                    <span>{{ scheduleDescription.scheduleText }}</span>
                    <span class="text-xs opacity-75">({{ scheduleDescription.statusText }})</span>
                    <Icon
                      :name="schedulePopoverOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                      class="h-3.5 w-3.5 opacity-60" />
                  </button>
                </UiPopoverTrigger>
                <UiPopoverContent align="start" class="w-80 p-0 max-h-[70vh] overflow-y-auto">
                  <!-- Schedule Popover Content -->
                  <div class="p-3 space-y-3">
                    <!-- Schedule Header -->
                    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Schedule</p>

                    <div
                      class="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-2 py-2">
                      <div class="min-w-0">
                        <p class="text-[10px] font-medium">Automatic scheduling</p>
                        <p class="text-[9px] text-muted-foreground">Use a relative schedule instead of manual dates</p>
                      </div>
                      <UiSwitch v-model:checked="autoSchedulingEnabled" />
                    </div>

                    <div v-if="mode === 'create'" class="space-y-3">
                      <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Notifications</p>
                      <div class="space-y-1.5">
                        <div
                          class="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-2 py-2">
                          <div class="min-w-0">
                            <p class="text-[10px] font-medium">Notify on create</p>
                            <p class="text-[9px] text-muted-foreground">Send an email when this task is created</p>
                          </div>
                          <UiSwitch v-model:checked="editableTask.notifyOnCreate" />
                        </div>
                        <div
                          class="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-2 py-2">
                          <div class="min-w-0">
                            <p class="text-[10px] font-medium">Notify on due date</p>
                            <p class="text-[9px] text-muted-foreground">Send an email on the due date</p>
                          </div>
                          <UiSwitch v-model:checked="editableTask.notifyOnDue" />
                        </div>
                        <div
                          class="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-2 py-2">
                          <div class="min-w-0">
                            <p class="text-[10px] font-medium">Lead time</p>
                            <p class="text-[9px] text-muted-foreground">Escalate if not done X hours before due</p>
                          </div>
                          <UiInput
                            v-model.number="editableTask.notifyHoursBeforeDue"
                            type="number"
                            min="0"
                            class="w-14 h-7 text-[10px] text-center bg-muted/30" />
                        </div>
                      </div>

                      <div class="space-y-1.5">
                        <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Grouping</p>
                        <div class="flex flex-wrap gap-1">
                          <button
                            v-for="opt in notifyGroupingOptions"
                            :key="opt.value"
                            type="button"
                            class="px-2 py-1 rounded-md text-[10px] border border-border hover:bg-muted/50 transition-colors"
                            :class="
                              editableTask.notifyGrouping === opt.value
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-card'
                            "
                            @click="editableTask.notifyGrouping = opt.value">
                            {{ opt.label }}
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Preset Templates -->
                    <div class="pt-2 border-t border-border space-y-2">
                      <div class="flex items-center justify-between">
                        <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Presets</p>
                        <button
                          type="button"
                          class="text-[10px] text-muted-foreground hover:text-foreground"
                          @click="saveSchedulePreset">
                          Save preset
                        </button>
                      </div>
                      <div class="flex items-center gap-2">
                        <UiSelect v-model="selectedSchedulePresetId">
                          <UiSelectTrigger class="text-[10px] flex-1 bg-card">
                            <UiSelectValue placeholder="Select preset" />
                          </UiSelectTrigger>
                          <UiSelectContent>
                            <UiSelectItem v-for="preset in allSchedulePresets" :key="preset.id" :value="preset.id">
                              {{ preset.label }}
                            </UiSelectItem>
                          </UiSelectContent>
                        </UiSelect>
                        <UiInput
                          v-model="schedulePresetName"
                          placeholder="Preset name"
                          class="h-9 text-[10px] flex-1 bg-muted/20" />
                        <UiButton
                          size="sm"
                          class="h-9 px-2 text-[10px]"
                          :disabled="!canSavePreset"
                          @click="saveSchedulePreset">
                          Save
                        </UiButton>
                      </div>
                    </div>

                    <!-- Accordion Sections -->
                    <div class="space-y-1 pt-2 border-t border-border">
                      <!-- Reminder Accordion -->
                      <UiCollapsible
                        class="group"
                        :open="activeScheduleTab === 'reminder'"
                        @update:open="(val) => (activeScheduleTab = val ? 'reminder' : 'repeat')">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between py-2 px-1 hover:bg-muted/50 rounded-md transition-colors">
                          <div class="flex items-center gap-2">
                            <Icon name="lucide:bell" class="h-3.5 w-3.5 text-muted-foreground" />
                            <span class="text-xs font-medium">Reminder</span>
                            <span
                              class="inline-flex items-center rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {{ reminderPresets.find((p) => p.value === selectedReminder)?.label || 'None' }}
                            </span>
                          </div>
                          <Icon
                            name="lucide:chevron-right"
                            class="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                        </UiCollapsibleTrigger>
                        <UiCollapsibleContent class="px-1 pb-2 pt-1 space-y-3">
                          <!-- Notification Method -->
                          <div class="space-y-1.5">
                            <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                              Delivery Method
                            </span>
                            <div class="grid gap-1">
                              <button
                                v-for="method in notifyMethodOptions"
                                :key="method.value"
                                type="button"
                                class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors"
                                :class="
                                  selectedNotifyMethod === method.value
                                    ? 'bg-primary/10 ring-1 ring-primary/30'
                                    : 'hover:bg-muted/50'
                                "
                                @click="selectedNotifyMethod = method.value">
                                <Icon :name="method.icon" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div class="flex-1 min-w-0">
                                  <p class="text-[11px] font-medium">{{ method.label }}</p>
                                  <p class="text-[10px] text-muted-foreground">{{ method.description }}</p>
                                </div>
                                <Icon
                                  v-if="selectedNotifyMethod === method.value"
                                  name="lucide:check"
                                  class="h-3.5 w-3.5 text-primary shrink-0" />
                              </button>
                            </div>
                          </div>

                          <!-- Reminder Timing -->
                          <div class="space-y-1.5 pt-2 border-t border-border/50">
                            <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                              Timing
                            </span>
                            <div class="grid gap-0.5">
                              <button
                                v-for="preset in reminderPresets"
                                :key="preset.value"
                                type="button"
                                class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] hover:bg-muted/50 transition-colors"
                                :class="selectedReminder === preset.value ? 'bg-muted/50' : ''"
                                @click="selectReminder(preset.value)">
                                <span>{{ preset.label }}</span>
                                <div class="flex items-center gap-1.5">
                                  <span v-if="preset.time && preset.value !== 'custom'" class="text-muted-foreground">
                                    ({{ preset.time }})
                                  </span>
                                  <Icon
                                    v-if="selectedReminder === preset.value"
                                    name="lucide:check"
                                    class="h-3 w-3 text-primary" />
                                </div>
                              </button>
                            </div>
                          </div>

                          <!-- Custom Reminder Options -->
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
                              <UiInput
                                v-model="reminderCustom.time"
                                type="time"
                                class="flex-1 h-6 text-[10px] bg-muted/30" />
                            </div>
                          </div>
                        </UiCollapsibleContent>
                      </UiCollapsible>

                      <!-- Repeat Accordion -->
                      <UiCollapsible
                        class="group"
                        :open="activeScheduleTab === 'repeat'"
                        @update:open="(val) => (activeScheduleTab = val ? 'repeat' : 'reminder')">
                        <UiCollapsibleTrigger
                          class="flex w-full items-center justify-between py-2 px-1 hover:bg-muted/50 rounded-md transition-colors">
                          <div class="flex items-center gap-2">
                            <Icon name="lucide:repeat" class="h-3.5 w-3.5 text-muted-foreground" />
                            <span class="text-xs font-medium">Repeat</span>
                            <span
                              class="inline-flex items-center rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {{ selectedRepeat !== 'none' ? getRepeatDisplayText : 'None' }}
                            </span>
                          </div>
                          <div class="flex items-center gap-1">
                            <button
                              v-if="selectedRepeat !== 'none'"
                              type="button"
                              class="p-0.5 hover:bg-muted rounded"
                              @click.stop="clearRepeat">
                              <Icon name="lucide:x" class="h-3 w-3 text-muted-foreground" />
                            </button>
                            <Icon
                              name="lucide:chevron-right"
                              class="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                          </div>
                        </UiCollapsibleTrigger>
                        <UiCollapsibleContent class="px-1 pb-2 pt-1 space-y-1">
                          <!-- Repeat Presets -->
                          <button
                            v-for="preset in repeatPresets"
                            :key="preset.value"
                            type="button"
                            class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] hover:bg-muted/50 transition-colors"
                            :class="selectedRepeat === preset.value ? 'bg-muted/50' : ''"
                            @click="selectRepeat(preset.value)">
                            <div class="flex items-center gap-1.5">
                              <span>{{ preset.label }}</span>
                              <span v-if="preset.subLabel" class="text-muted-foreground">{{ preset.subLabel }}</span>
                            </div>
                            <Icon
                              v-if="selectedRepeat === preset.value"
                              name="lucide:check"
                              class="h-3 w-3 text-primary" />
                          </button>
                          <!-- Custom Repeat Options -->
                          <div
                            v-if="selectedRepeat === 'custom'"
                            class="space-y-2 rounded-md border border-border/60 bg-muted/10 p-2">
                            <!-- Every X Unit -->
                            <div class="flex items-center gap-1.5">
                              <span class="text-[10px] text-muted-foreground">Every</span>
                              <UiInput
                                v-model.number="repeatCustom.interval"
                                type="number"
                                min="1"
                                class="w-16 h-6 text-[10px] text-center bg-muted/30 py-4" />
                              <UiSelect v-model="repeatCustom.unit">
                                <UiSelectTrigger class="h-6 text-[10px] flex-1">
                                  <UiSelectValue />
                                </UiSelectTrigger>
                                <UiSelectContent>
                                  <UiSelectItem value="Day">
                                    {{ `Day${repeatCustom.interval > 1 ? `s` : ''}` }}
                                  </UiSelectItem>
                                  <UiSelectItem value="Week">
                                    {{ `Week${repeatCustom.interval > 1 ? `s` : ''}` }}
                                  </UiSelectItem>
                                  <UiSelectItem value="Month">
                                    {{ `Month${repeatCustom.interval > 1 ? `s` : ''}` }}
                                  </UiSelectItem>
                                  <UiSelectItem value="Year">
                                    {{ `Year${repeatCustom.interval > 1 ? `s` : ''}` }}
                                  </UiSelectItem>
                                </UiSelectContent>
                              </UiSelect>
                            </div>
                            <!-- Weekday Picker (for Week unit) -->
                            <div v-if="repeatCustom.unit === 'Week'" class="flex gap-1 justify-center">
                              <button
                                v-for="(day, idx) in weekdayShort"
                                :key="idx"
                                type="button"
                                class="w-6 h-6 rounded-full text-[10px] font-medium transition-colors"
                                :class="
                                  repeatCustom.weekdays.includes(idx)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/40 hover:bg-muted/60'
                                "
                                @click="toggleWeekday(idx)">
                                {{ day }}
                              </button>
                            </div>
                          </div>
                        </UiCollapsibleContent>
                      </UiCollapsible>
                    </div>
                  </div>
                </UiPopoverContent>
              </UiPopover>

              <!-- Template Picker (disabled on edit mode) -->
              <UiPopover v-model:open="templateOpen" :disabled="mode === 'edit'">
                <UiPopoverTrigger as-child>
                  <button
                    :disabled="mode === 'edit'"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors"
                    :class="
                      mode === 'edit'
                        ? 'bg-muted/30 text-muted-foreground/50 cursor-not-allowed'
                        : 'bg-muted/50 hover:bg-muted'
                    ">
                    <Icon name="lucide:file-text" class="h-3.5 w-3.5" />
                    <span>
                      {{
                        selectedTemplateId !== '__none__'
                          ? templates.find((t) => t.id === selectedTemplateId)?.name || 'Template'
                          : 'Use template'
                      }}
                    </span>
                    <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-60" />
                  </button>
                </UiPopoverTrigger>
                <UiPopoverContent align="start" class="w-56 p-1 max-h-64 overflow-y-auto">
                  <div v-if="templates.length === 0" class="px-2 py-3 text-center text-xs text-muted-foreground italic">
                    No templates available
                  </div>
                  <template v-else>
                    <button
                      class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted"
                      @click="
                        () => {
                          selectedTemplateId = '__none__'
                          templateOpen = false
                        }
                      ">
                      No template
                    </button>
                    <button
                      v-for="tmpl in templates"
                      :key="tmpl.id"
                      class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                      @click="
                        () => {
                          selectedTemplateId = tmpl.id
                          applySelectedTemplate()
                          templateOpen = false
                        }
                      ">
                      <Icon name="lucide:file-text" class="h-3.5 w-3.5 text-muted-foreground" />
                      {{ tmpl.name }}
                    </button>
                  </template>
                </UiPopoverContent>
              </UiPopover>
            </div>

            <!-- Navigation Chevrons -->
            <div class="flex items-center gap-1">
              <UiButton
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                :disabled="!canNavigatePrev"
                @click="emit('navigatePrev')">
                <Icon name="lucide:chevron-up" class="h-4 w-4" />
              </UiButton>
              <UiButton
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                :disabled="!canNavigateNext"
                @click="emit('navigateNext')">
                <Icon name="lucide:chevron-down" class="h-4 w-4" />
              </UiButton>
            </div>
          </div>

          <!-- Title -->
          <input
            v-model="editableTask.title"
            type="text"
            placeholder="Task name..."
            class="w-full text-xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0 -mx-1 transition-all" />
        </div>
      </div>

      <!-- Main Content Area (two/three columns depending on mode) -->
      <div class="flex flex-1 min-h-0">
        <!-- Left Sidebar: Schedule (Create mode only) -->
        <aside
          v-if="mode === 'create'"
          class="w-72 shrink-0 flex flex-col bg-muted/30 border-r border-border overflow-y-auto">
          <div class="p-3 space-y-3">
            <!-- Schedule Header -->
            <!-- <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Schedule</p> -->

            <!-- Tab Bar: Repeat / Reminder (Repeat first) -->
            <div class="flex gap-1 p-1 bg-muted/50 rounded-lg">
              <button
                type="button"
                class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors"
                :class="
                  activeScheduleTab === 'repeat'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                "
                @click="activeScheduleTab = 'repeat'">
                <Icon name="lucide:repeat" class="h-3 w-3" />
                <span>Repeat</span>
                <span class="text-[8px] font-normal text-muted-foreground/70 truncate max-w-16">
                  {{ repeatPresets.find((p) => p.value === selectedRepeat)?.label || 'None' }}
                </span>
              </button>
              <button
                type="button"
                class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors"
                :class="
                  activeScheduleTab === 'reminder'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                "
                @click="activeScheduleTab = 'reminder'">
                <Icon name="lucide:bell" class="h-3 w-3" />
                <span>Reminder</span>
                <span class="text-[8px] font-normal text-muted-foreground/70 truncate max-w-16">
                  {{ reminderPresets.find((p) => p.value === selectedReminder)?.label || 'On the day' }}
                </span>
              </button>
            </div>

            <!-- Tab Content -->
            <div class="flex-1 overflow-y-auto">
              <!-- Repeat Tab Content (first, with v-if) -->
              <div v-if="activeScheduleTab === 'repeat'" class="space-y-3">
                <!-- Date Picker (inside Repeat tab) -->
                <div class="w-full">
                  <UiDatepicker
                    v-model="selectedCalendarDate"
                    mode="date"
                    :attributes="calendarAttributes"
                    :trim-weeks="true"
                    :popover="false"
                    class="rounded-lg border bg-card p-1 text-[9px] w-full! [&_.vc-pane-container]:w-full! [&_.vc-pane]:w-full! [&_.vc-weeks]:w-full! [&_.vc-weekday]:text-[8px] [&_.vc-weekday]:w-[32px]! [&_.vc-day]:text-[9px] [&_.vc-day]:w-[32px]! [&_.vc-day]:h-[32px]! [&_.vc-day-content]:w-[28px]! [&_.vc-day-content]:h-[28px]! [&_.vc-header]:text-[10px] [&_.vc-header]:px-0! [&_.vc-arrow]:w-5! [&_.vc-arrow]:h-5! [&_.vc-title]:text-[10px]" />
                </div>

                <!-- Selected Date Display -->
                <div class="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted border border-border">
                  <Icon name="lucide:calendar-check" class="h-3.5 w-3.5 text-muted-foreground" />
                  <span class="text-[10px] font-medium text-muted-foreground">
                    Starting: {{ editableTask.dueDate || 'Select a date above' }}
                  </span>
                </div>

                <!-- Quick Presets Dropdown -->
                <div class="flex items-center gap-2">
                  <UiSelect :model-value="''" @update:model-value="(id) => id && applySchedulePresetById(id)">
                    <UiSelectTrigger class="text-[10px] flex-1 !py-0">
                      <UiSelectValue placeholder="Apply preset..." />
                    </UiSelectTrigger>
                    <UiSelectContent>
                      <UiSelectItem v-for="preset in allSchedulePresets" :key="preset.id" :value="preset.id">
                        {{ preset.label }}
                      </UiSelectItem>
                    </UiSelectContent>
                  </UiSelect>
                  <UiPopover>
                    <UiPopoverTrigger as-child>
                      <button
                        type="button"
                        class="h-8 w-8 flex items-center justify-center rounded-md border border-border hover:bg-muted/50 transition-colors">
                        <Icon name="lucide:plus" class="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </UiPopoverTrigger>
                    <UiPopoverContent align="end" class="w-48 p-2 space-y-2">
                      <p class="text-[10px] font-medium">Save current as preset</p>
                      <UiInput v-model="schedulePresetName" placeholder="Preset name" class="h-8 text-[10px]" />
                      <UiButton
                        size="sm"
                        class="w-full h-7 text-[10px]"
                        :disabled="!canSavePreset"
                        @click="saveSchedulePreset">
                        Save Preset
                      </UiButton>
                    </UiPopoverContent>
                  </UiPopover>
                </div>

                <!-- Repeat presets -->
                <div class="grid gap-0.5">
                  <button
                    v-for="preset in repeatPresets"
                    :key="preset.value"
                    type="button"
                    class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] hover:bg-muted/50 transition-colors"
                    :class="selectedRepeat === preset.value ? 'bg-muted/50' : ''"
                    @click="selectRepeat(preset.value)">
                    <span>
                      {{ preset.label }}
                      <span v-if="preset.subLabel" class="text-muted-foreground ml-1">{{ preset.subLabel }}</span>
                    </span>
                    <Icon v-if="selectedRepeat === preset.value" name="lucide:check" class="h-3 w-3 text-primary" />
                  </button>
                </div>

                <!-- Custom Repeat Form -->
                <div
                  v-if="selectedRepeat === 'custom'"
                  class="space-y-2 rounded-md border border-border/60 bg-muted/10 p-2">
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-muted-foreground">Every</span>
                    <UiInput
                      v-model.number="repeatCustom.interval"
                      type="number"
                      min="1"
                      class="w-14 h-6 text-[10px] text-center bg-muted/30" />
                    <UiSelect v-model="repeatCustom.unit">
                      <UiSelectTrigger class="h-6 text-[10px] flex-1">
                        <UiSelectValue />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem value="Day">{{ `Day${repeatCustom.interval > 1 ? 's' : ''}` }}</UiSelectItem>
                        <UiSelectItem value="Week">{{ `Week${repeatCustom.interval > 1 ? 's' : ''}` }}</UiSelectItem>
                        <UiSelectItem value="Month">{{ `Month${repeatCustom.interval > 1 ? 's' : ''}` }}</UiSelectItem>
                        <UiSelectItem value="Year">{{ `Year${repeatCustom.interval > 1 ? 's' : ''}` }}</UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <!-- Weekday Picker (for Week unit) -->
                  <div v-if="repeatCustom.unit === 'Week'" class="flex gap-1 justify-center">
                    <button
                      v-for="(day, idx) in weekdayShort"
                      :key="idx"
                      type="button"
                      class="w-6 h-6 rounded-full text-[10px] font-medium transition-colors"
                      :class="
                        repeatCustom.weekdays.includes(idx)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/40 hover:bg-muted/60'
                      "
                      @click="toggleWeekday(idx)">
                      {{ day }}
                    </button>
                  </div>
                </div>

                <!-- Auto scheduling toggle -->
                <div class="pt-2 border-t border-border">
                  <div
                    class="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-2 py-2">
                    <div class="min-w-0">
                      <p class="text-[10px] font-medium">Automatic scheduling</p>
                      <p class="text-[9px] text-muted-foreground">Use relative schedule</p>
                    </div>
                    <UiSwitch v-model:checked="autoSchedulingEnabled" />
                  </div>
                </div>
              </div>

              <!-- Reminder Tab Content (second, with v-else-if) -->
              <div v-else-if="activeScheduleTab === 'reminder'" class="space-y-3">
                <!-- Reminder timing presets -->
                <div class="grid gap-0.5">
                  <button
                    v-for="preset in reminderPresets"
                    :key="preset.value"
                    type="button"
                    class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] hover:bg-muted/50 transition-colors"
                    :class="selectedReminder === preset.value ? 'bg-muted/50' : ''"
                    @click="selectReminder(preset.value)">
                    <span>{{ preset.label }}</span>
                    <div class="flex items-center gap-1.5">
                      <span v-if="preset.time && preset.value !== 'custom'" class="text-muted-foreground">
                        ({{ preset.time }})
                      </span>
                      <Icon v-if="selectedReminder === preset.value" name="lucide:check" class="h-3 w-3 text-primary" />
                    </div>
                  </button>
                </div>

                <!-- Custom Reminder Form -->
                <div
                  v-if="selectedReminder === 'custom'"
                  class="space-y-2 rounded-md border border-border/60 bg-muted/10 p-2">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] text-muted-foreground shrink-0">Days early</span>
                    <UiInput
                      v-model.number="reminderCustom.daysInAdvance"
                      type="number"
                      min="1"
                      class="w-14 h-6 text-[10px] text-center bg-muted/30" />
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] text-muted-foreground shrink-0">At</span>
                    <UiInput v-model="reminderCustom.time" type="time" class="flex-1 h-6 text-[10px] bg-muted/30" />
                  </div>
                </div>

                <!-- Delivery Method -->
                <div class="space-y-1.5 pt-2 border-t border-border">
                  <p class="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Delivery Method</p>
                  <div class="space-y-1">
                    <button
                      v-for="method in notifyMethodOptions"
                      :key="method.value"
                      type="button"
                      class="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-left hover:bg-muted/50 transition-colors"
                      :class="selectedNotifyMethod === method.value ? 'bg-muted/50' : ''"
                      @click="selectedNotifyMethod = method.value">
                      <Icon :name="method.icon" class="h-4 w-4 text-muted-foreground shrink-0" />
                      <div class="flex-1 min-w-0">
                        <p class="text-[10px] font-medium">{{ method.label }}</p>
                        <p class="text-[9px] text-muted-foreground">{{ method.description }}</p>
                      </div>
                      <Icon
                        v-if="selectedNotifyMethod === method.value"
                        name="lucide:check"
                        class="h-3.5 w-3.5 text-primary shrink-0" />
                    </button>
                  </div>
                </div>

                <!-- Notification toggles -->
                <div class="space-y-1.5 pt-2 border-t border-border">
                  <p class="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Notifications</p>
                  <div class="space-y-1">
                    <div
                      class="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5">
                      <p class="text-[10px]">Notify on create</p>
                      <UiSwitch v-model:checked="editableTask.notifyOnCreate" />
                    </div>
                    <div
                      class="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5">
                      <p class="text-[10px]">Notify on due date</p>
                      <UiSwitch v-model:checked="editableTask.notifyOnDue" />
                    </div>
                    <div
                      class="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5">
                      <p class="text-[10px]">Lead time (hours)</p>
                      <UiInput
                        v-model.number="editableTask.notifyHoursBeforeDue"
                        type="number"
                        min="0"
                        class="w-12 h-6 text-[10px] text-center bg-muted/30" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- Center: Scrollable content -->
        <div
          class="flex-1 flex flex-col min-w-0 overflow-y-auto"
          :class="mode === 'edit' ? 'border-r border-border' : ''">
          <!-- Properties Row -->
          <div class="sticky top-0 z-10 bg-card px-4 py-2.5 border-b border-border space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Properties</p>
            <div class="flex flex-wrap items-center gap-1.5 text-xs">
              <!-- Assigned To (Owner) - Required -->
              <UiPopover v-model:open="ownerOpen">
                <UiPopoverTrigger as-child>
                  <button
                    :class="[
                      'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ',
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
                        {{ (owners?.find((o) => o.id === editableTask.owner)?.name || 'U').slice(0, 2).toUpperCase() }}
                      </template>
                    </div>
                    <span>{{ owners?.find((o) => o.id === editableTask.owner)?.name || 'Owner' }}</span>
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
                    <p v-if="!owners || owners.length === 0" class="px-2 py-1.5 text-xs text-muted-foreground italic">
                      No owners available
                    </p>
                    <template v-else>
                      <button
                        v-if="editableTask.owner"
                        class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground"
                        @click="
                          () => {
                            editableTask.owner = ''
                            ownerOpen = false
                            ownerSearch = ''
                          }
                        ">
                        <Icon name="lucide:x" class="h-3.5 w-3.5" />
                        No assignee
                      </button>
                      <button
                        v-for="owner in filteredOwners"
                        :key="owner.id"
                        class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                        @click="
                          () => {
                            editableTask.owner = owner.id
                            ownerOpen = false
                            ownerSearch = ''
                          }
                        ">
                        <div
                          class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary">
                          {{ owner.name.slice(0, 2).toUpperCase() }}
                        </div>
                        <span class="flex-1">{{ owner.name }}</span>
                        <Icon
                          v-if="editableTask.owner === owner.id"
                          name="lucide:check"
                          class="h-3.5 w-3.5 text-primary" />
                      </button>
                      <p
                        v-if="filteredOwners.length === 0 && ownerSearch"
                        class="px-2 py-1.5 text-xs text-muted-foreground italic">
                        No results
                      </p>
                    </template>
                  </div>
                </UiPopoverContent>
              </UiPopover>

              <!-- Involved users -->
              <UiPopover v-model:open="involvedOpen">
                <UiPopoverTrigger as-child>
                  <button
                    :class="[
                      'inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors',
                      isInvolvedUnset
                        ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                        : 'bg-muted/50 hover:bg-muted',
                    ]">
                    <Icon name="lucide:users" class="h-3.5 w-3.5" :class="isInvolvedUnset ? 'opacity-50' : ''" />
                    <span>
                      {{
                        (editableTask.involved || []).length
                          ? `Involved (${editableTask.involved?.length})`
                          : 'Involved'
                      }}
                    </span>
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
                    <p v-if="!owners || owners.length === 0" class="px-2 py-1.5 text-xs text-muted-foreground italic">
                      No users available
                    </p>
                    <template v-else>
                      <button
                        v-for="owner in filteredInvolvedOwners"
                        :key="owner.id"
                        class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                        @click="toggleInvolvedUser(owner.id)">
                        <Icon
                          :name="
                            (editableTask.involved || []).includes(owner.id) ? 'lucide:check-square' : 'lucide:square'
                          "
                          class="h-3.5 w-3.5"
                          :class="
                            (editableTask.involved || []).includes(owner.id) ? 'text-primary' : 'text-muted-foreground'
                          " />
                        <span class="flex-1 truncate">{{ owner.name }}</span>
                      </button>
                      <p
                        v-if="filteredInvolvedOwners.length === 0 && involvedSearch"
                        class="px-2 py-1.5 text-xs text-muted-foreground italic">
                        No results
                      </p>
                    </template>
                  </div>
                </UiPopoverContent>
              </UiPopover>

              <!-- Category Dropdown -->
              <UiPopover v-model:open="categoryOpen">
                <UiPopoverTrigger as-child>
                  <button
                    :class="[
                      'inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors',
                      isCategoryUnset
                        ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                        : 'bg-muted/50 hover:bg-muted',
                    ]">
                    <Icon name="lucide:tag" class="h-3.5 w-3.5" :class="isCategoryUnset ? 'opacity-50' : ''" />
                    <span>{{ editableTask.category || 'Category' }}</span>
                  </button>
                </UiPopoverTrigger>
                <UiPopoverContent align="start" class="w-44 p-1 max-h-64 overflow-hidden">
                  <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
                    <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      v-model="categorySearch"
                      type="text"
                      placeholder="Search..."
                      class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
                  </div>
                  <div class="overflow-y-auto max-h-52">
                    <button
                      v-for="cat in filteredCategories"
                      :key="cat"
                      class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center justify-between"
                      @click="
                        () => {
                          editableTask.category = cat
                          categoryOpen = false
                          categorySearch = ''
                        }
                      ">
                      {{ cat }}
                      <Icon v-if="editableTask.category === cat" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
                    </button>
                    <p v-if="filteredCategories.length === 0" class="px-2 py-1.5 text-xs text-muted-foreground italic">
                      No results
                    </p>
                  </div>
                </UiPopoverContent>
              </UiPopover>

              <!-- Tracked Dropdown -->
              <UiPopover v-model:open="trackedOpen">
                <UiPopoverTrigger as-child>
                  <button
                    class="inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors bg-muted/50 hover:bg-muted">
                    <Icon
                      :name="trackedOptions.find((t) => t.value === editableTask.tracked)?.icon || 'lucide:eye-off'"
                      class="h-3.5 w-3.5" />
                    <span>
                      {{ trackedOptions.find((t) => t.value === editableTask.tracked)?.label || 'Untracked' }}
                    </span>
                  </button>
                </UiPopoverTrigger>
                <UiPopoverContent align="start" class="w-48 p-1">
                  <button
                    v-for="opt in trackedOptions"
                    :key="opt.value"
                    class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                    @click="
                      () => {
                        editableTask.tracked = opt.value
                        trackedOpen = false
                      }
                    ">
                    <Icon :name="opt.icon" class="h-3.5 w-3.5" :class="opt.color" />
                    {{ opt.label }}
                  </button>
                </UiPopoverContent>
              </UiPopover>

              <!-- Folder (Tree View) -->
              <UiPopover v-model:open="folderOpen">
                <UiPopoverTrigger as-child>
                  <button
                    :class="[
                      'inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors',
                      isFolderUnset
                        ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                        : 'bg-muted/50 hover:bg-muted',
                    ]">
                    <Icon name="lucide:folder" class="h-3.5 w-3.5" :class="isFolderUnset ? 'opacity-50' : ''" />
                    <span>{{ editableTask.folder || 'Folder' }}</span>
                  </button>
                </UiPopoverTrigger>
                <UiPopoverContent align="start" class="w-56 p-1.5 max-h-72 overflow-hidden">
                  <!-- Clear folder option -->
                  <button
                    v-if="editableTask.folder"
                    class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground mb-1 border-b border-border pb-2"
                    @click="
                      () => {
                        editableTask.folder = ''
                        folderOpen = false
                      }
                    ">
                    <Icon name="lucide:x" class="h-3.5 w-3.5" />
                    No folder
                  </button>
                  <!-- Tree View (recursive with dynamic indentation) -->
                  <div class="overflow-y-auto max-h-64 space-y-0.5">
                    <div
                      v-for="item in flattenedFolders"
                      :key="item.node.folderID"
                      class="flex items-center"
                      :style="{ paddingLeft: `${item.depth * 16}px` }">
                      <!-- Expand/collapse button -->
                      <button
                        v-if="item.node.children?.length"
                        class="p-1 rounded hover:bg-muted shrink-0"
                        @click.stop="toggleFolderExpand(item.node.folderID)">
                        <Icon
                          :name="
                            expandedFolders.has(item.node.folderID) ? 'lucide:chevron-down' : 'lucide:chevron-right'
                          "
                          class="h-3 w-3 text-muted-foreground" />
                      </button>
                      <div v-else class="w-5" />
                      <!-- Folder button -->
                      <button
                        class="flex-1 px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                        @click="
                          () => {
                            editableTask.folder = item.node.name
                            folderOpen = false
                          }
                        ">
                        <Icon name="lucide:folder" class="h-3.5 w-3.5 text-muted-foreground" />
                        <span class="flex-1">{{ item.node.name }}</span>
                        <Icon
                          v-if="editableTask.folder === item.node.name"
                          name="lucide:check"
                          class="h-3.5 w-3.5 text-primary" />
                      </button>
                    </div>
                  </div>
                </UiPopoverContent>
              </UiPopover>
            </div>
          </div>

          <!-- Content Area -->
          <div class="p-4 space-y-4">
            <!-- Description -->
            <div class="space-y-1.5">
              <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
              <UiRichTextEditor v-model="editableTask.description" placeholder="Add a description..." compact />
            </div>

            <!-- Attachments -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attachments</p>
                <UiButton variant="ghost" size="sm" class="h-6 text-xs gap-1" @click="handleAddAttachment">
                  <Icon name="lucide:plus" class="h-3 w-3" />
                  Add
                </UiButton>
              </div>
              <div v-if="displayAttachments.length" class="flex flex-wrap gap-2">
                <div
                  v-for="attachment in displayAttachments"
                  :key="attachment.id"
                  class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 cursor-pointer group">
                  <div
                    :class="['flex h-6 w-6 items-center justify-center rounded', getAttachmentColor(attachment.type)]">
                    <Icon :name="getAttachmentIcon(attachment.type)" class="h-3 w-3" />
                  </div>
                  <span class="text-xs font-medium truncate max-w-28">{{ attachment.name }}</span>
                  <Icon
                    name="lucide:download"
                    class="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <p v-else class="text-xs text-muted-foreground">No attachments yet.</p>
            </div>

            <!-- Escalation Schedule (only for tracked tasks) -->
            <div v-if="isTracked" class="space-y-3 pt-3 border-t border-border">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Escalation Schedule</p>
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                      editableTask.tracked === 'tracked-corporate'
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    ]">
                    <Icon
                      :name="editableTask.tracked === 'tracked-corporate' ? 'lucide:building-2' : 'lucide:warehouse'"
                      class="h-3 w-3" />
                    {{ editableTask.tracked === 'tracked-corporate' ? 'Corporate' : 'Facility' }}
                  </span>
                </div>
                <p class="text-[10px] text-muted-foreground">
                  Due:
                  {{ new Date(editableTask.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
                </p>
              </div>

              <!-- Escalation Timeline Table -->
              <div class="rounded-lg border border-border overflow-hidden">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="bg-muted/50 border-b border-border">
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Role</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Timing</th>
                      <th class="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                      <th class="px-3 py-2 text-center font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(step, index) in escalationSchedule"
                      :key="step.id"
                      :class="[
                        'transition-colors',
                        index !== escalationSchedule.length - 1 ? 'border-b border-border' : '',
                        step.status === 'active'
                          ? 'bg-amber-50 dark:bg-amber-900/10'
                          : step.status === 'completed'
                            ? 'bg-muted/30'
                            : 'hover:bg-muted/20',
                      ]">
                      <td class="px-3 py-2.5">
                        <div class="flex items-center gap-2">
                          <div
                            :class="[
                              'flex h-6 w-6 items-center justify-center rounded-full shrink-0',
                              step.status === 'active'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : step.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : 'bg-muted text-muted-foreground',
                            ]">
                            <Icon :name="step.icon" class="h-3 w-3" />
                          </div>
                          <span
                            :class="[
                              'font-medium',
                              step.status === 'completed' ? 'text-muted-foreground' : 'text-foreground',
                            ]">
                            {{ step.role }}
                          </span>
                        </div>
                      </td>
                      <td class="px-3 py-2.5">
                        <span
                          :class="[
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium',
                            step.daysFromDue < 0
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : step.daysFromDue === 0
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                          ]">
                          {{ step.description }}
                        </span>
                      </td>
                      <td class="px-3 py-2.5 text-muted-foreground">
                        {{ step.date }}
                      </td>
                      <td class="px-3 py-2.5 text-center">
                        <div
                          v-if="step.status === 'completed'"
                          class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Icon name="lucide:check-circle" class="h-3.5 w-3.5" />
                          <span class="text-[10px] font-medium">Notified</span>
                        </div>
                        <div
                          v-else-if="step.status === 'active'"
                          class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Icon name="lucide:alert-circle" class="h-3.5 w-3.5" />
                          <span class="text-[10px] font-medium">Today</span>
                        </div>
                        <div v-else class="inline-flex items-center gap-1 text-muted-foreground">
                          <Icon name="lucide:clock" class="h-3.5 w-3.5" />
                          <span class="text-[10px]">Pending</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Info Footer -->
              <div class="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <Icon name="lucide:info" class="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p class="text-[10px] text-muted-foreground leading-relaxed">
                  <template v-if="editableTask.tracked === 'tracked-corporate'">
                    This task escalates through facility managers and continues to corporate if not completed. Daily
                    reminders are sent after corporate escalation until resolved.
                  </template>
                  <template v-else>
                    This task escalates through facility managers only. The General Manager receives daily reminders
                    after the due date until resolved.
                  </template>
                </p>
              </div>
            </div>

            <!-- Schedule Section (only for recurring tasks) -->
            <div v-if="scheduleDescription.isRecurring" class="space-y-3 pt-3 border-t border-border bg-tr">
              <div class="flex items-center justify-between">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Schedule</p>
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon name="lucide:repeat" class="h-3.5 w-3.5" />
                  <span>Repeats {{ editableTask.schedule || editableTask.scheduleData?.repeat }}</span>
                </div>
              </div>

              <div class="flex gap-4">
                <!-- Mini Calendar with occurrence highlights -->
                <div class="w-[260px] shrink-0">
                  <UiCalendar
                    v-model="selectedCalendarDate"
                    :attributes="[
                      {
                        key: 'occurrences',
                        highlight: { color: 'blue', fillMode: 'light' },
                        dates: getTaskOccurrences(editableTask),
                      },
                    ]"
                    :trim-weeks="true"
                    class="rounded-lg border bg-card p-1 text-[9px] w-full! [&_.vc-pane-container]:w-full! [&_.vc-pane]:w-full! [&_.vc-weeks]:w-full! [&_.vc-weekday]:text-[8px] [&_.vc-weekday]:w-[32px]! [&_.vc-day]:text-[9px] [&_.vc-day]:w-[32px]! [&_.vc-day]:h-[32px]! [&_.vc-day-content]:w-[28px]! [&_.vc-day-content]:h-[28px]! [&_.vc-header]:text-[10px] [&_.vc-header]:px-0! [&_.vc-arrow]:w-5! [&_.vc-arrow]:h-5! [&_.vc-title]:text-[10px]" />
                </div>

                <!-- Upcoming Occurrences List -->
                <div class="relative flex-1 min-w-0">
                  <div class="space-y-1.5 max-h-[300px] overflow-y-hidden pr-1 custom-scrollbar">
                    <!-- Next Due (highlighted) -->
                    <div class="flex items-center gap-3 p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <Icon name="lucide:calendar-check" class="h-4 w-4 text-primary shrink-0" />
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-medium">{{ editableTask.dueDate }}</p>
                        <p class="text-[9px] text-muted-foreground">Next due</p>
                      </div>
                      <span class="text-[9px] font-medium text-primary px-1.5 py-0.5 rounded-full bg-primary/10">
                        Upcoming
                      </span>
                    </div>

                    <!-- Future Occurrences -->
                    <div
                      v-for="(occurrence, idx) in getTaskOccurrences(editableTask).slice(1, 8)"
                      :key="idx"
                      class="flex items-center gap-3 p-1.5 rounded-md bg-muted/30">
                      <Icon name="lucide:calendar" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div class="flex-1 min-w-0">
                        <p class="text-xs">{{ occurrence.toISOString().split('T')[0] }}</p>
                        <p class="text-[9px] text-muted-foreground">Future occurrence</p>
                      </div>
                    </div>
                  </div>
                  <!-- Fade overlay at bottom -->
                  <div
                    class="absolute bottom-0 left-0 right-0 h-4 bg-linear-to-t from-card to-transparent pointer-events-none" />
                </div>
              </div>
            </div>

            <!-- Custom Fields -->
            <div class="space-y-2 pt-3 border-t border-border">
              <div class="flex items-center justify-between">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custom Fields</p>
                <UiButton variant="ghost" size="sm" class="h-6 text-xs gap-1" @click="addCustomField">
                  <Icon name="lucide:plus" class="h-3 w-3" />
                  Add
                </UiButton>
              </div>
              <!-- Custom field header row -->
              <!-- <div v-if="editableTask.customFields?.length" class="flex gap-2 text-xs text-muted-foreground">
                <span class="shrink-0">Field type</span>
                <span class="flex-1">Field name</span>
                <span class="flex-1">Value</span>
                <span class="w-6 shrink-0" />
              </div> -->
              <!-- Custom field rows -->
              <div v-if="editableTask.customFields?.length" class="space-y-2">
                <div
                  v-for="field in editableTask.customFields"
                  :key="field.id"
                  :class="[
                    'grid gap-2 items-center',
                    field.type === 'long-text' ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-[auto_1fr_1fr_auto]',
                  ]">
                  <!-- Field Type Dropdown (dynamic width) -->
                  <UiSelect v-model="field.type">
                    <UiSelectTrigger class="h-8 text-xs w-auto shrink-0 min-w-[90px]">
                      <div class="flex items-center gap-1.5">
                        <Icon
                          :name="customFieldTypes.find((t) => t.value === field.type)?.icon || 'lucide:type'"
                          class="h-3 w-3 shrink-0" />
                        <UiSelectValue class="truncate" />
                      </div>
                    </UiSelectTrigger>
                    <UiSelectContent>
                      <UiSelectItem v-for="t in customFieldTypes" :key="t.value" :value="t.value">
                        <div class="flex items-center gap-2">
                          <Icon :name="t.icon" class="h-3.5 w-3.5" />
                          {{ t.label }}
                        </div>
                      </UiSelectItem>
                    </UiSelectContent>
                  </UiSelect>
                  <!-- Field Name Input -->
                  <input
                    v-model="field.name"
                    type="text"
                    placeholder="Field name..."
                    class="flex-1 h-8 text-xs bg-card rounded px-2 py-1 border border-border focus:outline-none focus:ring-1 focus:ring-primary" />

                  <!-- Field Value Input (changes based on type) -->
                  <template v-if="field.type === 'file'">
                    <button
                      class="flex-1 h-8 text-xs bg-card rounded px-2 py-1 border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-2 text-muted-foreground"
                      @click="handleAddAttachment">
                      <Icon name="lucide:upload" class="h-3.5 w-3.5" />
                      <span>Click to upload file...</span>
                    </button>
                  </template>
                  <template v-else-if="field.type === 'long-text'">
                    <!-- Full width textarea underneath - spans remaining columns -->
                    <div class="col-span-2 mt-2">
                      <textarea
                        placeholder="Enter value..."
                        rows="3"
                        class="w-full text-xs bg-card rounded px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[80px]"
                        :value="String(field.value || '')"
                        @input="field.value = ($event.target as HTMLTextAreaElement).value" />
                    </div>
                  </template>
                  <template v-else-if="field.type === 'task-lock'">
                    <textarea
                      placeholder="Describe why this task is locked..."
                      rows="2"
                      class="flex-1 text-xs bg-card rounded px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      :value="String(field.value || '')"
                      @input="field.value = ($event.target as HTMLTextAreaElement).value" />
                  </template>
                  <template v-else-if="field.type === 'choice'">
                    <div class="flex-1 flex items-center gap-2">
                      <UiSelect v-model="field.value as string">
                        <UiSelectTrigger class="h-8 text-xs flex-1">
                          <UiSelectValue placeholder="Select option..." />
                        </UiSelectTrigger>
                        <UiSelectContent>
                          <UiSelectItem v-for="opt in field.options || []" :key="opt" :value="opt">
                            {{ opt }}
                          </UiSelectItem>
                          <div v-if="!field.options?.length" class="px-2 py-1.5 text-xs text-muted-foreground italic">
                            No options configured
                          </div>
                        </UiSelectContent>
                      </UiSelect>
                      <UiPopover>
                        <UiPopoverTrigger as-child>
                          <UiButton variant="outline" size="sm" class="h-8 text-xs shrink-0">
                            <Icon name="lucide:settings" class="h-3 w-3 mr-1" />
                            Options
                          </UiButton>
                        </UiPopoverTrigger>
                        <UiPopoverContent align="end" class="w-64 p-3">
                          <p class="text-xs font-medium mb-2">Choice Options</p>
                          <div class="space-y-1.5">
                            <div v-for="(opt, idx) in field.options || []" :key="idx" class="flex items-center gap-1.5">
                              <input
                                type="text"
                                :value="opt"
                                class="flex-1 h-7 text-xs bg-card rounded px-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                                @input="field.options![idx] = ($event.target as HTMLInputElement).value" />
                              <UiButton
                                variant="ghost"
                                size="icon"
                                class="h-6 w-6 shrink-0"
                                @click="field.options?.splice(idx, 1)">
                                <Icon name="lucide:x" class="h-3 w-3" />
                              </UiButton>
                            </div>
                          </div>
                          <UiButton
                            variant="outline"
                            size="sm"
                            class="w-full mt-2 h-7 text-xs"
                            @click="field.options = [...(field.options || []), '']">
                            <Icon name="lucide:plus" class="h-3 w-3 mr-1" />
                            Add option
                          </UiButton>
                        </UiPopoverContent>
                      </UiPopover>
                    </div>
                  </template>
                  <template v-else-if="field.type === 'repeating-group'">
                    <div class="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Group name (e.g., Storage Area)"
                        class="flex-1 h-8 text-xs bg-card rounded px-2 py-1 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                        :value="String(field.value || '')"
                        @input="field.value = ($event.target as HTMLInputElement).value" />
                      <UiButton
                        variant="outline"
                        size="sm"
                        class="h-8 text-xs shrink-0"
                        @click="openRepeatingGroupConfig(field.id)">
                        <Icon name="lucide:settings" class="h-3 w-3 mr-1" />
                        Configure
                      </UiButton>
                    </div>
                  </template>
                  <template v-else>
                    <input
                      type="text"
                      placeholder="Enter value..."
                      class="flex-1 h-8 text-xs bg-card rounded px-2 py-1 border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                      :value="String(field.value || '')"
                      @input="field.value = ($event.target as HTMLInputElement).value" />
                  </template>
                  <!-- Delete Button -->
                  <UiButton
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                    @click="removeCustomField(field.id)">
                    <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
                  </UiButton>
                </div>
              </div>
              <!-- Field hint -->
              <p v-if="editableTask.customFields?.length" class="text-xs text-muted-foreground italic">
                Enter both a field name and its value
              </p>
            </div>

            <slot name="content" />
          </div>
        </div>

        <!-- Right Sidebar: Activity/Comments (Hidden for suggested tasks and create mode) -->
        <aside v-if="taskType !== 'suggested' && mode === 'edit'" class="w-72 shrink-0 flex flex-col bg-muted/50">
          <div class="p-2.5 pb-0 shrink-0">
            <div class="relative">
              <div
                class="absolute left-2.5 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-medium">
                U
              </div>
              <UiTextarea
                v-model="newComment"
                placeholder="Write a comment..."
                class="min-h-[60px] text-xs resize-none pl-9 pr-2.5 pb-8 bg-card"
                :rows="2" />
              <div class="absolute right-2 bottom-1.5">
                <UiButton size="sm" :disabled="!newComment.trim()" class="h-6 text-xs" @click="handleAddComment">
                  Comment
                </UiButton>
              </div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-3">
            <div v-for="item in displayActivity" :key="item.id" class="flex items-start gap-2 mb-3">
              <div class="text-xs text-muted-foreground">
                <span class="font-medium text-foreground mr-1">{{ item.author }}</span>
                <span v-if="item.type === 'created'">created this task</span>
                <span v-else-if="item.type === 'comment'">commented</span>
                <span class="ml-1 text-[10px]">{{ item.date }}</span>
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
            <span v-if="editableTask.id">ID: {{ editableTask.id }}</span>
            <span v-else>New task</span>
          </div>
          <!-- Validation indicator (create mode, moved to left side) -->
          <!-- <div
            v-if="mode === 'create'"
            class="flex items-center gap-2 rounded-lg px-3 py-1.5"
            :class="isFormValid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
            <Icon :name="isFormValid ? 'lucide:check-circle' : 'lucide:alert-circle'" class="h-3.5 w-3.5" />
            <span class="text-xs">{{ isFormValid ? 'Ready' : 'Missing required fields' }}</span>
          </div> -->
        </div>
        <div class="flex items-center gap-3">
          <template v-if="mode === 'edit' && taskType === 'suggested'">
            <!-- Suggested task actions -->
            <UiButton
              variant="outline"
              size="sm"
              class="gap-1.5 border-red-500 text-red-600 hover:bg-red-50"
              @click="emit('markNotApplicable', editableTask)">
              <Icon name="lucide:ban" class="h-3.5 w-3.5" />
              Mark as not applicable
            </UiButton>
            <UiButton
              variant="outline"
              size="sm"
              class="gap-1.5 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              @click="emit('alreadyResolved', editableTask)">
              <Icon name="lucide:check" class="h-3.5 w-3.5" />
              This has already been resolved
            </UiButton>
            <UiButton
              variant="outline"
              size="sm"
              class="gap-1.5 border-foreground/50 text-foreground hover:bg-muted"
              @click="emit('alreadyHaveTask', editableTask)">
              <Icon name="lucide:check-square" class="h-3.5 w-3.5" />
              I already have this task
            </UiButton>
            <UiButton size="sm" class="gap-1.5" @click="emit('createTask', editableTask)">
              <Icon name="lucide:plus" class="h-3.5 w-3.5" />
              Create task
            </UiButton>
          </template>
          <template v-else-if="mode === 'edit'">
            <!-- Standard/Scheduled task actions -->
            <UiButton
              variant="ghost"
              size="sm"
              class="gap-1.5 text-muted-foreground"
              @click="emit('saveAsTemplate', editableTask)">
              <Icon name="lucide:bookmark-plus" class="h-3.5 w-3.5" />
              Save as Template
            </UiButton>
            <UiButton size="sm" @click="handleSave">
              <Icon name="lucide:save" class="h-3.5 w-3.5 mr-1.5" />
              Save
            </UiButton>
            <UiButton variant="outline" size="sm" @click="closeDialog">Close</UiButton>
          </template>
          <template v-else-if="mode === 'create'">
            <UiButton size="sm" :disabled="!isFormValid" @click="handleSave">Create task</UiButton>
            <UiButton variant="ghost" size="sm" @click="closeDialog">Cancel</UiButton>
          </template>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>

  <!-- File Upload Modal -->
  <UiDialog v-model:open="fileUploadOpen">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Upload Attachment</UiDialogTitle>
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

  <!-- Repeating Group Config Modal -->
  <RepeatingGroupConfigModal
    :open="repeatingGroupConfigOpen"
    :config="repeatingGroupConfig"
    @update:open="repeatingGroupConfigOpen = $event"
    @save="handleRepeatingGroupSave" />
</template>

<style scoped>
  .vc-header {
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }
</style>
