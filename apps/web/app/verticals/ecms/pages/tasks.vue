<script setup lang="ts">
  /**
   * Facility Tasks Page - Graph-Driven Implementation
   *
   * This page demonstrates the graph-driven architecture:
   * - Data fetched via useFacilityEntities (from seed data, will migrate to InstantDB)
   * - Schema derived from type:Task in app-config.jsonld
   * - View modes (table, kanban, calendar) driven by schema field types
   */
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import { useFacilityEntities } from '~/composables/useFacilityEntities'
  import { buildViewModeOptionsFromType } from '~/lib/projections'
  import CalendarView from '~/components/views/CalendarView.vue'
  import UnifiedTaskDialog from '~/components/dialogs/UnifiedTaskDialog.vue'
  import FolderCreateDialog from '~/components/dialogs/FolderCreateDialog.vue'
  import ScheduledTasksView from '~/components/views/ScheduledTasksView.vue'
  import SuggestedTasksView from '~/components/views/SuggestedTasksView.vue'
  import FoldersView from '~/components/views/FoldersView.vue'
  import StandardTasksView from '~/components/views/StandardTasksView.vue'

  definePageMeta({
    layout: 'default',
  })

  const route = useRoute()
  const router = useRouter()
  const { currentFacility } = useFacilities()
  const { currentOrganization } = useOrganizations()

  // Section navigation
  type TaskSection = 'my' | 'all' | 'scheduled' | 'suggested' | 'templates' | 'folders'

  // Mock current user - using uid_00001001 (Alex Smith) from seed data
  // In production, this would come from the auth system
  const MOCK_CURRENT_USER_ID = 'uid_00001001'

  type TaskSectionConfig = {
    id: TaskSection
    label: string
    icon: string
    description: string
    viewModes: BrowseViewMode[]
  }

  const taskSections: TaskSectionConfig[] = [
    {
      id: 'my' as TaskSection,
      label: 'My Tasks',
      icon: 'lucide:user-check',
      description: 'Tasks assigned to you',
      viewModes: ['kanban', 'calendar', 'table'],
    },
    {
      id: 'all' as TaskSection,
      label: 'Facility Tasks',
      icon: 'lucide:building-2',
      description: 'All compliance tasks for this facility',
      viewModes: ['kanban', 'calendar', 'table'],
    },
    {
      id: 'scheduled' as TaskSection,
      label: 'Scheduled',
      icon: 'lucide:clock',
      description: 'Recurring tasks with schedules',
      viewModes: ['table'],
    },
    {
      id: 'suggested' as TaskSection,
      label: 'Suggested',
      icon: 'lucide:lightbulb',
      description: 'AI-recommended tasks',
      viewModes: ['table', 'grid'],
    },
    {
      id: 'templates' as TaskSection,
      label: 'Templates',
      icon: 'lucide:layout-template',
      description: 'Reusable task templates',
      viewModes: ['grid', 'table'],
    },
    {
      id: 'folders' as TaskSection,
      label: 'Folders',
      icon: 'lucide:folder',
      description: 'Organized task collections',
      viewModes: ['table', 'list'],
    },
  ]

  // Active section from URL query param
  const activeSection = computed<TaskSection>({
    get: () => (route.query.section as TaskSection) || 'all',
    set: (value) => {
      router.push({ query: { ...route.query, section: value } })
    },
  })

  const currentSection = computed(() => taskSections.find((s) => s.id === activeSection.value))

  const pageTitle = computed(() => {
    if (activeSection.value === 'my') return 'My Tasks'
    if (activeSection.value === 'all') return 'Facility Tasks'
    return currentSection.value?.label || 'Tasks'
  })

  const pageSubtitle = computed(() => {
    if (activeSection.value === 'my' || activeSection.value === 'all') return currentFacility.value?.name || 'Facility'
    return currentOrganization.value?.name || ''
  })

  useHead(() => ({
    title: `${currentSection.value?.label || 'Tasks'} | ${currentFacility.value?.name || 'Facility'}`,
  }))

  // Graph-driven data fetching: Get tasks scoped to current facility
  const {
    items: tasks,
    stats: entityStats,
    schema,
    create: createTask,
    update: _updateTask,
    remove: removeTask,
  } = useFacilityEntities({
    facilityId: currentFacility.value?.id,
    entityType: 'task',
  })

  // Mock data for other sections (will be replaced with real data fetching)
  const scheduledTasks = ref([
    {
      id: 'sched-1',
      title: 'Monthly Air Emissions Report',
      schedule: 'Monthly',
      nextDue: '2025-02-01',
      assignee: 'John Doe',
      status: 'active',
      category: 'Air',
      priority: 'high',
    },
    {
      id: 'sched-2',
      title: 'Quarterly Stormwater Sampling',
      schedule: 'Quarterly',
      nextDue: '2025-03-15',
      assignee: 'Jane Smith',
      status: 'active',
      category: 'Water',
      priority: 'medium',
    },
  ])

  const suggestedTasks = ref([
    {
      id: 'sugg-1',
      title: 'Update SPCC Plan',
      reason: 'Required by regulation updates',
      confidence: 0.95,
      category: 'safety',
      priority: 'high',
      dueDate: '2025-02-15',
      type: 'regulatory-update',
    },
    {
      id: 'sugg-2',
      title: 'Review Emergency Response Plan',
      reason: 'Annual review due',
      confidence: 0.88,
      category: 'safety',
      priority: 'medium',
      dueDate: '2025-03-01',
      type: 'deficient-task',
    },
  ])

  const standardTasks = ref([
    {
      id: 'std-1',
      name: 'Weekly Equipment Inspection',
      category: 'General Safety',
      usageCount: 24,
      lastUsed: '2025-01-15',
    },
    {
      id: 'std-2',
      name: 'Monthly Wastewater Report',
      category: 'Water',
      usageCount: 18,
      lastUsed: '2025-01-10',
    },
  ])

  const folders = ref([
    {
      id: 'folder-1',
      name: 'Air Quality',
      taskCount: 12,
      icon: 'lucide:wind',
      color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
      description: '',
    },
    {
      id: 'folder-2',
      name: 'Water Compliance',
      taskCount: 8,
      icon: 'lucide:droplet',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      description: '',
    },
    {
      id: 'folder-3',
      name: 'Safety Reports',
      taskCount: 15,
      icon: 'lucide:shield',
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      description: '',
    },
  ])

  // My Tasks - tasks assigned to the current user (owner matches user ID)
  const myTasks = computed(() => {
    return tasks.value.filter((task: any) => {
      // Check if task is owned by the current user
      if (task.owner === MOCK_CURRENT_USER_ID) return true
      // Also check 'assignee' field for backwards compatibility
      if (task.assignee === MOCK_CURRENT_USER_ID) return true
      // Check if current user is in the involved list
      if (Array.isArray(task.involved) && task.involved.includes(MOCK_CURRENT_USER_ID)) return true
      return false
    })
  })

  // Section-specific data
  const sectionData = computed(() => {
    switch (activeSection.value) {
      case 'my':
        return myTasks.value
      case 'scheduled':
        return scheduledTasks.value
      case 'suggested':
        return suggestedTasks.value
      case 'templates':
        return standardTasks.value
      case 'folders':
        return folders.value
      default:
        return tasks.value
    }
  })

  const selectedTasks = ref<string[]>([])
  const templatesRef = ref<InstanceType<typeof StandardTasksView> | null>(null)

  // Section-specific browse configuration
  const browseConfig = computed(() => {
    switch (activeSection.value) {
      case 'scheduled':
        return {
          searchFields: ['title', 'assignee'],
          sortOptions: [
            { value: 'nextDue', label: 'Next Due' },
            { value: 'title', label: 'Title' },
          ],
          filters: [
            {
              id: 'schedule',
              label: 'Schedule',
              icon: 'lucide:calendar-clock',
              options: [
                { value: 'all', label: 'All Schedules' },
                { value: 'Weekly', label: 'Weekly' },
                { value: 'Monthly', label: 'Monthly' },
                { value: 'Quarterly', label: 'Quarterly' },
              ],
              fn: (item: any, val: string) => item.schedule === val,
            },
          ],
        }
      case 'suggested':
        return {
          searchFields: ['title', 'reason'],
          sortOptions: [
            { value: 'title', label: 'Title' },
            { value: 'type', label: 'Type' },
          ],
          filters: [
            {
              id: 'type',
              label: 'Type',
              icon: 'lucide:layers',
              options: [
                { value: 'all', label: 'All Types' },
                { value: 'compliance-issue', label: 'Compliance Issue' },
                { value: 'deficient-task', label: 'Deficient Task' },
                { value: 'regulatory-update', label: 'Regulatory Update' },
                { value: 'best-practice', label: 'Best Practice' },
              ],
              fn: (item: any, val: string) => item.type === val,
            },
            {
              id: 'category',
              label: 'Category',
              icon: 'lucide:tag',
              options: [
                { value: 'all', label: 'All Categories' },
                { value: 'safety', label: 'Safety' },
                { value: 'permits', label: 'Permits' },
                { value: 'training', label: 'Training' },
                { value: 'inventory', label: 'Inventory' },
                { value: 'emissions', label: 'Emissions' },
              ],
              fn: (item: any, val: string) => item.category === val,
            },
          ],
        }
      case 'templates':
        return {
          searchFields: ['name', 'category'],
          sortOptions: [
            { value: 'usageCount', label: 'Usage Count' },
            { value: 'name', label: 'Name' },
          ],
          filters: [],
        }
      case 'folders':
        return {
          searchFields: ['name'],
          sortOptions: [{ value: 'name', label: 'Name' }],
          filters: [],
        }
      default:
        return {
          searchFields: ['title', 'assignee'],
          sortOptions: [{ value: 'dueDate', label: 'Due Date' }],
          filters: [
            {
              id: 'status',
              label: 'Status',
              icon: 'lucide:filter',
              options: [
                { value: 'all', label: 'All Statuses' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'due-soon', label: 'Due Soon' },
                { value: 'on-track', label: 'Due Later' },
                { value: 'completed', label: 'Completed' },
              ],
              fn: (item: any, val: string) => item.status === val,
            },
          ],
        }
    }
  })

  const { browseState, filteredItems: filteredTasks } = useBrowse({
    items: sectionData,
    searchFields: browseConfig.value.searchFields,
    defaultViewMode:
      activeSection.value === 'my' || activeSection.value === 'all'
        ? 'kanban'
        : activeSection.value === 'templates'
          ? 'grid'
          : 'table',
    sortOptions: browseConfig.value.sortOptions,
    filters: browseConfig.value.filters,
  })

  const activeBrowseState = computed(() => {
    if (activeSection.value === 'templates' && templatesRef.value?.browseState) {
      return templatesRef.value.browseState
    }
    return browseState
  })

  const viewMode = computed(() => activeBrowseState.value.viewMode.value)

  const allowedViewModesForSection = computed(
    () => currentSection.value?.viewModes || (['table', 'list', 'grid'] as BrowseViewMode[]),
  )

  watch(
    activeSection,
    () => {
      const allowed = allowedViewModesForSection.value
      const current = browseState.viewMode.value
      if (allowed.includes(current)) return

      const preferredDefault: BrowseViewMode =
        activeSection.value === 'my' || activeSection.value === 'all' ? 'kanban' : 'table'
      const next: BrowseViewMode = allowed.includes(preferredDefault) ? preferredDefault : allowed[0] || 'table'
      browseState.setViewMode(next)
    },
    { immediate: true },
  )

  // View mode options dynamically based on active section
  const viewModeOptions = computed(() => {
    const allowedModes = currentSection.value?.viewModes || (['table', 'list', 'grid'] as BrowseViewMode[])
    const preferredOrder: BrowseViewMode[] = ['kanban', 'calendar', 'table', 'list', 'grid']
    const orderedModes = preferredOrder.filter((m) => allowedModes.includes(m))
    return buildViewModeOptionsFromType('type:Task', orderedModes).map((o) =>
      o.mode === 'grid' ? { ...o, label: 'Cards' } : o,
    )
  })

  // Calendar view data - transform tasks into JSON-LD format for CalendarView component
  // Uses filtered tasks based on active section (my tasks vs all tasks)
  const calendarData = computed(() => {
    const tasksForCalendar = activeSection.value === 'my' ? myTasks.value : tasks.value
    const nodes = tasksForCalendar.map((task: any) => ({
      '@id': `task:${task.id}`,
      '@type': 'Task',
      'trellis:title': task.title,
      'user:dueDate': task.dueDate,
      'user:status': task.status,
      'user:assignee': task.assignee,
      'user:priority': task.priority,
    }))
    return JSON.stringify({ '@graph': nodes })
  })

  // Calendar schema - use schema from JSON-LD if available, otherwise fallback
  const calendarSchema = computed(() => {
    if (schema.value) return schema.value
    return {
      id: 'tasks-schema',
      collectionId: 'tasks',
      fields: [
        { id: 'dueDate', name: 'Due Date', type: 'date' as const, order: 0, required: false },
        { id: 'status', name: 'Status', type: 'select' as const, order: 1, required: false },
        { id: 'assignee', name: 'Assignee', type: 'text' as const, order: 2, required: false },
        { id: 'priority', name: 'Priority', type: 'select' as const, order: 3, required: false },
      ],
      views: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  })

  // Stats derived from section data
  const stats = computed<PageStat[]>(() => {
    switch (activeSection.value) {
      case 'scheduled':
        return [
          { label: 'Total Scheduled', value: scheduledTasks.value.length, icon: 'lucide:clock' },
          {
            label: 'Active',
            value: scheduledTasks.value.filter((t) => t.status === 'active').length,
            icon: 'lucide:play-circle',
            color: 'text-emerald-500',
          },
          {
            label: 'This Month',
            value: scheduledTasks.value.filter((t) => {
              const due = new Date(t.nextDue)
              const now = new Date()
              return due.getMonth() === now.getMonth()
            }).length,
            icon: 'lucide:calendar',
            color: 'text-blue-500',
          },
        ]
      case 'suggested':
        return [
          { label: 'Total Suggested', value: suggestedTasks.value.length, icon: 'lucide:lightbulb' },
          {
            label: 'High Confidence',
            value: suggestedTasks.value.filter((t) => t.confidence > 0.9).length,
            icon: 'lucide:trending-up',
            color: 'text-emerald-500',
          },
          {
            label: 'High Priority',
            value: suggestedTasks.value.filter((t) => t.priority === 'high').length,
            icon: 'lucide:alert-circle',
            color: 'text-amber-500',
          },
        ]
      case 'templates': {
        const templateStats = templatesRef.value?.stats
        if (templateStats?.length) return templateStats
        return [
          { label: 'Total Templates', value: standardTasks.value.length, icon: 'lucide:layout-template' },
          {
            label: 'Most Used',
            value: Math.max(0, ...standardTasks.value.map((t) => t.usageCount)),
            icon: 'lucide:trending-up',
            color: 'text-emerald-500',
          },
          {
            label: 'Categories',
            value: new Set(standardTasks.value.map((t) => t.category)).size,
            icon: 'lucide:tag',
            color: 'text-blue-500',
          },
        ]
      }
      case 'folders':
        return [
          { label: 'Total Folders', value: folders.value.length, icon: 'lucide:folder' },
          {
            label: 'Total Tasks',
            value: folders.value.reduce((sum, f) => sum + f.taskCount, 0),
            icon: 'lucide:list',
            color: 'text-blue-500',
          },
          {
            label: 'Avg per Folder',
            value: Math.round(folders.value.reduce((sum, f) => sum + f.taskCount, 0) / folders.value.length),
            icon: 'lucide:bar-chart',
            color: 'text-emerald-500',
          },
        ]
      case 'my': {
        const myOverdue = myTasks.value.filter((t: any) => t.status === 'overdue').length
        const myDueSoon = myTasks.value.filter((t: any) => t.status === 'due-soon').length
        const myCompleted = myTasks.value.filter((t: any) => t.status === 'completed').length
        return [
          { label: 'My Tasks', value: myTasks.value.length, icon: 'lucide:user-check' },
          {
            label: 'Overdue',
            value: myOverdue,
            icon: 'lucide:alert-circle',
            color: 'text-rose-500',
            trend: myOverdue > 0 ? ('up' as const) : undefined,
            change: myOverdue > 0 ? String(myOverdue) : undefined,
          },
          {
            label: 'Due Soon',
            value: myDueSoon,
            icon: 'lucide:clock',
            color: 'text-amber-500',
          },
          {
            label: 'Completed',
            value: myCompleted,
            icon: 'lucide:check-circle',
            color: 'text-emerald-500',
          },
        ]
      }
      default: {
        const s = entityStats.value
        const healthPercent = s.total > 0 ? Math.round(((s.completed ?? 0) / s.total) * 100) : 0
        return [
          {
            label: 'Health',
            value: `${healthPercent}%`,
            icon: 'lucide:heart-pulse',
            color: healthPercent >= 80 ? 'text-emerald-400' : healthPercent >= 50 ? 'text-amber-400' : 'text-rose-400',
            progress: healthPercent,
          },
          { label: 'Total', value: s.total, icon: 'lucide:list' },
          {
            label: 'Overdue',
            value: s.overdue ?? 0,
            icon: 'lucide:alert-circle',
            color: 'text-rose-500',
            trend: (s.overdue ?? 0) > 0 ? ('up' as const) : undefined,
            change: (s.overdue ?? 0) > 0 ? String(s.overdue) : undefined,
          },
          {
            label: 'Due Soon',
            value: s.dueSoon ?? 0,
            icon: 'lucide:clock',
            color: 'text-amber-500',
          },
          {
            label: 'Done',
            value: s.completed ?? 0,
            icon: 'lucide:check-circle',
            color: 'text-emerald-500',
          },
        ]
      }
    }
  })

  const statusColors: Record<string, string> = {
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'due-soon': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'on-track': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    completed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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

  const formatUserId = (uid: string) => {
    if (!uid) return '—'
    // Extract a readable name from uid format like "uid_00001001"
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

  type KanbanGrouping = 'status' | 'dueDate'
  const kanbanGrouping = ref<KanbanGrouping>('dueDate')

  const setKanbanGrouping = (value: unknown) => {
    const next = value === null || value === undefined ? '' : String(value)
    kanbanGrouping.value = next === 'dueDate' ? 'dueDate' : 'status'
  }

  const parseLocalDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null
    const raw = String(dateStr)
    const d = raw.includes('T') ? new Date(raw) : new Date(`${raw}T00:00:00`)
    if (Number.isNaN(d.getTime())) return null
    return d
  }

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  type DueBucketId = 'overdue' | 'due-today' | 'next-3-days' | 'next-7-days' | 'later' | 'no-due-date'

  const getDueBucketId = (task: any): DueBucketId => {
    const due = parseLocalDate(task?.dueDate)
    if (!due) return 'no-due-date'

    const MS_PER_DAY = 24 * 60 * 60 * 1000
    const today = startOfDay(new Date())
    const dueDay = startOfDay(due)
    const diffDays = Math.floor((dueDay.getTime() - today.getTime()) / MS_PER_DAY)

    if (diffDays < 0) return 'overdue'
    if (diffDays === 0) return 'due-today'
    if (diffDays <= 3) return 'next-3-days'
    if (diffDays <= 7) return 'next-7-days'
    return 'later'
  }

  const kanbanColumns = computed(() => {
    if (kanbanGrouping.value === 'dueDate') {
      return [
        {
          id: 'overdue' as const,
          label: 'Overdue',
          color: 'border-red-500',
          tasks: filteredTasks.value.filter((t) => getDueBucketId(t) === 'overdue'),
        },
        {
          id: 'due-today' as const,
          label: 'Due Today',
          color: 'border-amber-500',
          tasks: filteredTasks.value.filter((t) => getDueBucketId(t) === 'due-today'),
        },
        {
          id: 'next-3-days' as const,
          label: 'Next 3 Days',
          color: 'border-yellow-500',
          tasks: filteredTasks.value.filter((t) => getDueBucketId(t) === 'next-3-days'),
        },
        {
          id: 'next-7-days' as const,
          label: 'Next 7 Days',
          color: 'border-blue-500',
          tasks: filteredTasks.value.filter((t) => getDueBucketId(t) === 'next-7-days'),
        },
        {
          id: 'later' as const,
          label: 'Later',
          color: 'border-emerald-500',
          tasks: filteredTasks.value.filter((t) => getDueBucketId(t) === 'later'),
        },
        {
          id: 'no-due-date' as const,
          label: 'No Due Date',
          color: 'border-gray-400',
          tasks: filteredTasks.value.filter((t) => getDueBucketId(t) === 'no-due-date'),
        },
      ]
    }

    return [
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
    ]
  })

  // Local task detail state
  const viewTaskOpen = ref(false)
  const viewingTask = ref<any>(null)

  // Create task dialog state
  const createTaskOpen = ref(false)

  const createFolderOpen = ref(false)

  // Mock data for create dialog
  const taskOwners = ref([
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
  ])

  const taskFolders = ref([
    'Air Quality',
    'Water Compliance',
    'Hazardous Materials',
    'Reporting & Documentation',
    'General',
  ])

  // Refs for section-specific views
  const scheduledTasksRef = ref<InstanceType<typeof ScheduledTasksView> | null>(null)

  // Persist dialog state to localStorage
  const STORAGE_KEY = 'platform-sandbox-viewing-facility-task'

  onMounted(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const task = tasks.value.find((t) => t.id === parsed.taskId)
        if (task) {
          viewingTask.value = task
          viewTaskOpen.value = true
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  })

  watch([viewTaskOpen, viewingTask], ([isOpen, task]) => {
    if (isOpen && task) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ taskId: task.id }))
    } else if (!isOpen) {
      localStorage.removeItem(STORAGE_KEY)
    }
  })

  function openTaskDetail(task: any, mode: 'edit' | 'create' = 'edit') {
    if (mode === 'create') {
      if (activeSection.value === 'scheduled' && scheduledTasksRef.value) {
        scheduledTasksRef.value.createScheduleOpen = true
      } else if (activeSection.value === 'templates') {
        createTaskOpen.value = true
      } else if (activeSection.value === 'folders') {
        createFolderOpen.value = true
      } else {
        // Use UnifiedTaskDialog for all task creation (including suggested)
        createTaskOpen.value = true
      }
    } else {
      // Use UnifiedTaskDialog for all task viewing/editing
      viewingTask.value = task
      viewTaskOpen.value = true
    }
  }

  function closeTaskDetail() {
    viewTaskOpen.value = false
    viewingTask.value = null
  }

  // Handle task click from CalendarView - find the matching task and open the dialog
  function handleCalendarTaskClick(calendarEvent: { id: string; title: string; date: Date; status?: string }) {
    // Extract the task ID from the calendar event ID (format: "task:{id}-{nodeIndex}-{valueIndex}")
    const idMatch = calendarEvent.id.match(/^task:([^-]+)/)
    const taskId = idMatch ? idMatch[1] : calendarEvent.id

    // Find the matching task in the tasks list
    const task = tasks.value.find((t: any) => t.id === taskId || t.taskID === taskId)
    if (task) {
      viewingTask.value = task
      viewTaskOpen.value = true
    }
  }

  const viewingTaskIndex = computed(() => {
    if (!viewingTask.value) return -1
    return filteredTasks.value.findIndex((t) => t.id === viewingTask.value?.id)
  })

  const canNavigatePrev = computed(() => viewingTaskIndex.value > 0)
  const canNavigateNext = computed(() => viewingTaskIndex.value < filteredTasks.value.length - 1)

  const navigateToPrevTask = () => {
    if (canNavigatePrev.value) {
      viewingTask.value = filteredTasks.value[viewingTaskIndex.value - 1] ?? null
    }
  }

  const navigateToNextTask = () => {
    if (canNavigateNext.value) {
      viewingTask.value = filteredTasks.value[viewingTaskIndex.value + 1] ?? null
    }
  }

  // Handle save event from global detail sheet
  onMounted(() => {
    window.addEventListener('global-detail-sheet:save', ((e: CustomEvent) => {
      if (e.detail.entityType !== 'task') return
      if (e.detail.mode === 'create') {
        createTask(e.detail.formData)
      }
    }) as EventListener)

    window.addEventListener('global-detail-sheet:delete', ((e: CustomEvent) => {
      if (e.detail.entityType !== 'task') return
      // Handle task deletion
      removeTask(e.detail.node.id || e.detail.node.taskID)
    }) as EventListener)
  })

  async function handleCreateTask(formData: any) {
    await createTask({
      title: formData.title,
      description: formData.description,
      dueDate: formData.dueDate || formData.nextDue,
      owner: formData.owner,
      category: formData.category,
      tracked: formData.tracked,
      status: 'pending',
      priority: 'medium',
    })
    createTaskOpen.value = false
  }

  function handleCreateFolder(formData: any) {
    folders.value.push({
      id: crypto.randomUUID(),
      name: formData.name,
      taskCount: 0,
      icon: formData.icon,
      color: formData.color,
      description: formData.description,
    })
    createFolderOpen.value = false
  }

  async function handleUpdateTaskFromDialog(formData: any) {
    if (!viewingTask.value) return
    const id = viewingTask.value.id || viewingTask.value.taskID

    await _updateTask(id, {
      title: formData.title,
      description: formData.description,
      dueDate: formData.dueDate || formData.nextDue,
      owner: formData.owner,
      category: formData.category,
      tracked: formData.tracked,
    })

    viewingTask.value = {
      ...viewingTask.value,
      title: formData.title,
      description: formData.description,
      dueDate: formData.dueDate || formData.nextDue,
      owner: formData.owner,
      category: formData.category,
      tracked: formData.tracked,
    }
  }
</script>

<template>
  <div class="flex flex-col h-full bg-muted/50">
    <!-- Horizontal Tab Navigation -->
    <div class="border-b border-border">
      <div class="px-6">
        <div class="flex items-center gap-1 -mb-px">
          <button
            v-for="section in taskSections"
            :key="section.id"
            type="button"
            :class="[
              'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors rounded-none',
              activeSection === section.id
                ? 'text-foreground border-b-3 border-b-primary'
                : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="activeSection = section.id">
            <Icon :name="section.icon" class="h-4 w-4 shrink-0" />
            <span>{{ section.label }}</span>
            <span
              v-if="
                (section.id === 'all' && tasks.length) ||
                (section.id === 'scheduled' && scheduledTasks.length) ||
                (section.id === 'suggested' && suggestedTasks.length) ||
                (section.id === 'templates' && standardTasks.length) ||
                (section.id === 'folders' && folders.length)
              "
              :class="[
                'text-xs px-1.5 py-0.5 rounded-full',
                activeSection === section.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
              ]">
              {{
                section.id === 'all'
                  ? tasks.length
                  : section.id === 'scheduled'
                    ? scheduledTasks.length
                    : section.id === 'suggested'
                      ? suggestedTasks.length
                      : section.id === 'templates'
                        ? standardTasks.length
                        : section.id === 'folders'
                          ? folders.length
                          : 0
              }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Folders View - Full Bleed (outside Page component) -->
    <div v-if="activeSection === 'folders'" class="flex-1 min-h-0 overflow-hidden">
      <FoldersView />
    </div>

    <!-- Main Content Area (for non-folders sections) -->
    <Page
      v-else
      variant="browse"
      :title="pageTitle"
      :subtitle="pageSubtitle"
      :description="currentSection?.description"
      :icon="activeSection === 'my' ? 'lucide:user-check' : 'lucide:building-2'"
      :icon-class="activeSection === 'my' ? 'text-blue-400' : 'text-emerald-300'"
      :search-placeholder="`Search ${currentSection?.label.toLowerCase()}...`"
      :stats="stats"
      :show-view-switcher="true"
      :fill-height="true"
      :browse="activeBrowseState"
      :view-mode-options="viewModeOptions"
      class="flex-1 min-h-0">
      <!-- Actions -->
      <template #toolbarActions>
        <div
          v-if="(activeSection === 'my' || activeSection === 'all') && viewMode === 'kanban'"
          class="flex items-center gap-2 mr-2">
          <UiSelect :model-value="kanbanGrouping" @update:model-value="setKanbanGrouping">
            <UiSelectTrigger size="sm" class="w-48 bg-card" placeholder="Group columns by">
              <template #value>
                <span class="text-sm">Group: {{ kanbanGrouping === 'dueDate' ? 'Due date' : 'Status' }}</span>
              </template>
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectViewport>
                <UiSelectItem value="status" text="Status">Status</UiSelectItem>
                <UiSelectItem value="dueDate" text="Due date">Due date</UiSelectItem>
              </UiSelectViewport>
            </UiSelectContent>
          </UiSelect>
        </div>
        <div v-if="selectedTasks.length > 0" class="flex items-center gap-2 mr-2">
          <span class="text-sm text-muted-foreground">{{ selectedTasks.length }} selected</span>
          <UiButton variant="outline" size="sm">
            <Icon name="lucide:check-check" class="mr-2 h-4 w-4" />
            {{ activeSection === 'scheduled' ? 'Pause' : 'Mark Complete' }}
          </UiButton>
        </div>
        <UiButton @click="openTaskDetail({}, 'create')">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          {{
            activeSection === 'scheduled'
              ? 'Create Schedule'
              : activeSection === 'templates'
                ? 'New Template'
                : 'Add Task'
          }}
        </UiButton>
      </template>

      <!-- Section-Specific Views with transition -->
      <Transition name="tab-fade" mode="out-in">
        <ScheduledTasksView
          v-if="activeSection === 'scheduled'"
          :key="'scheduled'"
          ref="scheduledTasksRef"
          :view-mode="viewMode" />
        <SuggestedTasksView v-else-if="activeSection === 'suggested'" :key="'suggested'" :view-mode="viewMode" />
        <StandardTasksView
          v-else-if="activeSection === 'templates'"
          :key="'templates'"
          ref="templatesRef"
          :view-mode="viewMode" />
      </Transition>

      <!-- All Tasks View (default) - Table View -->
      <div
        v-if="(activeSection === 'my' || activeSection === 'all') && viewMode === 'table'"
        class="overflow-hidden rounded-xl border border-border bg-card">
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
                <UiTableHead>Status</UiTableHead>
                <UiTableHead>Category</UiTableHead>
                <UiTableHead>Type</UiTableHead>
                <UiTableHead>Branch</UiTableHead>
                <UiTableHead>Due Date</UiTableHead>
                <UiTableHead>Owner</UiTableHead>
                <UiTableHead>Involved</UiTableHead>
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
                @click="openTaskDetail(task)">
                <UiTableCell class="sticky left-0 bg-card z-10">
                  <UiCheckbox
                    :checked="selectedTasks.includes(task.id)"
                    @update:checked="
                      selectedTasks = $event
                        ? [...selectedTasks, task.id]
                        : selectedTasks.filter((id) => id !== task.id)
                    " />
                </UiTableCell>
                <UiTableCell>
                  <div class="flex items-center gap-2">
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
                      statusColors[task.status],
                    ]">
                    {{ task.status.replace('-', ' ') }}
                  </span>
                </UiTableCell>
                <UiTableCell>
                  <span
                    :class="[
                      'rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap',
                      categoryColors[task.category] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                    ]">
                    {{ task.category }}
                  </span>
                </UiTableCell>
                <UiTableCell class="text-muted-foreground text-sm whitespace-nowrap">
                  {{ task.inspectionType }}
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
                <UiTableCell>
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
      <div v-if="(activeSection === 'my' || activeSection === 'all') && viewMode === 'list'" class="space-y-2">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="flex items-start gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted transition-colors cursor-pointer"
          @click="openTaskDetail(task)">
          <UiCheckbox
            class="mt-1"
            :checked="selectedTasks.includes(task.id)"
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
                  categoryColors[task.category] || 'bg-gray-100 text-gray-600',
                ]">
                {{ task.category }}
              </span>
              <span>{{ formatUserId(task.owner) }}</span>
              <span>·</span>
              <span>{{ task.dueDate }}</span>
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
          <UiButton variant="ghost" size="icon" class="shrink-0">
            <Icon name="lucide:more-horizontal" class="h-4 w-4" />
          </UiButton>
        </div>
      </div>

      <!-- Grid View - Card layout with category, description, and metadata -->
      <div
        v-if="(activeSection === 'my' || activeSection === 'all') && viewMode === 'grid'"
        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiCard
          v-for="task in filteredTasks"
          :key="task.id"
          class="relative overflow-hidden hover:bg-muted transition-colors cursor-pointer"
          @click="openTaskDetail(task)">
          <div class="absolute top-0 left-0 w-1 h-full" :class="(statusColors[task.status] || '').split(' ')[0]" />
          <UiCardHeader class="pb-2">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2">
                <UiCheckbox
                  :checked="selectedTasks.includes(task.id)"
                  @update:checked="
                    selectedTasks = $event ? [...selectedTasks, task.id] : selectedTasks.filter((id) => id !== task.id)
                  " />
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
                  categoryColors[task.category] || 'bg-gray-100 text-gray-600',
                ]">
                {{ task.category }}
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
              <span v-if="task.fileCount" class="flex items-center gap-1">
                <Icon name="lucide:paperclip" class="h-3 w-3" />
                {{ task.fileCount }}
              </span>
            </div>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Kanban View - Compact cards with category, indicators -->
      <div
        v-if="(activeSection === 'my' || activeSection === 'all') && viewMode === 'kanban'"
        class="flex flex-1 min-h-0 items-stretch gap-4 overflow-x-auto pb-4">
        <div
          v-for="column in kanbanColumns"
          :key="column.id"
          class="shrink-0 w-72 rounded-lg border-t-4 bg-muted/30 flex h-full max-h-full flex-col overflow-y-auto"
          :class="column.color">
          <div class="sticky top-0 z-10 p-3 border-b border-border bg-muted/30">
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
              @click="openTaskDetail(task)">
              <div class="flex items-start gap-2 mb-2">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium leading-tight">{{ task.title }}</p>
                  <div class="flex items-center gap-1 mt-1">
                    <span
                      :class="[
                        'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                        categoryColors[task.category] || 'bg-gray-100 text-gray-600',
                      ]">
                      {{ task.category }}
                    </span>
                    <Icon v-if="task.tracked" name="lucide:eye" class="h-3 w-3 text-blue-500" />
                    <Icon
                      v-if="task.taskNeedsCorrectiveAction"
                      name="lucide:alert-triangle"
                      class="h-3.5 w-3.5 text-amber-500" />
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span>{{ formatUserId(task.owner) }}</span>
                <span>{{ task.dueDate }}</span>
              </div>
              <div
                v-if="task.fileCount"
                class="flex items-center gap-2 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                <span class="flex items-center gap-1">
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
      <div
        v-if="(activeSection === 'my' || activeSection === 'all') && viewMode === 'calendar'"
        class="h-fit min-h-125">
        <CalendarView
          :collection-id="'tasks'"
          :model-value="calendarData"
          :schema="calendarSchema"
          @task-click="handleCalendarTaskClick" />
      </div>

      <!-- Results count (for 'my' and 'all' sections) -->
      <div
        v-if="activeSection === 'my' || activeSection === 'all'"
        class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
        Showing {{ filteredTasks.length }} tasks
      </div>

      <!-- Unified Task Dialog -->
      <UnifiedTaskDialog
        v-model:open="viewTaskOpen"
        :task="viewingTask"
        mode="edit"
        task-type="standard"
        :can-navigate-prev="canNavigatePrev"
        :can-navigate-next="canNavigateNext"
        :owners="taskOwners"
        :folders="taskFolders"
        @navigate-prev="navigateToPrevTask"
        @navigate-next="navigateToNextTask"
        @save="handleUpdateTaskFromDialog"
        @close="closeTaskDetail" />

      <!-- Create Task Dialog -->
      <UnifiedTaskDialog
        v-model:open="createTaskOpen"
        mode="create"
        :owners="taskOwners"
        :folders="taskFolders"
        :task="null"
        @save="handleCreateTask"
        @close="createTaskOpen = false" />

      <FolderCreateDialog
        v-model:open="createFolderOpen"
        @save="handleCreateFolder"
        @close="createFolderOpen = false" />
    </Page>
  </div>
</template>

<style scoped>
  .tab-fade-enter-active,
  .tab-fade-leave-active {
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
  }

  .tab-fade-enter-from {
    opacity: 0;
    transform: translateY(4px);
  }

  .tab-fade-leave-to {
    opacity: 0;
    transform: translateY(-4px);
  }
</style>
