<script setup lang="ts">
  import type { GridView } from '~/types/grid'
  import type { ProjectionType } from '~/types/database'
  import type { Entity, EntityType } from '~/types/entity'
  import { GRID_COLS } from '~/types/grid'
  import { getProjectionsForType } from '~/config/entityRegistry'
  import GridCellInlinePicker from '~/components/grid/GridCellInlinePicker.vue'

  const props = defineProps<{
    view: GridView
    items: Entity[]
    editMode?: boolean
    /** True when this cell is the one currently being dragged */
    isDragSource?: boolean
  }>()

  const emit = defineEmits<{
    edit: [view: GridView]
    remove: [id: string]
    resize: [id: string, col: number, row: number, colSpan: number, rowSpan: number]
    'change-projection': [id: string, projection: ProjectionType]
    'update-sort': [id: string, sortField: string, sortDirection: 'asc' | 'desc']
    'update-filter': [id: string, filterText: string]
    configure: [id: string, dataSource: string, projection: ProjectionType]
    cancel: [id: string]
    'open-detail': [item: Entity]
  }>()

  // Grid placement styles — during resize, use local state for instant feedback
  const cellStyle = computed(() => {
    if (isResizing.value) {
      return {
        gridColumn: `${currentCol.value} / span ${currentColSpan.value}`,
        gridRow: `${currentRow.value} / span ${currentRowSpan.value}`,
        zIndex: 20,
      }
    }
    return {
      gridColumn: `${props.view.col} / span ${props.view.colSpan}`,
      gridRow: `${props.view.row} / span ${props.view.rowSpan}`,
    }
  })

  const isEmpty = computed(() => !props.view.dataSource)

  // ── Resize state ────────────────────────────────────────────────────
  type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

  const isResizing = ref(false)
  const resizeDir = ref<ResizeDir>('se')
  const resizeStartX = ref(0)
  const resizeStartY = ref(0)
  const resizeStartCol = ref(0)
  const resizeStartRow = ref(0)
  const resizeStartColSpan = ref(0)
  const resizeStartRowSpan = ref(0)
  const currentCol = ref(0)
  const currentRow = ref(0)
  const currentColSpan = ref(0)
  const currentRowSpan = ref(0)
  const cellEl = ref<HTMLElement | null>(null)
  // Stable per-cell dimensions computed once at resize start (avoids feedback loop)
  let stableCellW = 0
  let stableCellH = 0

  function onResizeStart(dir: ResizeDir, e: PointerEvent) {
    if (!props.editMode) return
    e.preventDefault()
    e.stopPropagation()

    // Compute stable per-cell dimensions from the grid container ONCE
    // so resizing doesn't feed back into itself.
    const gridEl = cellEl.value?.parentElement
    if (gridEl) {
      const gridRect = gridEl.getBoundingClientRect()
      const style = getComputedStyle(gridEl)
      const gapPx = parseFloat(style.columnGap) || 0
      stableCellW = (gridRect.width - gapPx * (GRID_COLS - 1)) / GRID_COLS
      stableCellH = 280 // ROW_HEIGHT constant
    } else if (cellEl.value) {
      // Fallback: use cell rect at start
      const rect = cellEl.value.getBoundingClientRect()
      stableCellW = rect.width / props.view.colSpan
      stableCellH = rect.height / props.view.rowSpan
    }

    isResizing.value = true
    resizeDir.value = dir
    resizeStartX.value = e.clientX
    resizeStartY.value = e.clientY
    resizeStartCol.value = props.view.col
    resizeStartRow.value = props.view.row
    resizeStartColSpan.value = props.view.colSpan
    resizeStartRowSpan.value = props.view.rowSpan
    currentCol.value = props.view.col
    currentRow.value = props.view.row
    currentColSpan.value = props.view.colSpan
    currentRowSpan.value = props.view.rowSpan

    document.addEventListener('pointermove', onResizeMove)
    document.addEventListener('pointerup', onResizeEnd)
  }

  function onResizeMove(e: PointerEvent) {
    if (!isResizing.value || !cellEl.value) return
    // Use stable dimensions captured at resize start (no feedback loop)
    const cellW = stableCellW || 100
    const cellH = stableCellH || 280

    const dx = Math.round((e.clientX - resizeStartX.value) / cellW)
    const dy = Math.round((e.clientY - resizeStartY.value) / cellH)

    const dir = resizeDir.value
    let newCol = resizeStartCol.value
    let newRow = resizeStartRow.value
    let newCS = resizeStartColSpan.value
    let newRS = resizeStartRowSpan.value

    // East: grow/shrink colSpan
    if (dir.includes('e')) {
      newCS = Math.max(1, resizeStartColSpan.value + dx)
    }
    // West: shift col left, grow colSpan
    if (dir.includes('w')) {
      const shift = Math.min(dx, resizeStartColSpan.value - 1)
      newCol = resizeStartCol.value + shift
      newCS = resizeStartColSpan.value - shift
    }
    // South: grow/shrink rowSpan
    if (dir === 's' || dir === 'se' || dir === 'sw') {
      newRS = Math.max(1, resizeStartRowSpan.value + dy)
    }
    // North: shift row up, grow rowSpan
    if (dir === 'n' || dir === 'ne' || dir === 'nw') {
      const shift = Math.min(dy, resizeStartRowSpan.value - 1)
      newRow = resizeStartRow.value + shift
      newRS = resizeStartRowSpan.value - shift
    }

    // Clamp bounds
    newCol = Math.max(1, newCol)
    newRow = Math.max(1, newRow)
    newCS = Math.max(1, Math.min(newCS, GRID_COLS - newCol + 1))
    newRS = Math.max(1, newRS)

    currentCol.value = newCol
    currentRow.value = newRow
    currentColSpan.value = newCS
    currentRowSpan.value = newRS
    // Don't emit on every move — local cellStyle override handles the preview.
    // We commit once on pointerup to avoid flicker from resolveCollisions.
  }

  function onResizeEnd() {
    document.removeEventListener('pointermove', onResizeMove)
    document.removeEventListener('pointerup', onResizeEnd)

    // Commit final size to the layout engine once
    const c = currentCol.value
    const r = currentRow.value
    const cs = currentColSpan.value
    const rs = currentRowSpan.value

    if (c !== props.view.col || r !== props.view.row ||
        cs !== props.view.colSpan || rs !== props.view.rowSpan) {
      emit('resize', props.view.id, c, r, cs, rs)
    }

    isResizing.value = false
    resizeDir.value = 'se'
  }

  // Projection icon mapping
  const projectionIcons: Record<string, string> = {
    table: 'lucide:table',
    list: 'lucide:list',
    'card-grid': 'lucide:grid-3x3',
    kanban: 'lucide:square-kanban',
    calendar: 'lucide:calendar',
    timeline: 'lucide:calendar-range',
    chart: 'lucide:bar-chart-2',
    graph: 'lucide:network',
    spreadsheet: 'lucide:sheet',
    dashboard: 'lucide:layout-dashboard',
    moodboard: 'lucide:image',
    'slide-deck': 'lucide:presentation',
    sankey: 'lucide:git-branch',
    'entity-detail': 'lucide:square-user',
  }

  // ── Sort / Filter state ─────────────────────────────────────────────
  const sortFilterOpen = ref(false)
  const localSortField = ref(props.view.sortField || 'title')
  const localSortDir = ref<'asc' | 'desc'>(props.view.sortDirection || 'asc')
  const localFilterText = ref((props.view.filters?.text as string) || '')

  const hasActiveSort = computed(() => localSortField.value !== 'title' || localSortDir.value !== 'asc')
  const hasActiveFilter = computed(() => !!localFilterText.value)
  const _hasSortOrFilter = computed(() => hasActiveSort.value || hasActiveFilter.value)

  const sortFieldOptions = [
    { value: 'title', label: 'Title' },
    { value: 'type', label: 'Type' },
    { value: 'startDate', label: 'Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'taskStatus', label: 'Status' },
  ]

  function applySortField(field: string) {
    localSortField.value = field
    emit('update-sort', props.view.id, field, localSortDir.value)
  }

  function toggleSortDir() {
    localSortDir.value = localSortDir.value === 'asc' ? 'desc' : 'asc'
    emit('update-sort', props.view.id, localSortField.value, localSortDir.value)
  }

  function applyFilter() {
    emit('update-filter', props.view.id, localFilterText.value)
  }

  /** Projections available for this cell's data source */
  const availableProjections = computed<ProjectionType[]>(() => {
    const ds = props.view.dataSource
    if (!ds || ds === 'all') {
      return Object.keys(projectionIcons) as ProjectionType[]
    }
    try {
      return getProjectionsForType(ds as EntityType)
    } catch {
      return Object.keys(projectionIcons) as ProjectionType[]
    }
  })
</script>

<template>
  <div
    ref="cellEl"
    class="relative group transition-[border-color,box-shadow,opacity] duration-200"
    :class="[
      'rounded-lg',
      isEmpty && editMode ? 'border-2 border-dashed border-border/60 hover:border-primary/40' : '',
      !isEmpty && !isDragSource ? 'border border-border/40 bg-card overflow-hidden flex flex-col min-h-0' : '',
      !isEmpty && isDragSource ? 'border-2 border-dashed border-primary/30 bg-primary/5 overflow-hidden flex flex-col min-h-0' : '',
      isResizing ? 'z-20 ring-2 ring-primary/30' : '',
    ]"
    :style="cellStyle"
    :data-view-id="view.id"
    :data-view-col="view.col"
    :data-view-row="view.row"
    :data-view-colspan="view.colSpan">

    <!-- ═══════ EMPTY STATE — INLINE PICKER ═══════ -->
    <GridCellInlinePicker
      v-if="isEmpty"
      @configure="(ds, proj) => emit('configure', view.id, ds, proj)"
      @cancel="emit('cancel', view.id)" />

    <!-- ═══════ OCCUPIED STATE ═══════ -->
    <template v-else>
      <!-- Resize size indicator -->
      <div
        v-if="isResizing"
        class="absolute top-2 right-2 z-30 bg-foreground text-background text-[10px] font-mono font-medium px-1.5 py-0.5 rounded shadow-sm">
        {{ currentColSpan }}×{{ currentRowSpan }}
      </div>
      <!-- Title bar -->
      <div
        data-drag-handle
        class="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-card/50 shrink-0"
        :class="editMode ? 'cursor-grab active:cursor-grabbing' : ''">
        <span class="text-xs font-medium text-muted-foreground truncate flex-1">
          {{ view.title || view.dataSource }}
        </span>

        <!-- Inline search -->
        <div class="flex items-center gap-0.5 flex-1 min-w-0">
          <div class="relative flex items-center flex-1 min-w-0 max-w-[140px]">
            <Icon name="lucide:search" class="absolute left-1.5 h-2.5 w-2.5 text-muted-foreground/40 pointer-events-none" />
            <input
              v-model="localFilterText"
              class="w-full pl-5 pr-1.5 py-0.5 rounded bg-transparent text-[11px] outline-none border border-transparent focus:border-border/40 placeholder:text-muted-foreground/30 transition-colors"
              placeholder="Filter..."
              @click.stop
              @input="applyFilter" />
          </div>
        </div>

        <!-- Projection switcher icons -->
        <div class="flex items-center gap-0.5 shrink-0">
          <button
            v-for="proj in availableProjections"
            :key="proj"
            class="p-1 rounded transition-colors"
            :class="view.projection === proj
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50'"
            :title="proj"
            @click.stop="emit('change-projection', view.id, proj)">
            <Icon :name="projectionIcons[proj] || 'lucide:layout-grid'" class="h-3 w-3" />
          </button>
        </div>

        <!-- Sort popover -->
        <UiPopover v-model:open="sortFilterOpen">
          <UiPopoverTrigger as-child>
            <button
              class="p-1 rounded transition-colors shrink-0"
              :class="hasActiveSort
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50'"
              title="Sort & Filter"
              @click.stop>
              <Icon name="lucide:arrow-up-down" class="h-3 w-3" />
            </button>
          </UiPopoverTrigger>
          <UiPopoverContent class="w-44 p-2 space-y-2" align="end" :side-offset="6" @click.stop>
            <div class="space-y-1">
              <p class="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">Sort by</p>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="opt in sortFieldOptions"
                  :key="opt.value"
                  class="px-1.5 py-0.5 rounded text-[11px] transition-colors"
                  :class="localSortField === opt.value
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50'"
                  @click="applySortField(opt.value)">
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <button
              class="flex items-center gap-1.5 w-full px-1.5 py-1 rounded text-[11px] text-muted-foreground hover:bg-muted/50 transition-colors"
              @click="toggleSortDir">
              <Icon
                :name="localSortDir === 'asc' ? 'lucide:arrow-up' : 'lucide:arrow-down'"
                class="h-3 w-3" />
              {{ localSortDir === 'asc' ? 'Ascending' : 'Descending' }}
            </button>
          </UiPopoverContent>
        </UiPopover>

        <!-- Remove button (edit mode) -->
        <button
          v-if="editMode"
          class="p-1 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          title="Remove view"
          @click.stop="emit('remove', view.id)">
          <Icon name="lucide:x" class="h-3 w-3" />
        </button>
      </div>

      <!-- Projection content area -->
      <div class="flex-1 overflow-auto min-h-0" style="container-type: inline-size;">
        <slot :view="view" :items="items" />
      </div>

      <!-- 8-directional resize handles (edit mode only) -->
      <template v-if="editMode">
        <!-- Edge handles -->
        <div class="absolute inset-x-2 top-0 h-1.5 cursor-ns-resize z-10" :class="isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'" @pointerdown="(e) => onResizeStart('n', e)" />
        <div class="absolute inset-x-2 bottom-0 h-1.5 cursor-ns-resize z-10" :class="isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'" @pointerdown="(e) => onResizeStart('s', e)" />
        <div class="absolute inset-y-2 left-0 w-1.5 cursor-ew-resize z-10" :class="isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'" @pointerdown="(e) => onResizeStart('w', e)" />
        <div class="absolute inset-y-2 right-0 w-1.5 cursor-ew-resize z-10" :class="isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'" @pointerdown="(e) => onResizeStart('e', e)" />
        <!-- Corner handles -->
        <div class="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-10" :class="isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'" @pointerdown="(e) => onResizeStart('nw', e)" />
        <div class="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-10" :class="isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'" @pointerdown="(e) => onResizeStart('ne', e)" />
        <div class="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-10" :class="isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'" @pointerdown="(e) => onResizeStart('sw', e)" />
        <div class="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-10" :class="isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'" @pointerdown="(e) => onResizeStart('se', e)" />
      </template>
    </template>
  </div>
</template>
