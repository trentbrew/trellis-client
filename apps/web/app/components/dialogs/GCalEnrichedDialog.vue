<script lang="ts" setup>
  import type { EntityReference, Reference } from '~/types/entity'
  import { PRIORITY_OPTIONS, URGENCY_OPTIONS } from '~/types/entity'
  import { useGCalEnrichment } from '~/composables/useGCalEnrichment'
  import { useEntityReferences } from '~/composables/useEntityReferences'
  import { useComments } from '~/composables/useComments'

  interface GCalEventData {
    title?: string
    startDate?: string
    endDate?: string
    startTime?: string
    endTime?: string
    allDay?: boolean
    description?: string
    location?: string
    htmlLink?: string
    googleStatus?: string
    googleCalendarId?: string
    googleEventId?: string
    tags?: string[]
  }

  const props = defineProps<{
    open: boolean
    event: GCalEventData | null
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
  }>()

  // ── Enrichment composable ─────────────────────────────────────────────
  const { getEnrichment, ensureEnrichment, enrichmentUUID, enrichmentUUIDSync } = useGCalEnrichment()

  const googleEventId = computed(() => props.event?.googleEventId ?? '')
  const enrichment = getEnrichment(googleEventId)

  // Stable UUID for the enrichment node — resolved async on open, then cached.
  // We use a ref so the template can react once the UUID is resolved.
  const enrichmentId = ref('')

  watch(
    googleEventId,
    async (evId) => {
      if (!evId) {
        enrichmentId.value = ''
        return
      }
      // Use cached value synchronously if available, then confirm async
      const cached = enrichmentUUIDSync(evId)
      if (cached) enrichmentId.value = cached
      const uuid = await enrichmentUUID(evId)
      enrichmentId.value = uuid
    },
    { immediate: true },
  )

  // ── Editable enrichment state ─────────────────────────────────────────
  const editableEnrichment = reactive<{
    id: string
    type: 'event'
    title: string
    eventType: 'gcal-enrichment'
    referenceNumber: string
    allDay: boolean
    startDate: string
    notes: string
    tags: string[]
    references: Reference[]
    owner?: string
    involved: string[]
    priority: string
    urgency?: string
    updatedAt: number
  }>({
    id: '',
    type: 'event',
    title: '',
    eventType: 'gcal-enrichment',
    referenceNumber: '',
    allDay: true,
    startDate: new Date().toISOString().slice(0, 10),
    notes: '',
    tags: [],
    references: [],
    owner: undefined,
    involved: [],
    priority: 'medium',
    urgency: undefined,
    updatedAt: 0,
  })

  // Track which enrichment node ID is currently loaded.
  // Only do a full hydrate when the node ID changes (first load or switching
  // events). While the dialog is open, local state is authoritative —
  // SSE echoes of our own saves must NOT clobber in-progress edits.
  const _loadedEnrichmentId = ref<string | null>(null)

  watch(
    [enrichment, enrichmentId, googleEventId],
    ([node, uuid, evId]) => {
      if (!evId || !uuid) return
      const nodeId = (node as any)?.id ?? null
      const clean = evId.replace(/^gcal:/, '').replace(/^entity:/, '')
      const gcalTitle = props.event?.title ?? ''

      if (node && nodeId !== _loadedEnrichmentId.value) {
        // First load of this enrichment node — full hydrate
        Object.assign(editableEnrichment, {
          id: node.id,
          type: 'event',
          title: gcalTitle,
          eventType: 'gcal-enrichment',
          referenceNumber: clean,
          allDay: (node as any).allDay ?? true,
          startDate: (node as any).startDate || new Date().toISOString().slice(0, 10),
          notes: (node as any).notes ?? '',
          tags: Array.isArray((node as any).tags) ? [...(node as any).tags] : [],
          references: Array.isArray((node as any).references) ? [...(node as any).references] : [],
          owner: (node as any).owner,
          involved: Array.isArray((node as any).involved) ? [...(node as any).involved] : [],
          priority: (node as any).priority || 'medium',
          urgency: (node as any).urgency,
          updatedAt: (node as any).updatedAt ?? 0,
        })
        _loadedEnrichmentId.value = nodeId
      } else if (!node && uuid !== _loadedEnrichmentId.value) {
        // No enrichment node yet — pre-populate with UUID so auto-save can
        // create it on first edit. updatedAt=0 prevents a spurious save.
        Object.assign(editableEnrichment, {
          id: uuid,
          type: 'event',
          title: gcalTitle,
          eventType: 'gcal-enrichment',
          referenceNumber: clean,
          allDay: true,
          startDate: new Date().toISOString().slice(0, 10),
          notes: '',
          tags: [],
          references: [],
          owner: undefined,
          involved: [],
          priority: 'medium',
          urgency: undefined,
          updatedAt: 0,
        })
        _loadedEnrichmentId.value = uuid
      }
    },
    { immediate: true },
  )

  // ── Priority / Urgency computed refs (mirrors EntityDialog pattern) ───
  const currentPriority = computed(() => PRIORITY_OPTIONS.find((p) => p.value === editableEnrichment.priority))
  const currentUrgency = computed(() => URGENCY_OPTIONS.find((u) => u.value === editableEnrichment.urgency))

  const priorityOpen = ref(false)
  const urgencyOpen = ref(false)

  const setPriority = (v: string) => {
    editableEnrichment.priority = v
    priorityOpen.value = false
  }
  const setUrgency = (v: string) => {
    editableEnrichment.urgency = v
    urgencyOpen.value = false
  }

  // ── Auto-save ─────────────────────────────────────────────────────────
  // Active whenever the dialog has a valid enrichmentId (UUID resolved).
  // The beforeSave hook lazily creates the enrichment node on first save
  // so the user doesn't need to do anything special to trigger creation.
  const isEditMode = computed(() => !!enrichmentId.value)
  const { status: saveStatus, formatLastSaved } = useAutoSave(editableEnrichment, {
    enabled: isEditMode,
    ignoreKeys: ['updatedAt', 'createdAt'],
    beforeSave: async (item) => {
      // Lazy-create the enrichment node on first save if it doesn't exist yet
      if (!enrichment.value) {
        const uuid = await ensureEnrichment(googleEventId.value, props.event?.title ?? '')
        item.id = uuid
      }
      item.updatedAt = Date.now()
    },
  })

  // ── References ────────────────────────────────────────────────────────
  const {
    addEntityRef,
    removeRef: removeEntityRef,
    openEntityRef: handleOpenEntityRef,
    createAndOpenEntityRef,
    createEntityAndLink,
  } = useEntityReferences(editableEnrichment as any)

  const entityPickerOpen = ref(false)
  const entityPickerFilterType = ref<string | undefined>(undefined)

  const handleAddEntityRef = async (ref: EntityReference) => {
    if (!enrichment.value) {
      await ensureEnrichment(googleEventId.value, props.event?.title ?? '')
    }
    addEntityRef(ref)
  }

  const handleCreatedEntityRef = async (ref: EntityReference) => {
    if (!enrichment.value) {
      await ensureEnrichment(googleEventId.value, props.event?.title ?? '')
    }
    createAndOpenEntityRef(ref)
  }

  const handleCreateEntityOfType = async (type: string, title: string) => {
    if (!enrichment.value) {
      await ensureEnrichment(googleEventId.value, props.event?.title ?? '')
    }
    void createEntityAndLink(type, title)
  }

  const handleRemoveRef = (refId: string) => removeEntityRef(refId)

  // ── Comments / Activity ───────────────────────────────────────────────
  const currentEntityId = computed(() => enrichment.value?.id || undefined)
  const { displayActivity, addComment: persistComment, loading: commentsLoading } = useComments(currentEntityId)

  const newComment = ref('')
  const rightSidebarTab = ref<'references' | 'activity'>('references')
  const rightSidebarW = ref(360)
  const rightSidebarCollapsed = ref(false)
  const isResizingSidebar = ref(false)

  const startSidebarResize = (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    isResizingSidebar.value = true
    const startX = e.clientX
    const startW = rightSidebarW.value
    document.body.style.cursor = 'ew-resize'
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      rightSidebarW.value = Math.max(200, Math.min(480, startW - dx))
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

  const handleAddComment = async () => {
    if (!newComment.value.trim()) return
    if (!enrichment.value) {
      await ensureEnrichment(googleEventId.value, props.event?.title ?? '')
    }
    await persistComment(newComment.value.trim())
    newComment.value = ''
  }

  // ── Mini calendar state ───────────────────────────────────────────────
  const calendarViewDate = computed(() => {
    if (!props.event?.startDate) return new Date()
    const [y, m, d] = props.event.startDate.split('-').map(Number) as [number, number, number]
    return new Date(y, m - 1, d)
  })

  const miniCalYear = ref(0)
  const miniCalMonth = ref(0)

  watch(
    calendarViewDate,
    (d) => {
      miniCalYear.value = d.getFullYear()
      miniCalMonth.value = d.getMonth()
    },
    { immediate: true },
  )

  const miniCalDays = computed(() => {
    const year = miniCalYear.value
    const month = miniCalMonth.value
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrev = new Date(year, month, 0).getDate()
    const days: Array<{ date: number; month: 'prev' | 'current' | 'next'; full: string }> = []

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrev - i
      days.push({
        date: d,
        month: 'prev',
        full: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: d,
        month: 'current',
        full: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      })
    }
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: d,
        month: 'next',
        full: `${year}-${String(month + 2).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      })
    }
    return days
  })

  const isEventDay = (full: string) => {
    const { startDate, endDate } = props.event ?? {}
    if (!startDate) return false
    if (!endDate || endDate === startDate) return full === startDate
    return full >= startDate && full <= endDate
  }

  const miniCalMonthLabel = computed(() => {
    return new Date(miniCalYear.value, miniCalMonth.value, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  })

  // ── Formatted date display ────────────────────────────────────────────
  const formattedDate = computed(() => {
    if (!props.event) return ''
    const { startDate, endDate, startTime, endTime, allDay } = props.event
    if (!startDate) return ''

    const fmt = (d: string) => {
      const [y, m, day] = d.split('-').map(Number) as [number, number, number]
      return new Date(y, m - 1, day).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    }

    if (allDay) {
      if (endDate && endDate !== startDate) return `${fmt(startDate)} – ${fmt(endDate)}`
      return fmt(startDate)
    }

    const timePart = startTime ? `${startTime}${endTime ? ` – ${endTime}` : ''}` : ''
    if (endDate && endDate !== startDate)
      return `${fmt(startDate)} – ${fmt(endDate)}${timePart ? ` · ${timePart}` : ''}`
    return `${fmt(startDate)}${timePart ? ` · ${timePart}` : ''}`
  })

  const close = () => emit('update:open', false)
</script>

<template>
  <EntityDialogShell
    :open="open"
    :title="event?.title || '(No title)'"
    description=""
    mode="view"
    :entity-id="enrichmentId || undefined"
    :type-badge="{ icon: 'simple-icons:googlecalendar', label: 'Google Calendar' }"
    title-placeholder=""
    dialog-title="Google Calendar Event"
    dialog-description="View Google Calendar event details and add Trellis enrichment."
    @update:open="close"
    @close="close">
    <!-- Header badges: GCal source indicator -->
    <template #header-badges>
      <span
        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-500">
        <Icon name="lucide:lock" class="h-2.5 w-2.5" />
        Read-only from Google
      </span>
    </template>

    <!-- Properties row: Trellis-only enrichment pills -->
    <template #properties>
      <!-- Priority -->
      <UiPopover v-model:open="priorityOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors text-xs"
            :class="currentPriority?.color || 'bg-muted/50 hover:bg-muted'">
            <Icon :name="currentPriority?.icon || 'lucide:flag'" class="h-3.5 w-3.5" />
            <span>{{ currentPriority?.label || 'Priority' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-40 p-1">
          <button
            v-for="opt in PRIORITY_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="setPriority(opt.value)">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon
              v-if="editableEnrichment.priority === opt.value"
              name="lucide:check"
              class="h-3.5 w-3.5 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>

      <!-- Urgency -->
      <UiPopover v-model:open="urgencyOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors text-xs"
            :class="currentUrgency?.color || 'bg-muted/50 hover:bg-muted'">
            <Icon :name="currentUrgency?.icon || 'lucide:zap'" class="h-3.5 w-3.5" />
            <span>{{ currentUrgency?.label || 'Urgency' }}</span>
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
            <Icon
              v-if="editableEnrichment.urgency === opt.value"
              name="lucide:check"
              class="h-3.5 w-3.5 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>
    </template>

    <!-- Main content area -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <!-- Left sidebar: mini calendar + frozen GCal schedule details -->
      <aside class="w-64 shrink-0 border-r border-border overflow-y-auto flex flex-col bg-muted/10">
        <div class="p-4 space-y-4">
          <!-- Read-only mini calendar -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {{ miniCalMonthLabel }}
              </p>
            </div>
            <!-- Day-of-week headers -->
            <div class="grid grid-cols-7 gap-px">
              <span
                v-for="d in ['S', 'M', 'T', 'W', 'T', 'F', 'S']"
                :key="d"
                class="text-center text-[9px] font-medium text-muted-foreground/60 py-0.5">
                {{ d }}
              </span>
            </div>
            <!-- Day cells -->
            <div class="grid grid-cols-7 gap-px">
              <div
                v-for="(day, i) in miniCalDays"
                :key="i"
                class="aspect-square flex items-center justify-center rounded text-[10px] leading-none"
                :class="[
                  day.month !== 'current' ? 'text-muted-foreground/30' : 'text-foreground',
                  isEventDay(day.full) ? 'bg-primary text-primary-foreground font-semibold rounded-full' : '',
                ]">
                {{ day.date }}
              </div>
            </div>
          </div>

          <div class="border-t border-border/60" />

          <!-- GCal source badge -->
          <div class="flex items-center gap-2">
            <div class="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
              <Icon name="simple-icons:googlecalendar" class="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div class="min-w-0">
              <p class="text-[11px] font-medium text-foreground leading-tight">Google Calendar</p>
              <p class="text-[10px] text-muted-foreground truncate">{{ event?.googleCalendarId || 'primary' }}</p>
            </div>
          </div>

          <!-- Date / Time -->
          <div v-if="formattedDate" class="flex items-start gap-2">
            <Icon name="lucide:clock" class="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p class="text-xs text-foreground leading-relaxed">{{ formattedDate }}</p>
          </div>

          <!-- Location -->
          <div v-if="event?.location" class="flex items-start gap-2">
            <Icon name="lucide:map-pin" class="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p class="text-xs text-foreground leading-relaxed">{{ event.location }}</p>
          </div>

          <!-- GCal status (if not confirmed) -->
          <div v-if="event?.googleStatus && event.googleStatus !== 'confirmed'">
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
              {{ event.googleStatus }}
            </span>
          </div>

          <!-- Open in Google Calendar -->
          <a
            v-if="event?.htmlLink"
            :href="event.htmlLink"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-[11px] text-blue-500 hover:text-blue-400 transition-colors">
            <Icon name="lucide:external-link" class="h-3 w-3" />
            Open in Google Calendar
          </a>
        </div>
      </aside>

      <!-- Center: frozen GCal description + editable Trellis notes -->
      <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <!-- Frozen GCal description section -->
        <div v-if="event?.description" class="border-b border-border/60 bg-muted/20">
          <div class="px-6 py-4">
            <div class="flex items-center gap-2 mb-2">
              <Icon name="lucide:lock" class="h-3 w-3 text-muted-foreground/60 shrink-0" />
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">From Google Calendar</p>
            </div>
            <p class="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{{ event.description }}</p>
          </div>
        </div>

        <!-- Trellis enrichment: notes (editable) -->
        <div class="flex-1 px-0 py-0">
          <UiRichTextEditor
            v-model="editableEnrichment.notes"
            placeholder="Add notes, context, or action items for this event..."
            class="min-h-[120px] h-full flex-1" />
        </div>
      </div>

      <!-- Right sidebar: collapsed strip -->
      <div
        v-if="rightSidebarCollapsed"
        class="shrink-0 border-l border-border flex flex-col items-center py-2 w-10 bg-card/50">
        <button
          class="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Expand sidebar"
          @click="rightSidebarCollapsed = false">
          <Icon name="lucide:panel-right-open" class="h-4 w-4" />
        </button>
      </div>

      <!-- Right sidebar: References + Activity -->
      <aside
        v-else
        class="shrink-0 border-l border-border overflow-hidden flex flex-col relative transition-[width] duration-150"
        :class="isResizingSidebar ? 'select-none' : ''"
        :style="{ width: rightSidebarW + 'px' }">
        <!-- Resize handle -->
        <div
          class="absolute inset-y-0 left-0 w-1 cursor-ew-resize z-10 hover:bg-primary/20 transition-colors"
          @pointerdown="startSidebarResize($event)" />

        <!-- Tab bar -->
        <div class="flex border-b border-border shrink-0">
          <button
            class="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
            :class="
              rightSidebarTab === 'references'
                ? 'text-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="rightSidebarTab = 'references'">
            References
          </button>
          <button
            class="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
            :class="
              rightSidebarTab === 'activity'
                ? 'text-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="rightSidebarTab = 'activity'">
            Activity
            <span v-if="displayActivity.length" class="ml-1 text-[9px] bg-muted rounded-full px-1.5 py-0.5">
              {{ displayActivity.length }}
            </span>
          </button>
          <button
            class="px-2 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Collapse sidebar"
            @click="rightSidebarCollapsed = true">
            <Icon name="lucide:panel-right-close" class="h-4 w-4" />
          </button>
        </div>

        <!-- Tab content -->
        <div class="flex-1 overflow-y-auto">
          <!-- References tab -->
          <ReferencesSection
            v-if="rightSidebarTab === 'references'"
            v-model="editableEnrichment.references"
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
            @create-entity="handleCreateEntityOfType" />

          <!-- Activity tab -->
          <div v-if="rightSidebarTab === 'activity'" class="p-4 space-y-2">
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
                    added enrichment
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="py-4 text-center">
              <p class="text-xs text-muted-foreground italic">No activity yet</p>
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
      </aside>
    </div>

    <!-- Footer left: save status indicator -->
    <template #footer-left>
      <div class="flex items-center gap-2">
        <Icon name="lucide:info" class="h-3.5 w-3.5" />
        <span v-if="enrichment" class="font-mono">{{ enrichmentId }}</span>
        <span v-else class="text-muted-foreground/60">No enrichment yet · edit to create</span>
      </div>
    </template>

    <!-- Footer right: save status + close -->
    <template #footer-right>
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
            Saved {{ formatLastSaved }}
          </span>
        </Transition>
      </span>
      <UiButton variant="ghost" size="sm" @click="close">Close</UiButton>
    </template>
  </EntityDialogShell>

  <!-- Entity Reference Picker -->
  <EntityReferencePicker
    v-model:open="entityPickerOpen"
    :exclude-id="enrichmentId || undefined"
    :filter-type="entityPickerFilterType || undefined"
    @select="handleAddEntityRef"
    @created="handleCreatedEntityRef" />
</template>

<style scoped>
  .save-fade-enter-active,
  .save-fade-leave-active {
    transition: opacity 0.15s ease;
  }
  .save-fade-enter-from,
  .save-fade-leave-to {
    opacity: 0;
  }
</style>
