/**
 * Universal entity selection composable.
 *
 * Provides multi-select with shift+click range selection, cmd/ctrl+click
 * additive selection, and escape to clear. Works across all projections
 * (grid, list, kanban, table, feed) — selection is by entity ID, not DOM position.
 *
 * Selection state persists across view mode switches within the same page.
 */

import type { Entity } from '~/types/entity'

export interface UseEntitySelectionOptions {
  /** Enable shift+click range selection (default: true) */
  rangeSelect?: boolean
}

export function useEntitySelection(
  items: Ref<Entity[]> | ComputedRef<Entity[]>,
  options: UseEntitySelectionOptions = {},
) {
  const { rangeSelect = true } = options

  const selectedIds = ref(new Set<string>())
  const lastSelectedId = ref<string | null>(null)

  // ── Core API ─────────────────────────────────────────────────────────────

  const isSelected = (id: string): boolean => selectedIds.value.has(id)

  const selectAll = () => {
    const newSet = new Set<string>()
    for (const item of items.value) {
      if (item.id) newSet.add(item.id)
    }
    selectedIds.value = newSet
  }

  const clearSelection = () => {
    selectedIds.value = new Set()
    lastSelectedId.value = null
  }

  /**
   * Toggle selection for a single item.
   * Supports modifier keys for range and additive selection.
   *
   * - No modifier: replace selection with this item
   * - Cmd/Ctrl (or forceAdditive): toggle this item without affecting others
   * - Shift: select range from last selected to this item
   */
  const toggle = (id: string, event?: MouseEvent | KeyboardEvent, forceAdditive = false) => {
    const isMetaKey = event?.metaKey || event?.ctrlKey
    const isShiftKey = event?.shiftKey

    if (isShiftKey && rangeSelect && lastSelectedId.value) {
      handleRangeSelect(id)
      return
    }

    if (isMetaKey || forceAdditive) {
      handleAdditiveToggle(id)
      return
    }

    // Simple click — replace selection
    if (selectedIds.value.has(id) && selectedIds.value.size === 1) {
      clearSelection()
    } else {
      selectedIds.value = new Set([id])
      lastSelectedId.value = id
    }
  }

  // ── Range select (shift+click) ─────────────────────────────────────────

  const handleRangeSelect = (targetId: string) => {
    const allIds = items.value.map(i => i.id).filter(Boolean)
    const anchorIdx = allIds.indexOf(lastSelectedId.value!)
    const targetIdx = allIds.indexOf(targetId)

    if (anchorIdx === -1 || targetIdx === -1) {
      // Fallback to simple select if either ID not found
      selectedIds.value = new Set([targetId])
      lastSelectedId.value = targetId
      return
    }

    const start = Math.min(anchorIdx, targetIdx)
    const end = Math.max(anchorIdx, targetIdx)
    const rangeIds = allIds.slice(start, end + 1)

    const newSet = new Set(selectedIds.value)
    for (const rid of rangeIds) {
      newSet.add(rid)
    }
    selectedIds.value = newSet
    // Keep anchor unchanged for continued shift-click ranges
  }

  // ── Additive toggle (cmd/ctrl+click) ───────────────────────────────────

  const handleAdditiveToggle = (id: string) => {
    const newSet = new Set(selectedIds.value)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    selectedIds.value = newSet
    lastSelectedId.value = id
  }

  // ── Derived state ──────────────────────────────────────────────────────

  const selectedItems = computed(() => {
    const ids = selectedIds.value
    if (ids.size === 0) return []
    return items.value.filter(i => i.id && ids.has(i.id))
  })

  const hasSelection = computed(() => selectedIds.value.size > 0)
  const selectionCount = computed(() => selectedIds.value.size)

  // ── Keyboard shortcuts via registry ────────────────────────────────────

  const { register: registerShortcut, pushScope, popScope } = useKeyboardShortcuts()

  const _unregSelectAll = registerShortcut('select-all', () => {
    selectAll()
    const count = selectedIds.value.size
    return count ? `${count} item${count !== 1 ? 's' : ''}` : undefined
  })
  const _unregClearSelection = registerShortcut('clear-selection', () => {
    const count = selectedIds.value.size
    if (count) {
      clearSelection()
      return `${count} item${count !== 1 ? 's' : ''}`
    }
  })

  onMounted(() => {
    pushScope('browse')
  })

  onUnmounted(() => {
    popScope('browse')
    _unregSelectAll()
    _unregClearSelection()
  })

  return {
    selectedIds: readonly(selectedIds),
    isSelected,
    toggle,
    selectAll,
    clearSelection,
    selectedItems,
    hasSelection,
    selectionCount,
  }
}
