/**
 * useGridDraw — Squarespace-style draw-to-create composable for grid cells.
 *
 * In edit mode, clicking and dragging on empty grid space draws a
 * snapping rectangle. On release, emits the drawn rectangle coordinates
 * so the parent can create a new unconfigured view at that position.
 *
 * Grid guidelines (columns + rows) are shown faintly on hover and
 * become more prominent during active drawing.
 */

import { toast } from 'vue-sonner'
import type { GridGap, GridView } from '~/types/grid'
import { GRID_COLS, GRID_GAP_PX } from '~/types/grid'

const ROW_HEIGHT = 280

export interface GridDrawOptions {
  /** Ref to the grid container element */
  gridEl: Ref<HTMLElement | null>
  /** Current gap setting */
  gap: Ref<GridGap>
  /** Whether edit mode is active */
  editMode: Ref<boolean>
  /** Existing views — used to prevent drawing on occupied cells */
  views: Ref<GridView[]>
  /** Called when a rectangle is drawn */
  onDraw: (col: number, row: number, colSpan: number, rowSpan: number) => void
}

export interface DrawRect {
  col: number
  row: number
  colSpan: number
  rowSpan: number
}

export function useGridDraw(options: GridDrawOptions) {
  const { gridEl, gap, editMode, views, onDraw } = options

  const isDrawing = ref(false)
  const isHovering = ref(false)
  const drawRect = ref<DrawRect | null>(null)

  // Track whether the pointer actually moved (to distinguish click vs drag)
  let didMove = false

  // Start cell (grid coordinates) — always the top-left corner of the box
  let startCol = 0
  let startRow = 0

  // ── Occupancy helpers ─────────────────────────────────────────────────

  function _buildOccupancySet(): Set<string> {
    const set = new Set<string>()
    for (const v of views.value) {
      for (let c = v.col; c < v.col + v.colSpan; c++) {
        for (let r = v.row; r < v.row + v.rowSpan; r++) {
          set.add(`${c},${r}`)
        }
      }
    }
    return set
  }

  function _isCellOccupied(col: number, row: number, occupancy: Set<string>): boolean {
    return occupancy.has(`${col},${row}`)
  }

  /** Find the next unoccupied cell scanning right then down from (col, row) */
  function _findNearestEmpty(col: number, row: number, occupancy: Set<string>): { col: number; row: number } {
    // Scan right on current row first, then next rows
    const maxRow = Math.max(row + 20, ...views.value.map((v) => v.row + v.rowSpan + 5))
    for (let r = row; r <= maxRow; r++) {
      const startC = r === row ? col : 1
      for (let c = startC; c <= GRID_COLS; c++) {
        if (!occupancy.has(`${c},${r}`)) return { col: c, row: r }
      }
    }
    return { col: 1, row: maxRow + 1 }
  }

  // ── Grid metrics ──────────────────────────────────────────────────────

  function getGridMetrics() {
    const el = gridEl.value
    if (!el) return { colWidth: 0, rowHeight: ROW_HEIGHT, gapPx: 0, gridRect: null as DOMRect | null }

    const gridRect = el.getBoundingClientRect()
    const gapPx = GRID_GAP_PX[gap.value]
    const totalGapX = gapPx * (GRID_COLS - 1)
    const colWidth = (gridRect.width - totalGapX) / GRID_COLS

    return { colWidth, rowHeight: ROW_HEIGHT, gapPx, gridRect }
  }

  function pixelToGrid(clientX: number, clientY: number): { col: number; row: number } {
    const { colWidth, rowHeight, gapPx, gridRect } = getGridMetrics()
    if (!gridRect || colWidth === 0) return { col: 1, row: 1 }

    const x = clientX - gridRect.left
    const y = clientY - gridRect.top

    const stepX = colWidth + gapPx
    const stepY = rowHeight + gapPx

    const col = Math.max(1, Math.min(GRID_COLS, Math.floor(x / stepX) + 1))
    const row = Math.max(1, Math.floor(y / stepY) + 1)

    return { col, row }
  }

  // ── Pointer handlers ──────────────────────────────────────────────────

  function onPointerDown(e: PointerEvent) {
    if (!editMode.value) return

    // Only draw on empty space — ignore if target is inside a grid cell
    const target = e.target as HTMLElement
    if (target.closest('[data-view-id]')) return

    // Only left mouse button
    if (e.button !== 0) return

    e.preventDefault()
    didMove = false

    let { col, row } = pixelToGrid(e.clientX, e.clientY)

    // If the cell is occupied, snap to the nearest empty cell
    const occupancy = _buildOccupancySet()
    if (_isCellOccupied(col, row, occupancy)) {
      const empty = _findNearestEmpty(col, row, occupancy)
      col = empty.col
      row = empty.row
    }

    startCol = col
    startRow = row

    isDrawing.value = true
    drawRect.value = { col, row, colSpan: 1, rowSpan: 1 }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDrawing.value) return
    didMove = true

    const { col, row } = pixelToGrid(e.clientX, e.clientY)

    // Box position is anchored at startCol/startRow (top-left corner).
    // Dragging extends the box to the right and/or downward only.
    const endCol = Math.max(startCol, col)
    const endRow = Math.max(startRow, row)

    drawRect.value = {
      col: startCol,
      row: startRow,
      colSpan: Math.min(endCol - startCol + 1, GRID_COLS - startCol + 1),
      rowSpan: endRow - startRow + 1,
    }
  }

  function onPointerUp(_e: PointerEvent) {
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', onPointerUp)

    if (isDrawing.value) {
      if (!didMove) {
        // Click without drag — show hint toast
        toast.info('Click & drag to draw a new section')
      } else if (drawRect.value) {
        const { col, row, colSpan, rowSpan } = drawRect.value
        onDraw(col, row, colSpan, rowSpan)
      }
    }

    isDrawing.value = false
    drawRect.value = null
  }

  // ── Hover handlers ────────────────────────────────────────────────────

  function onMouseEnter() {
    if (editMode.value) isHovering.value = true
  }

  function onMouseLeave() {
    isHovering.value = false
  }

  // ── Computed styles ───────────────────────────────────────────────────

  /** Compute CSS grid placement for the draw preview overlay */
  const drawPreviewStyle = computed(() => {
    if (!drawRect.value) return null

    const { col, row, colSpan, rowSpan } = drawRect.value

    return {
      gridColumn: `${col} / span ${colSpan}`,
      gridRow: `${row} / span ${rowSpan}`,
      pointerEvents: 'none' as const,
    }
  })

  /** CSS for grid guidelines (column + row lines).
   *  Faint on hover, stronger while drawing. */
  const guidelinesStyle = computed(() => {
    if (!isDrawing.value && !isHovering.value) return null

    const gapPx = GRID_GAP_PX[gap.value]
    // Opacity: faint on hover, stronger while drawing
    const pct = isDrawing.value ? 30 : 10
    const color = `color-mix(in srgb, var(--color-border) ${pct}%, transparent)`

    // Column lines (vertical)
    const colLines: string[] = []
    for (let i = 1; i < GRID_COLS; i++) {
      const p = (i / GRID_COLS) * 100
      colLines.push(
        `transparent calc(${p}% - ${gapPx / 2}px)`,
        `${color} calc(${p}% - ${gapPx / 2}px)`,
        `${color} calc(${p}% + ${gapPx / 2}px)`,
        `transparent calc(${p}% + ${gapPx / 2}px)`,
      )
    }

    // Row lines (horizontal) — repeating pattern based on fixed row height
    const rowStep = ROW_HEIGHT + gapPx
    const rowGrad = `repeating-linear-gradient(to bottom, transparent 0px, transparent ${ROW_HEIGHT}px, ${color} ${ROW_HEIGHT}px, ${color} ${rowStep}px)`

    return {
      backgroundImage: `linear-gradient(to right, ${colLines.join(', ')}), ${rowGrad}`,
    }
  })

  // ── Lifecycle ─────────────────────────────────────────────────────────

  watch([gridEl, editMode], ([el, active], _old, onCleanup) => {
    if (el && active) {
      el.addEventListener('pointerdown', onPointerDown)
      el.addEventListener('mouseenter', onMouseEnter)
      el.addEventListener('mouseleave', onMouseLeave)
    }
    onCleanup(() => {
      el?.removeEventListener('pointerdown', onPointerDown)
      el?.removeEventListener('mouseenter', onMouseEnter)
      el?.removeEventListener('mouseleave', onMouseLeave)
    })
  }, { immediate: true })

  onBeforeUnmount(() => {
    gridEl.value?.removeEventListener('pointerdown', onPointerDown)
    gridEl.value?.removeEventListener('mouseenter', onMouseEnter)
    gridEl.value?.removeEventListener('mouseleave', onMouseLeave)
    document.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerup', onPointerUp)
  })

  return {
    isDrawing,
    isHovering,
    drawRect,
    drawPreviewStyle,
    guidelinesStyle,
  }
}
