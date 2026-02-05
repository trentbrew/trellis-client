<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { buildViewModeOptionsFromType } from '~/lib/projections'
  import CalendarView from '~/components/views/CalendarView.vue'

  definePageMeta({
    layout: 'default',
  })

  const { currentFacility } = useFacilities()
  const { currentOrganization } = useOrganizations()

  useHead(() => ({
    title: `Scheduled Tasks | ${currentFacility.value?.name || 'Facility'}`,
  }))

  type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'custom'
  type Category =
    | 'Air'
    | 'Water'
    | 'Waste'
    | 'SPCC'
    | 'EPCRA'
    | 'Fire Safety'
    | 'General Safety'
    | 'Industrial Hygiene'
    | 'Machine Guarding'
    | 'Lockout/Tagout'
    | 'Emergency Preparedness'
    | 'Respiratory Protection'
    | 'Personal Protective Equipment'
    | 'Vehicle Safety'
    | 'Corp'
  type TaskStatus = 'pending' | 'in-progress' | 'on-track' | 'due-soon' | 'overdue' | 'completed'
  type Priority = 'low' | 'medium' | 'high'
  type CommentType = 'comment' | 'attachment' | 'status_change' | 'reminder' | 'created'

  // Task interface aligned with facility tasks schema
  interface Task {
    id: string
    title: string
    description?: string
    status: TaskStatus
    priority: Priority
    dueDate: string
    category?: Category
    inspectionType?: string
    branches?: string[]
    owner?: string
    involved?: string[]
    tracked?: boolean
    taskNeedsCorrectiveAction?: boolean
    notes?: string
    commentCount?: number
    fileCount?: number
    // Recurrence properties for scheduled/recurring tasks
    schedule?: string
    reminders?: string[]
    createdAt?: string
    updatedAt?: string
  }

  interface TaskTemplate {
    id: string
    name: string
    description: string
    category: Category
    frequency: Frequency
    tracked: boolean
  }

  interface StandardTask {
    id: string
    name: string
  }

  interface Owner {
    id: string
    name: string
    email?: string
    avatar?: string
    role?: string
  }

  interface _Attachment {
    id: string
    filename: string
    url?: string
    uploadedBy: string
    uploadedAt: string
  }

  interface ActivityItem {
    id: string
    author: string
    avatar?: string
    date: string
    type: CommentType
    content?: string
    filename?: string
    status?: string
  }

  const createScheduleOpen = ref(false)
  const viewScheduleOpen = ref(false)
  const viewingTask = ref<Task | null>(null)

  // Persist dialog state to localStorage
  const STORAGE_KEY = 'platform-sandbox-viewing-task'

  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const task = scheduledTasks.value.find((t) => t.id === parsed.taskId)
        if (task) {
          viewingTask.value = task
          viewScheduleOpen.value = true
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  })

  watch([viewScheduleOpen, viewingTask], ([isOpen, task]) => {
    if (isOpen && task) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ taskId: task.id }))
    } else if (!isOpen) {
      localStorage.removeItem(STORAGE_KEY)
    }
  })

  const selectedTemplate = ref<string | null>(null)
  const templateSearchQuery = ref('')
  const involvedSearchQuery = ref('')
  const _activeTab = ref('details')
  const _templateComboboxOpen = ref(false)
  const _newComment = ref('')
  const _replyingTo = ref<string | null>(null)
  const _replyText = ref('')

  const comments = ref<ActivityItem[]>([
    {
      id: '1',
      author: 'Sarah Wilson',
      avatar: 'https://i.pravatar.cc/150?img=5',
      content: 'Completed the initial inspection. All readings within normal parameters. Uploaded the data file.',
      date: '2 hours ago',
      type: 'comment' as const,
    },
    {
      id: '2',
      author: 'Sarah Wilson',
      avatar: 'https://i.pravatar.cc/150?img=5',
      filename: 'Air_Quality_Data.xlsx',
      date: 'Jan 10',
      type: 'attachment' as const,
    },
    {
      id: '3',
      author: 'Mike Johnson',
      avatar: 'https://i.pravatar.cc/150?img=8',
      content: 'Please make sure to include the calibration certificates when uploading the report.',
      date: 'Jan 8, 2025',
      type: 'comment' as const,
    },
    {
      id: '4',
      author: 'Mike Johnson',
      avatar: 'https://i.pravatar.cc/150?img=8',
      status: 'active',
      date: 'Jan 5',
      type: 'status_change' as const,
    },
    {
      id: '5',
      author: 'David Parker',
      avatar: 'https://i.pravatar.cc/150?img=12',
      content:
        "I've reviewed the previous month's data and everything looks consistent. Let's continue with the current monitoring schedule.",
      date: 'Jan 3, 2025',
      type: 'comment' as const,
    },
    {
      id: '6',
      author: 'System',
      type: 'reminder' as const,
      date: 'Jan 2',
    },
    {
      id: '7',
      author: 'System',
      type: 'created' as const,
      date: 'Jan 1',
    },
  ])

  const getToday = () => new Date().toISOString().split('T')[0] ?? ''

  const scheduleForm = reactive({
    title: '',
    description: '',
    frequency: 'monthly' as Frequency,
    nextDue: getToday(),
    customIntervalDays: '',
    owner: '',
    category: 'General Safety' as Category,
    tracked: true,
    permitRef: '',
    involved: [] as string[],
    standardTaskId: '',
    folder: '',
    reminderTiming: [] as string[],
    reminderMethods: [] as string[],
    customFields: [] as { key: string; value: string }[],
  })

  const templates = ref<TaskTemplate[]>([
    {
      id: 'tpl-air-monthly',
      name: 'Monthly Air Emissions Report',
      description: 'Submit monthly emissions data to EPA via CEDRI.',
      category: 'Air',
      frequency: 'monthly',
      tracked: true,
    },
    {
      id: 'tpl-water-quarterly',
      name: 'Quarterly Wastewater Sampling',
      description: 'Collect and analyze wastewater discharge samples per NPDES permit.',
      category: 'Water',
      frequency: 'quarterly',
      tracked: true,
    },
    {
      id: 'tpl-hazmat-weekly',
      name: 'Bi-Weekly Hazardous Waste Inspection',
      description: 'Inspect satellite and central accumulation areas.',
      category: 'Waste',
      frequency: 'weekly',
      tracked: false,
    },
    {
      id: 'tpl-spcc',
      name: 'SPCC Plan Review',
      description: 'Annual review of Spill Prevention Control and Countermeasure Plan.',
      category: 'SPCC',
      frequency: 'annually',
      tracked: true,
    },
  ])

  const categories = ref<Category[]>([
    'Air',
    'Water',
    'Waste',
    'SPCC',
    'EPCRA',
    'Fire Safety',
    'General Safety',
    'Corp',
  ])

  const frequencyOptions: { value: Frequency; label: string; description: string }[] = [
    { value: 'daily', label: 'Daily', description: 'Every day' },
    { value: 'weekly', label: 'Weekly', description: 'Once per week' },
    { value: 'monthly', label: 'Monthly', description: 'Once per month' },
    { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
    { value: 'annually', label: 'Annually', description: 'Once per year' },
    { value: 'custom', label: 'Custom', description: 'Define custom schedule' },
  ]

  const owners = ref<Owner[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@example.com',
      avatar: 'https://i.pravatar.cc/150?img=1',
      role: 'Environmental Manager',
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      avatar: 'https://i.pravatar.cc/150?img=5',
      role: 'Compliance Officer',
    },
    {
      id: '3',
      name: 'Mike Davis',
      email: 'mike.davis@example.com',
      avatar: 'https://i.pravatar.cc/150?img=8',
      role: 'Safety Coordinator',
    },
    {
      id: '4',
      name: 'Emily Brown',
      email: 'emily.brown@example.com',
      avatar: 'https://i.pravatar.cc/150?img=9',
      role: 'Operations Lead',
    },
    { id: '5', name: 'Operations Team', role: 'Team' },
    { id: '6', name: 'Environmental Team', role: 'Team' },
  ])

  const folders = ref<string[]>([
    'Air Quality',
    'Water Compliance',
    'Hazardous Materials',
    'Reporting & Documentation',
    'General',
  ])

  const standardTasks = ref<StandardTask[]>([
    { id: 'ST-001', name: 'Monthly Emissions Report' },
    { id: 'ST-002', name: 'Quarterly Water Sampling' },
    { id: 'ST-003', name: 'Annual Stack Test' },
    { id: 'ST-004', name: 'Weekly Inspection' },
    { id: 'ST-005', name: 'SPCC Plan Review' },
  ])

  const _reminderTimingOptions = ['1 day before', '3 days before', '1 week before', '2 weeks before']

  const _reminderMethodOptions = [
    { value: 'email', label: 'Email', icon: 'lucide:mail' },
    { value: 'in-app', label: 'In-app notification', icon: 'lucide:bell' },
    { value: 'sms', label: 'SMS', icon: 'lucide:message-square' },
  ]

  const _trackingOptions: {
    value: boolean
    label: string
    description: string
    icon: string
    color: 'emerald' | 'slate'
  }[] = [
    {
      value: true,
      label: 'Tracked',
      description: 'Escalates if overdue',
      icon: 'lucide:eye',
      color: 'emerald',
    },
    {
      value: false,
      label: 'Untracked',
      description: 'No escalation notifications',
      icon: 'lucide:eye-off',
      color: 'slate',
    },
  ]

  const _filteredTemplates = computed(() => {
    if (!templateSearchQuery.value) return templates.value
    const query = templateSearchQuery.value.toLowerCase()
    return templates.value.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query),
    )
  })

  const _filteredOwners = computed(() => {
    if (!involvedSearchQuery.value) return owners.value
    const query = involvedSearchQuery.value.toLowerCase()
    return owners.value.filter((owner) => owner.name.toLowerCase().includes(query))
  })

  const _frequencyStyles: Record<Frequency, { bg: string; color: string }> = {
    daily: { bg: 'bg-rose-500/10', color: 'text-rose-500' },
    weekly: { bg: 'bg-blue-500/10', color: 'text-blue-500' },
    monthly: { bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
    quarterly: { bg: 'bg-amber-500/10', color: 'text-amber-500' },
    annually: { bg: 'bg-violet-500/10', color: 'text-violet-500' },
    custom: { bg: 'bg-slate-500/10', color: 'text-slate-500' },
  }

  const isScheduleValid = computed(() => {
    return scheduleForm.title.trim().length > 0 && scheduleForm.owner.trim().length > 0 && scheduleForm.nextDue
  })

  const _detailsTabHasMissingRequired = computed(() => {
    return !scheduleForm.owner.trim()
  })

  const _sidebarHasMissingRequired = computed(() => {
    return !scheduleForm.nextDue
  })

  const resetScheduleForm = () => {
    scheduleForm.title = ''
    scheduleForm.description = ''
    scheduleForm.frequency = 'monthly'
    scheduleForm.nextDue = getToday()
    scheduleForm.customIntervalDays = ''
    scheduleForm.owner = ''
    scheduleForm.category = 'General Safety'
    scheduleForm.tracked = true
    scheduleForm.permitRef = ''
    scheduleForm.involved = []
    scheduleForm.standardTaskId = ''
    scheduleForm.folder = ''
    scheduleForm.reminderTiming = []
    scheduleForm.reminderMethods = []
    scheduleForm.customFields = []
    selectedTemplate.value = null
    templateSearchQuery.value = ''
    involvedSearchQuery.value = ''
  }

  watch(createScheduleOpen, (isOpen) => {
    if (isOpen) resetScheduleForm()
  })

  const openViewDialog = (task: (typeof scheduledTasks.value)[0]) => {
    viewingTask.value = task
    viewScheduleOpen.value = true
  }

  const viewingTaskIndex = computed(() => {
    if (!viewingTask.value) return -1
    return scheduledTasks.value.findIndex((t) => t.id === viewingTask.value?.id)
  })

  const canNavigatePrev = computed(() => viewingTaskIndex.value > 0)
  const canNavigateNext = computed(() => viewingTaskIndex.value < scheduledTasks.value.length - 1)

  const navigateToPrevTask = () => {
    if (canNavigatePrev.value) {
      viewingTask.value = scheduledTasks.value[viewingTaskIndex.value - 1] ?? null
    }
  }

  const navigateToNextTask = () => {
    if (canNavigateNext.value) {
      viewingTask.value = scheduledTasks.value[viewingTaskIndex.value + 1] ?? null
    }
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

  const _getUrgencyLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Due Today'
    if (diffDays <= 3) return 'High'
    if (diffDays <= 7) return 'Medium'
    return 'Low'
  }

  const _getUrgencyStyle = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'bg-red-500/15 text-red-700 dark:text-red-400 animate-pulse'
    if (diffDays === 0) return 'bg-red-500/15 text-red-700 dark:text-red-400 animate-pulse'
    if (diffDays <= 3) return 'bg-orange-500/15 text-orange-700 dark:text-orange-400'
    if (diffDays <= 7) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
    return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
  }

  const _getTaskOccurrences = (task: (typeof scheduledTasks.value)[0]) => {
    const occurrences: Date[] = []
    const startDate = new Date(task.dueDate)
    const scheduleMap: Record<string, number> = {
      Weekly: 7,
      Monthly: 30,
      Quarterly: 90,
      Annually: 365,
      'Semi-annually': 182,
    }
    const interval = task.schedule ? (scheduleMap[task.schedule] ?? 30) : 30

    for (let i = 0; i < 12; i++) {
      const occurrence = new Date(startDate)
      occurrence.setDate(startDate.getDate() + interval * i)
      occurrences.push(occurrence)
    }
    return occurrences
  }

  const _applyTemplate = (templateId: string) => {
    const template = templates.value.find((item) => item.id === templateId)
    if (!template) return
    selectedTemplate.value = templateId
    scheduleForm.title = template.name
    scheduleForm.description = template.description
    scheduleForm.category = template.category
    scheduleForm.frequency = template.frequency
    scheduleForm.tracked = template.tracked
  }

  const _clearTemplate = () => {
    selectedTemplate.value = null
    scheduleForm.title = ''
    scheduleForm.description = ''
  }

  const _toggleInvolved = (owner: string) => {
    if (scheduleForm.involved.includes(owner)) {
      scheduleForm.involved = scheduleForm.involved.filter((person) => person !== owner)
      return
    }
    scheduleForm.involved = [...scheduleForm.involved, owner]
  }

  const showInvolvedDropdown = ref(false)

  const _handleInvolvedBlur = () => {
    setTimeout(() => {
      showInvolvedDropdown.value = false
    }, 150)
  }

  const _toggleArrayValue = (list: string[], value: string, checked: boolean) => {
    if (checked && !list.includes(value)) {
      list.push(value)
      return
    }
    if (!checked) {
      const index = list.indexOf(value)
      if (index >= 0) list.splice(index, 1)
    }
  }

  const _addCustomField = () => {
    scheduleForm.customFields = [...scheduleForm.customFields, { key: '', value: '' }]
  }

  const _removeCustomField = (index: number) => {
    scheduleForm.customFields = scheduleForm.customFields.filter((_, idx) => idx !== index)
  }

  const handleCreateScheduleFromDialog = (formData: any) => {
    const scheduleLabel: string =
      frequencyOptions.find((option) => option.value === formData.frequency)?.label || 'Custom'
    const newTask = {
      id: `task-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      status: 'pending' as const,
      priority: 'medium' as const,
      dueDate: formData.nextDue,
      category: formData.category,
      owner: formData.owner,
      schedule: scheduleLabel,
      tracked: formData.tracked,
    }
    scheduledTasks.value.unshift(newTask)
    createScheduleOpen.value = false
  }

  const _handleCreateSchedule = () => {
    if (!isScheduleValid.value) return
    const scheduleLabel: string =
      frequencyOptions.find((option) => option.value === scheduleForm.frequency)?.label || 'Custom'

    scheduledTasks.value.unshift({
      id: `sched-${Math.random().toString(36).slice(2, 8)}`,
      title: scheduleForm.title.trim(),
      description: scheduleForm.description,
      status: 'on-track',
      priority: 'medium',
      dueDate: scheduleForm.nextDue,
      category: scheduleForm.category,
      owner: scheduleForm.owner || undefined,
      tracked: scheduleForm.tracked,
      schedule: scheduleLabel,
      reminders: scheduleForm.reminderTiming,
      involved: scheduleForm.involved,
    })

    createScheduleOpen.value = false
    resetScheduleForm()
  }

  const scheduledTasks = ref<Task[]>([
    {
      id: '1',
      title: 'Monthly Air Emissions Report',
      description:
        'Submit monthly emissions data to EPA via CEDRI portal. Includes stack test results and continuous monitoring data.',
      status: 'on-track',
      priority: 'high',
      dueDate: '2025-02-01',
      category: 'Air',
      inspectionType: 'Report',
      branches: ['environmental'],
      owner: 'uid_00001001',
      tracked: true,
      schedule: 'Monthly',
      reminders: ['1 week before', '3 days before'],
      involved: ['uid_00001002', 'uid_00001003'],
      commentCount: 3,
      fileCount: 2,
    },
    {
      id: '2',
      title: 'Quarterly Stormwater Sampling',
      description: 'Collect and analyze stormwater discharge samples per NPDES permit requirements.',
      status: 'on-track',
      priority: 'high',
      dueDate: '2025-03-15',
      category: 'Water',
      inspectionType: 'Monitoring',
      branches: ['environmental'],
      owner: 'uid_00001002',
      tracked: true,
      schedule: 'Quarterly',
      reminders: ['2 weeks before', '1 week before'],
      notes: 'NPDES #2024-0042',
    },
    {
      id: '3',
      title: 'Annual SPCC Plan Review',
      description: 'Review and update Spill Prevention Control and Countermeasure Plan as required by EPA regulations.',
      status: 'on-track',
      priority: 'high',
      dueDate: '2025-06-01',
      category: 'SPCC',
      inspectionType: 'Inspection',
      branches: ['environmental', 'safety'],
      owner: 'uid_00001003',
      tracked: true,
      schedule: 'Annually',
      reminders: ['1 month before', '2 weeks before', '1 week before'],
    },
    {
      id: '4',
      title: 'Weekly Equipment Inspection',
      description: 'Inspect all monitoring equipment and calibration status.',
      status: 'overdue',
      priority: 'medium',
      dueDate: '2025-01-27',
      category: 'General Safety',
      inspectionType: 'Equipment Inspection',
      branches: ['safety'],
      owner: 'uid_00001004',
      tracked: false,
      schedule: 'Weekly',
      taskNeedsCorrectiveAction: true,
    },
    {
      id: '5',
      title: 'Bi-Annual Training Certification',
      description: 'Complete required environmental compliance training for all facility personnel.',
      status: 'on-track',
      priority: 'medium',
      dueDate: '2025-07-01',
      category: 'Corp',
      inspectionType: 'Training',
      branches: ['environmental', 'safety'],
      owner: 'uid_00001001',
      tracked: true,
      schedule: 'Semi-annually',
      involved: ['uid_00001005', 'uid_00001006'],
    },
    {
      id: '6',
      title: 'Weekly Tank Level Monitoring',
      description: 'Monitor and record tank levels for all chemical storage tanks.',
      status: 'due-soon',
      priority: 'medium',
      dueDate: '2025-01-28',
      category: 'Waste',
      inspectionType: 'Monitoring',
      branches: ['environmental'],
      owner: 'uid_00001007',
      tracked: false,
      schedule: 'Weekly',
    },
    {
      id: '7',
      title: 'Monthly Wastewater Discharge Report',
      description: 'Compile and submit monthly wastewater discharge monitoring report.',
      status: 'on-track',
      priority: 'high',
      dueDate: '2025-02-15',
      category: 'Water',
      inspectionType: 'Report',
      branches: ['environmental'],
      owner: 'uid_00001008',
      tracked: true,
      schedule: 'Monthly',
      notes: 'NPDES #2024-0042',
      commentCount: 1,
    },
    {
      id: '8',
      title: 'Quarterly Groundwater Monitoring',
      description: 'Monitor and analyze groundwater samples from facility wells.',
      status: 'on-track',
      priority: 'medium',
      dueDate: '2025-04-01',
      category: 'Water',
      inspectionType: 'Monitoring',
      branches: ['environmental'],
      owner: 'uid_00001009',
      tracked: true,
      schedule: 'Quarterly',
    },
    {
      id: '9',
      title: 'Annual Hazmat Inventory',
      description: 'Complete annual inventory of all hazardous materials on site.',
      status: 'on-track',
      priority: 'high',
      dueDate: '2025-12-31',
      category: 'EPCRA',
      inspectionType: 'Inspection',
      branches: ['environmental', 'safety'],
      owner: 'uid_00001010',
      tracked: true,
      schedule: 'Annually',
    },
    {
      id: '10',
      title: 'Weekly Safety Walk-through',
      description: 'Conduct weekly safety inspection of all facility areas.',
      status: 'due-soon',
      priority: 'medium',
      dueDate: '2025-01-29',
      category: 'General Safety',
      inspectionType: 'Inspection',
      branches: ['safety'],
      owner: 'uid_00001002',
      tracked: false,
      schedule: 'Weekly',
    },
    {
      id: '11',
      title: 'Monthly Fire Extinguisher Check',
      description: 'Inspect all fire extinguishers for proper pressure and accessibility.',
      status: 'completed',
      priority: 'medium',
      dueDate: '2025-02-28',
      category: 'Fire Safety',
      inspectionType: 'Inspection',
      branches: ['safety'],
      owner: 'uid_00001003',
      tracked: true,
      schedule: 'Monthly',
    },
    {
      id: '12',
      title: 'Quarterly Emergency Drill',
      description: 'Conduct quarterly emergency evacuation drill.',
      status: 'on-track',
      priority: 'high',
      dueDate: '2025-03-30',
      category: 'Emergency Preparedness',
      inspectionType: 'Training',
      branches: ['safety'],
      owner: 'uid_00001004',
      tracked: true,
      schedule: 'Quarterly',
    },
    {
      id: '13',
      title: 'Semi-Annual Air Quality Testing',
      description: 'Perform comprehensive air quality testing in all work areas.',
      status: 'on-track',
      priority: 'high',
      dueDate: '2025-06-15',
      category: 'Air',
      inspectionType: 'Testing',
      branches: ['environmental'],
      owner: 'uid_00001001',
      tracked: true,
      schedule: 'Semi-annually',
    },
    {
      id: '14',
      title: 'Annual Permit Renewal Review',
      description: 'Review all environmental permits for renewal requirements.',
      status: 'on-track',
      priority: 'high',
      dueDate: '2025-11-01',
      category: 'Corp',
      inspectionType: 'Report',
      branches: ['environmental'],
      owner: 'uid_00001007',
      tracked: true,
      schedule: 'Annually',
    },
    {
      id: '15',
      title: 'Monthly Chemical Storage Audit',
      description: 'Audit chemical storage areas for compliance and organization.',
      status: 'on-track',
      priority: 'medium',
      dueDate: '2025-02-10',
      category: 'Waste',
      inspectionType: 'Inspection',
      branches: ['environmental', 'safety'],
      owner: 'uid_00001008',
      tracked: true,
      schedule: 'Monthly',
    },
  ])

  const { browseState, filteredItems: filteredTasks } = useBrowse({
    items: scheduledTasks,
    searchFields: ['title', 'owner'],
    defaultViewMode: 'table',
    sortOptions: [
      { value: 'dueDate', label: 'Due Date' },
      { value: 'title', label: 'Title' },
    ],
    filters: [
      {
        id: 'schedule',
        label: 'Schedule',
        icon: 'lucide:calendar-clock',
        options: [
          { value: 'all', label: 'All Schedules' },
          { value: 'Daily', label: 'Daily' },
          { value: 'Weekly', label: 'Weekly' },
          { value: 'Monthly', label: 'Monthly' },
          { value: 'Quarterly', label: 'Quarterly' },
          { value: 'Semi-annually', label: 'Semi-annually' },
          { value: 'Annually', label: 'Annually' },
          { value: 'Custom', label: 'Custom' },
        ],
        fn: (item, val) => item.schedule === val,
      },
      {
        id: 'status',
        label: 'Status',
        icon: 'lucide:circle-dot',
        options: [
          { value: 'all', label: 'All Statuses' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'due-soon', label: 'Due Soon' },
          { value: 'on-track', label: 'Due Later' },
          { value: 'completed', label: 'Completed' },
        ],
        fn: (item, val) => item.status === val,
      },
    ],
  })

  const selectedTasks = ref<string[]>([])
  const viewMode = computed(() => browseState.viewMode.value)

  // View mode options dynamically inferred from type:Task schema
  const viewModeOptions = computed(() =>
    buildViewModeOptionsFromType('type:Task', ['grid', 'list', 'table', 'calendar', 'kanban']),
  )

  // Calendar view data - transform tasks into JSON-LD format
  const calendarData = computed(() => {
    const nodes = scheduledTasks.value.map((task) => ({
      '@id': `task:${task.id}`,
      '@type': 'Task',
      'trellis:title': task.title,
      'user:dueDate': task.dueDate,
      'user:status': task.status,
      'user:owner': task.owner,
      'user:priority': task.priority,
      'user:schedule': task.schedule,
    }))
    return JSON.stringify({ '@graph': nodes })
  })

  // Calendar schema fallback
  const calendarSchema = computed(() => ({
    id: 'scheduled-tasks-schema',
    collectionId: 'scheduled-tasks',
    fields: [
      { id: 'dueDate', name: 'Due Date', type: 'date' as const, order: 0, required: false },
      { id: 'status', name: 'Status', type: 'select' as const, order: 1, required: false },
      { id: 'owner', name: 'Owner', type: 'text' as const, order: 2, required: false },
      { id: 'priority', name: 'Priority', type: 'select' as const, order: 3, required: false },
    ],
    views: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }))

  // Kanban columns grouped by status
  const kanbanColumns = computed(() => [
    {
      id: 'overdue',
      label: 'Overdue',
      color: 'border-red-500',
      tasks: filteredTasks.value.filter((t) => t.status === 'overdue'),
    },
    {
      id: 'due-soon',
      label: 'Due Soon',
      color: 'border-amber-500',
      tasks: filteredTasks.value.filter((t) => t.status === 'due-soon'),
    },
    {
      id: 'on-track',
      label: 'Due Later',
      color: 'border-emerald-500',
      tasks: filteredTasks.value.filter((t) => t.status === 'on-track'),
    },
    {
      id: 'completed',
      label: 'Completed',
      color: 'border-gray-400',
      tasks: filteredTasks.value.filter((t) => t.status === 'completed'),
    },
  ])

  const stats = computed<PageStat[]>(() => [
    { label: 'Total Scheduled', value: scheduledTasks.value.length, icon: 'lucide:clock' },
    {
      label: 'Overdue',
      value: scheduledTasks.value.filter((t) => t.status === 'overdue').length,
      icon: 'lucide:alert-circle',
      color: 'text-rose-500',
    },
    {
      label: 'Due Soon',
      value: scheduledTasks.value.filter((t) => t.status === 'due-soon').length,
      icon: 'lucide:clock',
      color: 'text-amber-500',
    },
    {
      label: 'Completed',
      value: scheduledTasks.value.filter((t) => t.status === 'completed').length,
      icon: 'lucide:check-circle',
      color: 'text-emerald-500',
    },
  ])

  const scheduleColors: Record<string, string> = {
    Daily: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    Weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Monthly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Quarterly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Semi-annually': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    Annually: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    Custom: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  }

  const statusColors: Record<string, string> = {
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'due-soon': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'on-track': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'in-progress': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  }

  const priorityIcons: Record<string, string> = {
    high: 'lucide:alert-circle',
    medium: 'lucide:minus-circle',
    low: 'lucide:arrow-down-circle',
  }

  const priorityColors: Record<string, string> = {
    high: 'text-rose-500',
    medium: 'text-amber-500',
    low: 'text-blue-500',
  }

  const categoryColors: Record<string, string> = {
    Air: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    Water: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Waste: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    EPCRA: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    SPCC: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'Fire Safety': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    'Emergency Preparedness': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'General Safety': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'Lockout/Tagout': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Respiratory Protection': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    'Vehicle Safety': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'Industrial Hygiene': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Machine Guarding': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    'Personal Protective Equipment': 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
    Corp: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }

  const branchColors: Record<string, string> = {
    environmental: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    safety: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }

  const formatUserId = (uid: string | undefined) => {
    if (!uid) return '—'
    const num = uid.replace('uid_', '').replace(/^0+/, '')
    return `User ${num || '1'}`
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }
</script>

<template>
  <Page
    variant="browse"
    :title="currentFacility?.name ? `${currentFacility.name} - Scheduled Tasks` : 'Scheduled Tasks'"
    :subtitle="currentOrganization?.name"
    description="Recurring compliance tasks with automated scheduling."
    icon="lucide:clock"
    icon-class="text-purple-300"
    search-placeholder="Search scheduled tasks..."
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :browse="browseState"
    :view-mode-options="viewModeOptions">
    <!-- Filters are now handled automatically by Page.vue via browseState -->

    <!-- Page handles #search and #viewSwitcher via :browse prop -->

    <template #toolbarActions>
      <div v-if="selectedTasks.length > 0" class="flex items-center gap-2 mr-2">
        <span class="text-sm text-muted-foreground">{{ selectedTasks.length }} selected</span>
        <UiButton variant="outline" size="sm">
          <Icon name="lucide:pause" class="mr-2 h-4 w-4" />
          Pause
        </UiButton>
      </div>
      <UiButton @click="createScheduleOpen = true">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Create Schedule
      </UiButton>
    </template>

    <!-- Table View - All Properties -->
    <div v-if="viewMode === 'table'" class="overflow-hidden rounded-xl border border-border bg-card">
      <div class="overflow-x-auto">
        <UiTable>
          <UiTableHeader>
            <UiTableRow>
              <UiTableHead class="w-12 sticky left-0 bg-card z-10">
                <UiCheckbox
                  :checked="selectedTasks.length === filteredTasks.length && filteredTasks.length > 0"
                  @update:checked="selectedTasks = $event ? filteredTasks.map((t) => t.id) : []" />
              </UiTableHead>
              <UiTableHead class="min-w-[250px]">Task</UiTableHead>
              <UiTableHead>Schedule</UiTableHead>
              <UiTableHead>Status</UiTableHead>
              <UiTableHead>Priority</UiTableHead>
              <UiTableHead>Category</UiTableHead>
              <UiTableHead>Type</UiTableHead>
              <UiTableHead>Branch</UiTableHead>
              <UiTableHead>Due Date</UiTableHead>
              <UiTableHead>Owner</UiTableHead>
              <UiTableHead>Involved</UiTableHead>
              <UiTableHead class="text-center">
                <Icon name="lucide:message-square" class="h-4 w-4" />
              </UiTableHead>
              <UiTableHead class="text-center">
                <Icon name="lucide:paperclip" class="h-4 w-4" />
              </UiTableHead>
              <UiTableHead>Tracked</UiTableHead>
              <UiTableHead>Notes</UiTableHead>
              <UiTableHead>Updated</UiTableHead>
              <UiTableHead class="w-12"></UiTableHead>
            </UiTableRow>
          </UiTableHeader>
          <UiTableBody>
            <UiTableRow
              v-for="task in filteredTasks"
              :key="task.id"
              class="cursor-pointer"
              @click="openViewDialog(task)">
              <UiTableCell class="sticky left-0 bg-card z-10" @click.stop>
                <UiCheckbox
                  :checked="selectedTasks.includes(task.id)"
                  @update:checked="
                    selectedTasks = $event ? [...selectedTasks, task.id] : selectedTasks.filter((id) => id !== task.id)
                  " />
              </UiTableCell>
              <UiTableCell>
                <div class="flex items-center gap-2">
                  <Icon
                    :name="priorityIcons[task.priority] || 'lucide:circle'"
                    :class="['h-4 w-4 shrink-0', priorityColors[task.priority]]" />
                  <span class="font-medium">{{ task.title }}</span>
                  <Icon
                    v-if="task.taskNeedsCorrectiveAction"
                    name="lucide:alert-triangle"
                    class="h-4 w-4 text-amber-500 shrink-0"
                    title="Needs Corrective Action" />
                </div>
              </UiTableCell>
              <UiTableCell>
                <span
                  :class="[
                    'rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap',
                    scheduleColors[task.schedule || ''] || 'bg-gray-100 text-gray-600',
                  ]">
                  {{ task.schedule || '—' }}
                </span>
              </UiTableCell>
              <UiTableCell>
                <span
                  :class="['rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap', statusColors[task.status]]">
                  {{ task.status.replace('-', ' ') }}
                </span>
              </UiTableCell>
              <UiTableCell>
                <div class="flex items-center gap-1.5">
                  <Icon
                    :name="priorityIcons[task.priority] || 'lucide:circle'"
                    :class="['h-4 w-4', priorityColors[task.priority]]" />
                  <span class="text-sm capitalize">{{ task.priority }}</span>
                </div>
              </UiTableCell>
              <UiTableCell>
                <span
                  :class="[
                    'rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap',
                    categoryColors[task.category || ''] ||
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                  ]">
                  {{ task.category || '—' }}
                </span>
              </UiTableCell>
              <UiTableCell class="text-muted-foreground text-sm whitespace-nowrap">
                {{ task.inspectionType || '—' }}
              </UiTableCell>
              <UiTableCell>
                <div class="flex gap-1">
                  <span
                    v-for="branch in task.branches"
                    :key="branch"
                    :class="[
                      'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      branchColors[branch] || 'bg-gray-100 text-gray-600',
                    ]">
                    {{ branch.slice(0, 3).toUpperCase() }}
                  </span>
                  <span v-if="!task.branches?.length" class="text-muted-foreground/50">—</span>
                </div>
              </UiTableCell>
              <UiTableCell class="text-muted-foreground whitespace-nowrap">{{ task.dueDate }}</UiTableCell>
              <UiTableCell class="text-sm">{{ formatUserId(task.owner) }}</UiTableCell>
              <UiTableCell>
                <div v-if="task.involved?.length" class="flex -space-x-1">
                  <div
                    v-for="uid in task.involved.slice(0, 3)"
                    :key="uid"
                    class="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-medium"
                    :title="formatUserId(uid)">
                    {{ formatUserId(uid).slice(0, 2).toUpperCase() }}
                  </div>
                  <div
                    v-if="task.involved.length > 3"
                    class="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-medium">
                    +{{ task.involved.length - 3 }}
                  </div>
                </div>
                <span v-else class="text-muted-foreground text-sm">—</span>
              </UiTableCell>
              <UiTableCell class="text-center">
                <span v-if="task.commentCount" class="text-sm text-muted-foreground">{{ task.commentCount }}</span>
                <span v-else class="text-muted-foreground/50">—</span>
              </UiTableCell>
              <UiTableCell class="text-center">
                <span v-if="task.fileCount" class="text-sm text-muted-foreground">{{ task.fileCount }}</span>
                <span v-else class="text-muted-foreground/50">—</span>
              </UiTableCell>
              <UiTableCell>
                <Icon v-if="task.tracked" name="lucide:eye" class="h-4 w-4 text-blue-500" title="Tracked task" />
                <span v-else class="text-muted-foreground/50">—</span>
              </UiTableCell>
              <UiTableCell class="max-w-[200px]">
                <span v-if="task.notes" class="text-sm text-muted-foreground truncate block" :title="task.notes">
                  {{ task.notes.slice(0, 50) }}{{ task.notes.length > 50 ? '...' : '' }}
                </span>
                <span v-else class="text-muted-foreground/50">—</span>
              </UiTableCell>
              <UiTableCell class="text-muted-foreground text-sm whitespace-nowrap">
                {{ formatDate(task.updatedAt) }}
              </UiTableCell>
              <UiTableCell @click.stop>
                <UiButton variant="ghost" size="icon">
                  <Icon name="lucide:more-horizontal" class="h-4 w-4" />
                </UiButton>
              </UiTableCell>
            </UiTableRow>
          </UiTableBody>
        </UiTable>
      </div>
    </div>

    <!-- List View - Compact with key details -->
    <div v-else-if="viewMode === 'list'" class="space-y-2">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="flex items-start gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted transition-colors cursor-pointer"
        @click="openViewDialog(task)">
        <UiCheckbox
          class="mt-1"
          :checked="selectedTasks.includes(task.id)"
          @click.stop
          @update:checked="
            selectedTasks = $event ? [...selectedTasks, task.id] : selectedTasks.filter((id) => id !== task.id)
          " />
        <Icon
          :name="priorityIcons[task.priority] || 'lucide:circle'"
          :class="['h-5 w-5 shrink-0 mt-0.5', priorityColors[task.priority]]" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <p class="font-medium truncate">{{ task.title }}</p>
            <Icon
              v-if="task.taskNeedsCorrectiveAction"
              name="lucide:alert-triangle"
              class="h-4 w-4 text-amber-500 shrink-0" />
            <Icon v-if="task.tracked" name="lucide:eye" class="h-4 w-4 text-blue-500 shrink-0" />
          </div>
          <div class="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span
              :class="[
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                scheduleColors[task.schedule || ''] || 'bg-gray-100 text-gray-600',
              ]">
              {{ task.schedule || 'One-time' }}
            </span>
            <span
              :class="[
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                categoryColors[task.category || ''] || 'bg-gray-100 text-gray-600',
              ]">
              {{ task.category || 'General' }}
            </span>
            <span>{{ formatUserId(task.owner) }}</span>
            <span>·</span>
            <span>{{ task.dueDate }}</span>
            <span v-if="task.commentCount" class="flex items-center gap-1">
              <Icon name="lucide:message-square" class="h-3 w-3" />
              {{ task.commentCount }}
            </span>
            <span v-if="task.fileCount" class="flex items-center gap-1">
              <Icon name="lucide:paperclip" class="h-3 w-3" />
              {{ task.fileCount }}
            </span>
          </div>
          <p v-if="task.notes" class="text-sm text-muted-foreground mt-1 line-clamp-1">
            {{ task.notes }}
          </p>
        </div>
        <span :class="['rounded-full px-2 py-1 text-xs font-medium shrink-0', statusColors[task.status]]">
          {{ task.status.replace('-', ' ') }}
        </span>
        <UiButton variant="ghost" size="icon" class="shrink-0" @click.stop>
          <Icon name="lucide:more-horizontal" class="h-4 w-4" />
        </UiButton>
      </div>
    </div>

    <!-- Grid View - Card layout with category, description, and metadata -->
    <div v-else-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiCard
        v-for="task in filteredTasks"
        :key="task.id"
        class="relative overflow-hidden hover:bg-muted transition-colors cursor-pointer"
        @click="openViewDialog(task)">
        <div class="absolute top-0 left-0 w-1 h-full" :class="(statusColors[task.status] || '').split(' ')[0]" />
        <UiCardHeader class="pb-2">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <UiCheckbox
                :checked="selectedTasks.includes(task.id)"
                @click.stop
                @update:checked="
                  selectedTasks = $event ? [...selectedTasks, task.id] : selectedTasks.filter((id) => id !== task.id)
                " />
              <Icon
                :name="priorityIcons[task.priority] || 'lucide:circle'"
                :class="['h-4 w-4', priorityColors[task.priority] || '']" />
              <Icon v-if="task.tracked" name="lucide:eye" class="h-3.5 w-3.5 text-blue-500" />
              <Icon
                v-if="task.taskNeedsCorrectiveAction"
                name="lucide:alert-triangle"
                class="h-3.5 w-3.5 text-amber-500" />
            </div>
            <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', statusColors[task.status]]">
              {{ task.status.replace('-', ' ') }}
            </span>
          </div>
          <UiCardTitle class="text-base mt-2">{{ task.title }}</UiCardTitle>
          <div class="flex items-center gap-1.5 mt-1">
            <span
              :class="[
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                scheduleColors[task.schedule || ''] || 'bg-gray-100 text-gray-600',
              ]">
              {{ task.schedule || 'One-time' }}
            </span>
            <span
              :class="[
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                categoryColors[task.category || ''] || 'bg-gray-100 text-gray-600',
              ]">
              {{ task.category || 'General' }}
            </span>
            <span
              v-for="branch in task.branches"
              :key="branch"
              :class="[
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                branchColors[branch] || 'bg-gray-100 text-gray-600',
              ]">
              {{ branch.slice(0, 3).toUpperCase() }}
            </span>
          </div>
        </UiCardHeader>
        <UiCardContent class="pt-0 space-y-2">
          <p v-if="task.description" class="text-sm text-muted-foreground line-clamp-2">
            {{ task.description }}
          </p>
          <div class="flex items-center justify-between text-sm text-muted-foreground">
            <span>{{ formatUserId(task.owner) }}</span>
            <span>{{ task.dueDate }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-muted-foreground border-t border-border pt-2">
            <span v-if="task.involved?.length" class="flex items-center gap-1">
              <Icon name="lucide:users" class="h-3 w-3" />
              {{ task.involved.length }}
            </span>
            <span v-if="task.commentCount" class="flex items-center gap-1">
              <Icon name="lucide:message-square" class="h-3 w-3" />
              {{ task.commentCount }}
            </span>
            <span v-if="task.fileCount" class="flex items-center gap-1">
              <Icon name="lucide:paperclip" class="h-3 w-3" />
              {{ task.fileCount }}
            </span>
            <span
              v-if="!task.involved?.length && !task.commentCount && !task.fileCount"
              class="text-muted-foreground/50">
              No activity
            </span>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <!-- Kanban View - Compact cards with category, indicators -->
    <div v-else-if="viewMode === 'kanban'" class="flex gap-4 overflow-x-auto pb-4">
      <div
        v-for="column in kanbanColumns"
        :key="column.id"
        class="flex-shrink-0 w-72 rounded-lg border-t-4 bg-muted/30"
        :class="column.color">
        <div class="p-3 border-b border-border">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-sm">{{ column.label }}</h3>
            <span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {{ column.tasks.length }}
            </span>
          </div>
        </div>
        <div class="p-2 space-y-2 min-h-[200px]">
          <div
            v-for="task in column.tasks"
            :key="task.id"
            class="rounded-lg border border-border bg-card p-3 hover:bg-muted transition-colors cursor-pointer"
            @click="openViewDialog(task)">
            <div class="flex items-start gap-2 mb-2">
              <Icon
                :name="priorityIcons[task.priority] || 'lucide:circle'"
                :class="['h-4 w-4 mt-0.5 shrink-0', priorityColors[task.priority] || '']" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium leading-tight">{{ task.title }}</p>
                <div class="flex items-center gap-1 mt-1">
                  <span
                    :class="[
                      'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                      scheduleColors[task.schedule || ''] || 'bg-gray-100 text-gray-600',
                    ]">
                    {{ task.schedule || 'One-time' }}
                  </span>
                  <span
                    :class="[
                      'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                      categoryColors[task.category || ''] || 'bg-gray-100 text-gray-600',
                    ]">
                    {{ task.category || 'General' }}
                  </span>
                  <Icon v-if="task.tracked" name="lucide:eye" class="h-3 w-3 text-blue-500" />
                  <Icon
                    v-if="task.taskNeedsCorrectiveAction"
                    name="lucide:alert-triangle"
                    class="h-3 w-3 text-amber-500" />
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ formatUserId(task.owner) }}</span>
              <span>{{ task.dueDate }}</span>
            </div>
            <div
              v-if="task.commentCount || task.fileCount"
              class="flex items-center gap-2 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
              <span v-if="task.commentCount" class="flex items-center gap-1">
                <Icon name="lucide:message-square" class="h-3 w-3" />
                {{ task.commentCount }}
              </span>
              <span v-if="task.fileCount" class="flex items-center gap-1">
                <Icon name="lucide:paperclip" class="h-3 w-3" />
                {{ task.fileCount }}
              </span>
            </div>
          </div>
          <div
            v-if="column.tasks.length === 0"
            class="flex items-center justify-center h-20 text-sm text-muted-foreground">
            No tasks
          </div>
        </div>
      </div>
    </div>

    <!-- Calendar View -->
    <div v-else-if="viewMode === 'calendar'" class="h-fit min-h-[500px]">
      <CalendarView :collection-id="'scheduled-tasks'" :model-value="calendarData" :schema="calendarSchema" />
    </div>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredTasks.length }} scheduled tasks
    </div>

    <!-- Create Schedule Dialog -->
    <TaskCreateDialog
      v-model:open="createScheduleOpen"
      :is-recurring="true"
      :templates="templates"
      :owners="owners"
      :folders="folders"
      :standard-tasks="standardTasks"
      :categories="categories"
      @save="handleCreateScheduleFromDialog"
      @close="createScheduleOpen = false" />

    <!-- View Schedule Dialog -->
    <TaskDetailDialog
      v-model:open="viewScheduleOpen"
      :task="viewingTask"
      :can-navigate-prev="canNavigatePrev"
      :can-navigate-next="canNavigateNext"
      :show-schedule-section="true"
      :activity="comments"
      @navigate-prev="navigateToPrevTask"
      @navigate-next="navigateToNextTask"
      @close="viewScheduleOpen = false"
      @edit="
        () => {
          viewScheduleOpen = false
          createScheduleOpen = true
        }
      "
      @delete="() => {}" />
  </Page>
</template>
