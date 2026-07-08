<script setup lang="ts">
  import type { Entity, EntityType, PropertyFieldId } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import { schemaFieldToPropertyFieldId, TABLE_SKIP_FIELD_NAMES } from '~/lib/ontology-sidebar-fields'
  import { formatFieldValue } from '~/utils/fieldFormatters'
  import { useVirtualRows } from '~/composables/useVirtualRows'
  import { useColumnWidths } from '~/composables/useColumnWidths'
  import { useOntologyRegistry } from '~/composables/useOntologyRegistry'
  import ColumnResizeHandle from '~/components/data/DataGrid/ColumnResizeHandle.vue'
  import EntityFieldEditor from '~/components/entity/EntityFieldEditor.vue'
  import BrowseSpreadsheetDateCell from '~/components/views/BrowseSpreadsheetDateCell.vue'

  const ROW_HEIGHT = 42
  const HEADER_HEIGHT = 36
  const OVERSCAN = 10
  const CHECK_WIDTH = 36
  const INDEX_WIDTH = 40
  const ACTION_WIDTH = 36
  const DEFAULT_COL_WIDTH = 160
  const COL_MIN = 80
  const COL_MAX = 480

  const SKIP_TABLE_FIELDS = TABLE_SKIP_FIELD_NAMES

  interface SpreadsheetColumn {
    key: string
    label: string
    defaultWidth: number
    editable: boolean
    valueType: string
    isTitle: boolean
  }

  const FALLBACK_COLUMNS: SpreadsheetColumn[] = [
    { key: 'title', label: 'Title', defaultWidth: 280, editable: true, valueType: 'title', isTitle: true },
    { key: 'type', label: 'Type', defaultWidth: 120, editable: false, valueType: 'select', isTitle: false },
    { key: 'category', label: 'Category', defaultWidth: 120, editable: true, valueType: 'select', isTitle: false },
    { key: 'startDate', label: 'Date', defaultWidth: 148, editable: true, valueType: 'date', isTitle: false },
  ]

  /** Opaque header surface — blocks scroll bleed-through. */
  const HEADER_SURFACE = 'bg-card'
  /** Row + sticky rails share one surface so rails don't look lighter/darker. */
  const SURFACE = 'bg-card/50'
  const rowBg = (selected: boolean) => (selected ? 'bg-muted' : `${SURFACE} hover:bg-muted/40`)
  const stickyBg = (selected: boolean) => (selected ? 'bg-muted' : `${SURFACE} group-hover:bg-muted/40`)

  const props = defineProps<{
    items: Entity[]
    isSelected: (_id: string) => boolean
    storageKey?: string
    /** Single entity type slug — drives ontology-backed columns. Omit for "all" browse. */
    entityType?: string
  }>()

  const emit = defineEmits<{
    'toggle-select': [id: string, event?: MouseEvent]
    'toggle-select-all': []
    'open-detail': [item: Entity]
    'cell-update': [item: Entity, column: string, value: unknown]
  }>()

  const { getBrowseConfig, serverTypes } = useOntologyRegistry()

  const columns = computed<SpreadsheetColumn[]>(() => {
    if (!props.entityType || props.entityType === 'all') return FALLBACK_COLUMNS

    // Recompute when server ontologies finish loading
    void serverTypes.value.length

    const tableCols = getBrowseConfig(props.entityType).tableColumns.filter(
      (col) => !SKIP_TABLE_FIELDS.has(col.key),
    )
    if (!tableCols.length) return FALLBACK_COLUMNS

    return tableCols.map((col) => ({
      key: col.key,
      label: col.label,
      valueType: col.valueType,
      isTitle: col.isTitle,
      defaultWidth: col.isTitle
        ? 280
        : col.key === 'startDate' || col.valueType === 'date'
          ? 148
          : col.valueType === 'number'
            ? 100
            : 140,
      editable:
        col.isTitle ||
        !!schemaFieldToPropertyFieldId(col.key) ||
        ['date', 'email', 'url', 'phone_number', 'number', 'checkbox'].includes(col.valueType),
    }))
  })

  const editableColumnKeys = computed(() =>
    columns.value.filter((col) => col.editable && col.key !== 'startDate').map((col) => col.key),
  )

  const { widths, setColumnWidth, resetColumnWidth } = useColumnWidths(
    props.storageKey ?? 'browse:spreadsheet:columns',
    { min: COL_MIN, max: COL_MAX },
  )

  const colWidth = (key: string) =>
    widths.value[key] ?? columns.value.find((c) => c.key === key)?.defaultWidth ?? DEFAULT_COL_WIDTH

  const gridTemplate = computed(() => {
    const cols = columns.value.map((c) => `${colWidth(c.key)}px`).join(' ')
    return `${CHECK_WIDTH}px ${INDEX_WIDTH}px ${cols} ${ACTION_WIDTH}px`
  })

  const tableWidth = computed(
    () =>
      CHECK_WIDTH +
      INDEX_WIDTH +
      ACTION_WIDTH +
      columns.value.reduce((sum, c) => sum + colWidth(c.key), 0),
  )

  const rowCount = computed(() => props.items.length)
  const { scrollerRef, measure, range } = useVirtualRows(rowCount, { rowHeight: ROW_HEIGHT, overscan: OVERSCAN })

  const visibleRows = computed(() => {
    const { start, end } = range.value
    return props.items.slice(start, end).map((item, i) => ({
      item,
      pos: start + i,
      top: (start + i) * ROW_HEIGHT,
    }))
  })

  const allSelected = computed(
    () => props.items.length > 0 && props.items.every((item) => props.isSelected(item.id)),
  )

  function propertyFieldId(columnKey: string): PropertyFieldId | null {
    return schemaFieldToPropertyFieldId(columnKey)
  }

  function cellDisplay(item: Entity, column: SpreadsheetColumn): string {
    if (column.key === 'type') {
      return getEntityTypeConfig(item.type as EntityType)?.label ?? item.type
    }
    const raw = (item as unknown as Record<string, unknown>)[column.key]
    const formatted = formatFieldValue(raw, column.valueType)
    return formatted || '—'
  }

  function cellRawValue(item: Entity, column: SpreadsheetColumn): unknown {
    if (column.key === 'type') return item.type
    return (item as unknown as Record<string, unknown>)[column.key]
  }

  // --- Inline title editing + keyboard grid navigation ---

  const editing = ref<{ itemId: string; key: string } | null>(null)
  const draft = ref('')
  const editInput = ref<HTMLInputElement | null>(null)

  const isEditing = (item: Entity, key: string) =>
    editing.value?.itemId === item.id && editing.value.key === key

  const clearEdit = () => {
    editing.value = null
    draft.value = ''
  }

  const beginEdit = (item: Entity, column: SpreadsheetColumn) => {
    if (!column.editable || column.key !== 'title') return
    editing.value = { itemId: item.id, key: column.key }
    draft.value = String(cellRawValue(item, column) ?? '')
    nextTick(() => {
      editInput.value?.focus()
      editInput.value?.select()
    })
  }

  const commitEdit = (item: Entity, column: SpreadsheetColumn): boolean => {
    if (!isEditing(item, column.key)) return true
    emit('cell-update', item, column.key, draft.value)
    clearEdit()
    return true
  }

  const scrollRowIntoView = (pos: number) => {
    const el = scrollerRef.value
    if (!el) return
    const y = HEADER_HEIGHT + pos * ROW_HEIGHT
    if (y < el.scrollTop + HEADER_HEIGHT) el.scrollTop = y - HEADER_HEIGHT
    if (y + ROW_HEIGHT > el.scrollTop + el.clientHeight) {
      el.scrollTop = y - el.clientHeight + ROW_HEIGHT
    }
    measure()
  }

  const focusNext = (item: Entity, key: string, direction: 'down' | 'next' | 'prev') => {
    const pos = props.items.findIndex((row) => row.id === item.id)
    if (pos < 0) return

    if (direction === 'down') {
      const nextItem = props.items[pos + 1]
      if (!nextItem) return
      const titleCol = columns.value.find((c) => c.isTitle)
      if (titleCol) beginEdit(nextItem, titleCol)
      scrollRowIntoView(pos + 1)
      return
    }

    const editable = editableColumnKeys.value
    const ci = editable.indexOf(key)
    if (ci < 0) return
    const nextKey = editable[direction === 'next' ? ci + 1 : ci - 1]
    if (!nextKey) return
    const nextCol = columns.value.find((c) => c.key === nextKey)
    if (nextCol) beginEdit(item, nextCol)
  }

  const onEditKeydown = (event: KeyboardEvent, item: Entity, column: SpreadsheetColumn) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (commitEdit(item, column)) focusNext(item, column.key, 'down')
    } else if (event.key === 'Tab') {
      event.preventDefault()
      if (commitEdit(item, column)) focusNext(item, column.key, event.shiftKey ? 'prev' : 'next')
    } else if (event.key === 'Escape') {
      event.preventDefault()
      clearEdit()
    }
  }

  const onFieldEditorUpdate = (item: Entity, columnKey: string, value: unknown) => {
    emit('cell-update', item, columnKey, value)
  }

  const onDateUpdate = (
    item: Entity,
    patch: { startDate: string; startTime?: string; allDay?: boolean },
  ) => {
    emit('cell-update', item, 'startDate', patch)
  }
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col overflow-hidden bg-transparent">
    <div ref="scrollerRef" class="relative flex-1 overflow-auto" @scroll="measure">
      <div class="min-w-full" :style="{ width: tableWidth + 'px' }">
        <!-- Header -->
        <div
          class="sticky top-0 z-30 grid border-b border-border text-xs font-medium text-muted-foreground"
          :class="HEADER_SURFACE"
          :style="{ gridTemplateColumns: gridTemplate, height: HEADER_HEIGHT + 'px' }">
          <div class="sticky left-0 z-10 flex items-center justify-center" :class="HEADER_SURFACE">
            <UiCheckbox :model-value="allSelected" @update:model-value="emit('toggle-select-all')" />
          </div>
          <div
            class="sticky z-10 flex items-center justify-center"
            :class="HEADER_SURFACE"
            :style="{ left: CHECK_WIDTH + 'px' }">
            #
          </div>
          <div
            v-for="column in columns"
            :key="column.key"
            class="relative flex items-center overflow-hidden border-r border-border/40 px-2">
            <span class="truncate">{{ column.label }}</span>
            <ColumnResizeHandle
              :width="colWidth(column.key)"
              @resize="(w) => setColumnWidth(column.key, w)"
              @reset="resetColumnWidth(column.key)" />
          </div>
          <div class="sticky right-0 z-10 shadow-[-4px_0_8px_-6px_rgba(0,0,0,0.3)]" :class="HEADER_SURFACE" />
        </div>

        <!-- Empty -->
        <div v-if="!items.length" class="p-12 text-center">
          <Icon name="lucide:table" class="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
          <p class="mt-3 text-sm font-medium">Nothing here yet</p>
        </div>

        <!-- Virtualized rows -->
        <div v-else class="relative" :style="{ height: items.length * ROW_HEIGHT + 'px' }">
          <div
            v-for="{ item, pos, top } in visibleRows"
            :key="item.id"
            class="group absolute left-0 grid w-full border-b border-border/60 text-sm"
            :class="rowBg(isSelected(item.id))"
            :style="{ top: top + 'px', height: ROW_HEIGHT + 'px', gridTemplateColumns: gridTemplate }">
            <div
              class="sticky left-0 z-10 flex items-center justify-center"
              :class="stickyBg(isSelected(item.id))">
              <UiCheckbox
                :model-value="isSelected(item.id)"
                @click="(e: MouseEvent) => emit('toggle-select', item.id, e)" />
            </div>
            <div
              class="sticky z-10 flex items-center justify-center text-xs text-muted-foreground tabular-nums"
              :class="stickyBg(isSelected(item.id))"
              :style="{ left: CHECK_WIDTH + 'px' }">
              {{ pos + 1 }}
            </div>

            <div
              v-for="column in columns"
              :key="column.key"
              class="relative flex min-w-0 items-center overflow-hidden border-r border-border/40"
              :class="column.isTitle ? 'gap-2 px-2' : 'px-1 text-xs'"
              @click.stop>
              <!-- Title -->
              <template v-if="column.isTitle">
                <Icon
                  :name="getEntityTypeConfig(item.type as EntityType)?.icon ?? 'lucide:file'"
                  class="h-4 w-4 shrink-0 text-muted-foreground" />
                <template v-if="isEditing(item, column.key)">
                  <input
                    :ref="(el) => (editInput = el as HTMLInputElement | null)"
                    v-model="draft"
                    type="text"
                    class="h-full min-w-0 flex-1 bg-background text-sm outline-none ring-1 ring-inset ring-primary"
                    @keydown="(e) => onEditKeydown(e, item, column)"
                    @blur="commitEdit(item, column)" />
                </template>
                <button
                  v-else
                  type="button"
                  class="flex min-w-0 flex-1 items-center gap-2 text-left"
                  @click="beginEdit(item, column)">
                  <span class="truncate font-medium" :class="!item.title ? 'text-muted-foreground/50' : ''">
                    {{ cellDisplay(item, column) }}
                  </span>
                  <Icon
                    v-if="(item as any).pinned"
                    name="lucide:pin"
                    class="ml-auto h-3 w-3 shrink-0 text-amber-500" />
                </button>
              </template>

              <!-- All-types fallback: type label -->
              <span v-else-if="column.key === 'type'" class="truncate px-1 text-muted-foreground">
                {{ cellDisplay(item, column) }}
              </span>

              <!-- Schedule date -->
              <BrowseSpreadsheetDateCell
                v-else-if="column.key === 'startDate'"
                :item="item"
                @update="(patch) => onDateUpdate(item, patch)" />

              <!-- Registry-backed property editors -->
              <EntityFieldEditor
                v-else-if="propertyFieldId(column.key)"
                :field-id="propertyFieldId(column.key)!"
                display="badge"
                compact
                :entity-type="item.type as EntityType"
                :model-value="(item as any)[column.key]"
                class="w-full min-w-0"
                @update:model-value="(v) => onFieldEditorUpdate(item, column.key, v)" />

              <!-- Plain formatted values -->
              <span v-else class="truncate px-1 text-muted-foreground">
                {{ cellDisplay(item, column) }}
              </span>
            </div>

            <!-- Open detail -->
            <div
              class="sticky right-0 z-10 flex items-center justify-center shadow-[-4px_0_8px_-6px_rgba(0,0,0,0.3)]"
              :class="stickyBg(isSelected(item.id))">
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                title="Open detail"
                @click.stop="emit('open-detail', item)">
                <Icon name="lucide:panel-right" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
