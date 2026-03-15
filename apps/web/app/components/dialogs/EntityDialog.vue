<script lang="ts" setup>
  import type {
    Entity,
    EntityType,
    PropertyFieldId,
  } from '~/types/entity'
  import {
    ENTITY_TYPE_OPTIONS,
    createDefaultItem,
  } from '~/types/entity'
  import { useEntityFormulas } from '~/composables/useEntityFormulas'
  import { typeHasField } from '~/config/entityRegistry'
  import { useComments } from '~/composables/useComments'
  import { extractYmd, parseYmdLocal, todayYmdLocal } from '~/utils/date'


  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')
  const { user: currentUser } = useInstantAuth()

  // Share dialog
  const showShareDialog = ref(false)

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
  const schedulePanelOpen = ref(true)
  const scheduleSidebarRef = ref<any>(null)
  const entityPickerOpen = ref(false)
  const entityPickerFilterType = ref<string | undefined>(undefined)

  // Sidebar state
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

  const owners = computed(() => props.owners ?? [])
  const folders = computed(() => props.folders ?? [])

  const currentType = computed(() => ENTITY_TYPE_OPTIONS.find((t) => t.value === editableItem.type))

  const isFormValid = computed(() => !!editableItem.title?.trim())

  // Schedule state (sidebar component manages recurrence/reminder/calendar internally)
  const selectedRepeat = ref<string>('none')

  const combineDateAndTime = (ymd: string, time?: string): Date | null => {
    const base = parseYmdLocal(ymd)
    if (!base) return null
    if (!time) return base
    const [h, m] = time.split(':').map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return base
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m)
  }


  watch(
    () => props.item,
    (newItem) => {
      if (newItem) {
        selectedRepeat.value = editableItem.recurrence?.frequency || 'none'
      } else if (isCreateMode.value) {
        selectedRepeat.value = 'none'
      }
      // Reset sidebar component state via exposed refs
      const sidebar = scheduleSidebarRef.value
      if (sidebar) {
        sidebar.repeatOpen = false
        sidebar.reminderOpen = false
        sidebar.selectedReminder = 'none'
      }
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
    schedulePanelOpen.value = false
    const sidebar = scheduleSidebarRef.value
    if (sidebar) {
      sidebar.repeatOpen = false
      sidebar.reminderOpen = false
      sidebar.selectedReminder = 'none'
    }
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
        const sidebar = scheduleSidebarRef.value
        if (sidebar) {
          sidebar.repeatOpen = false
          sidebar.reminderOpen = false
        }
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

  // Notify newly assigned user when owner changes in edit mode
  const currentOrg = useState<any>('currentOrg')
  const adapter = useDataAdapter()
  let _prevOwner: string | undefined = undefined
  watch(
    () => editableItem.owner,
    (newOwner, oldOwner) => {
      // Seed baseline on first load — don't fire on initial hydration
      if (_prevOwner === undefined) {
        _prevOwner = newOwner
        return
      }
      if (!isEditMode.value || !newOwner || newOwner === oldOwner) return
      if (newOwner === currentUser.value?.id) return
      if (adapter.mode !== 'cloud') return
      const orgId = currentOrg.value?.id
      if (!orgId) return
      $fetch('/api/notify', {
        method: 'POST',
        body: {
          recipientId: newOwner,
          orgId,
          type: 'entity_updated',
          title: 'Task assigned to you',
          message: `${(currentUser.value as any)?.name || (currentUser.value as any)?.email || 'Someone'} assigned "${editableItem.title || 'a task'}" to you.`,
          actionUrl: '/workspace/tasks',
          icon: 'lucide:user-check',
          variant: 'default',
          actorId: currentUser.value?.id,
          actorName: (currentUser.value as any)?.name || (currentUser.value as any)?.email || '',
          metadata: { entityId: editableItem.id, subtype: 'assigned' },
        },
      }).catch(() => { /* non-fatal */ })
      _prevOwner = newOwner
    },
  )

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
      <EntityScheduleSidebar
        ref="scheduleSidebarRef"
        v-model:editable-item="editableItem"
        v-model:selected-repeat="selectedRepeat"
        :has-field="hasField"
        :is-view-mode="isViewMode"
        :is-dark="isDark" />
    </aside>

    <!-- Properties Row (full-width, above sidebars) -->
    <template v-if="hasVisibleProperties" #properties>
      <EntityPropertyPills
        v-model:editable-item="editableItem"
        :has-field="hasField"
        :is-view-mode="isViewMode"
        :owners="owners"
        :folders="folders"
        :schedule-panel-open="schedulePanelOpen"
        :schedule-description="scheduleDescription"
        @toggle-schedule="schedulePanelOpen = !schedulePanelOpen" />
    </template>

    <!-- Center: type-specific content panel -->
    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <EntityContentPanel v-model="editableItem" :mode="mode" />
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
      <EntityRightSidebar
        :references="editableItem.references"
        :is-view-mode="isViewMode"
        :is-create-mode="isCreateMode"
        :display-activity="displayActivity"
        :comments-loading="commentsLoading"
        :new-comment="newComment"
        :entity-label="currentType?.label?.toLowerCase()"
        :updated-at="editableItem.updatedAt"
        :created-at="editableItem.createdAt"
        @update:references="editableItem.references = $event"
        @update:new-comment="newComment = $event"
        @open-entity="handleOpenEntityRef"
        @remove-ref="handleRemoveRef"
        @add-entity="() => { entityPickerFilterType = undefined; entityPickerOpen = true }"
        @add-entity-of-type="(type) => { entityPickerFilterType = type; entityPickerOpen = true }"
        @add-comment="handleAddComment" />
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
            <UiDropdownMenuItem icon="lucide:share" title="Share" @click="showShareDialog = true" />
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

  <!-- Share Dialog -->
  <ShareDialog
    v-model:open="showShareDialog"
    :entity-id="editableItem.id"
    entity-type="entity"
    :entity-title="editableItem.title" />
</template>
