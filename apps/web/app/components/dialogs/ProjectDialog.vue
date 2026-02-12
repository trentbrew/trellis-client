<script lang="ts" setup>
  import type { CalendarItem, ProjectStatus } from '~/types/calendarItem'
  import { CATEGORY_OPTIONS, createDefaultItem } from '~/types/calendarItem'
  import { typeHasField } from '~/config/entityRegistry'
  import type { PropertyFieldId } from '~/types/entity'
  import { useComments } from '~/composables/useComments'

  const { user: currentUser } = useInstantAuth()

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'view' | 'create' | 'edit'
      item?: CalendarItem | null
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
      owners?: { id: string; name: string }[]
    }>(),
    {
      mode: 'edit',
      item: null,
      canNavigatePrev: false,
      canNavigateNext: false,
      owners: () => [],
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

  const mode = computed(() => props.mode)
  const isViewMode = computed(() => mode.value === 'view')
  const isCreateMode = computed(() => mode.value === 'create')
  const isEditMode = computed(() => mode.value === 'edit')

  const editableItem: any = reactive(createDefaultItem('project'))

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
        Object.assign(editableItem, { ...createDefaultItem('project') })
      }
    },
    { immediate: true, deep: true },
  )

  // Comments
  const currentEntityId = computed(() => editableItem.id || undefined)
  const {
    displayActivity,
    addComment: persistComment,
    loading: commentsLoading,
  } = useComments(currentEntityId, 'calendarItem')

  // UI State
  const newComment = ref('')
  const categoryOpen = ref(false)
  const ownerOpen = ref(false)
  const ownerSearch = ref('')
  const involvedOpen = ref(false)
  const involvedSearch = ref('')
  const statusOpen = ref(false)
  const commentsOpen = ref(false)
  const fileUploadOpen = ref(false)
  const entityPickerOpen = ref(false)
  const entityPickerFilterType = ref<string | undefined>(undefined)

  const owners = computed(() => props.owners ?? [])

  const filteredOwners = computed(() => {
    let list = owners.value
    if (ownerSearch.value) {
      const s = ownerSearch.value.toLowerCase()
      list = list.filter((o) => o.name.toLowerCase().includes(s))
    }
    if (currentUser.value?.id) {
      const uid = currentUser.value.id
      list = [...list].sort((a, b) => (a.id === uid ? -1 : b.id === uid ? 1 : 0))
    }
    return list
  })

  const filteredInvolvedOwners = computed(() => {
    if (!involvedSearch.value) return owners.value
    const s = involvedSearch.value.toLowerCase()
    return owners.value.filter((o) => o.name.toLowerCase().includes(s))
  })

  const currentCategory = computed(() => CATEGORY_OPTIONS.find((c) => c.value === editableItem.category))
  const isFormValid = computed(() => !!editableItem.title?.trim())

  // Status options
  const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string; icon: string; color: string }[] = [
    { value: 'active', label: 'Active', icon: 'lucide:play', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { value: 'on-hold', label: 'On Hold', icon: 'lucide:pause', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
    { value: 'completed', label: 'Completed', icon: 'lucide:check-circle', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'archived', label: 'Archived', icon: 'lucide:archive', color: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-900/30 dark:text-zinc-400' },
  ]

  const currentStatus = computed(() => PROJECT_STATUS_OPTIONS.find((s) => s.value === editableItem.status))

  // Progress helpers
  const progressPercent = computed(() => Math.round((editableItem.progress || 0) * 100))
  const progressColor = computed(() => {
    const p = editableItem.progress || 0
    if (p < 0.3) return 'bg-red-500'
    if (p < 0.7) return 'bg-amber-500'
    return 'bg-emerald-500'
  })

  // People
  const toggleInvolvedUser = (uid: string) => {
    const i = editableItem.involved.indexOf(uid)
    if (i === -1) editableItem.involved.push(uid)
    else editableItem.involved.splice(i, 1)
  }

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

  const initBlankCreateItem = () => {
    Object.assign(editableItem, {
      ...createDefaultItem('project'),
      id: '',
      title: '',
      description: '',
      tags: [],
      category: '',
      owner: undefined,
      involved: [],
      children: [],
      status: 'active',
      progress: 0,
    })
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen && isCreateMode.value && !props.item) initBlankCreateItem()
    },
  )

  // Actions
  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }

  const handleSave = () => {
    emit('save', { ...editableItem } as CalendarItem)
    closeDialog()
  }

  const handleDelete = () => {
    emit('delete', { ...editableItem } as CalendarItem)
    closeDialog()
  }

  // Auto-save in edit mode
  const { status: saveStatus } = useAutoSave(editableItem, {
    enabled: isEditMode,
  })

  // Bidirectional entity references
  const { addEntityRef, removeRef: removeEntityRef, openEntityRef: handleOpenEntityRef } = useEntityReferences(editableItem)
  const handleAddEntityRef = (ref: import('~/types/entity').EntityReference) => addEntityRef(ref)
  const handleRemoveRef = (refId: string) => removeEntityRef(refId)

  const handleAddComment = async () => {
    if (newComment.value.trim()) {
      await persistComment(newComment.value.trim())
      newComment.value = ''
    }
  }
</script>

<template>
  <ContainerDialogShell
    :open="open"
    :title="editableItem.title"
    :description="editableItem.description"
    :mode="mode"
    :type-badge="{ icon: 'lucide:folder-kanban', label: 'Project' }"
    title-placeholder="Project name..."
    :can-navigate-prev="canNavigatePrev"
    :can-navigate-next="canNavigateNext"
    :item-count="editableItem.children?.length || 0"
    :dialog-title="isCreateMode ? 'New Project' : editableItem.title || 'Project'"
    :dialog-description="isCreateMode ? 'Create a new project.' : 'View and edit project details.'"
    @update:open="emit('update:open', $event)"
    @update:title="editableItem.title = $event"
    @update:description="editableItem.description = $event"
    @close="closeDialog"
    @navigate-prev="emit('navigatePrev')"
    @navigate-next="emit('navigateNext')">

    <!-- Properties Row -->
    <template #properties>
      <!-- Status -->
      <UiPopover v-if="hasField('status')" v-model:open="statusOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
            :class="currentStatus?.color || 'bg-muted/50 hover:bg-muted'">
            <Icon :name="currentStatus?.icon || 'lucide:circle-dot'" class="h-3.5 w-3.5" />
            <span>{{ currentStatus?.label || 'Status' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in PROJECT_STATUS_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="editableItem.status = opt.value; statusOpen = false">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="editableItem.status === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
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
            @click="() => { editableItem.category = opt.value; categoryOpen = false }">
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
              !editableItem.owner
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:user" class="h-3.5 w-3.5" />
            <span>{{ owners?.find((o) => o.id === editableItem.owner)?.name || 'Owner' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-52 p-1 max-h-64 overflow-hidden">
          <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
            <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input v-model="ownerSearch" type="text" placeholder="Search..." class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
          </div>
          <div class="overflow-y-auto max-h-52">
            <button
              v-if="editableItem.owner"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground"
              @click="() => { editableItem.owner = undefined; ownerOpen = false; ownerSearch = '' }">
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
              No owner
            </button>
            <button
              v-for="o in filteredOwners"
              :key="o.id"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="() => { editableItem.owner = o.id; ownerOpen = false; ownerSearch = '' }">
              <div class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary">
                {{ o.name.slice(0, 2).toUpperCase() }}
              </div>
              <span class="flex-1">{{ o.name }}</span>
              <Icon v-if="editableItem.owner === o.id" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
        </UiPopoverContent>
      </UiPopover>

      <!-- Involved -->
      <UiPopover v-if="hasField('involved')" v-model:open="involvedOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              !editableItem.involved?.length
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:users" class="h-3.5 w-3.5" />
            <span>{{ editableItem.involved?.length ? `Team (${editableItem.involved.length})` : 'Team' }}</span>
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
                :name="editableItem.involved?.includes(o.id) ? 'lucide:check-square' : 'lucide:square'"
                class="h-3.5 w-3.5"
                :class="editableItem.involved?.includes(o.id) ? 'text-primary' : 'text-muted-foreground'" />
              <span class="flex-1 truncate">{{ o.name }}</span>
            </button>
          </div>
        </UiPopoverContent>
      </UiPopover>

      <!-- Tags -->
      <span v-if="hasField('tags')" class="w-px h-4 bg-border/60 mx-0.5 shrink-0" />
      <div v-if="hasField('tags')" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/30 border border-border/40">
        <TagsSection v-model="editableItem.tags" :readonly="isViewMode" inline />
      </div>
    </template>

    <!-- Content: Sidebar + Main -->
    <!-- Project Sidebar -->
    <aside class="w-64 shrink-0 border-r border-border overflow-y-auto hidden md:block">
      <div class="p-4 space-y-4">
        <!-- Progress -->
        <div class="space-y-2">
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Progress</p>
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="text-foreground font-medium">{{ progressPercent }}%</span>
              <span class="text-muted-foreground">{{ currentStatus?.label || 'Active' }}</span>
            </div>
            <div class="h-2 rounded-full bg-muted/40 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="progressColor"
                :style="{ width: `${progressPercent}%` }" />
            </div>
            <input
              v-if="!isViewMode"
              v-model.number="editableItem.progress"
              type="range"
              min="0"
              max="1"
              step="0.05"
              class="w-full h-1 accent-primary" />
          </div>
        </div>

        <!-- Dates -->
        <div class="space-y-2">
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Timeline</p>

          <!-- Start Date -->
          <div class="flex items-center gap-2">
            <Icon name="lucide:calendar" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div class="flex-1">
              <span class="text-[10px] text-muted-foreground block">Start</span>
              <input
                v-if="!isViewMode"
                v-model="editableItem.startDate"
                type="date"
                class="w-full text-xs bg-transparent outline-none text-foreground" />
              <span v-else class="text-xs text-foreground">{{ editableItem.startDate || '—' }}</span>
            </div>
          </div>

          <!-- End Date -->
          <div class="flex items-center gap-2">
            <Icon name="lucide:calendar-range" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div class="flex-1">
              <span class="text-[10px] text-muted-foreground block">End</span>
              <input
                v-if="!isViewMode"
                v-model="editableItem.endDate"
                type="date"
                class="w-full text-xs bg-transparent outline-none text-foreground" />
              <span v-else class="text-xs text-foreground">{{ editableItem.endDate || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Budget -->
        <div class="space-y-2">
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Budget</p>
          <div class="flex items-center gap-2">
            <Icon name="lucide:banknote" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <template v-if="!isViewMode">
              <select
                v-model="editableItem.currency"
                class="h-6 rounded border border-border bg-transparent text-[10px] px-1 outline-none w-14 shrink-0">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
              <input
                v-model.number="editableItem.budget"
                type="number"
                min="0"
                placeholder="Amount..."
                class="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50" />
            </template>
            <span v-else class="text-xs text-foreground">
              {{ editableItem.budget != null ? `${editableItem.currency || 'USD'} ${editableItem.budget.toLocaleString()}` : '—' }}
            </span>
          </div>
        </div>

        <!-- Quick Stats -->
        <div v-if="!isCreateMode" class="space-y-2">
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Stats</p>
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-lg bg-muted/30 p-2 text-center">
              <p class="text-lg font-semibold text-foreground">{{ editableItem.children?.length || 0 }}</p>
              <p class="text-[10px] text-muted-foreground">Items</p>
            </div>
            <div class="rounded-lg bg-muted/30 p-2 text-center">
              <p class="text-lg font-semibold text-foreground">{{ editableItem.involved?.length || 0 }}</p>
              <p class="text-[10px] text-muted-foreground">Members</p>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <div class="divide-y divide-border flex flex-col min-h-full">
        <!-- References -->
        <ReferencesSection
          v-model="editableItem.references"
          :readonly="isViewMode"
          @open-entity="handleOpenEntityRef"
          @remove-ref="handleRemoveRef"
          @add-file="fileUploadOpen = true"
          @add-entity="() => { entityPickerFilterType = undefined; entityPickerOpen = true }"
          @add-entity-of-type="(type: string) => { entityPickerFilterType = type; entityPickerOpen = true }" />

        <!-- Comments / Activity -->
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
                  <Icon v-if="activityItem.type === 'created'" name="lucide:plus" class="h-2.5 w-2.5 text-muted-foreground" />
                  <Icon v-else-if="activityItem.type === 'comment'" name="lucide:message-circle" class="h-2.5 w-2.5 text-muted-foreground" />
                  <Icon v-else name="lucide:activity" class="h-2.5 w-2.5 text-muted-foreground" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-1 flex-wrap">
                    <span class="text-[11px] font-medium">{{ activityItem.authorName }}</span>
                    <span class="text-[10px] text-muted-foreground">{{ formatRelativeTime(Number(activityItem.createdAt)) }}</span>
                  </div>
                  <p v-if="activityItem.content" class="text-xs text-foreground/80 mt-0.5">{{ activityItem.content }}</p>
                  <p v-else-if="activityItem.type === 'created'" class="text-[10px] text-muted-foreground mt-0.5">created this project</p>
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
              <button v-if="newComment.trim()" class="text-primary hover:text-primary/80 transition-colors" @click="handleAddComment">
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
        <span v-else>New project</span>
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
        <span class="text-[11px] text-muted-foreground flex items-center gap-1 mr-2 transition-opacity" :class="saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'">
          <Icon v-if="saveStatus === 'saving'" name="lucide:loader-2" class="h-3 w-3 animate-spin" />
          <Icon v-else-if="saveStatus === 'saved'" name="lucide:check" class="h-3 w-3 text-emerald-500" />
          <Icon v-else-if="saveStatus === 'error'" name="lucide:alert-circle" class="h-3 w-3 text-destructive" />
          {{ saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : '' }}
        </span>
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="ghost" size="icon" class="h-8 w-8">
              <Icon name="lucide:more-horizontal" class="h-4 w-4" />
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end" class="w-40">
            <UiDropdownMenuItem icon="lucide:share" title="Share" />
            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem icon="lucide:trash-2" title="Delete" variant="destructive" @click="handleDelete" />
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </template>
      <template v-else-if="isCreateMode">
        <UiButton size="sm" :disabled="!isFormValid" @click="handleSave">Create</UiButton>
        <UiButton variant="ghost" size="sm" @click="closeDialog">Cancel</UiButton>
      </template>
    </template>
  </ContainerDialogShell>

  <!-- File Upload Modal -->
  <UiDialog v-model:open="fileUploadOpen">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Upload File</UiDialogTitle>
        <UiDialogDescription>Drag and drop files here or click to browse.</UiDialogDescription>
      </UiDialogHeader>
      <div class="py-4">
        <div class="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
          <Icon name="lucide:upload-cloud" class="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p class="text-sm font-medium">Drop files here</p>
          <p class="text-xs text-muted-foreground mt-1">or click to browse</p>
        </div>
      </div>
      <UiDialogFooter>
        <UiButton variant="outline" @click="fileUploadOpen = false">Cancel</UiButton>
        <UiButton @click="fileUploadOpen = false">Upload</UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>

  <!-- Entity Reference Picker -->
  <EntityReferencePicker v-model:open="entityPickerOpen" :exclude-id="editableItem.id" :filter-type="entityPickerFilterType" @select="handleAddEntityRef" />
</template>
