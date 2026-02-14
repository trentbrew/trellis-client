<script setup lang="ts">
  import type { GridView, GridGap, GridPreset } from '~/types/grid'
  import type { ProjectionType } from '~/types/database'
  import type { Entity } from '~/types/entity'
  import { GRID_COLS, GRID_GAP_PX } from '~/types/grid'
  import { useGridDraggable } from '~/composables/useGridDraggable'
  import { useGridDraw } from '~/composables/useGridDraw'
  import GridCell from '~/components/grid/GridCell.vue'
  import GridCellPicker from '~/components/grid/GridCellPicker.vue'
  import GridEmptyState from '~/components/grid/GridEmptyState.vue'

  const props = defineProps<{
    views: GridView[]
    gap: GridGap
    editMode: boolean
    allItems: Entity[]
    previewMove: (viewId: string, col: number, row: number) => GridView[]
  }>()

  const gridContainerEl = ref<HTMLElement | null>(null)

  const emit = defineEmits<{
    'add-view': [dataSource: string, projection: ProjectionType, title?: string]
    'add-view-at': [col: number, row: number, colSpan: number, rowSpan: number]
    'remove-view': [id: string]
    'update-view': [id: string, updates: Partial<GridView>]
    'resize-view': [id: string, col: number, row: number, colSpan: number, rowSpan: number]
    'move-view': [id: string, col: number, row: number]
    'set-gap': [gap: GridGap]
    'toggle-edit': []
    'apply-preset': [preset: GridPreset]
    'create-first-view': [dataSource: string, projection: ProjectionType]
    'open-detail': [item: Entity]
  }>()

  // Cell picker dialog state (kept for editing existing views via pencil button)
  const pickerOpen = ref(false)
  const editingView = ref<GridView | null>(null)

  function openPickerForEdit(view: GridView) {
    editingView.value = view
    pickerOpen.value = true
  }

  function handlePickerConfirm(dataSource: string, projection: ProjectionType, title?: string) {
    if (editingView.value) {
      emit('update-view', editingView.value.id, { dataSource, projection, title })
    }
    editingView.value = null
  }

  // Items filtered by data source, then by per-view sort/filter
  function itemsForView(view: GridView): Entity[] {
    const ds = (view.dataSource || '').toLowerCase()
    let items = (!ds || ds === 'all')
      ? [...props.allItems]
      : props.allItems.filter((item) => (item.type || '').toLowerCase() === ds)

    // Text filter
    const filterText = ((view.filters?.text as string) || '').toLowerCase()
    if (filterText) {
      items = items.filter((item) =>
        (item.title || '').toLowerCase().includes(filterText) ||
        (item.type || '').toLowerCase().includes(filterText),
      )
    }

    // Sort
    const sortField = view.sortField || 'title'
    const sortDir = view.sortDirection === 'desc' ? -1 : 1
    items.sort((a, b) => {
      const av = (a as Record<string, any>)[sortField] ?? ''
      const bv = (b as Record<string, any>)[sortField] ?? ''
      if (av < bv) return -1 * sortDir
      if (av > bv) return 1 * sortDir
      return 0
    })

    return items
  }

  // Grid styles
  const gridStyle = computed(() => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
    gridAutoRows: '280px',
    gap: `${GRID_GAP_PX[props.gap]}px`,
  }))

  // ── Draw-to-create integration ──────────────────────────────────────────
  const { isDrawing, drawPreviewStyle, guidelinesStyle } = useGridDraw({
    gridEl: gridContainerEl,
    gap: computed(() => props.gap),
    editMode: computed(() => props.editMode),
    views: computed(() => props.views),
    onDraw: (col, row, colSpan, rowSpan) => {
      emit('add-view-at', col, row, colSpan, rowSpan)
    },
  })

  // ── Pointer-based Draggable integration ──────────────────────────────────
  // The views ref is writable so the drag system can mutate sibling positions
  // during live preview (FLIP animation). The parent's moveView() commits final state.
  const writableViews = computed({
    get: () => props.views,
    set: () => { /* parent owns the data; mutations happen in-place on the array items */ },
  })

  const { isDragging, dragViewId, initDraggables } = useGridDraggable({
    gridEl: gridContainerEl,
    gap: computed(() => props.gap),
    editMode: computed(() => props.editMode),
    views: writableViews as unknown as Ref<GridView[]>,
    previewMove: props.previewMove,
    onMove: (viewId, col, row) => {
      emit('move-view', viewId, col, row)
    },
  })

  // Re-initialize draggables when views change (added/removed/reordered)
  watch(() => props.views.length, () => {
    if (props.editMode) {
      nextTick(() => initDraggables())
    }
  })

  // Also re-init after mount
  onMounted(() => {
    if (props.editMode) {
      nextTick(() => initDraggables())
    }
  })
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0">
    <!-- Toolbar (edit mode only, rendered in header slot) -->
    <slot
      name="toolbar"
      :edit-mode="editMode"
      :gap="gap"
      :view-count="views.length"
      :on-toggle-edit="() => emit('toggle-edit')"
      :on-set-gap="(g: GridGap) => emit('set-gap', g)"
      :on-add-view="() => emit('add-view', '', '' as ProjectionType)"
      :on-show-presets="() => {}" />

    <!-- Empty state (no views yet) -->
    <GridEmptyState
      v-if="views.length === 0"
      @create-view="(ds, proj) => emit('create-first-view', ds, proj)"
      @apply-preset="(preset) => emit('apply-preset', preset)" />

    <!-- Grid -->
    <div v-else class="flex-1 overflow-y-auto p-4 pb-[50vh]">
      <div
        ref="gridContainerEl"
        :style="{ ...gridStyle, ...(guidelinesStyle || {}) }"
        class="min-h-0"
        :class="isDrawing ? 'cursor-crosshair' : editMode ? 'cursor-crosshair' : ''">
        <GridCell
          v-for="view in views"
          :key="view.id"
          :view="view"
          :items="itemsForView(view)"
          :edit-mode="editMode"
          :is-drag-source="dragViewId === view.id"
          @edit="openPickerForEdit"
          @configure="(id, ds, proj) => emit('update-view', id, { dataSource: ds, projection: proj })"
          @change-projection="(id, proj) => emit('update-view', id, { projection: proj })"
          @update-sort="(id, sf, sd) => emit('update-view', id, { sortField: sf, sortDirection: sd })"
          @update-filter="(id, ft) => emit('update-view', id, { filters: { text: ft } })"
          @cancel="(id) => emit('remove-view', id)"
          @remove="(id) => emit('remove-view', id)"
          @resize="(id, c, r, cs, rs) => emit('resize-view', id, c, r, cs, rs)"
          @open-detail="(item) => emit('open-detail', item)">
          <!-- Projection content slot -->
          <template #default="{ view: v, items }">
            <slot name="cell-content" :view="v" :items="items" />
          </template>
        </GridCell>

        <!-- Draw preview overlay -->
        <div
          v-if="drawPreviewStyle"
          :style="drawPreviewStyle"
          class="rounded-lg border-2 border-primary/50 bg-primary/10 transition-[left,top,width,height] duration-75 z-30">
          <div class="h-full flex items-center justify-center">
            <span class="text-[10px] font-medium text-primary/70 select-none">Draw to create</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Cell picker dialog -->
    <GridCellPicker
      v-model:open="pickerOpen"
      :existing-view="editingView"
      @confirm="handlePickerConfirm" />
  </div>
</template>
