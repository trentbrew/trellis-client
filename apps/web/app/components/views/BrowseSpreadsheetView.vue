<script setup lang="ts">
  import type { Entity, EntityType } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import { resolvePropertyKey } from '~/lib/fieldEditorConfig'
  import { useVirtualRows } from '~/composables/useVirtualRows'
  import { useColumnWidths } from '~/composables/useColumnWidths'
  import ColumnResizeHandle from '~/components/data/DataGrid/ColumnResizeHandle.vue'
  import EntityFieldEditor from '~/components/entity/EntityFieldEditor.vue'
  import BrowseSpreadsheetDateCell from '~/components/views/BrowseSpreadsheetDateCell.vue'
  import { extractYmd } from '~/utils/date'

  const ROW_HEIGHT = 42
  const HEADER_HEIGHT = 36
  const OVERSCAN = 10
  const CHECK_WIDTH = 36
  const INDEX_WIDTH = 40
  const ACTION_WIDTH = 36
  const DEFAULT_COL_WIDTH = 160
  const COL_MIN = 80
  const COL_MAX = 480

  const COLUMNS = [
    { key: 'title', label: 'Title', defaultWidth: 280, editable: true },
    { key: 'type', label: 'Type', defaultWidth: 120, editable: false },
    { key: 'status', label: 'Status', defaultWidth: 120, editable: true },
    { key: 'date', label: 'Date', defaultWidth: 148, editable: true },
  ] as const

  type ColumnKey = (typeof COLUMNS)[number]['key']

  const EDITABLE_COLUMNS: ColumnKey[] = ['title', 'status', 'date']

  /** Opaque header surface — blocks scroll bleed-through. */
  const HEADER_SURFACE = 'bg-card'
  /** Row + sticky rails share one surface so rails don't look lighter/darker. */
  const SURFACE = 'bg-card/50'
  const rowBg = (selected: boolean) => (selected ? 'bg-muted' : `${SURFACE} hover:bg-muted/40`)
  const stickyBg = (selected: boolean) => (selected ? 'bg-muted' : `${SURFACE} group-hover:bg-muted/40`)

  const props = defineProps<{
    items: Entity[]
    isSelected: (id: string) => boolean
    storageKey?: string
  }>()

  const emit = defineEmits<{
    'toggle-select': [id: string, event?: MouseEvent]
    'toggle-select-all': []
    'open-detail': [item: Entity]
    'cell-update': [item: Entity, column: ColumnKey, value: unknown]
  }>()

  const { widths, setColumnWidth, resetColumnWidth } = useColumnWidths(
    props.storageKey ?? 'browse:spreadsheet:columns',
    { min: COL_MIN, max: COL_MAX },
  )

  const colWidth = (key: string) =>
    widths.value[key] ?? COLUMNS.find((c) => c.key === key)?.defaultWidth ?? DEFAULT_COL_WIDTH

  const gridTemplate = computed(() => {
    const cols = COLUMNS.map((c) => `${colWidth(c.key)}px`).join(' ')
    return `${CHECK_WIDTH}px ${INDEX_WIDTH}px ${cols} ${ACTION_WIDTH}px`
  })

  const tableWidth = computed(
    () =>
      CHECK_WIDTH +
      INDEX_WIDTH +
      ACTION_WIDTH +
      COLUMNS.reduce((sum, c) => sum + colWidth(c.key), 0),
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

  const getStatusValue = (item: Entity) => {
    const key = resolvePropertyKey('status', item.type as EntityType)
    return (item as any)[key] ?? (item as any).status ?? ''
  }

  const getDateValue = (item: Entity) => extractYmd((item as any).startDate)

  const cellValue = (item: Entity, key: ColumnKey) => {
    if (key === 'title') return item.title || 'Untitled'
    if (key === 'type') return getEntityTypeConfig(item.type as EntityType)?.label ?? item.type
    if (key === 'status') return getStatusValue(item) || '—'
    const d = getDateValue(item)
    if (!d) return '—'
    return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getCellRawValue = (item: Entity, key: ColumnKey): unknown => {
    if (key === 'title') return item.title ?? ''
    if (key === 'status') return getStatusValue(item)
    if (key === 'date') return getDateValue(item)
    return ''
  }

  // --- Inline title editing + keyboard grid navigation ---

  const editing = ref<{ itemId: string; key: ColumnKey } | null>(null)
  const draft = ref('')
  const editInput = ref<HTMLInputElement | null>(null)

  const isEditing = (item: Entity, key: ColumnKey) =>
    editing.value?.itemId === item.id && editing.value.key === key

  const clearEdit = () => {
    editing.value = null
    draft.value = ''
  }

  const beginEdit = (item: Entity, key: ColumnKey) => {
    if (!EDITABLE_COLUMNS.includes(key)) return
    if (key === 'status' || key === 'date') return
    editing.value = { itemId: item.id, key }
    draft.value = String(getCellRawValue(item, key) ?? '')
    nextTick(() => {
      editInput.value?.focus()
      editInput.value?.select()
    })
  }

  const commitEdit = (item: Entity, key: ColumnKey): boolean => {
    if (!isEditing(item, key)) return true
    emit('cell-update', item, key, draft.value)
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

  const focusNext = (item: Entity, key: ColumnKey, direction: 'down' | 'next' | 'prev') => {
    const pos = props.items.findIndex((row) => row.id === item.id)
    if (pos < 0) return

    if (direction === 'down') {
      const nextItem = props.items[pos + 1]
      if (!nextItem) return
      beginEdit(nextItem, key)
      scrollRowIntoView(pos + 1)
      return
    }

    const ci = EDITABLE_COLUMNS.indexOf(key)
    if (ci < 0) return
    const nextKey = EDITABLE_COLUMNS[direction === 'next' ? ci + 1 : ci - 1]
    if (!nextKey || nextKey === 'status' || nextKey === 'date') return
    beginEdit(item, nextKey)
  }

  const onEditKeydown = (event: KeyboardEvent, item: Entity, key: ColumnKey) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (commitEdit(item, key)) focusNext(item, key, 'down')
    } else if (event.key === 'Tab') {
      event.preventDefault()
      if (commitEdit(item, key)) focusNext(item, key, event.shiftKey ? 'prev' : 'next')
    } else if (event.key === 'Escape') {
      event.preventDefault()
      clearEdit()
    }
  }

  const onFieldEditorUpdate = (item: Entity, key: ColumnKey, value: unknown) => {
    emit('cell-update', item, key, value)
  }

  const onDateUpdate = (
    item: Entity,
    patch: { startDate: string; startTime?: string; allDay?: boolean },
  ) => {
    emit('cell-update', item, 'date', patch)
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
            v-for="column in COLUMNS"
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
              v-for="column in COLUMNS"
              :key="column.key"
              class="relative flex min-w-0 items-center overflow-hidden border-r border-border/40"
              :class="column.key === 'title' ? 'gap-2 px-2' : 'px-1 text-xs'"
              @click.stop>
              <!-- Title: inline text -->
              <template v-if="column.key === 'title'">
                <Icon
                  :name="getEntityTypeConfig(item.type as EntityType)?.icon ?? 'lucide:file'"
                  class="h-4 w-4 shrink-0 text-muted-foreground" />
                <template v-if="isEditing(item, 'title')">
                  <input
                    :ref="(el) => (editInput = el as HTMLInputElement | null)"
                    v-model="draft"
                    type="text"
                    class="h-full min-w-0 flex-1 bg-background text-sm outline-none ring-1 ring-inset ring-primary"
                    @keydown="(e) => onEditKeydown(e, item, 'title')"
                    @blur="commitEdit(item, 'title')" />
                </template>
                <button
                  v-else
                  type="button"
                  class="flex min-w-0 flex-1 items-center gap-2 text-left"
                  @click="beginEdit(item, 'title')">
                  <span class="truncate font-medium" :class="!item.title ? 'text-muted-foreground/50' : ''">
                    {{ cellValue(item, 'title') }}
                  </span>
                  <Icon
                    v-if="(item as any).pinned"
                    name="lucide:pin"
                    class="ml-auto h-3 w-3 shrink-0 text-amber-500" />
                </button>
              </template>

              <!-- Type: read-only -->
              <span v-else-if="column.key === 'type'" class="truncate px-1 text-muted-foreground">
                {{ cellValue(item, 'type') }}
              </span>

              <!-- Status: field editor -->
              <EntityFieldEditor
                v-else-if="column.key === 'status'"
                field-id="status"
                display="badge"
                compact
                :entity-type="item.type as EntityType"
                :model-value="getStatusValue(item)"
                class="w-full min-w-0"
                @update:model-value="(v) => onFieldEditorUpdate(item, 'status', v)" />

              <BrowseSpreadsheetDateCell
                v-else-if="column.key === 'date'"
                :item="item"
                @update="(patch) => onDateUpdate(item, patch)" />
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
