/**
 * useGridDraggable — Custom pointer-event drag system for grid cell reordering.
 *
 * Provides iOS homescreen-style behavior:
 * 1. Grab via drag handle → cell lifts as a fixed-position ghost
 * 2. During drag → siblings smoothly FLIP-animate to make room
 * 3. Drop → ghost settles, layout commits, persists
 *
 * Uses FLIP (First-Last-Invert-Play) animation since CSS Grid properties
 * (grid-column, grid-row) are not directly animatable.
 */

import type { GridView, GridGap } from '~/types/grid'
import { GRID_COLS, GRID_GAP_PX } from '~/types/grid'

export interface GridDraggableOptions {
  /** Ref to the grid container element */
  gridEl: Ref<HTMLElement | null>
  /** Current gap setting */
  gap: Ref<GridGap>
  /** Whether edit mode is active */
  editMode: Ref<boolean>
  /** Called when a cell is dropped at a new grid position */
  onMove: (viewId: string, col: number, row: number) => void
  /** Returns a preview layout without mutating real state */
  previewMove: (viewId: string, col: number, row: number) => GridView[]
  /** Current views (reactive) */
  views: Ref<GridView[]>
}

// ── FLIP animation helper ──────────────────────────────────────────────

function snapshotRects(container: HTMLElement): Map<string, DOMRect> {
  const rects = new Map<string, DOMRect>()
  const cells = container.querySelectorAll<HTMLElement>('[data-view-id]')
  for (const cell of cells) {
    const id = cell.dataset.viewId
    if (id) rects.set(id, cell.getBoundingClientRect())
  }
  return rects
}

function flipAnimate(
  container: HTMLElement,
  beforeRects: Map<string, DOMRect>,
  skipId?: string,
  duration = 200,
) {
  const cells = container.querySelectorAll<HTMLElement>('[data-view-id]')
  for (const cell of cells) {
    const id = cell.dataset.viewId
    if (!id || id === skipId) continue

    const before = beforeRects.get(id)
    if (!before) continue

    const after = cell.getBoundingClientRect()
    const dx = before.left - after.left
    const dy = before.top - after.top

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue

    // Invert: place cell at its old position
    cell.style.transform = `translate(${dx}px, ${dy}px)`
    cell.style.transition = 'none'

    // Play: animate to new position
    requestAnimationFrame(() => {
      cell.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0, 0, 1)`
      cell.style.transform = ''

      const onEnd = () => {
        cell.style.transition = ''
        cell.style.transform = ''
        cell.removeEventListener('transitionend', onEnd)
      }
      cell.addEventListener('transitionend', onEnd, { once: true })
    })
  }
}

// ── Main composable ────────────────────────────────────────────────────

export function useGridDraggable(options: GridDraggableOptions) {
  const { gridEl, gap, editMode, onMove, previewMove, views } = options

  const isDragging = ref(false)
  const dragViewId = ref<string | null>(null)
  const dropPreview = ref<{ col: number; row: number } | null>(null)

  // Ghost element state
  let ghostEl: HTMLElement | null = null
  let dragSourceEl: HTMLElement | null = null
  let ghostOffsetX = 0
  let ghostOffsetY = 0
  let currentTargetCol = -1
  let currentTargetRow = -1
  let rafId = 0

  // Deferred drag start (threshold)
  const DRAG_THRESHOLD_PX = 5
  let pendingDrag = false
  let pendingStartX = 0
  let pendingStartY = 0
  let pendingCellEl: HTMLElement | null = null
  let pendingViewId: string | null = null

  // Bound handlers (for cleanup)
  let boundPointerMove: ((_e: PointerEvent) => void) | null = null
  let boundPointerUp: ((_e: PointerEvent) => void) | null = null

  // ── Grid metrics ─────────────────────────────────────────────────────

  function getGridMetrics() {
    const el = gridEl.value
    if (!el) return { colWidth: 0, rowHeight: 0, gapPx: 0, gridRect: new DOMRect() }

    const gapPx = GRID_GAP_PX[gap.value]
    const gridRect = el.getBoundingClientRect()
    const containerWidth = el.clientWidth
    const totalGap = (GRID_COLS - 1) * gapPx
    const colWidth = (containerWidth - totalGap) / GRID_COLS

    const computedStyle = getComputedStyle(el)
    const rowSizes = computedStyle.gridTemplateRows.split(' ')
    const rowHeight = rowSizes.length > 0 ? parseFloat(rowSizes[0]!) || 280 : 280

    return { colWidth, rowHeight, gapPx, gridRect }
  }

  function pixelToGrid(clientX: number, clientY: number, colSpan: number): { col: number; row: number } {
    const { colWidth, rowHeight, gapPx, gridRect } = getGridMetrics()
    if (colWidth === 0) return { col: 1, row: 1 }

    const stepX = colWidth + gapPx
    const stepY = rowHeight + gapPx

    // Position relative to grid container
    const relX = clientX - gridRect.left
    const relY = clientY - gridRect.top + (gridEl.value?.parentElement?.scrollTop || 0)

    const col = Math.max(1, Math.min(
      Math.round(relX / stepX) + 1,
      GRID_COLS - colSpan + 1,
    ))
    const row = Math.max(1, Math.round(relY / stepY) + 1)

    return { col, row }
  }

  // ── Ghost element ────────────────────────────────────────────────────

  function createGhost(sourceEl: HTMLElement): HTMLElement {
    const rect = sourceEl.getBoundingClientRect()
    const ghost = sourceEl.cloneNode(true) as HTMLElement

    ghost.style.position = 'fixed'
    ghost.style.left = `${rect.left}px`
    ghost.style.top = `${rect.top}px`
    ghost.style.width = `${rect.width}px`
    ghost.style.height = `${rect.height}px`
    ghost.style.zIndex = '9999'
    ghost.style.pointerEvents = 'none'
    ghost.style.opacity = '0.9'
    ghost.style.transform = 'scale(1.03)'
    ghost.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.1)'
    ghost.style.borderRadius = '0.5rem'
    ghost.style.transition = 'transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease'
    ghost.style.willChange = 'transform, left, top'
    ghost.removeAttribute('data-view-id')
    ghost.classList.add('grid-drag-ghost')

    document.body.appendChild(ghost)
    return ghost
  }

  function removeGhost() {
    if (ghostEl) {
      ghostEl.remove()
      ghostEl = null
    }
  }

  // ── Pointer handlers ─────────────────────────────────────────────────

  function onPointerDown(e: PointerEvent) {
    if (!editMode.value) return

    const handle = (e.target as HTMLElement).closest('[data-drag-handle]') as HTMLElement | null
    if (!handle) return

    const cellEl = handle.closest('[data-view-id]') as HTMLElement | null
    if (!cellEl) return

    const viewId = cellEl.dataset.viewId
    if (!viewId) return

    // Don't preventDefault/stopPropagation yet — allow clicks to pass through
    // until the drag threshold is crossed.
    pendingDrag = true
    pendingStartX = e.clientX
    pendingStartY = e.clientY
    pendingCellEl = cellEl
    pendingViewId = viewId

    // Bind move/up to document
    boundPointerMove = onPointerMove
    boundPointerUp = onPointerUp
    document.addEventListener('pointermove', boundPointerMove)
    document.addEventListener('pointerup', boundPointerUp)
  }

  /** Actually start the drag (called once threshold is crossed) */
  function beginDrag(_e: PointerEvent) {
    if (!pendingCellEl || !pendingViewId) return

    pendingDrag = false

    const rect = pendingCellEl.getBoundingClientRect()
    ghostOffsetX = pendingStartX - rect.left
    ghostOffsetY = pendingStartY - rect.top
    currentTargetCol = -1
    currentTargetRow = -1

    isDragging.value = true
    dragViewId.value = pendingViewId
    dragSourceEl = pendingCellEl

    // Mark the source cell as placeholder
    pendingCellEl.style.opacity = '0.3'
    pendingCellEl.style.transition = 'opacity 150ms ease'

    // Create ghost
    ghostEl = createGhost(pendingCellEl)

    pendingCellEl = null
    pendingViewId = null
  }

  function onPointerMove(e: PointerEvent) {
    // Check drag threshold before starting
    if (pendingDrag) {
      const dx = e.clientX - pendingStartX
      const dy = e.clientY - pendingStartY
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD_PX) return
      beginDrag(e)
    }

    if (!isDragging.value || !ghostEl || !dragViewId.value) return

    // Move ghost to follow cursor
    const ghostX = e.clientX - ghostOffsetX
    const ghostY = e.clientY - ghostOffsetY
    ghostEl.style.left = `${ghostX}px`
    ghostEl.style.top = `${ghostY}px`

    // Throttle grid position calculation to rAF
    // Use the ghost's top-left position (box position) instead of cursor
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      computeDropTarget(ghostX, ghostY)
    })
  }

  function computeDropTarget(ghostX: number, ghostY: number) {
    if (!dragViewId.value || !gridEl.value) return

    const view = views.value.find((v) => v.id === dragViewId.value)
    if (!view) return

    // ghostX/ghostY is the ghost's top-left corner (box position)
    const { col, row } = pixelToGrid(ghostX, ghostY, view.colSpan)

    // Only update if target changed
    if (col === currentTargetCol && row === currentTargetRow) return
    currentTargetCol = col
    currentTargetRow = row
    dropPreview.value = { col, row }

    // Snapshot current positions before layout change
    const beforeRects = snapshotRects(gridEl.value)

    // Get preview layout and apply it to the views (temporarily)
    const preview = previewMove(dragViewId.value, col, row)

    // Apply preview positions to ALL views (including the dragged one,
    // so its placeholder moves to the target slot in the grid)
    for (const previewView of preview) {
      const realView = views.value.find((v) => v.id === previewView.id)
      if (realView && (realView.col !== previewView.col || realView.row !== previewView.row)) {
        realView.col = previewView.col
        realView.row = previewView.row
      }
    }

    // FLIP animate the displacement after Vue re-renders
    nextTick(() => {
      if (gridEl.value) {
        flipAnimate(gridEl.value, beforeRects, dragViewId.value || undefined)
      }
    })
  }

  function onPointerUp(_e: PointerEvent) {
    // If threshold was never crossed, cancel silently (allow click)
    if (pendingDrag) {
      pendingDrag = false
      pendingCellEl = null
      pendingViewId = null
      cleanup()
      return
    }

    if (!isDragging.value || !dragViewId.value) {
      cleanup()
      return
    }

    const viewId = dragViewId.value
    const col = currentTargetCol
    const row = currentTargetRow

    // Remove ghost
    removeGhost()

    // Restore source cell
    if (dragSourceEl) {
      dragSourceEl.style.opacity = ''
      dragSourceEl.style.transition = ''
      dragSourceEl = null
    }

    // Commit the move if target is valid
    if (col > 0 && row > 0) {
      onMove(viewId, col, row)
    }

    // Reset state
    isDragging.value = false
    dragViewId.value = null
    dropPreview.value = null
    currentTargetCol = -1
    currentTargetRow = -1

    cleanup()
  }

  function cleanup() {
    cancelAnimationFrame(rafId)
    if (boundPointerMove) {
      document.removeEventListener('pointermove', boundPointerMove)
      boundPointerMove = null
    }
    if (boundPointerUp) {
      document.removeEventListener('pointerup', boundPointerUp)
      boundPointerUp = null
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  function initDraggables() {
    destroyDraggables()

    const el = gridEl.value
    if (!el || !editMode.value) return

    // Attach a single pointerdown listener to the grid container
    el.addEventListener('pointerdown', onPointerDown)
  }

  function destroyDraggables() {
    cleanup()
    removeGhost()

    const el = gridEl.value
    if (el) {
      el.removeEventListener('pointerdown', onPointerDown)
    }

    isDragging.value = false
    dragViewId.value = null
    dropPreview.value = null
  }

  // Re-init when edit mode toggles or gap changes
  watch([editMode, gap], () => {
    nextTick(() => initDraggables())
  })

  onBeforeUnmount(() => {
    destroyDraggables()
  })

  return {
    isDragging,
    dragViewId,
    dropPreview,
    initDraggables,
    destroyDraggables,
  }
}
