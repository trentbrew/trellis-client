<script setup lang="ts">
import type { ChangeEvent } from '~/components/Ui/Draggable.vue'
import type { Entity, PropertyFieldId } from '~/types/entity'
import type { ViewFieldDefinition } from '~/lib/view-field-catalog'
import EntityCard from '~/components/entity/cards/EntityCard.vue'
import { useKanbanCardExpand } from '~/composables/useKanbanCardExpand'
import { useKanbanCardOrder } from '~/composables/useKanbanCardOrder'
import { buildViewFieldCatalog, defaultVisibleKeys } from '~/lib/view-field-catalog'
import { useOntologyRegistry } from '~/composables/useOntologyRegistry'
import {
  buildEntityKanbanColumns,
  getDefaultKanbanColumnSource,
  getKanbanColumnSources,
  KANBAN_CUSTOM_ORDER_SOURCE_ID,
  type KanbanColumn,
  type KanbanColumnSource,
} from '~/lib/browse-kanban'

const props = withDefaults(
  defineProps<{
    items: Entity[]
    entityType?: string
    isSelected?: (_id: string) => boolean
    visibleFields?: string[] | null
    fieldCatalog?: ViewFieldDefinition[]
    showEmptyProperties?: boolean
  }>(),
  { isSelected: () => () => false, showEmptyProperties: false },
)

const emit = defineEmits<{
  openDetail: [item: Entity]
  toggleSelect: [id: string, event?: MouseEvent]
  fieldUpdate: [item: Entity, fieldId: PropertyFieldId, value: unknown]
  columnUpdate: [item: Entity, column: string, value: unknown]
}>()

const selectedSourceId = ref<PropertyFieldId | typeof KANBAN_CUSTOM_ORDER_SOURCE_ID | null>(null)
const columnOrder = ref<string[]>([])
const draggingColumnId = ref<string | null>(null)
const isDraggingCard = ref(false)
const columnLists = ref<Record<string, Entity[]>>({})

const sourceStorageKey = computed(() => `browse:kanban:${props.entityType ?? 'all'}:source`)
const orderStorageKey = computed(() => `browse:kanban:${props.entityType ?? 'all'}:${selectedSourceId.value ?? 'auto'}:order`)

const columnSources = computed(() => getKanbanColumnSources(props.entityType))
const selectedSource = computed<KanbanColumnSource | null>(() =>
  columnSources.value.find((source) => source.fieldId === selectedSourceId.value)
    ?? getDefaultKanbanColumnSource(props.entityType),
)
const selectedSourceLabel = computed(() => selectedSource.value?.label ?? 'Type')
const isCustomOrderMode = computed(() => selectedSourceId.value === KANBAN_CUSTOM_ORDER_SOURCE_ID)
const canDragCards = computed(() => Boolean(selectedSource.value))

const { applyOrderToColumns, persistFromLists } = useKanbanCardOrder(
  computed(() => props.entityType),
  selectedSourceId,
)

const { getBrowseConfig } = useOntologyRegistry()
const { isExpanded: isCardExpanded, toggleExpanded: toggleCardExpanded } = useKanbanCardExpand(
  computed(() => props.entityType),
)

const kanbanFieldCatalog = computed(() => {
  const type = props.entityType
  if (!type) return buildViewFieldCatalog('all')
  const cols = getBrowseConfig(type).tableColumns.map((col) => ({
    key: col.key,
    label: col.label,
    valueType: col.valueType,
    isTitle: col.isTitle,
  }))
  return buildViewFieldCatalog(type, cols)
})

const kanbanVisibleFields = computed(() =>
  defaultVisibleKeys(kanbanFieldCatalog.value, props.entityType),
)

const baseColumns = computed(() =>
  buildEntityKanbanColumns(props.items, props.entityType, selectedSourceId.value ?? undefined),
)
const columns = computed(() => {
  const byId = new Map(baseColumns.value.map((column) => [column.id, column]))
  const ordered = columnOrder.value.flatMap((id) => byId.get(id) ?? [])
  const missing = baseColumns.value.filter((column) => !columnOrder.value.includes(column.id))
  return [...ordered, ...missing]
})

function readStoredString(key: string): string | null {
  if (!import.meta.client) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStoredString(key: string, value: string) {
  if (!import.meta.client) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage quota/privacy failures; the board still works without persistence.
  }
}

function selectColumnSource(sourceId: PropertyFieldId | typeof KANBAN_CUSTOM_ORDER_SOURCE_ID) {
  selectedSourceId.value = sourceId
  writeStoredString(sourceStorageKey.value, sourceId)
}

function syncColumnSource() {
  const sources = columnSources.value
  if (!sources.length) {
    selectedSourceId.value = null
    return
  }

  const stored = readStoredString(sourceStorageKey.value)
  const fallback = getDefaultKanbanColumnSource(props.entityType)
  selectedSourceId.value = (
    sources.find((source) => source.fieldId === stored)
    ?? fallback
    ?? sources[0]
  )?.fieldId ?? null
}

function syncColumnOrder() {
  const ids = baseColumns.value.map((column) => column.id)
  if (!ids.length) {
    columnOrder.value = []
    return
  }

  const stored = readStoredString(orderStorageKey.value)
  let next: string[] = []
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) next = parsed.filter((id): id is string => ids.includes(String(id)))
    } catch {
      next = []
    }
  }

  columnOrder.value = [...next, ...ids.filter((id) => !next.includes(id))]
}

function persistColumnOrder(ids = columnOrder.value) {
  writeStoredString(orderStorageKey.value, JSON.stringify(ids))
}

function moveColumn(sourceId: string, targetId: string) {
  if (sourceId === targetId) return
  const next = [...columnOrder.value]
  const sourceIndex = next.indexOf(sourceId)
  const targetIndex = next.indexOf(targetId)
  if (sourceIndex < 0 || targetIndex < 0) return
  next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, sourceId)
  columnOrder.value = next
  persistColumnOrder(next)
}

function nudgeColumn(id: string, delta: -1 | 1) {
  const next = [...columnOrder.value]
  const index = next.indexOf(id)
  const target = index + delta
  if (index < 0 || target < 0 || target >= next.length) return
  const currentId = next[index]
  const targetId = next[target]
  if (!currentId || !targetId) return
  next[index] = targetId
  next[target] = currentId
  columnOrder.value = next
  persistColumnOrder(next)
}

function handleColumnDragStart(id: string, event: DragEvent) {
  draggingColumnId.value = id
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function handleColumnDrop(targetId: string, event: DragEvent) {
  const sourceId = draggingColumnId.value ?? event.dataTransfer?.getData('text/plain')
  draggingColumnId.value = null
  if (!sourceId) return
  moveColumn(sourceId, targetId)
}

function syncColumnListsFromComputed() {
  const grouped: Record<string, Entity[]> = {}
  for (const col of columns.value) {
    grouped[col.id] = col.items.slice()
  }
  columnLists.value = applyOrderToColumns(columns.value.map((c) => c.id), grouped)
}

function columnValueForField(columnId: string): unknown {
  if (columnId === 'none') return ''
  return columnId
}

function onCardColumnChange(destColumnId: string, event: ChangeEvent<Entity>) {
  const source = selectedSource.value
  if (!source) return

  const addedEl = event?.added?.element
  const movedEl = event?.moved?.element

  if (addedEl && !isCustomOrderMode.value) {
    emit('fieldUpdate', addedEl, source.fieldId as PropertyFieldId, columnValueForField(destColumnId))
  }

  if (addedEl || movedEl) {
    persistFromLists(columnLists.value)
  }
}

function columnListFor(col: KanbanColumn): Entity[] {
  return columnLists.value[col.id] ?? []
}

watch(columnSources, syncColumnSource, { immediate: true })
watch(
  [() => selectedSourceId.value, () => baseColumns.value.map((column) => column.id).join('|')],
  syncColumnOrder,
  { immediate: true },
)
watch(
  [columns, () => props.items],
  () => {
    if (isDraggingCard.value) return
    syncColumnListsFromComputed()
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col gap-3">
    <div v-if="columnSources.length" class="flex shrink-0 items-center justify-between gap-3">
      <div class="text-xs text-muted-foreground">
        <template v-if="isCustomOrderMode">
          Drag cards to set your custom order
        </template>
        <template v-else>
          Columns by <span class="font-medium text-foreground">{{ selectedSourceLabel }}</span>
        </template>
      </div>

      <UiDropdownMenu>
        <UiDropdownMenuTrigger as-child>
          <UiButton variant="outline" size="sm" class="h-8 gap-1.5 bg-card/0 text-xs">
            <Icon name="lucide:columns-3" class="h-3.5 w-3.5" />
            {{ selectedSourceLabel }}
            <Icon name="lucide:chevron-down" class="h-3.5 w-3.5 opacity-60" />
          </UiButton>
        </UiDropdownMenuTrigger>
        <UiDropdownMenuContent align="end" class="w-56">
          <UiDropdownMenuLabel>Column source</UiDropdownMenuLabel>
          <UiDropdownMenuSeparator />
          <UiDropdownMenuItem
            v-for="source in columnSources"
            :key="String(source.fieldId)"
            class="gap-2"
            @click="selectColumnSource(source.fieldId)">
            <Icon
              :name="selectedSourceId === source.fieldId ? 'lucide:check' : 'lucide:circle'"
              class="h-3.5 w-3.5 text-muted-foreground" />
            <span>{{ source.label }}</span>
          </UiDropdownMenuItem>
        </UiDropdownMenuContent>
      </UiDropdownMenu>
    </div>

    <div class="flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto pb-2">
      <section
        v-for="(col, index) in columns"
        :key="col.id"
        class="flex h-full max-h-full min-h-0 w-72 shrink-0 flex-col rounded-xl border-t-2"
        :class="[col.border, col.bg, draggingColumnId === col.id ? 'opacity-60' : '']">
        <div
          class="flex shrink-0 items-center justify-between gap-2 px-3 py-2.5"
          draggable="true"
          @dragstart="handleColumnDragStart(col.id, $event)"
          @dragend="draggingColumnId = null"
          @dragover.prevent
          @drop="handleColumnDrop(col.id, $event)">
          <div class="flex min-w-0 items-center gap-2">
            <button
              type="button"
              class="kanban-column-handle flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/70 hover:bg-foreground/5 hover:text-muted-foreground active:cursor-grabbing"
              aria-label="Drag to reorder column"
              @mousedown.stop>
              <Icon name="lucide:grip-vertical" class="h-3.5 w-3.5" />
            </button>
            <Icon v-if="col.icon" :name="col.icon" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span class="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {{ col.label }}
            </span>
          </div>

          <div class="flex items-center gap-1">
            <span class="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
              {{ columnListFor(col).length }}
            </span>
            <button
              type="button"
              class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground disabled:opacity-30"
              :disabled="index === 0"
              aria-label="Move column left"
              @click="nudgeColumn(col.id, -1)">
              <Icon name="lucide:chevron-left" class="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground disabled:opacity-30"
              :disabled="index === columns.length - 1"
              aria-label="Move column right"
              @click="nudgeColumn(col.id, 1)">
              <Icon name="lucide:chevron-right" class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col px-2 pb-2">
          <UiDraggable
            v-if="canDragCards && columnLists[col.id]"
            :list="columnLists[col.id]!"
            :item-key="(el: Entity) => el.id"
            :group="{ name: 'browse-kanban-cards', pull: true, put: true }"
            filter=".no-drag"
            :prevent-on-filter="true"
            :animation="150"
            :empty-insert-threshold="48"
            ghost-class="sortable-ghost"
            class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
            @start="() => (isDraggingCard = true)"
            @end="() => { isDraggingCard = false; persistFromLists(columnLists) }"
            @change="(event: ChangeEvent<Entity>) => onCardColumnChange(col.id, event)">
            <template #item="{ element: item }">
              <div class="cursor-grab active:cursor-grabbing">
                <EntityCard
                  class="min-w-0 w-full"
                  :item="item"
                  layout="list"
                  compact
                  :properties-expanded="isCardExpanded(item.id)"
                  editable
                  :selected="isSelected(item.id)"
                  :visible-fields="kanbanVisibleFields"
                  :field-catalog="kanbanFieldCatalog"
                  :show-empty-properties="showEmptyProperties"
                  @click="emit('openDetail', item)"
                  @select="(event: MouseEvent) => emit('toggleSelect', item.id, event)"
                  @field-update="(fieldId: PropertyFieldId, value: unknown) => emit('fieldUpdate', item, fieldId, value)"
                  @column-update="(column: string, value: unknown) => emit('columnUpdate', item, column, value)"
                  @toggle-properties="toggleCardExpanded(item.id)" />
              </div>
            </template>
            <template #footer>
              <div
                v-if="!columnListFor(col).length"
                class="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 px-3 py-8 text-center text-xs text-muted-foreground/70">
                Drop items here
              </div>
            </template>
          </UiDraggable>

          <template v-else>
            <EntityCard
              v-for="item in col.items"
              :key="item.id"
              :item="item"
              layout="list"
              compact
              :properties-expanded="isCardExpanded(item.id)"
              editable
              :selected="isSelected(item.id)"
              :visible-fields="kanbanVisibleFields"
              :field-catalog="kanbanFieldCatalog"
              :show-empty-properties="showEmptyProperties"
              @click="emit('openDetail', item)"
              @select="(event: MouseEvent) => emit('toggleSelect', item.id, event)"
              @field-update="(fieldId: PropertyFieldId, value: unknown) => emit('fieldUpdate', item, fieldId, value)"
              @column-update="(column: string, value: unknown) => emit('columnUpdate', item, column, value)"
              @toggle-properties="toggleCardExpanded(item.id)" />
            <div
              v-if="!col.items.length"
              class="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-border/60 px-3 text-center text-xs text-muted-foreground/70">
              No {{ col.label.toLowerCase() }} items
            </div>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>
