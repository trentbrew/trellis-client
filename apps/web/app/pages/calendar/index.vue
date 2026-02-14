<script setup lang="ts">
  import CalendarView from '~/components/views/CalendarView.vue'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
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
  // Dynamic type filters (multi-select checkboxes)
  // ---------------------------------------------------------------------------

  // All entity types that have date-related property fields in their schema
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

  const selectedTypes = ref(new Set<EntityType>())

  // Initialize with all date-bearing types selected
  watch(availableFilterTypes, (types) => {
    if (selectedTypes.value.size === 0 && types.length > 0) {
      selectedTypes.value = new Set(types.map(t => t.type))
    }
  }, { immediate: true })

  function toggleType(type: EntityType) {
    const next = new Set(selectedTypes.value)
    if (next.has(type)) next.delete(type)
    else next.add(type)
    selectedTypes.value = next
  }

  const allSelected = computed(() =>
    availableFilterTypes.value.length > 0
    && selectedTypes.value.size === availableFilterTypes.value.length,
  )

  function toggleAll() {
    if (allSelected.value) {
      selectedTypes.value = new Set()
    } else {
      selectedTypes.value = new Set(availableFilterTypes.value.map(t => t.type))
    }
  }

  const typeCount = (type: EntityType) => items.value.filter(i => i.type === type).length

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

  const calendarData = computed(() => {
    const nodes = filteredItems.value.map((item) => ({
      '@id': `item:${item.id}`,
      '@type': item.type.charAt(0).toUpperCase() + item.type.slice(1),
      'trellis:title': item.title,
      'user:dueDate': item.endDate ? { start: item.startDate, end: item.endDate } : item.startDate,
      'user:status': (item as any).taskStatus || (item as any).paymentStatus || (item as any).eventType || 'note',
      'user:priority': item.priority,
      'user:urgency': item.urgency,
    }))
    return JSON.stringify({ '@graph': nodes })
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
    // CalendarView formats IDs as "item:{uuid}-{nodeIndex}-{valueIndex}"
    // Strip the prefix and trailing index suffixes to get the original UUID
    const rawId = calEvent.id.replace(/^item:/, '').replace(/-\d+-\d+$/, '')
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
    // CalendarView formats IDs as "item:{uuid}-{nodeIndex}-{valueIndex}"
    const rawId = eventId.replace(/^item:/, '').replace(/-\d+-\d+$/, '')
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
      :model-value="calendarData"
      :schema="calendarSchema"
      fullscreen
      @task-click="handleEntityClick"
      @cell-click="handleCellClick"
      @create-request="handleCreateRequest"
      @event-reschedule="handleEventReschedule">
      <!-- Type filter checkboxes under the mini calendar -->
      <template #sidebar-filters>
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filter</h4>
          <button
            type="button"
            class="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            @click="toggleAll">
            {{ allSelected ? 'None' : 'All' }}
          </button>
        </div>
        <div class="flex flex-col gap-0.5">
          <label
            v-for="tc in availableFilterTypes"
            :key="tc.type"
            class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            :class="[
              selectedTypes.has(tc.type)
                ? 'text-foreground hover:bg-muted/50'
                : 'text-muted-foreground/50 hover:bg-muted/30 hover:text-muted-foreground',
            ]">
            <span
              class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors"
              :class="[
                selectedTypes.has(tc.type)
                  ? `bg-${tc.color}-500 border-${tc.color}-500`
                  : 'border-muted-foreground/30',
              ]"
              @click.prevent="toggleType(tc.type)">
              <Icon v-if="selectedTypes.has(tc.type)" name="lucide:check" class="h-2.5 w-2.5 text-white" />
            </span>
            <Icon :name="tc.icon" :class="['h-3.5 w-3.5 shrink-0', `text-${tc.color}-500`]" />
            <span class="flex-1" @click.prevent="toggleType(tc.type)">{{ tc.labelPlural }}</span>
            <span class="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full min-w-[20px] text-center bg-muted text-muted-foreground">
              {{ typeCount(tc.type) }}
            </span>
          </label>
        </div>
      </template>

      <!-- Create button in the calendar header -->
      <template #header-actions>
        <UiButton size="sm" class="gap-1.5 h-8" @click="openCreate()">
          <Icon name="lucide:plus" class="h-3.5 w-3.5" />
          Add
        </UiButton>
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

  </Page>
</template>
