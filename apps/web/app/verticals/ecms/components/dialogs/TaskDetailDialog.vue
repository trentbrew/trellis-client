<script lang="ts" setup>
  export type TaskStatus = 'pending' | 'in-progress' | 'on-track' | 'due-soon' | 'overdue' | 'completed'
  export type Priority = 'low' | 'medium' | 'high'
  export type CommentType = 'comment' | 'attachment' | 'status_change' | 'reminder' | 'created'

  export interface TaskData {
    id: string
    title: string
    description?: string
    status: TaskStatus
    priority: Priority
    dueDate: string
    category?: string
    inspectionType?: string
    branches?: string[]
    owner?: string
    involved?: string[]
    tracked?: boolean
    taskNeedsCorrectiveAction?: boolean
    notes?: string
    commentCount?: number
    fileCount?: number
    schedule?: string
    reminders?: string[]
    createdAt?: string
    updatedAt?: string
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

  const props = withDefaults(
    defineProps<{
      open: boolean
      task: TaskData | null
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
      showScheduleSection?: boolean
      activity?: ActivityItem[]
      attachments?: Attachment[]
    }>(),
    {
      canNavigatePrev: false,
      canNavigateNext: false,
      showScheduleSection: false,
      activity: () => [],
      attachments: () => [],
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    edit: [task: TaskData]
    delete: [task: TaskData]
    share: [task: TaskData]
    navigatePrev: []
    navigateNext: []
    addAttachment: []
    addComment: [comment: string]
  }>()

  const newComment = ref('')
  const replyingTo = ref<string | null>(null)
  const replyText = ref('')

  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }

  const handleAddComment = () => {
    if (newComment.value.trim()) {
      emit('addComment', newComment.value.trim())
      newComment.value = ''
    }
  }

  // Style mappings
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
    Corp: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }

  const branchColors: Record<string, string> = {
    environmental: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    safety: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }

  const scheduleColors: Record<string, string> = {
    Daily: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    Weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Monthly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Quarterly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Semi-annually': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    Annually: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  }

  // Utility functions
  const formatUserId = (uid: string | undefined) => {
    if (!uid) return '—'
    const num = uid.replace('uid_', '').replace(/^0+/, '')
    return `User ${num || '1'}`
  }

  const formatRelativeDate = (dateStr: string) => {
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

  const isOverdue = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    return date.getTime() < now.getTime()
  }

  const getTaskOccurrences = (task: TaskData) => {
    if (!task.schedule) return []
    const occurrences: Date[] = []
    const startDate = new Date(task.dueDate)
    const scheduleMap: Record<string, number> = {
      Daily: 1,
      Weekly: 7,
      Monthly: 30,
      Quarterly: 90,
      Annually: 365,
      'Semi-annually': 182,
    }
    const interval = scheduleMap[task.schedule] || 30

    for (let i = 0; i < 12; i++) {
      const occurrence = new Date(startDate)
      occurrence.setDate(startDate.getDate() + interval * i)
      occurrences.push(occurrence)
    }
    return occurrences
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

  const getActivityIcon = (type: CommentType) => {
    const icons: Record<CommentType, string> = {
      comment: 'lucide:message-circle',
      attachment: 'lucide:paperclip',
      status_change: 'lucide:arrow-right',
      reminder: 'lucide:bell',
      created: 'lucide:plus-circle',
    }
    return icons[type] || 'lucide:activity'
  }

  const getActivityColor = (type: CommentType) => {
    const colors: Record<CommentType, string> = {
      comment: 'bg-primary/10',
      attachment: 'bg-blue-500/15 text-blue-600',
      status_change: 'bg-amber-500/15 text-amber-600',
      reminder: 'bg-violet-500/15 text-violet-600',
      created: 'bg-emerald-500/15 text-emerald-600',
    }
    return colors[type] || 'bg-muted'
  }

  // Default mock attachments if none provided
  const displayAttachments = computed(() => {
    if (props.attachments.length > 0) return props.attachments
    if (props.task?.fileCount && props.task.fileCount > 0) {
      return [
        { id: '1', name: 'Task_Document.pdf', type: 'pdf' as const },
        { id: '2', name: 'Data_Export.xlsx', type: 'spreadsheet' as const },
      ].slice(0, props.task.fileCount)
    }
    return []
  })

  // Default mock activity if none provided
  const displayActivity = computed(() => {
    if (props.activity.length > 0) return props.activity
    return [
      {
        id: '1',
        author: 'System',
        type: 'created' as const,
        date: props.task?.createdAt || 'Jan 1',
      },
    ]
  })
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :hide-close="true"
      class="w-[min(1180px,calc(100vw-4rem))]! max-w-[min(1180px,calc(100vw-4rem))]! h-[min(750px,calc(100vh-4rem))] max-h-[min(750px,calc(100vh-4rem))] p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col gap-0">
      <template v-if="task">
        <!-- Header with Navigation -->
        <div class="px-6 py-4 shrink-0 bg-muted/20 border-b border-border flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-semibold mb-1">{{ task.title }}</h2>
            <p class="text-sm text-muted-foreground">
              {{ task.description || 'Task details and information.' }}
            </p>
            <div class="flex items-center gap-2 mt-2">
              <UiBadge :class="statusColors[task.status]" class="text-[10px] px-1.5 py-0.5">
                {{ task.status.replace('-', ' ') }}
              </UiBadge>
              <UiBadge
                v-if="isOverdue(task.dueDate)"
                class="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-700 dark:text-red-400">
                <Icon name="lucide:alert-triangle" class="h-2.5 w-2.5 mr-1" />
                Overdue
              </UiBadge>
              <UiBadge
                v-if="task.taskNeedsCorrectiveAction"
                variant="outline"
                class="text-[10px] px-1.5 py-0.5 border-amber-500/50 text-amber-600 bg-amber-500/10">
                <Icon name="lucide:alert-triangle" class="h-2.5 w-2.5 mr-1" />
                Needs Action
              </UiBadge>
            </div>
          </div>
          <!-- Navigation Buttons -->
          <div class="flex items-center gap-1 shrink-0">
            <UiButton
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              :disabled="!canNavigatePrev"
              @click="emit('navigatePrev')">
              <Icon name="lucide:chevron-up" class="h-4 w-4" />
            </UiButton>
            <UiButton
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              :disabled="!canNavigateNext"
              @click="emit('navigateNext')">
              <Icon name="lucide:chevron-down" class="h-4 w-4" />
            </UiButton>
          </div>
        </div>

        <!-- Main Content with Sidebar -->
        <div class="flex flex-1 min-h-0">
          <!-- Left: Details & Schedule -->
          <div class="flex-1 flex flex-col min-w-0 border-r border-border overflow-y-auto">
            <!-- Properties Section - Sticky -->
            <div class="sticky top-0 z-10 bg-card px-5 pb-3 pt-6 border-b border-border space-y-2">
              <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Properties</p>
              <div class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <!-- Slot for custom property content (like avatars) -->
                <slot name="properties-prefix" />

                <!-- Schedule (if available) -->
                <button
                  v-if="task.schedule"
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors shrink-0',
                    scheduleColors[task.schedule] || 'hover:bg-muted',
                  ]">
                  <Icon name="lucide:refresh-cw" class="h-3.5 w-3.5" />
                  <span>{{ task.schedule }}</span>
                </button>

                <!-- Due Date -->
                <button
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted transition-colors shrink-0">
                  <Icon name="lucide:calendar" class="h-3.5 w-3.5" />
                  <span>{{ formatRelativeDate(task.dueDate) }}</span>
                </button>

                <!-- Priority -->
                <button
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted transition-colors shrink-0',
                    priorityColors[task.priority],
                  ]">
                  <Icon :name="priorityIcons[task.priority] || 'lucide:circle'" class="h-3.5 w-3.5" />
                  <span class="capitalize">{{ task.priority }}</span>
                </button>

                <!-- Category -->
                <button
                  v-if="task.category"
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors shrink-0',
                    categoryColors[task.category] || 'hover:bg-muted',
                  ]">
                  <Icon name="lucide:tag" class="h-3.5 w-3.5" />
                  <span>{{ task.category }}</span>
                </button>

                <!-- Inspection Type -->
                <button
                  v-if="task.inspectionType"
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted transition-colors shrink-0">
                  <Icon name="lucide:clipboard-check" class="h-3.5 w-3.5" />
                  <span>{{ task.inspectionType }}</span>
                </button>

                <!-- Branches -->
                <div
                  v-for="branch in task.branches"
                  :key="branch"
                  :class="[
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors shrink-0',
                    branchColors[branch] || 'bg-muted',
                  ]">
                  <span class="text-[10px] font-semibold uppercase">{{ branch }}</span>
                </div>

                <!-- Tracked Flag -->
                <button
                  v-if="task.tracked"
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 transition-colors shrink-0">
                  <Icon name="lucide:eye" class="h-3.5 w-3.5" />
                  <span>Tracked</span>
                </button>

                <!-- Corrective Action Flag -->
                <button
                  v-if="task.taskNeedsCorrectiveAction"
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 transition-colors shrink-0">
                  <Icon name="lucide:alert-triangle" class="h-3.5 w-3.5" />
                  <span>Corrective Action</span>
                </button>

                <button
                  class="inline-flex items-center justify-center size-6 rounded hover:bg-muted transition-colors shrink-0 ml-auto">
                  <Icon name="lucide:more-horizontal" class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <!-- Scrollable content area -->
            <div class="p-5 space-y-5">
              <!-- Description -->
              <div v-if="task.description" class="space-y-2">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                <p class="text-sm leading-relaxed">{{ task.description }}</p>
              </div>

              <!-- Notes -->
              <div v-if="task.notes" class="space-y-2">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
                <div class="rounded-lg border border-border p-3 bg-muted/30">
                  <p class="text-sm">{{ task.notes }}</p>
                </div>
              </div>

              <!-- Attachments -->
              <div v-if="displayAttachments.length > 0" class="space-y-2">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attachments</p>
                  <UiButton variant="ghost" size="sm" class="h-6 text-xs gap-1" @click="emit('addAttachment')">
                    <Icon name="lucide:plus" class="h-3 w-3" />
                    Add
                  </UiButton>
                </div>
                <div class="flex flex-wrap gap-2">
                  <div
                    v-for="attachment in displayAttachments"
                    :key="attachment.id"
                    class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div :class="['flex h-6 w-6 items-center justify-center rounded', getAttachmentColor(attachment.type)]">
                      <Icon :name="getAttachmentIcon(attachment.type)" class="h-3 w-3" />
                    </div>
                    <span class="text-xs font-medium truncate max-w-32">{{ attachment.name }}</span>
                    <UiButton variant="ghost" size="icon" class="h-5 w-5 shrink-0 -mr-1">
                      <Icon name="lucide:download" class="h-3 w-3" />
                    </UiButton>
                  </div>
                </div>
              </div>

              <!-- Schedule Section with Mini Calendar (only for scheduled tasks) -->
              <div v-if="showScheduleSection && task.schedule" class="space-y-4 pt-4 border-t border-border">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Schedule</p>
                  <div class="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon name="lucide:repeat" class="h-3.5 w-3.5" />
                    <span>Repeats {{ task.schedule.toLowerCase() }}</span>
                  </div>
                </div>
                <div class="flex gap-4">
                  <!-- Mini Calendar -->
                  <div class="shrink-0 sticky top-28 self-start">
                    <UiCalendar
                      :attributes="[
                        {
                          key: 'occurrences',
                          highlight: { color: 'blue', fillMode: 'solid' },
                          dates: getTaskOccurrences(task),
                        },
                      ]"
                      :trim-weeks="true"
                      class="rounded-lg border p-2 text-sm" />
                    <!-- Reminders -->
                    <div v-if="task.reminders?.length" class="flex flex-wrap gap-2 mt-3">
                      <UiBadge v-for="reminder in task.reminders" :key="reminder" variant="secondary" class="text-xs">
                        <Icon name="lucide:bell" class="mr-1 h-3 w-3" />
                        {{ reminder }}
                      </UiBadge>
                    </div>
                    <div v-else class="flex flex-wrap gap-2 mt-3">
                      <UiBadge variant="secondary" class="text-xs">
                        <Icon name="lucide:bell" class="mr-1 h-3 w-3" />
                        7 days before
                      </UiBadge>
                      <UiBadge variant="secondary" class="text-xs">
                        <Icon name="lucide:bell" class="mr-1 h-3 w-3" />
                        1 day before
                      </UiBadge>
                    </div>
                  </div>
                  <!-- Upcoming Occurrences List -->
                  <div class="flex-1 space-y-2">
                    <div class="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                      <Icon name="lucide:calendar-check" class="h-4 w-4 text-primary" />
                      <div class="flex-1">
                        <p class="text-sm font-medium">{{ task.dueDate }}</p>
                        <p class="text-xs text-muted-foreground">Next due</p>
                      </div>
                      <UiBadge variant="outline" class="text-[10px]">Upcoming</UiBadge>
                    </div>
                    <div
                      v-for="(occurrence, idx) in getTaskOccurrences(task).slice(1, 8)"
                      :key="idx"
                      class="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                      <Icon name="lucide:calendar" class="h-4 w-4 text-muted-foreground" />
                      <div class="flex-1">
                        <p class="text-sm font-medium text-muted-foreground">
                          {{ occurrence.toISOString().split('T')[0] }}
                        </p>
                        <p class="text-xs text-muted-foreground">Future occurrence</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Assignment Section (for non-scheduled tasks without calendar) -->
              <div v-if="!showScheduleSection" class="space-y-2 pt-4 border-t border-border">
                <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignment</p>
                <div class="grid gap-3 grid-cols-2">
                  <div class="rounded-lg border border-border p-3 bg-muted/30">
                    <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Icon name="lucide:user" class="h-3.5 w-3.5" />
                      Owner
                    </div>
                    <span class="text-sm font-medium">{{ formatUserId(task.owner) }}</span>
                  </div>
                  <div class="rounded-lg border border-border p-3 bg-muted/30">
                    <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Icon name="lucide:users" class="h-3.5 w-3.5" />
                      Involved
                    </div>
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
                    <span v-else class="text-sm text-muted-foreground">—</span>
                  </div>
                </div>
              </div>

              <!-- Slot for additional content -->
              <slot name="content" />
            </div>
          </div>

          <!-- Right: Comments & Activity Sidebar -->
          <aside class="w-80 shrink-0 flex flex-col bg-muted/50">
            <!-- Comment Input -->
            <div class="p-3 pb-0 shrink-0">
              <div class="relative">
                <div
                  class="absolute left-3 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                  U
                </div>
                <UiTextarea
                  v-model="newComment"
                  placeholder="Write a comment..."
                  class="min-h-[70px] text-xs resize-none pl-11 pr-3 pb-10 bg-card"
                  :rows="2" />
                <div class="absolute right-2 bottom-2">
                  <UiButton size="sm" :disabled="!newComment.trim()" class="h-7 text-xs" @click="handleAddComment">
                    Comment
                  </UiButton>
                </div>
              </div>
            </div>

            <!-- Activity Feed -->
            <div class="flex-1 overflow-y-auto p-4">
              <template v-if="displayActivity.length">
                <UiTimeline>
                  <template v-for="(item, idx) in displayActivity" :key="item.id">
                    <!-- Comment -->
                    <UiTimelineItem
                      v-if="item.type === 'comment'"
                      :step="idx + 1"
                      class="group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-6">
                      <UiTimelineHeader>
                        <UiTimelineSeparator
                          class="group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=vertical]/timeline:translate-y-6.5" />
                        <UiTimelineTitle class="mt-0.5 text-xs">
                          {{ item.author }}
                          <span class="font-normal text-muted-foreground">commented</span>
                        </UiTimelineTitle>
                        <UiTimelineIndicator
                          class="flex size-6 items-center justify-center border-none bg-primary/10 group-data-[orientation=vertical]/timeline:-left-7">
                          <img v-if="item.avatar" :src="item.avatar" :alt="item.author" class="size-6 rounded-full" />
                          <Icon v-else :name="getActivityIcon(item.type)" class="h-3 w-3" />
                        </UiTimelineIndicator>
                      </UiTimelineHeader>
                      <UiTimelineContent class="mt-2 rounded-lg border bg-card px-3 py-2.5 text-xs text-foreground">
                        {{ item.content }}
                        <div class="flex items-center justify-between mt-1.5">
                          <span class="text-[10px] text-muted-foreground">{{ item.date }}</span>
                          <UiButton
                            variant="ghost"
                            size="sm"
                            class="h-5 w-5 p-0 text-muted-foreground/50 hover:text-muted-foreground"
                            @click="replyingTo = item.id">
                            <Icon name="lucide:message-circle" class="h-2.5 w-2.5" />
                          </UiButton>
                        </div>
                        <!-- Reply input -->
                        <div v-if="replyingTo === item.id" class="mt-2">
                          <UiTextarea
                            v-model="replyText"
                            placeholder="Write a reply..."
                            class="min-h-[60px] text-xs resize-none bg-card mb-2"
                            :rows="2" />
                          <div class="flex items-center gap-2">
                            <UiButton
                              variant="outline"
                              size="sm"
                              class="h-7 text-xs"
                              @click="() => { replyText = ''; replyingTo = null }">
                              Cancel
                            </UiButton>
                            <UiButton
                              variant="default"
                              size="sm"
                              class="h-7 text-xs"
                              @click="() => { replyText = ''; replyingTo = null }">
                              Reply
                            </UiButton>
                          </div>
                        </div>
                      </UiTimelineContent>
                    </UiTimelineItem>

                    <!-- Attachment -->
                    <UiTimelineItem
                      v-else-if="item.type === 'attachment'"
                      :step="idx + 1"
                      class="group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-4">
                      <UiTimelineHeader>
                        <UiTimelineSeparator
                          class="group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-0.5rem)] group-data-[orientation=vertical]/timeline:translate-y-5" />
                        <UiTimelineTitle class="mt-0 text-[11px] text-muted-foreground">
                          <span class="font-medium text-foreground">{{ item.author }}</span> attached
                          <span class="text-primary font-medium">{{ item.filename }}</span>
                          <span class="ml-2 text-[10px]">{{ item.date }}</span>
                        </UiTimelineTitle>
                        <UiTimelineIndicator
                          :class="[
                            'flex size-5 items-center justify-center border-none group-data-[orientation=vertical]/timeline:-left-6.5',
                            getActivityColor(item.type),
                          ]">
                          <Icon :name="getActivityIcon(item.type)" class="h-2.5 w-2.5" />
                        </UiTimelineIndicator>
                      </UiTimelineHeader>
                    </UiTimelineItem>

                    <!-- Status change -->
                    <UiTimelineItem
                      v-else-if="item.type === 'status_change'"
                      :step="idx + 1"
                      class="group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-4">
                      <UiTimelineHeader>
                        <UiTimelineSeparator
                          class="group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-0.5rem)] group-data-[orientation=vertical]/timeline:translate-y-5" />
                        <UiTimelineTitle class="mt-0 text-[11px] text-muted-foreground">
                          <span class="font-medium text-foreground">{{ item.author }}</span> changed status to
                          <span class="font-medium text-foreground">{{ item.status }}</span>
                          <span class="ml-2 text-[10px]">{{ item.date }}</span>
                        </UiTimelineTitle>
                        <UiTimelineIndicator
                          :class="[
                            'flex size-5 items-center justify-center border-none group-data-[orientation=vertical]/timeline:-left-6.5',
                            getActivityColor(item.type),
                          ]">
                          <Icon :name="getActivityIcon(item.type)" class="h-2.5 w-2.5" />
                        </UiTimelineIndicator>
                      </UiTimelineHeader>
                    </UiTimelineItem>

                    <!-- Reminder -->
                    <UiTimelineItem
                      v-else-if="item.type === 'reminder'"
                      :step="idx + 1"
                      class="group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-4">
                      <UiTimelineHeader>
                        <UiTimelineSeparator
                          class="group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-0.5rem)] group-data-[orientation=vertical]/timeline:translate-y-5" />
                        <UiTimelineTitle class="mt-0 text-[11px] text-muted-foreground">
                          <span class="font-medium text-foreground">System</span> sent reminder to owner
                          <span class="ml-2 text-[10px]">{{ item.date }}</span>
                        </UiTimelineTitle>
                        <UiTimelineIndicator
                          :class="[
                            'flex size-5 items-center justify-center border-none group-data-[orientation=vertical]/timeline:-left-6.5',
                            getActivityColor(item.type),
                          ]">
                          <Icon :name="getActivityIcon(item.type)" class="h-2.5 w-2.5" />
                        </UiTimelineIndicator>
                      </UiTimelineHeader>
                    </UiTimelineItem>

                    <!-- Created -->
                    <UiTimelineItem
                      v-else-if="item.type === 'created'"
                      :step="idx + 1"
                      class="group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-4">
                      <UiTimelineHeader>
                        <UiTimelineSeparator
                          class="group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-0.5rem)] group-data-[orientation=vertical]/timeline:translate-y-5" />
                        <UiTimelineTitle class="mt-0 text-[11px] text-muted-foreground">
                          <span class="font-medium text-foreground">System</span> created this task
                          <span class="ml-2 text-[10px]">{{ item.date }}</span>
                        </UiTimelineTitle>
                        <UiTimelineIndicator
                          class="flex size-5 items-center justify-center border-none bg-muted group-data-[orientation=vertical]/timeline:-left-6.5">
                          <Icon :name="getActivityIcon(item.type)" class="h-2.5 w-2.5 text-muted-foreground" />
                        </UiTimelineIndicator>
                      </UiTimelineHeader>
                    </UiTimelineItem>
                  </template>
                </UiTimeline>
              </template>
              <div v-else class="flex flex-col items-center justify-center py-12 text-center">
                <div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
                  <Icon name="lucide:message-square" class="h-5 w-5 text-muted-foreground" />
                </div>
                <p class="text-xs font-medium mb-1">No comments yet</p>
                <p class="text-[10px] text-muted-foreground">Comments and activity will appear here.</p>
              </div>
            </div>
          </aside>
        </div>

        <!-- Footer -->
        <div class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon name="lucide:info" class="h-3.5 w-3.5" />
            <span>ID: {{ task.id }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UiButton variant="ghost" size="sm" class="gap-1.5" @click="emit('share', task)">
              <Icon name="lucide:share" class="h-3.5 w-3.5" />
              Share
            </UiButton>
            <UiButton
              variant="outline"
              size="sm"
              class="gap-1.5 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
              @click="emit('delete', task)">
              <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
              Delete
            </UiButton>
            <UiButton variant="outline" size="sm" @click="closeDialog">Close</UiButton>
            <UiButton size="sm" class="gap-1.5" @click="emit('edit', task)">
              <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
              Edit
            </UiButton>
          </div>
        </div>
      </template>
    </UiDialogContent>
  </UiDialog>
</template>
