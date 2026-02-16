/**
 * useGapResize — Gap-based resize handles for grid cells.
 *
 * Detects clean column/row boundaries between adjacent cells and renders
 * invisible drag handles in the gaps. Dragging performs a zero-sum resize:
 * cells on one side grow while cells on the other side shrink.
 *
 * "Column mode": all cells sharing a boundary participate in the resize.
 */

import type { GridView, GridGap } from '~/types/grid'
import { GRID_COLS, GRID_GAP_PX } from '~/types/grid'

// ── Types ────────────────────────────────────────────────────────────────

export interface GapHandle {
  id: string
  axis: 'x' | 'y'
  /** Grid boundary position (e.g., 6 means between col 6 and col 7) */
  boundary: number
  /** View IDs on the left/top side of the gap */
  leftIds: string[]
  /** View IDs on the right/bottom side of the gap */
  rightIds: string[]
}

export interface UseGapResizeOptions {
  /** Ref to the grid container element */
  gridEl: Ref<HTMLElement | null>
  /** Current gap setting */
  gap: Ref<GridGap>
  /** Whether edit mode is active */
  editMode: Ref<boolean>
  /** Current views (reactive — will be mutated in-place during drag) */
  views: Ref<GridView[]>
  /** Called once at drag start (push undo snapshot) */
  onDragStart: () => void
  /** Called once at drag end (persist) */
  onDragEnd: () => void
}

// ── Composable ───────────────────────────────────────────────────────────

export function useGapResize(opts: UseGapResizeOptions) {
  const { gridEl, gap, editMode, views, onDragStart, onDragEnd } = opts
  const ROW_HEIGHT = 280 // matches gridAutoRows in GridEditor

  // ── Detect valid gap handles ─────────────────────────────────────────

  const gapHandles = computed<GapHandle[]>(() => {
    if (!editMode.value) return []
    const handles: GapHandle[] = []
    const vs = views.value
    if (!vs.length) return handles

    // ── Vertical (column) gaps ────────────────────────────────────────
    // A gap at column boundary `b` is valid when:
    //   - At least one cell ends there (col + colSpan === b + 1)
    //   - At least one cell starts there (col === b + 1)
    //   - No cell spans across (col <= b AND col + colSpan > b + 1)
    for (let b = 1; b < GRID_COLS; b++) {
      const leftCells = vs.filter(v => v.col + v.colSpan === b + 1)
      const rightCells = vs.filter(v => v.col === b + 1)
      const blockers = vs.filter(v => v.col <= b && v.col + v.colSpan > b + 1)

      if (leftCells.length > 0 && rightCells.length > 0 && blockers.length === 0) {
        handles.push({
          id: `col-${b}`,
          axis: 'x',
          boundary: b,
          leftIds: leftCells.map(v => v.id),
          rightIds: rightCells.map(v => v.id),
        })
      }
    }

    // ── Horizontal (row) gaps ─────────────────────────────────────────
    const maxRow = Math.max(...vs.map(v => v.row + v.rowSpan), 0)
    for (let b = 1; b < maxRow; b++) {
      const topCells = vs.filter(v => v.row + v.rowSpan === b + 1)
      const bottomCells = vs.filter(v => v.row === b + 1)
      const blockers = vs.filter(v => v.row <= b && v.row + v.rowSpan > b + 1)

      if (topCells.length > 0 && bottomCells.length > 0 && blockers.length === 0) {
        handles.push({
          id: `row-${b}`,
          axis: 'y',
          boundary: b,
          leftIds: topCells.map(v => v.id),
          rightIds: bottomCells.map(v => v.id),
        })
      }
    }

    return handles
  })

  // ── Grid metrics (pixel math) ────────────────────────────────────────

  function getGridMetrics() {
    const el = gridEl.value
    if (!el) return null
    const gapPx = GRID_GAP_PX[gap.value]
    const containerWidth = el.clientWidth
    const colWidth = (containerWidth - (GRID_COLS - 1) * gapPx) / GRID_COLS
    return { gapPx, colWidth, rowHeight: ROW_HEIGHT, containerWidth }
  }

  // ── Pixel positioning for each handle ────────────────────────────────

  const HANDLE_THICKNESS = 14 // px — invisible hit zone width

  function getHandleStyle(handle: GapHandle): Record<string, string> {
    const m = getGridMetrics()
    if (!m) return { display: 'none' }

    if (handle.axis === 'x') {
      // Vertical line at column boundary
      const rightEdge = handle.boundary * m.colWidth + (handle.boundary - 1) * m.gapPx
      const gapCenter = rightEdge + m.gapPx / 2

      // Compute vertical extent from participating cells
      const allIds = new Set([...handle.leftIds, ...handle.rightIds])
      const pvs = views.value.filter(v => allIds.has(v.id))
      const minRow = Math.min(...pvs.map(v => v.row))
      const maxRowEnd = Math.max(...pvs.map(v => v.row + v.rowSpan))

      const top = (minRow - 1) * (m.rowHeight + m.gapPx)
      const height = (maxRowEnd - minRow) * m.rowHeight + (maxRowEnd - minRow - 1) * m.gapPx

      return {
        position: 'absolute',
        left: `${gapCenter - HANDLE_THICKNESS / 2}px`,
        top: `${top}px`,
        width: `${HANDLE_THICKNESS}px`,
        height: `${Math.max(height, m.rowHeight)}px`,
        cursor: 'col-resize',
        zIndex: '15',
      }
    } else {
      // Horizontal line at row boundary
      const bottomEdge = handle.boundary * m.rowHeight + (handle.boundary - 1) * m.gapPx
      const gapCenter = bottomEdge + m.gapPx / 2

      // Compute horizontal extent from participating cells
      const allIds = new Set([...handle.leftIds, ...handle.rightIds])
      const pvs = views.value.filter(v => allIds.has(v.id))
      const minCol = Math.min(...pvs.map(v => v.col))
      const maxColEnd = Math.max(...pvs.map(v => v.col + v.colSpan))

      const left = (minCol - 1) * (m.colWidth + m.gapPx)
      const width = (maxColEnd - minCol) * m.colWidth + (maxColEnd - minCol - 1) * m.gapPx

      return {
        position: 'absolute',
        left: `${left}px`,
        top: `${gapCenter - HANDLE_THICKNESS / 2}px`,
        width: `${Math.max(width, m.colWidth)}px`,
        height: `${HANDLE_THICKNESS}px`,
        cursor: 'row-resize',
        zIndex: '15',
      }
    }
  }

  // ── Visual indicator line style (2px accent line in the gap center) ──

  function getIndicatorStyle(handle: GapHandle): Record<string, string> {
    const m = getGridMetrics()
    if (!m) return { display: 'none' }

    if (handle.axis === 'x') {
      const rightEdge = handle.boundary * m.colWidth + (handle.boundary - 1) * m.gapPx
      const gapCenter = rightEdge + m.gapPx / 2

      const allIds = new Set([...handle.leftIds, ...handle.rightIds])
      const pvs = views.value.filter(v => allIds.has(v.id))
      const minRow = Math.min(...pvs.map(v => v.row))
      const maxRowEnd = Math.max(...pvs.map(v => v.row + v.rowSpan))
      const top = (minRow - 1) * (m.rowHeight + m.gapPx)
      const height = (maxRowEnd - minRow) * m.rowHeight + (maxRowEnd - minRow - 1) * m.gapPx

      return {
        position: 'absolute',
        left: `${gapCenter - 1}px`,
        top: `${top}px`,
        width: '2px',
        height: `${Math.max(height, m.rowHeight)}px`,
        pointerEvents: 'none',
        zIndex: '16',
      }
    } else {
      const bottomEdge = handle.boundary * m.rowHeight + (handle.boundary - 1) * m.gapPx
      const gapCenter = bottomEdge + m.gapPx / 2

      const allIds = new Set([...handle.leftIds, ...handle.rightIds])
      const pvs = views.value.filter(v => allIds.has(v.id))
      const minCol = Math.min(...pvs.map(v => v.col))
      const maxColEnd = Math.max(...pvs.map(v => v.col + v.colSpan))
      const left = (minCol - 1) * (m.colWidth + m.gapPx)
      const width = (maxColEnd - minCol) * m.colWidth + (maxColEnd - minCol - 1) * m.gapPx

      return {
        position: 'absolute',
        left: `${left}px`,
        top: `${gapCenter - 1}px`,
        width: `${Math.max(width, m.colWidth)}px`,
        height: '2px',
        pointerEvents: 'none',
        zIndex: '16',
      }
    }
  }

  // ── Drag state ───────────────────────────────────────────────────────

  const activeHandle = ref<GapHandle | null>(null)
  const isDraggingGap = ref(false)
  const hoverHandleId = ref<string | null>(null)

  let dragStartPx = 0
  let lastDelta = 0

  // Snapshot of original positions for all affected views
  let originals: Map<string, { col: number; row: number; colSpan: number; rowSpan: number }> = new Map()

  function onGapPointerDown(handle: GapHandle, e: PointerEvent) {
    if (!editMode.value) return
    e.preventDefault()
    e.stopPropagation()

    activeHandle.value = handle
    isDraggingGap.value = true
    dragStartPx = handle.axis === 'x' ? e.clientX : e.clientY
    lastDelta = 0

    // Push undo snapshot before any mutations
    onDragStart()

    // Save originals
    originals = new Map()
    const allIds = new Set([...handle.leftIds, ...handle.rightIds])
    for (const v of views.value) {
      if (allIds.has(v.id)) {
        originals.set(v.id, { col: v.col, row: v.row, colSpan: v.colSpan, rowSpan: v.rowSpan })
      }
    }

    window.addEventListener('pointermove', onGapPointerMove)
    window.addEventListener('pointerup', onGapPointerUp)
  }

  function onGapPointerMove(e: PointerEvent) {
    if (!activeHandle.value || !isDraggingGap.value) return
    const handle = activeHandle.value
    const m = getGridMetrics()
    if (!m) return

    const currentPx = handle.axis === 'x' ? e.clientX : e.clientY
    const pixelDelta = currentPx - dragStartPx
    const cellSize = handle.axis === 'x' ? m.colWidth + m.gapPx : m.rowHeight + m.gapPx

    let delta = Math.round(pixelDelta / cellSize)

    // Clamp: no cell goes below span 1
    const maxGrow = Math.min(
      ...handle.rightIds.map(id => {
        const orig = originals.get(id)!
        return handle.axis === 'x' ? orig.colSpan - 1 : orig.rowSpan - 1
      }),
    )
    const maxShrink = Math.min(
      ...handle.leftIds.map(id => {
        const orig = originals.get(id)!
        return handle.axis === 'x' ? orig.colSpan - 1 : orig.rowSpan - 1
      }),
    )

    delta = Math.max(-maxShrink, Math.min(delta, maxGrow))

    if (delta === lastDelta) return
    lastDelta = delta

    // Apply live preview — mutate views in-place
    for (const id of handle.leftIds) {
      const orig = originals.get(id)!
      const v = views.value.find(view => view.id === id)
      if (!v) continue
      if (handle.axis === 'x') {
        v.colSpan = orig.colSpan + delta
      } else {
        v.rowSpan = orig.rowSpan + delta
      }
    }

    for (const id of handle.rightIds) {
      const orig = originals.get(id)!
      const v = views.value.find(view => view.id === id)
      if (!v) continue
      if (handle.axis === 'x') {
        v.col = orig.col + delta
        v.colSpan = orig.colSpan - delta
      } else {
        v.row = orig.row + delta
        v.rowSpan = orig.rowSpan - delta
      }
    }
  }

  function onGapPointerUp() {
    window.removeEventListener('pointermove', onGapPointerMove)
    window.removeEventListener('pointerup', onGapPointerUp)

    if (lastDelta !== 0) {
      // Commit: persist the in-place mutations
      onDragEnd()
    } else {
      // No change — restore originals (undo the pushed snapshot)
      for (const [id, orig] of originals) {
        const v = views.value.find(view => view.id === id)
        if (v) Object.assign(v, orig)
      }
    }

    activeHandle.value = null
    isDraggingGap.value = false
    lastDelta = 0
    originals = new Map()
  }

  // Cleanup
  onUnmounted(() => {
    window.removeEventListener('pointermove', onGapPointerMove)
    window.removeEventListener('pointerup', onGapPointerUp)
  })

  return {
    gapHandles,
    getHandleStyle,
    getIndicatorStyle,
    onGapPointerDown,
    isDraggingGap,
    hoverHandleId,
    activeHandle,
  }
}
