/**
 * useGridLayout — Grid page state management composable.
 *
 * Manages view CRUD, auto-positioning (top-left gravity),
 * collision displacement, resize, and persistence via usePages.
 */

import type { GridView, GridGap, GridPreset } from '~/types/grid'
import type { ProjectionType } from '~/types/database'
import { GRID_COLS, createGridView } from '~/types/grid'

export function useGridLayout(pageId: MaybeRef<string>) {
  const { pages, updatePage } = usePages()

  const resolvedPageId = computed(() => toValue(pageId))

  // ── Reactive State ─────────────────────────────────────────────────────

  const views = ref<GridView[]>([])
  const gap = ref<GridGap>('md')
  const editMode = ref(false)

  // ── Undo / Redo History ─────────────────────────────────────────────────
  const MAX_HISTORY = 50
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])

  /** Snapshot current views state onto the undo stack (call before every mutation). */
  function _pushUndo(): void {
    undoStack.value.push(JSON.stringify(views.value))
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    redoStack.value = [] // new action clears redo
  }

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function undo(): void {
    if (!undoStack.value.length) return
    redoStack.value.push(JSON.stringify(views.value))
    views.value = JSON.parse(undoStack.value.pop()!)
    _persist()
  }

  function redo(): void {
    if (!redoStack.value.length) return
    undoStack.value.push(JSON.stringify(views.value))
    views.value = JSON.parse(redoStack.value.pop()!)
    _persist()
  }

  // ── Sync from PageConfig ───────────────────────────────────────────────

  const pageConfig = computed(() =>
    (pages.value || []).find((p) => p.id === resolvedPageId.value),
  )

  // Hydrate from persisted config when page loads/changes
  watch(
    pageConfig,
    (config) => {
      if (!config) return
      views.value = config.views
        ? JSON.parse(JSON.stringify(config.views))
        : []
      gap.value = config.gridGap || 'md'
    },
    { immediate: true },
  )

  // ── Persistence ────────────────────────────────────────────────────────

  const _persist = useDebounceFn(async () => {
    if (!resolvedPageId.value) return
    await updatePage(resolvedPageId.value, {
      views: JSON.parse(JSON.stringify(views.value)),
      gridGap: gap.value,
    })
  }, 500)

  // ── Occupancy Grid ─────────────────────────────────────────────────────
  // A 2D boolean map that tracks which cells are occupied.
  // Used for auto-positioning and collision detection.

  function _buildOccupancyMap(
    excludeId?: string,
  ): Map<string, string> {
    const map = new Map<string, string>()
    for (const v of views.value) {
      if (v.id === excludeId) continue
      for (let c = v.col; c < v.col + v.colSpan; c++) {
        for (let r = v.row; r < v.row + v.rowSpan; r++) {
          map.set(`${c},${r}`, v.id)
        }
      }
    }
    return map
  }

  function _getMaxRow(): number {
    if (views.value.length === 0) return 0
    return Math.max(...views.value.map((v) => v.row + v.rowSpan - 1))
  }

  // ── Auto-Position ──────────────────────────────────────────────────────
  // Finds the first available slot (top-left gravity) for a view of given size.

  function autoPosition(colSpan: number, rowSpan: number): { col: number; row: number } {
    const occupancy = _buildOccupancyMap()
    const maxRow = _getMaxRow() + rowSpan + 2 // search space

    for (let r = 1; r <= maxRow; r++) {
      for (let c = 1; c <= GRID_COLS - colSpan + 1; c++) {
        let fits = true
        for (let dc = 0; dc < colSpan && fits; dc++) {
          for (let dr = 0; dr < rowSpan && fits; dr++) {
            if (occupancy.has(`${c + dc},${r + dr}`)) {
              fits = false
            }
          }
        }
        if (fits) return { col: c, row: r }
      }
    }

    // Fallback: place at the bottom
    return { col: 1, row: _getMaxRow() + 1 }
  }

  // ── Collision Resolution (Upward Gravity) ──────────────────────────────
  // After moving/resizing a view, displace any overlapping views.
  // Displaced views try to move UP first; only pushed down if no room above.

  function _canPlaceAt(view: GridView, col: number, row: number, excludeId: string): boolean {
    for (const other of views.value) {
      if (other.id === view.id || other.id === excludeId) continue
      if (col < other.col + other.colSpan &&
          col + view.colSpan > other.col &&
          row < other.row + other.rowSpan &&
          row + view.rowSpan > other.row) {
        return false
      }
    }
    return true
  }

  /** Try to find the highest row (>= 1) where `view` fits without overlapping anything except `excludeId`. */
  function _findUpwardSlot(view: GridView, excludeId: string): number | null {
    for (let testRow = 1; testRow < view.row; testRow++) {
      if (_canPlaceAt(view, view.col, testRow, excludeId)) return testRow
    }
    return null
  }

  function resolveCollisions(movedId: string, originalPos?: { col: number; row: number }): void {
    const moved = views.value.find((v) => v.id === movedId)
    if (!moved) return

    // Iterative displacement — keep resolving until stable
    let maxIterations = 50
    let changed = true

    while (changed && maxIterations-- > 0) {
      changed = false
      for (const other of views.value) {
        if (other.id === movedId) continue
        if (_overlaps(moved, other)) {
          // 1. Try to swap into the dragged box's original position
          if (originalPos && _canPlaceAt(other, originalPos.col, originalPos.row, movedId)) {
            other.col = originalPos.col
            other.row = originalPos.row
          } else {
            // 2. Try to move other UPWARD
            const upRow = _findUpwardSlot(other, movedId)
            if (upRow !== null) {
              other.row = upRow
            } else {
              // 3. Last resort — push below the moved view
              other.row = moved.row + moved.rowSpan
            }
          }
          changed = true
        }
      }

      // Now check all pairs for cascading collisions
      for (let i = 0; i < views.value.length; i++) {
        for (let j = i + 1; j < views.value.length; j++) {
          const a = views.value[i]!
          const b = views.value[j]!
          if (_overlaps(a, b)) {
            const lower = a.row >= b.row ? a : b
            const upper = a.row >= b.row ? b : a
            const upRow = _findUpwardSlot(lower, upper.id)
            if (upRow !== null) {
              lower.row = upRow
            } else {
              lower.row = upper.row + upper.rowSpan
            }
            changed = true
          }
        }
      }
    }
  }

  function _overlaps(a: GridView, b: GridView): boolean {
    const aRight = a.col + a.colSpan
    const aBottom = a.row + a.rowSpan
    const bRight = b.col + b.colSpan
    const bBottom = b.row + b.rowSpan

    return a.col < bRight && aRight > b.col && a.row < bBottom && aBottom > b.row
  }

  // ── Compaction ─────────────────────────────────────────────────────────
  // After removing a view, compact remaining views upward (gravity).

  function _compact(): void {
    // Sort by row then col
    const sorted = [...views.value].sort((a, b) => a.row - b.row || a.col - b.col)

    for (const view of sorted) {
      // Try to move this view upward as far as possible
      while (view.row > 1) {
        const testRow = view.row - 1
        const occupancy = _buildOccupancyMap(view.id)
        let canMove = true
        for (let c = view.col; c < view.col + view.colSpan; c++) {
          for (let r = testRow; r < testRow + view.rowSpan; r++) {
            if (occupancy.has(`${c},${r}`)) {
              canMove = false
              break
            }
          }
          if (!canMove) break
        }
        if (canMove) {
          view.row = testRow
        } else {
          break
        }
      }
    }
  }

  // ── View CRUD ──────────────────────────────────────────────────────────

  function addView(
    dataSource: string,
    projection: ProjectionType,
    options?: {
      title?: string
      colSpan?: number
      rowSpan?: number
      col?: number
      row?: number
    },
  ): GridView {
    const colSpan = options?.colSpan ?? GRID_COLS
    const rowSpan = options?.rowSpan ?? 1
    const pos = options?.col && options?.row
      ? { col: options.col, row: options.row }
      : autoPosition(colSpan, rowSpan)

    const view = createGridView({
      ...pos,
      colSpan,
      rowSpan,
      dataSource,
      projection,
      title: options?.title,
    })

    _pushUndo()
    views.value.push(view)
    resolveCollisions(view.id)
    _compact()
    _persist()
    return view
  }

  /** Create an unconfigured view at exact coordinates (for draw-to-create) */
  function addViewAt(col: number, row: number, colSpan: number, rowSpan: number): GridView {
    const view = createGridView({
      col,
      row,
      colSpan,
      rowSpan,
      dataSource: '',
      projection: 'table' as ProjectionType,
    })
    _pushUndo()
    views.value.push(view)
    resolveCollisions(view.id)
    _compact()
    _persist()
    return view
  }

  /** Create an unconfigured view auto-positioned (for "New View" button) */
  function addUnconfiguredView(): GridView {
    const pos = autoPosition(6, 1)
    return addViewAt(pos.col, pos.row, 6, 1)
  }

  function removeView(id: string): void {
    _pushUndo()
    views.value = views.value.filter((v) => v.id !== id)
    _compact()
    _persist()
  }

  function updateView(
    id: string,
    updates: Partial<Omit<GridView, 'id'>>,
  ): void {
    const view = views.value.find((v) => v.id === id)
    if (!view) return
    _pushUndo()
    Object.assign(view, updates)
    if (updates.col !== undefined || updates.row !== undefined ||
        updates.colSpan !== undefined || updates.rowSpan !== undefined) {
      resolveCollisions(id)
      _compact()
    }
    _persist()
  }

  function resizeView(id: string, col: number, row: number, colSpan: number, rowSpan: number): void {
    const view = views.value.find((v) => v.id === id)
    if (!view) return
    _pushUndo()

    // Clamp to grid bounds
    const clampedCol = Math.max(1, Math.min(col, GRID_COLS))
    const clampedRow = Math.max(1, row)
    const maxColSpan = GRID_COLS - clampedCol + 1
    view.col = clampedCol
    view.row = clampedRow
    view.colSpan = Math.max(1, Math.min(colSpan, maxColSpan))
    view.rowSpan = Math.max(1, rowSpan)

    resolveCollisions(id)
    _compact()
    _persist()
  }

  function moveView(id: string, col: number, row: number): void {
    const view = views.value.find((v) => v.id === id)
    if (!view) return
    _pushUndo()

    // Record original position for swap behavior
    const originalPos = { col: view.col, row: view.row }

    // Clamp to grid bounds
    view.col = Math.max(1, Math.min(col, GRID_COLS - view.colSpan + 1))
    view.row = Math.max(1, row)

    resolveCollisions(id, originalPos)
    _compact()
    _persist()
  }

  // ── Preview Move (non-mutating) ────────────────────────────────────────
  // Returns a preview layout showing where all views would be if `id` moved
  // to (col, row). Does NOT mutate real state or trigger persistence.

  function previewMove(id: string, col: number, row: number): GridView[] {
    const clone: GridView[] = JSON.parse(JSON.stringify(views.value))
    const moved = clone.find((v) => v.id === id)
    if (!moved) return clone

    // Record original position for swap behavior
    const originalPos = { col: moved.col, row: moved.row }

    moved.col = Math.max(1, Math.min(col, GRID_COLS - moved.colSpan + 1))
    moved.row = Math.max(1, row)

    // Resolve collisions on clone (swap-first, then upward gravity)
    function canPlaceInClone(view: GridView, col: number, row: number, excludeId: string): boolean {
      for (const other of clone) {
        if (other.id === view.id || other.id === excludeId) continue
        if (col < other.col + other.colSpan &&
            col + view.colSpan > other.col &&
            row < other.row + other.rowSpan &&
            row + view.rowSpan > other.row) {
          return false
        }
      }
      return true
    }

    function findUpInClone(view: GridView, excludeId: string): number | null {
      for (let r = 1; r < view.row; r++) {
        if (canPlaceInClone(view, view.col, r, excludeId)) return r
      }
      return null
    }

    let maxIter = 50
    let changed = true
    while (changed && maxIter-- > 0) {
      changed = false
      for (const other of clone) {
        if (other.id === id) continue
        if (_overlaps(moved, other)) {
          // 1. Try to swap into the dragged box's original position
          if (canPlaceInClone(other, originalPos.col, originalPos.row, id)) {
            other.col = originalPos.col
            other.row = originalPos.row
          } else {
            // 2. Try upward
            const upRow = findUpInClone(other, id)
            if (upRow !== null) {
              other.row = upRow
            } else {
              // 3. Push below
              other.row = moved.row + moved.rowSpan
            }
          }
          changed = true
        }
      }
      for (let i = 0; i < clone.length; i++) {
        for (let j = i + 1; j < clone.length; j++) {
          const a = clone[i]!
          const b = clone[j]!
          if (_overlaps(a, b)) {
            const lower = a.row >= b.row ? a : b
            const upper = a.row >= b.row ? b : a
            const upRow = findUpInClone(lower, upper.id)
            if (upRow !== null) {
              lower.row = upRow
            } else {
              lower.row = upper.row + upper.rowSpan
            }
            changed = true
          }
        }
      }
    }

    // Compact upward (gravity)
    const sorted = [...clone].sort((a, b) => a.row - b.row || a.col - b.col)
    for (const view of sorted) {
      if (view.id === id) continue // don't compact the moved view
      while (view.row > 1) {
        const testRow = view.row - 1
        let canMove = true
        for (let c = view.col; c < view.col + view.colSpan && canMove; c++) {
          for (let r = testRow; r < testRow + view.rowSpan && canMove; r++) {
            for (const other of clone) {
              if (other.id === view.id) continue
              if (c >= other.col && c < other.col + other.colSpan &&
                  r >= other.row && r < other.row + other.rowSpan) {
                canMove = false
              }
            }
          }
        }
        if (canMove) view.row = testRow
        else break
      }
    }

    return clone
  }

  // ── Grid Controls ──────────────────────────────────────────────────────

  function setGap(size: GridGap): void {
    gap.value = size
    _persist()
  }

  function applyPreset(preset: GridPreset): void {
    _pushUndo()
    views.value = preset.views.map((stub) =>
      createGridView({
        ...stub,
        dataSource: '',
        projection: 'table',
      }),
    )
    _persist()
  }

  function clearAll(): void {
    _pushUndo()
    views.value = []
    _persist()
  }

  // ── Computed ───────────────────────────────────────────────────────────

  const hasViews = computed(() => views.value.length > 0)
  const viewCount = computed(() => views.value.length)
  const maxRow = computed(() => _getMaxRow())

  // Views that have no data source configured yet (need user setup)
  const unconfiguredViews = computed(() =>
    views.value.filter((v) => !v.dataSource),
  )

  return {
    // State
    views,
    gap,
    editMode,
    pageConfig,

    // Computed
    hasViews,
    viewCount,
    maxRow,
    unconfiguredViews,

    // View CRUD
    addView,
    addViewAt,
    addUnconfiguredView,
    removeView,
    updateView,
    resizeView,
    moveView,

    // Grid controls
    setGap,
    applyPreset,
    clearAll,
    autoPosition,
    resolveCollisions,
    previewMove,

    // Batch mutation (for gap resize — single undo entry + single persist)
    beginBatchMutation: () => _pushUndo(),
    commitBatchMutation: () => _persist(),

    // Undo / Redo
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
