<script setup lang="ts">
  import CalendarView from '~/components/views/CalendarView.vue'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import GCalEnrichedDialog from '~/components/dialogs/GCalEnrichedDialog.vue'
  import type { Entity, EntityType } from '~/types/entity'
  import { createDefaultItem } from '~/types/entity'
  import { typeHasField, getTypesForClass } from '~/config/entityRegistry'

  definePageMeta({
    layout: 'default',
  })

  useHead({ title: 'Calendar' })

  // ---------------------------------------------------------------------------
  // Live data from instant-local
  // ---------------------------------------------------------------------------

  const { items, create: createItem, update: updateItem, remove: removeItem } = useEntities()

  // ---------------------------------------------------------------------------
  // Google Calendar integration
  // ---------------------------------------------------------------------------

  const {
    gcalEvents,
    isConnected: gcalConnected,
    activeConnections: gcalAccounts,
    disconnect: _gcalDisconnect,
  } = useGoogleCalendar()

  // Per-account visibility toggles — shared with CalendarSidebarPanel
  const { selectedTypes, hiddenGcalAccounts, reset: resetSidebarState } = useCalendarSidebarState()

  const showGcalEvents = computed(() =>
    gcalConnected.value && hiddenGcalAccounts.value.size < gcalAccounts.value.length,
  )

  // ── Connection success/error toast on redirect back from OAuth ──────
  const { $toast } = useNuxtApp()
  const route = useRoute()
  const router = useRouter()

  onUnmounted(() => {
    resetSidebarState()
  })

  onMounted(() => {
    if (route.query.connected === 'google-calendar') {
      $toast?.success('Google Calendar connected', {
        description: 'Your events will sync automatically.',
      })
      router.replace({ query: { ...route.query, connected: undefined } })
    }
    if (route.query.error) {
      $toast?.error('Connection failed', {
        description: String(route.query.error),
      })
      router.replace({ query: { ...route.query, error: undefined } })
    }
  })

  // Events filtered by visible accounts
  const visibleGcalEvents = computed(() => {
    if (!gcalConnected.value) return []
    if (hiddenGcalAccounts.value.size === 0) return gcalEvents.value
    const visibleEmails = new Set(
      gcalAccounts.value
        .filter((c) => !hiddenGcalAccounts.value.has(c.id))
        .map((c) => c.accountEmail)
        .filter(Boolean),
    )
    if (visibleEmails.size === 0) return []
    return gcalEvents.value.filter((e) => {
      const calId = e.googleCalendarId as string | undefined
      if (!calId || calId === 'primary') return true
      return visibleEmails.has(calId)
    })
  })

  function _gcalEventCount(connId: string) {
    const conn = gcalAccounts.value.find((c) => c.id === connId)
    return conn?.syncedEntityCount ?? 0
  }

  // ---------------------------------------------------------------------------
  // Dynamic type filters (multi-select checkboxes)
  // ---------------------------------------------------------------------------

  // selectedTypes is now managed by CalendarSidebarPanel via useCalendarSidebarState

  // Still needed locally for the #header-actions Add button dropdown
  const availableFilterTypes = computed(() => {
    const allTypes = [
      ...getTypesForClass('temporal'),
      ...getTypesForClass('document'),
      ...getTypesForClass('actor'),
      ...getTypesForClass('container'),
    ]
    return allTypes
      .filter(t => typeHasField(t.type, 'startDate') || typeHasField(t.type, 'endDate') || typeHasField(t.type, 'targetDate'))
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  // ---------------------------------------------------------------------------
  // Filtered data per selection
  // ---------------------------------------------------------------------------

  const filteredItems = computed(() => {
    if (selectedTypes.value.size === 0) return []
    return items.value.filter(i => selectedTypes.value.has(i.type))
  })

  // ---------------------------------------------------------------------------
  // Calendar data transform (for CalendarView component)
  // ---------------------------------------------------------------------------

  const calendarNodes = computed<Record<string, any>[]>(() => {
    const nodes: Record<string, any>[] = filteredItems.value.map((item) => ({
      '@id': `item:${item.id}`,
      '@type': item.type.charAt(0).toUpperCase() + item.type.slice(1),
      'trellis:title': item.title,
      'user:dueDate': item.endDate ? { start: item.startDate, end: item.endDate } : item.startDate,
      'user:recurrence': item.recurrence,
      'user:status': (item as any).taskStatus || (item as any).paymentStatus || (item as any).eventType || 'note',
      'user:priority': item.priority,
      'user:urgency': item.urgency,
    }))

    // Merge Google Calendar events (filtered by per-account visibility)
    if (showGcalEvents.value) {
      for (const node of visibleGcalEvents.value) {
        const startDate = (node.startDate as string) || ''
        const endDate = (node.endDate as string) || startDate
        if (!startDate) continue
        nodes.push({
          '@id': `gcal:${node.googleEventId || node['@id']}`,
          '@type': 'GoogleCalendar',
          'trellis:title': (node.title as string) || '(No title)',
          'user:dueDate': endDate && endDate !== startDate
            ? { start: `${startDate}T00:00:00`, end: `${endDate}T00:00:00` }
            : `${startDate}T00:00:00`,
          'user:recurrence': undefined,
          'user:status': 'google-calendar',
          'user:priority': undefined,
          'user:urgency': undefined,
        })
      }
    }

    return nodes
  })

  const calendarSchema = computed(() => ({
    id: 'calendar-schema',
    collectionId: 'all-items',
    fields: [
      { id: 'dueDate', name: 'Date', type: 'date' as const, order: 0, required: false },
      { id: 'status', name: 'Status', type: 'select' as const, order: 1, required: false },
      { id: 'priority', name: 'Priority', type: 'select' as const, order: 2, required: false },
    ],
    views: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }))

  // ---------------------------------------------------------------------------
  // Dialog state
  // ---------------------------------------------------------------------------

  const viewDialogOpen = ref(false)
  const _viewingItemId = ref<string | null>(null)
  const _pendingNewItem = ref<Entity | null>(null)

  // ── GCal event dialog ────────────────────────────────────────────────
  const gcalDialogOpen = ref(false)
  const gcalViewingEvent = ref<Record<string, any> | null>(null)
  const viewingItem = computed<Entity | null>(() => {
    if (!_viewingItemId.value) return null
    return items.value.find((i) => i.id === _viewingItemId.value)
      ?? _pendingNewItem.value
      ?? null
  })

  const taskOwners = [
    { id: 'you', name: 'You' },
    { id: 'alex', name: 'Alex' },
    { id: 'maya', name: 'Maya' },
    { id: 'jordan', name: 'Jordan' },
  ]
  const taskFolders = ['Work', 'Personal', 'Health', 'Finance', 'Projects']

  async function openCreate(type?: EntityType, startDate?: Date) {
    const itemType = type || [...selectedTypes.value][0] || 'task'
    const defaults = createDefaultItem(itemType)
    if (startDate) (defaults as any).startDate = startDate.toISOString().slice(0, 10)
    const newId = await createItem({ ...defaults, type: itemType, title: '' } as Entity)
    _pendingNewItem.value = { ...defaults, id: newId } as Entity
    _viewingItemId.value = newId
    viewDialogOpen.value = true
  }

  function handleCellClick(date: Date) {
    openCreate(undefined, date)
  }

  function handleCreateRequest(date: Date, typeLabel: string) {
    const typeLower = typeLabel.toLowerCase() as EntityType
    openCreate(typeLower, date)
  }

  function openDetail(item: Entity) {
    _viewingItemId.value = item.id
    viewDialogOpen.value = true
  }

  function handleEntityClick(calEvent: { id: string }) {
    // GCal events have IDs prefixed with "gcal:"
    if (calEvent.id.startsWith('gcal:')) {
      const googleEventId = calEvent.id
        .replace(/^gcal:/, '')
        .replace(/-repeat-\d+$/, '')
        .replace(/-\d+-\d+$/, '')
      const gcalEvent = gcalEvents.value.find((e) => e.googleEventId === googleEventId)
      if (gcalEvent) {
        gcalViewingEvent.value = gcalEvent
        gcalDialogOpen.value = true
      }
      return
    }
    // CalendarView formats IDs as "item:{uuid}-{nodeIndex}-{valueIndex}".
    // Repeated instances append "-repeat-{n}".
    // Strip the prefix and trailing index suffixes to get the original UUID
    const rawId = calEvent.id
      .replace(/^item:/, '')
      .replace(/-repeat-\d+$/, '')
      .replace(/-\d+-\d+$/, '')
    const item = items.value.find((i) => i.id === rawId)
    if (item) openDetail(item)
  }

  // Navigation within dialog
  const viewingIndex = computed(() =>
    viewingItem.value ? filteredItems.value.findIndex((i) => i.id === viewingItem.value?.id) : -1,
  )
  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < filteredItems.value.length - 1)
  function navPrev() {
    if (canPrev.value) _viewingItemId.value = (filteredItems.value[viewingIndex.value - 1] as Entity).id
  }
  function navNext() {
    if (canNext.value) _viewingItemId.value = (filteredItems.value[viewingIndex.value + 1] as Entity).id
  }

  async function handleUpdate(item: Entity) {
    await updateItem(item)
    viewDialogOpen.value = false
  }

  async function handleDelete(item: Entity) {
    await removeItem(item.id)
    viewDialogOpen.value = false
  }

  function handleEventReschedule(eventId: string, newDate: Date) {
    // CalendarView formats IDs as "item:{uuid}-{nodeIndex}-{valueIndex}".
    // Repeated instances append "-repeat-{n}".
    const rawId = eventId
      .replace(/^item:/, '')
      .replace(/-repeat-\d+$/, '')
      .replace(/-\d+-\d+$/, '')
    const item = items.value.find((i) => i.id === rawId)
    if (!item) return
    const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`
    updateItem({ ...item, startDate: dateStr } as Entity)
  }
</script>

<template>
  <Page variant="calendar" seo-title="Calendar">
    <CalendarView
      collection-id="all-items"
      :nodes="calendarNodes"
      :schema="calendarSchema"
      :hide-sidebar="true"
      fullscreen
      @task-click="handleEntityClick"
      @cell-click="handleCellClick"
      @create-request="handleCreateRequest"
      @event-reschedule="handleEventReschedule">
      <!-- Create button in the calendar header (with type dropdown) -->
      <template #header-actions>
        <UiPopover>
          <UiPopoverTrigger as-child>
            <UiButton size="sm" class="gap-1.5 h-8">
              <Icon name="lucide:plus" class="h-3.5 w-3.5" />
              Add
            </UiButton>
          </UiPopoverTrigger>
          <UiPopoverContent align="end" class="w-44 p-1 max-h-80 overflow-y-auto">
            <button
              v-for="tc in availableFilterTypes"
              :key="tc.type"
              class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted/50 transition-colors"
              @click="openCreate(tc.type)">
              <Icon :name="tc.icon" :class="['h-3.5 w-3.5', `text-${tc.color}-500`]" />
              <span>{{ tc.label }}</span>
            </button>
          </UiPopoverContent>
        </UiPopover>
      </template>
    </CalendarView>

    <!-- View/Edit Dialog -->
    <EntityDialog
      v-model:open="viewDialogOpen"
      mode="edit"
      :item="viewingItem"
      :can-navigate-prev="canPrev"
      :can-navigate-next="canNext"
      :owners="taskOwners"
      :folders="taskFolders"
      @navigate-prev="navPrev"
      @navigate-next="navNext"
      @save="handleUpdate"
      @delete="handleDelete"
      @close="viewDialogOpen = false" />

    <!-- Google Calendar Event Dialog (enriched) -->
    <GCalEnrichedDialog
      v-model:open="gcalDialogOpen"
      :event="gcalViewingEvent" />

  </Page>
</template>
