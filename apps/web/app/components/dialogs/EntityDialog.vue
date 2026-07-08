<script lang="ts" setup>
  import type { Entity, EntityType, PropertyFieldId } from '~/types/entity'
  import { ENTITY_TYPE_OPTIONS, createDefaultItem } from '~/types/entity'
  import { useEntityFormulas } from '~/composables/useEntityFormulas'
  import { typeHasField } from '~/config/entityRegistry'
  import { useComments } from '~/composables/useComments'
  import { extractYmd, parseYmdLocal, todayYmdLocal } from '~/utils/date'
  import { isDocumentChromeType } from '~/lib/document-chrome'
  import { entityId as toEntityId } from '~/lib/tql-namespace'
  import { resolveSummaryText, MIN_SUMMARY_SOURCE_LENGTH } from '~/composables/useEntitySummary'

  const colorMode = useColorMode()
  const isDark = computed(() => colorMode.value === 'dark')
  const { user: currentUser } = useInstantAuth()

  // Share dialog
  const showShareDialog = ref(false)
  // Schema editor (entity-type schema). Inline editing in Properties tab is
  // a follow-up; for now this opens a placeholder.
  const showSchemaEditor = ref(false)

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
      variant?: 'dialog' | 'inset' | 'inline'
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
      variant: 'dialog',
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

  // Sync AI summary fields from the live store without clobbering in-progress edits.
  watch(
    () =>
      [
        props.item?.summary,
        props.item?.summaryGeneratedAt,
        props.item?.summarySourceHash,
      ] as const,
    ([summary, generatedAt, sourceHash]) => {
      if (!props.item?.id || props.item.id !== _loadedItemId.value) return
      if (summary !== undefined) editableItem.summary = summary
      if (generatedAt !== undefined) editableItem.summaryGeneratedAt = generatedAt
      if (sourceHash !== undefined) editableItem.summarySourceHash = sourceHash
    },
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
  const { displayActivity, addComment: persistComment, loading: commentsLoading } = useComments(currentEntityId)

  // ── AI summary ──────────────────────────────────────────────────────
  // Lazy-generates a clean 1–3 sentence summary of the entity's description
  // (stored on the entity as `summary`). Shown in the dialog header under
  // the title, with a toggle to view the original. Works for any entity
  // type that has a `description` field.
  const {
    ensure: ensureSummary,
    regenerate: regenerateSummaryFn,
    isGenerating: isSummaryGenerating,
  } = useEntitySummary()
  const { fetchNode } = useTrellisGraph()

  async function hydrateDocumentContentForSummary(): Promise<string> {
    const mergedContent = editableItem.content || props.item?.content || ''
    if (!isDocumentChromeType(editableItem.type) || !editableItem.id) return mergedContent
    if (resolveSummaryText({ ...editableItem, content: mergedContent }).length >= MIN_SUMMARY_SOURCE_LENGTH) {
      return mergedContent
    }

    try {
      const { node } = await fetchNode(toEntityId(editableItem.id))
      const content = (node?.content as string) || ''
      if (content) editableItem.content = content
      return content || mergedContent
    } catch {
      return mergedContent
    }
  }

  watch(
    () =>
      [
        editableItem.id,
        editableItem.type,
        editableItem.description,
        editableItem.content,
        props.item?.content,
      ] as const,
    () => {
      if (isCreateMode.value) return
      if (!editableItem.id) return
      void (async () => {
        const content = await hydrateDocumentContentForSummary()
        const entity = { ...editableItem, content }
        const source = resolveSummaryText(entity)
        if (source.length < MIN_SUMMARY_SOURCE_LENGTH) return
        void ensureSummary(entity)
      })()
    },
    { immediate: true },
  )

  const entitySummary = computed(() => (editableItem.summary || '').trim())
  const generatingSummary = computed(() => !!editableItem.id && isSummaryGenerating(editableItem.id))

  function handleRegenerateSummary() {
    if (!editableItem.id) return
    void regenerateSummaryFn(editableItem)
  }

  // UI State
  const newComment = ref('')
  const typeOpen = ref(false)
  const schedulePanelOpen = ref(true)
  const scheduleSidebarRef = ref<any>(null)
  const entityPickerOpen = ref(false)
  const entityPickerFilterType = ref<string | undefined>(undefined)

  // Sidebar state
  const rightSidebarW = ref(360)
  const rightSidebarCollapsed = ref(false)

  // Bookmarks: preview-first with metadata sidebar collapsed.
  // Files: preview-first with properties sidebar open by default.
  watch(
    () => ({ open: props.open, id: editableItem.id, type: editableItem.type as string, variant: props.variant }),
    (cur, prev) => {
      if (!cur.open || cur.variant === 'inset') return
      const opened = cur.open && !prev?.open
      const switched = !!cur.id && cur.id !== prev?.id
      if (!opened && !switched) return
      if (cur.type === 'bookmark') rightSidebarCollapsed.value = true
      if (cur.type === 'file') rightSidebarCollapsed.value = false
    },
  )

  const owners = computed(() => props.owners ?? [])
  const folders = computed(() => props.folders ?? [])

  const isInset = computed(() => props.variant === 'inset')
  const activeInsetTab = ref<'preview' | 'properties' | 'references' | 'activity'>('preview')
  const insetTabs = computed(() => {
    const base = [
      { id: 'preview' as const, label: 'Preview' },
      { id: 'properties' as const, label: 'Properties' },
      { id: 'references' as const, label: 'References' },
    ]
    if (!isCreateMode.value) base.push({ id: 'activity' as any, label: 'Activity' })
    return base
  })

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
    const start = combineDateAndTime(
      extractYmd(editableItem.startDate),
      editableItem.allDay ? undefined : editableItem.startTime,
    )
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
    const startDate = combineDateAndTime(
      extractYmd(editableItem.startDate),
      editableItem.allDay ? undefined : editableItem.startTime,
    )
    if (!startDate) return null

    const now = new Date()
    const endRaw = editableItem.endDate ? extractYmd(editableItem.endDate) : null
    const endDate = endRaw ? combineDateAndTime(endRaw, editableItem.allDay ? undefined : editableItem.endTime) : null

    // Use end-of-day for all-day events
    const effectiveEnd =
      endDate || new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59)

    if (now < startDate) {
      return { label: 'Upcoming', icon: 'lucide:calendar-clock', colorClass: 'bg-blue-500/15 text-blue-600' }
    }
    if (now <= effectiveEnd) {
      return { label: 'In progress', icon: 'lucide:radio', colorClass: 'bg-emerald-500/15 text-emerald-600' }
    }
    const daysAgo = Math.floor((now.getTime() - effectiveEnd.getTime()) / 86_400_000)
    if (daysAgo === 0)
      return { label: 'Ended today', icon: 'lucide:clock', colorClass: 'bg-muted/50 text-muted-foreground' }
    if (daysAgo === 1)
      return { label: 'Yesterday', icon: 'lucide:clock', colorClass: 'bg-muted/50 text-muted-foreground' }
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
      }).catch(() => {
        /* non-fatal */
      })
      _prevOwner = newOwner
    },
  )

  // Sync inline images → content-derived FileReference entries
  useImageLinks(editableItem)

  // Bidirectional entity references
  const {
    addEntityRef,
    removeRef: removeEntityRef,
    openEntityRef: handleOpenEntityRef,
    createAndOpenEntityRef,
    createEntityAndLink,
  } = useEntityReferences(editableItem)
  const handleAddEntityRef = (ref: import('~/types/entity').EntityReference) => addEntityRef(ref)
  const handleCreatedEntityRef = (ref: import('~/types/entity').EntityReference) => createAndOpenEntityRef(ref)
  const handleCreateEntityOfType = (type: string, title: string) => {
    void createEntityAndLink(type, title)
  }
  const handleRemoveRef = (refId: string) => removeEntityRef(refId)
  const handleAddComment = async () => {
    if (newComment.value.trim()) {
      await persistComment(newComment.value.trim())
      newComment.value = ''
    }
  }

  const { getEntityConfig } = useOntologyRegistry()

  const hasOntologyFields = computed(() => {
    const config = getEntityConfig(editableItem.type)
    return !!(config && 'fields' in config && Array.isArray(config.fields) && config.fields.length > 0)
  })

  const hasVisibleProperties = computed(() => {
    if (editableItem.type === 'bookmark') return true
    if (editableItem.type === 'file') return true
    if (isDocumentChrome.value) return true
    if (hasOntologyFields.value) return true
    if (hasField('startDate')) return true
    if (hasField('status')) return true
    if (hasField('priority')) return true
    if (hasField('urgency')) return true
    if (hasField('category')) return true
    if (hasField('owner')) return true
    if (hasField('involved')) return true
    if (hasField('folder')) return true
    if (hasField('paymentStatus')) return true
    if (hasField('tripStatus')) return true
    if (hasField('sprintStatus')) return true
    if (hasField('budgetStatus')) return true
    if (hasField('achieved')) return true
    if (hasField('metric')) return true
    if (hasField('location')) return true
    if (hasField('eventSubtype')) return true
    if (editableItem.type === 'email') return true
    return false
  })

  const isBookmark = computed(() => editableItem.type === 'bookmark')
  const isFile = computed(() => editableItem.type === 'file')
  const isPreviewFirst = computed(() => isBookmark.value || isFile.value)
  const isDocumentChrome = computed(() => isDocumentChromeType(editableItem.type))
  const { columnClass: documentColumnClass } = useDocumentReadingWidth()
  const isDialogVariant = computed(() => props.variant === 'dialog')

  // ── Email helpers ───────────────────────────────────────────────────
  const emailFromName = computed(() => {
    const raw = editableItem.from || ''
    const match = /^(.+?)\s*<(.+)>$/.exec(raw)
    return (match?.[1] || raw).replace(/["']/g, '').trim()
  })

  const emailFromAddress = computed(() => {
    const raw = editableItem.from || ''
    const match = /^(.+?)\s*<(.+)>$/.exec(raw)
    return match?.[2] || raw
  })

  const emailDate = computed(() => {
    const iso = editableItem.date || ''
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
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
    :variant="variant"
    :inline-header-tags="isDialogVariant"
    :title="editableItem.title"
    :description="editableItem.description"
    :mode="mode"
    :header-in-body="true"
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
    :summary="entitySummary"
    :is-generating-summary="generatingSummary"
    :item-type="editableItem.type"
    @update:open="emit('update:open', $event)"
    @update:title="editableItem.title = $event"
    @update:description="editableItem.description = $event"
    @close="closeDialog"
    @navigate-prev="emit('navigatePrev')"
    @navigate-next="emit('navigateNext')"
    @regenerate-summary="handleRegenerateSummary">
    <template v-if="!isInset" #header-actions>
      <DocumentReadingWidthToggle v-if="isDocumentChrome" />
      <RightSidebarToggle v-model:collapsed="rightSidebarCollapsed" />
    </template>
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
    </template>

    <template v-if="hasField('tags')" #header-tags>
      <TagsSection v-model="editableItem.tags" :readonly="isViewMode" inline />
    </template>

    <div v-if="!isInset" :class="['flex-1 flex flex-col min-w-0 min-h-0', isPreviewFirst ? 'overflow-hidden' : 'overflow-y-auto']">
      <EntityContentPanel
        v-if="isPreviewFirst"
        v-model="editableItem"
        :mode="mode"
        class="flex-1 min-h-0 flex flex-col h-full" />
      <div v-else :class="isDocumentChrome ? documentColumnClass : ''">
        <EntityBodyHeader
          :variant="isDocumentChrome ? 'document' : 'default'"
          :title="editableItem.title"
          :description="editableItem.description"
          :mode="mode"
          :title-placeholder="isDocumentChrome ? 'Untitled' : `${currentType?.label || 'Item'} name...`"
          :summary="entitySummary"
          :is-generating-summary="generatingSummary"
          :entity-id="editableItem.id || undefined"
          :ai-only="editableItem.type === 'email'"
          @update:title="editableItem.title = $event"
          @update:description="editableItem.description = $event"
          @regenerate-summary="handleRegenerateSummary">
          <template v-if="editableItem.type === 'email'" #below>
          <div class="flex flex-wrap items-center gap-1.5 mt-3 text-xs">
            <span
              v-if="emailFromName"
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 max-w-[220px]"
              :title="emailFromAddress">
              <Icon name="lucide:user" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span class="truncate">{{ emailFromName }}</span>
            </span>
            <span
              v-if="editableItem.to"
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 max-w-[260px]"
              :title="editableItem.to">
              <Icon name="lucide:send" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span class="truncate">to {{ editableItem.to }}</span>
            </span>
            <span
              v-if="editableItem.cc"
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 max-w-[220px]"
              :title="editableItem.cc">
              <Icon name="lucide:users" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span class="truncate">cc {{ editableItem.cc }}</span>
            </span>
            <span v-if="emailDate" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
              <Icon name="lucide:calendar" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span class="whitespace-nowrap">{{ emailDate }}</span>
            </span>
            <button
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
              :class="
                editableItem.isStarred
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground'
              "
              :disabled="isViewMode"
              :title="editableItem.isStarred ? 'Starred' : 'Star email'"
              @click="!isViewMode && (editableItem.isStarred = !editableItem.isStarred)">
              <Icon :name="editableItem.isStarred ? 'lucide:star' : 'lucide:star-off'" class="h-3.5 w-3.5 shrink-0" />
              {{ editableItem.isStarred ? 'Starred' : 'Star' }}
            </button>
            <button
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
              :class="
                editableItem.isRead
                  ? 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  : 'bg-primary/10 text-primary'
              "
              :disabled="isViewMode"
              :title="editableItem.isRead ? 'Mark as unread' : 'Mark as read'"
              @click="!isViewMode && (editableItem.isRead = !editableItem.isRead)">
              <Icon :name="editableItem.isRead ? 'lucide:mail-open' : 'lucide:mail'" class="h-3.5 w-3.5 shrink-0" />
              {{ editableItem.isRead ? 'Read' : 'Unread' }}
            </button>
          </div>
        </template>
        </EntityBodyHeader>
        <div :class="isDocumentChrome ? 'pb-6' : 'px-6 pb-6'">
          <EntityContentPanel v-model="editableItem" :mode="mode" />
        </div>
      </div>
    </div>

    <!-- Right sidebar: tabbed references + activity (non-inset) -->
    <ResizableRightPanel
      v-if="!isInset"
      v-model:collapsed="rightSidebarCollapsed"
      v-model:width="rightSidebarW">
      <EntityRightSidebar
        v-model:collapsed="rightSidebarCollapsed"
        :references="editableItem.references"
        :is-view-mode="isViewMode"
        :is-create-mode="isCreateMode"
        :display-activity="displayActivity"
        :comments-loading="commentsLoading"
        :new-comment="newComment"
        :entity-label="currentType?.label?.toLowerCase()"
        :updated-at="editableItem.updatedAt"
        :created-at="editableItem.createdAt"
        :item="editableItem"
        :show-properties="hasVisibleProperties"
        @update:references="editableItem.references = $event"
        @update:new-comment="newComment = $event"
        @edit-schema="showSchemaEditor = true"
        @open-entity="handleOpenEntityRef"
        @remove-ref="handleRemoveRef"
        @add-entity="
          () => {
            entityPickerFilterType = undefined
            entityPickerOpen = true
          }
        "
        @add-entity-of-type="
          (type) => {
            entityPickerFilterType = type
            entityPickerOpen = true
          }
        "
        @create-entity="handleCreateEntityOfType"
        @add-comment="handleAddComment">
        <template #properties>
          <BookmarkPropertiesTab
            v-if="isBookmark"
            v-model:editable-item="editableItem"
            :is-view-mode="isViewMode"
            :summary="entitySummary"
            :is-generating-summary="generatingSummary"
            @regenerate-summary="handleRegenerateSummary" />
          <FilePropertiesTab
            v-else-if="isFile"
            v-model:editable-item="editableItem"
            v-model:selected-repeat="selectedRepeat"
            :has-field="hasField"
            :is-view-mode="isViewMode"
            :is-dark="isDark"
            :owners="owners"
            :folders="folders"
            :schedule-description="scheduleDescription"
            :summary="entitySummary"
            :is-generating-summary="generatingSummary"
            @regenerate-summary="handleRegenerateSummary" />
          <DocumentPropertiesTab
            v-else-if="isDocumentChrome"
            v-model:editable-item="editableItem"
            v-model:selected-repeat="selectedRepeat"
            :has-field="hasField"
            :is-view-mode="isViewMode"
            :is-dark="isDark"
            :owners="owners"
            :folders="folders"
            :schedule-description="scheduleDescription"
            :summary="entitySummary"
            :is-generating-summary="generatingSummary"
            @regenerate-summary="handleRegenerateSummary" />
          <OntologyPropertiesTab
            v-else-if="hasOntologyFields"
            v-model:editable-item="editableItem"
            v-model:selected-repeat="selectedRepeat"
            :has-field="hasField"
            :is-view-mode="isViewMode"
            :is-dark="isDark"
            :owners="owners"
            :folders="folders"
            :schedule-description="scheduleDescription" />
          <EntityPropertiesTab
            v-else
            v-model:editable-item="editableItem"
            v-model:selected-repeat="selectedRepeat"
            :has-field="hasField"
            :is-view-mode="isViewMode"
            :is-dark="isDark"
            :owners="owners"
            :folders="folders"
            :schedule-description="scheduleDescription" />
        </template>
      </EntityRightSidebar>
    </ResizableRightPanel>

    <!-- ═══ Inset tabbed layout (narrow sidebar mode) ═══ -->
    <div v-if="isInset" class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Tab bar -->
      <div class="flex border-b border-border shrink-0">
        <button
          v-for="tab in insetTabs"
          :key="tab.id"
          class="flex-1 px-2 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
          :class="
            activeInsetTab === tab.id
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="activeInsetTab = tab.id as any">
          {{ tab.label }}
          <span
            v-if="tab.id === 'activity' && !isCreateMode && displayActivity.length"
            class="ml-1 text-[9px] bg-muted rounded-full px-1.5 py-0.5">
            {{ displayActivity.length }}
          </span>
        </button>
      </div>

      <!-- Tab content -->
      <div class="flex-1 overflow-hidden min-h-0">
        <!-- Preview -->
        <div
          v-if="activeInsetTab === 'preview'"
          :class="['h-full flex flex-col min-h-0', isPreviewFirst ? 'overflow-hidden' : 'overflow-y-auto']">
          <EntityBodyHeader
            v-if="!isPreviewFirst"
            density="inset"
            :variant="isDocumentChrome ? 'document' : 'default'"
            :title="editableItem.title"
            :description="editableItem.description"
            :mode="mode"
            :title-placeholder="isDocumentChrome ? 'Untitled' : `${currentType?.label || 'Item'} name...`"
            :summary="entitySummary"
            :is-generating-summary="generatingSummary"
            :entity-id="editableItem.id || undefined"
            :ai-only="editableItem.type === 'email'"
            @update:title="editableItem.title = $event"
            @update:description="editableItem.description = $event"
            @regenerate-summary="handleRegenerateSummary" />
          <div :class="['flex-1 min-h-0 flex flex-col', isPreviewFirst ? '' : 'px-4 pt-2 pb-6']">
            <EntityContentPanel v-model="editableItem" :mode="mode" class="flex-1 min-h-0" />
          </div>
        </div>

        <!-- Properties -->
        <BookmarkPropertiesTab
          v-else-if="activeInsetTab === 'properties' && isBookmark"
          v-model:editable-item="editableItem"
          :is-view-mode="isViewMode"
          :summary="entitySummary"
          :is-generating-summary="generatingSummary"
          @regenerate-summary="handleRegenerateSummary" />
        <FilePropertiesTab
          v-else-if="activeInsetTab === 'properties' && isFile"
          v-model:editable-item="editableItem"
          v-model:selected-repeat="selectedRepeat"
          :has-field="hasField"
          :is-view-mode="isViewMode"
          :is-dark="isDark"
          :owners="owners"
          :folders="folders"
          :schedule-description="scheduleDescription"
          :summary="entitySummary"
          :is-generating-summary="generatingSummary"
          @regenerate-summary="handleRegenerateSummary" />
        <DocumentPropertiesTab
          v-else-if="activeInsetTab === 'properties' && isDocumentChrome"
          v-model:editable-item="editableItem"
          v-model:selected-repeat="selectedRepeat"
          :has-field="hasField"
          :is-view-mode="isViewMode"
          :is-dark="isDark"
          :owners="owners"
          :folders="folders"
          :schedule-description="scheduleDescription"
          :summary="entitySummary"
          :is-generating-summary="generatingSummary"
          @regenerate-summary="handleRegenerateSummary" />
        <OntologyPropertiesTab
          v-else-if="activeInsetTab === 'properties' && hasOntologyFields"
          v-model:editable-item="editableItem"
          v-model:selected-repeat="selectedRepeat"
          :has-field="hasField"
          :is-view-mode="isViewMode"
          :is-dark="isDark"
          :owners="owners"
          :folders="folders"
          :schedule-description="scheduleDescription" />
        <EntityPropertiesTab
          v-else-if="activeInsetTab === 'properties'"
          v-model:editable-item="editableItem"
          v-model:selected-repeat="selectedRepeat"
          :has-field="hasField"
          :is-view-mode="isViewMode"
          :is-dark="isDark"
          :owners="owners"
          :folders="folders"
          :schedule-description="scheduleDescription" />

        <!-- References -->
        <div v-else-if="activeInsetTab === 'references'" class="h-full overflow-y-auto">
          <ReferencesSection
            :model-value="editableItem.references"
            :readonly="isViewMode"
            @update:model-value="editableItem.references = $event"
            @open-entity="handleOpenEntityRef"
            @remove-ref="handleRemoveRef"
            @add-entity="
              () => {
                entityPickerFilterType = undefined
                entityPickerOpen = true
              }
            "
            @add-entity-of-type="
              (type: string) => {
                entityPickerFilterType = type
                entityPickerOpen = true
              }
            "
            @create-entity="handleCreateEntityOfType" />
          <EntityAISuggestionsPanel v-if="!isCreateMode" :entity="editableItem" />
        </div>

        <!-- Activity -->
        <div v-else-if="activeInsetTab === 'activity' && !isCreateMode" class="p-3 pb-0 space-y-2 flex flex-col h-full">
          <div class="flex items-center gap-2 border border-border bg-card py-3 px-2 rounded-lg shrink-0">
            <div class="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
              <Icon name="lucide:user" class="h-2.5 w-2.5 text-muted-foreground" />
            </div>
            <input
              :value="newComment"
              type="text"
              placeholder="Add a comment..."
              class="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
              @input="newComment = ($event.target as HTMLInputElement).value"
              @keydown.enter="newComment.trim() && handleAddComment()" />
            <button
              v-if="newComment.trim()"
              class="text-primary hover:text-primary/80 transition-colors shrink-0"
              @click="handleAddComment">
              <Icon name="lucide:send" class="h-3 w-3" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto space-y-2 min-h-0 px-1 pt-2">
            <div v-if="commentsLoading" class="flex items-center gap-2 py-2">
              <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin text-muted-foreground" />
              <span class="text-xs text-muted-foreground">Loading…</span>
            </div>
            <template v-else-if="displayActivity.length">
              <div v-for="activityItem in displayActivity" :key="activityItem.id" class="flex items-start gap-2">
                <div
                  class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white bg-muted-foreground/40">
                  <Icon v-if="activityItem.type === 'created'" name="lucide:plus" class="h-2.5 w-2.5" />
                  <Icon v-else-if="activityItem.type === 'comment'" name="lucide:message-circle" class="h-2.5 w-2.5" />
                  <Icon v-else-if="activityItem.type === 'status_change'" name="lucide:edit-3" class="h-2.5 w-2.5" />
                  <Icon v-else name="lucide:activity" class="h-2.5 w-2.5" />
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
            </template>
            <div v-else class="py-4 text-center">
              <p class="text-xs text-muted-foreground italic">No activity yet</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer-left>
      <div class="flex items-center gap-2 min-w-0 overflow-hidden">
        <Icon name="lucide:info" class="h-3.5 w-3.5 shrink-0" />
        <EntityFooterId v-if="editableItem.id && !isCreateMode" :id="editableItem.id" />
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
            <UiDropdownMenuItem icon="lucide:trash-2" title="Delete" variant="destructive" @click="handleDelete" />
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
  <EntityReferencePicker
    v-model:open="entityPickerOpen"
    :exclude-id="editableItem.id"
    :filter-type="entityPickerFilterType"
    @select="handleAddEntityRef"
    @created="handleCreatedEntityRef" />

  <!-- Share Dialog -->
  <ShareDialog
    v-model:open="showShareDialog"
    :entity-id="editableItem.id"
    entity-type="entity"
    :entity-title="editableItem.title" />

  <!-- Schema editor (placeholder — inline schema editing in Properties tab is TODO) -->
  <UiDialog v-if="showSchemaEditor" :open="showSchemaEditor" @update:open="showSchemaEditor = $event">
    <UiDialogContent class="max-w-md">
      <UiDialogTitle>Edit {{ currentType?.label || 'Entity' }} schema</UiDialogTitle>
      <UiDialogDescription>
        Schema editing for entity types is coming soon. Changes here will affect every
        {{ currentType?.label?.toLowerCase() || 'entity' }} in your workspace.
      </UiDialogDescription>
      <div class="flex justify-end mt-4">
        <UiButton variant="outline" size="sm" @click="showSchemaEditor = false">Close</UiButton>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
