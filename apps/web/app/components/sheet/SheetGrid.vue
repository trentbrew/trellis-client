<script setup lang="ts">
  import type { SheetColumn } from '~/types/sheet'
  import type { EditorLease } from '~/composables/useEditorLease'
  import type { SheetSelectionState } from '~/composables/useSheetSelection'
  import SheetCell from './SheetCell.vue'
  import SheetColumnHeader from './SheetColumnHeader.vue'
  import SheetSelectionOverlay from './SheetSelectionOverlay.vue'
  import { useVirtualRows } from '~/composables/useVirtualRows'
  import { useColumnReorder } from '~/composables/useColumnReorder'
  import { parseSheetCellKey } from '~/lib/sheet-cell-key'
  import { applyFillDown, applyFillDragRange, canFillColumn } from '~/composables/useSheetFill'
  import { pasteTsvIntoSelection, selectionToTsv } from '~/composables/useSheetClipboard'
  import { toast } from 'vue-sonner'

  const ROW_HEIGHT = 36
  const HEADER_HEIGHT = 36
  const OVERSCAN = 10

  const props = defineProps<{
    rows: Array<{ entityId: string; data: Record<string, unknown> }>
    columns: SheetColumn[]
    getCellValue: (entityId: string, column: SheetColumn, rowIndex: number) => unknown
    lease: EditorLease
    selection: SheetSelectionState
    sheetId: string
    people: Array<{ id: string; title: string }>
    resolvePersonTitle: (id: string | null | undefined) => Promise<string>
    updateColumnsOrder: (ordered: SheetColumn[]) => Promise<void>
    updateCell: (entityId: string, attribute: string, value: unknown) => Promise<void>
    updateRelationCell: (
      entityId: string,
      attribute: string,
      personId: string | null,
      relationType?: string,
    ) => Promise<void>
  }>()

  const emit = defineEmits<{
    'select-cell': [row: number, col: number]
    'move-focus': [dr: number, dc: number, extend: boolean]
    'extend-focus': [row: number, col: number]
    'tab-focus': [direction: 1 | -1]
  }>()

  const columnsRef = toRef(props, 'columns')
  const rowCount = computed(() => props.rows.length)
  const { scrollerRef, measure, range, scrollToIndex } = useVirtualRows(rowCount, {
    rowHeight: ROW_HEIGHT,
    overscan: OVERSCAN,
  })

  const {
    dragFromIndex,
    dropTargetIndex,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
  } = useColumnReorder(toRef(props, 'sheetId'), columnsRef, props.updateColumnsOrder)

  const visibleRows = computed(() => {
    const { start, end } = range.value
    return props.rows.slice(start, end).map((row, i) => ({
      row,
      pos: start + i,
    }))
  })

  const topSpacerHeight = computed(() => range.value.start * ROW_HEIGHT)
  const bottomSpacerHeight = computed(() => Math.max(0, (props.rows.length - range.value.end) * ROW_HEIGHT))

  const showFillHandle = computed(() => {
    const s = props.selection
    const col = props.columns[s.c0]
    if (!col || !canFillColumn(col)) return false
    return s.r1 > s.r0 || (s.r0 === s.r1 && s.c0 === s.c1)
  })

  const fillDragging = ref(false)
  const fillPointerStart = ref({ x: 0, y: 0 })
  const fillDragAnchorRow = ref(0)

  function rowIndexFromClientY(clientY: number): number {
    const el = scrollerRef.value
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const yInContent = clientY - rect.top + el.scrollTop - HEADER_HEIGHT
    return Math.max(0, Math.min(rowCount.value - 1, Math.floor(yInContent / ROW_HEIGHT)))
  }

  const fillHandleStyle = computed(() => {
    const s = props.selection
    const colWidth = 120
    const right = Math.max(8, (props.columns.length - s.c1 - 1) * colWidth + 40)
    const bottom = Math.max(8, (rowCount.value - s.r1 - 1) * ROW_HEIGHT + 48)
    return { bottom, right }
  })

  function isSelected(row: number, col: number): boolean {
    const s = props.selection
    return row >= s.r0 && row <= s.r1 && col >= s.c0 && col <= s.c1
  }

  function isFocused(row: number, col: number): boolean {
    return props.selection.focus.row === row && props.selection.focus.col === col
  }

  function selectCell(row: number, col: number) {
    emit('select-cell', row, col)
  }

  function leasedRowIndex(): number | null {
    const key = props.lease.cellKey.value
    if (!key) return null
    const parsed = parseSheetCellKey(key)
    if (!parsed) return null
    const idx = props.rows.findIndex((r) => r.entityId === parsed.entityId)
    return idx >= 0 ? idx : null
  }

  watch(
    () => props.selection.focus.row,
    (row) => {
      scrollToIndex(row)
    },
  )

  watch(
    () => [range.value.start, range.value.end, props.lease.cellKey.value] as const,
    async ([start, end, key]) => {
      if (!key) return
      const idx = leasedRowIndex()
      if (idx == null) return
      if (idx < start || idx >= end) {
        await props.lease.release()
      }
    },
  )

  async function handleGridKeydown(e: KeyboardEvent) {
    const extend = e.shiftKey
    const mod = e.metaKey || e.ctrlKey

    if (mod && e.key === 'c') {
      e.preventDefault()
      const tsv = selectionToTsv(
        props.selection,
        props.rows,
        props.columns,
        props.getCellValue,
      )
      try {
        await navigator.clipboard.writeText(tsv)
      } catch {
        toast.message('Copy failed')
      }
      return
    }

    if (mod && e.key === 'v') {
      e.preventDefault()
      await props.lease.release()
      try {
        const text = await navigator.clipboard.readText()
        const { updated, skipped } = await pasteTsvIntoSelection(
          text,
          props.selection,
          props.rows,
          props.columns,
          props.updateCell,
        )
        if (updated > 0) toast.success(`Pasted ${updated} cell${updated === 1 ? '' : 's'}`)
        if (skipped > 0) toast.message(`Skipped ${skipped} read-only cell${skipped === 1 ? '' : 's'}`)
      } catch {
        toast.message('Paste failed')
      }
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      await props.lease.release()
      emit('move-focus', -1, 0, extend)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      await props.lease.release()
      emit('move-focus', 1, 0, extend)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      await props.lease.release()
      emit('move-focus', 0, -1, extend)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      await props.lease.release()
      emit('move-focus', 0, 1, extend)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      await props.lease.release()
      emit('tab-focus', e.shiftKey ? -1 : 1)
    }
  }

  async function onFillStart(e: PointerEvent) {
    const col = props.columns[props.selection.c0]
    if (!col || !canFillColumn(col)) {
      toast.message('Fill not supported for this column type')
      return
    }

    e.preventDefault()
    fillDragging.value = true
    fillPointerStart.value = { x: e.clientX, y: e.clientY }
    fillDragAnchorRow.value = props.selection.r0
    const handleEl = e.currentTarget as HTMLElement
    handleEl.setPointerCapture(e.pointerId)

    const onMove = (ev: PointerEvent) => {
      if (!fillDragging.value) return
      const targetRow = rowIndexFromClientY(ev.clientY)
      const extendRow = Math.max(props.selection.r0, targetRow)
      emit('extend-focus', extendRow, props.selection.c0)
    }

    const onUp = async (ev: PointerEvent) => {
      handleEl.releasePointerCapture(ev.pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      fillDragging.value = false

      const col2 = props.columns[props.selection.c0]
      if (!col2 || !canFillColumn(col2)) {
        toast.message('Fill not supported for this column type')
        return
      }

      const dx = ev.clientX - fillPointerStart.value.x
      const dy = ev.clientY - fillPointerStart.value.y
      const moved = Math.hypot(dx, dy)

      if (moved < 4 && props.selection.r1 > props.selection.r0) {
        const { filled, skipped } = await applyFillDown(
          props.selection,
          props.columns,
          props.rows,
          props.getCellValue,
          props.updateCell,
        )
        if (skipped) toast.message('Fill not supported for this column type')
        else if (filled > 0) toast.success(`Filled ${filled} cell${filled === 1 ? '' : 's'}`)
        return
      }

      const targetRow = rowIndexFromClientY(ev.clientY)
      const { filled, skipped } = await applyFillDragRange(
        fillDragAnchorRow.value,
        targetRow,
        col2,
        props.rows,
        props.getCellValue,
        props.updateCell,
      )
      if (skipped) toast.message('Fill not supported for this column type')
      else if (filled > 0) toast.success(`Filled ${filled} cell${filled === 1 ? '' : 's'}`)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
</script>

<template>
  <div
    ref="scrollerRef"
    class="sheet-grid relative h-full min-h-0 overflow-auto"
    data-sheet-virtual="useVirtualRows"
    tabindex="-1"
    @scroll="measure"
    @keydown="handleGridKeydown"
  >
    <table class="w-full min-w-max border-collapse text-left text-[12.5px]" role="grid">
      <thead class="sticky top-0 z-10">
        <tr>
          <th
            class="w-10 border border-border bg-muted/50 px-2 py-1.5 font-data text-[10.5px] font-normal text-muted-foreground/70"
            scope="col"
          />
          <SheetColumnHeader
            v-for="(col, ci) in columns"
            :key="col.id"
            :column="col"
            :col-index="ci"
            :dragging="dragFromIndex === ci"
            :drop-before="dropTargetIndex === ci"
            @dragstart="onDragStart"
            @dragover="onDragOver"
            @dragend="onDragEnd"
            @drop="onDrop"
          />
        </tr>
      </thead>
      <tbody>
        <tr v-if="topSpacerHeight > 0" aria-hidden="true">
          <td :colspan="columns.length + 1" class="border-0 p-0" :style="{ height: topSpacerHeight + 'px' }" />
        </tr>
        <tr
          v-for="{ row, pos } in visibleRows"
          :key="row.entityId"
          :style="{ height: ROW_HEIGHT + 'px' }"
        >
          <th
            class="border border-border bg-muted/40 px-2 py-1 text-center font-data text-[10.5px] font-normal text-muted-foreground/60"
            scope="row"
          >
            {{ pos + 1 }}
          </th>
          <SheetCell
            v-for="(col, ci) in columns"
            :key="col.id"
            :entity-id="row.entityId"
            :column="col"
            :row-index="pos"
            :col-index="ci"
            :value="getCellValue(row.entityId, col, pos)"
            :focused="isFocused(pos, ci)"
            :selected="isSelected(pos, ci)"
            :lease="lease"
            :people="people"
            :resolve-person-title="resolvePersonTitle"
            :update-relation-cell="updateRelationCell"
            @focus="selectCell(pos, ci)"
          />
        </tr>
        <tr v-if="bottomSpacerHeight > 0" aria-hidden="true">
          <td :colspan="columns.length + 1" class="border-0 p-0" :style="{ height: bottomSpacerHeight + 'px' }" />
        </tr>
      </tbody>
      <tfoot v-if="rows.length" class="sticky bottom-0 z-10">
        <tr class="sheet-footer-row">
          <td class="border border-border px-2 py-1.5 text-xs text-muted-foreground/70">Σ</td>
          <td v-for="(col, ci) in columns" :key="'f-' + col.id" class="border border-border px-3 py-1.5 text-xs">
            <slot name="footer" :column="col" :col-index="ci" />
          </td>
        </tr>
      </tfoot>
    </table>
    <SheetSelectionOverlay
      :visible="showFillHandle"
      :bottom="fillHandleStyle.bottom"
      :right="fillHandleStyle.right"
      :dragging="fillDragging"
      @fillstart="onFillStart"
    />
  </div>
</template>
