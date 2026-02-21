import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'

const PLUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
const X_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

// ── Helpers ──────────────────────────────────────────────────────────

function getRows(tableEl: HTMLElement): HTMLTableRowElement[] {
  return Array.from(
    tableEl.querySelectorAll(':scope > tbody > tr, :scope > thead > tr, :scope > tr'),
  ) as HTMLTableRowElement[]
}

function getCells(row: HTMLTableRowElement): HTMLTableCellElement[] {
  return Array.from(row.querySelectorAll(':scope > td, :scope > th')) as HTMLTableCellElement[]
}

function tableSig(tableEl: HTMLElement): string {
  const rows = getRows(tableEl)
  const cols = rows[0] ? getCells(rows[0]).length : 0
  return `${rows.length}x${cols}`
}

function focusCell(editor: Editor, cell: Element) {
  try {
    const pos = editor.view.posAtDOM(cell, 0)
    if (pos >= 0) editor.commands.setTextSelection(pos)
  } catch { /* ignore */ }
}

function makeBtn(cls: string, title: string, svg: string, handler: (_e: MouseEvent) => void): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = cls
  btn.title = title
  btn.innerHTML = svg
  btn.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    handler(e)
  })
  return btn
}

// ── Overlay management ───────────────────────────────────────────────
// Controls are rendered as absolutely-positioned children of .tableWrapper
// (the div ProseMirror wraps around <table>). ProseMirror only reconciles
// the <table> itself, so our overlay div survives DOM sync.

interface OverlayState {
  wrapper: HTMLDivElement
  sig: string
}

const overlayMap = new WeakMap<HTMLElement, OverlayState>()

function removeOverlay(tableEl: HTMLElement) {
  const state = overlayMap.get(tableEl)
  if (state) {
    state.wrapper.remove()
    overlayMap.delete(tableEl)
  }
}

function ensureOverlay(editor: Editor, tableEl: HTMLElement) {
  const sig = tableSig(tableEl)
  const existing = overlayMap.get(tableEl)
  if (existing && existing.sig === sig) {
    // Reposition only
    positionOverlay(tableEl, existing.wrapper)
    return
  }

  // Remove stale overlay
  if (existing) removeOverlay(tableEl)

  const rows = getRows(tableEl)
  if (!rows.length) return

  // Create overlay wrapper — lives outside ProseMirror's managed DOM
  const wrapper = document.createElement('div')
  wrapper.className = 'tc-overlay'
  wrapper.contentEditable = 'false'
  wrapper.setAttribute('data-tc-overlay', '')

  // ── "+" add-row button (bottom of table) ──────────────────────────
  const addRowBtn = makeBtn('tc-add-row', 'Add row', PLUS_SVG, () => {
    const lastRow = getRows(tableEl).at(-1)
    const cell = lastRow ? getCells(lastRow)[0] : null
    if (cell) {
      focusCell(editor, cell)
      editor.chain().focus().addRowAfter().run()
    }
  })
  wrapper.appendChild(addRowBtn)

  // ── "+" add-column button (right of table) ────────────────────────
  const addColBtn = makeBtn('tc-add-col', 'Add column', PLUS_SVG, () => {
    const firstRow = getRows(tableEl)[0]
    const lastCell = firstRow ? getCells(firstRow).at(-1) : null
    if (lastCell) {
      focusCell(editor, lastCell)
      editor.chain().focus().addColumnAfter().run()
    }
  })
  wrapper.appendChild(addColBtn)

  // ── Delete-row buttons (one per row, left gutter) ─────────────────
  rows.forEach((row) => {
    const cells = getCells(row)
    if (!cells.length) return
    const btn = makeBtn('tc-del-row', 'Delete row', X_SVG, () => {
      focusCell(editor, cells[0]!)
      editor.chain().focus().deleteRow().run()
    })
    btn.dataset.rowIndex = String(Array.from(row.parentElement!.children).indexOf(row))
    wrapper.appendChild(btn)
  })

  // ── Delete-column buttons (one per col, top gutter) ───────────────
  const firstRow = rows[0]!
  const firstCells = getCells(firstRow)
  firstCells.forEach((cell, colIdx) => {
    const btn = makeBtn('tc-del-col', 'Delete column', X_SVG, () => {
      focusCell(editor, cell)
      editor.chain().focus().deleteColumn().run()
    })
    btn.dataset.colIndex = String(colIdx)
    wrapper.appendChild(btn)
  })

  // Insert overlay inside .tableWrapper (ProseMirror won't strip it)
  const tableWrapper = (tableEl.closest('.tableWrapper') ?? tableEl.parentElement) as HTMLElement | null
  if (!tableWrapper) return
  tableWrapper.style.position = 'relative'
  tableWrapper.appendChild(wrapper)

  positionOverlay(tableEl, wrapper)
  overlayMap.set(tableEl, { wrapper, sig })
}

function positionOverlay(tableEl: HTMLElement, wrapper: HTMLDivElement) {
  const tableRect = tableEl.getBoundingClientRect()
  const wrapperParent = tableEl.closest('.tableWrapper') ?? tableEl.parentElement
  const parentRect = wrapperParent?.getBoundingClientRect() ?? tableRect

  const top = tableRect.top - parentRect.top
  const left = tableRect.left - parentRect.left

  wrapper.style.position = 'absolute'
  wrapper.style.top = `${top}px`
  wrapper.style.left = `${left}px`
  wrapper.style.width = `${tableRect.width}px`
  wrapper.style.height = `${tableRect.height}px`
  wrapper.style.pointerEvents = 'none'
  wrapper.style.zIndex = '5'

  // Position add-row at bottom center
  const addRow = wrapper.querySelector<HTMLElement>('.tc-add-row')
  if (addRow) {
    addRow.style.position = 'absolute'
    addRow.style.bottom = '-20px'
    addRow.style.left = '50%'
    addRow.style.transform = 'translateX(-50%)'
    addRow.style.pointerEvents = 'auto'
  }

  // Position add-col at right center
  const addCol = wrapper.querySelector<HTMLElement>('.tc-add-col')
  if (addCol) {
    addCol.style.position = 'absolute'
    addCol.style.right = '-20px'
    addCol.style.top = '50%'
    addCol.style.transform = 'translateY(-50%)'
    addCol.style.pointerEvents = 'auto'
  }

  // Position delete-row buttons in left gutter
  const rows = getRows(tableEl)
  wrapper.querySelectorAll<HTMLElement>('.tc-del-row').forEach((btn) => {
    const idx = parseInt(btn.dataset.rowIndex ?? '0', 10)
    const row = rows[idx]
    if (!row) return
    const rowRect = row.getBoundingClientRect()
    const rowTop = rowRect.top - tableRect.top
    btn.style.position = 'absolute'
    btn.style.left = '-18px'
    btn.style.top = `${rowTop + rowRect.height / 2}px`
    btn.style.transform = 'translateY(-50%)'
    btn.style.pointerEvents = 'auto'
  })

  // Position delete-col buttons in top gutter
  const firstRow = rows[0]
  const cells = firstRow ? getCells(firstRow) : []
  wrapper.querySelectorAll<HTMLElement>('.tc-del-col').forEach((btn) => {
    const idx = parseInt(btn.dataset.colIndex ?? '0', 10)
    const cell = cells[idx]
    if (!cell) return
    const cellRect = cell.getBoundingClientRect()
    const cellLeft = cellRect.left - tableRect.left
    btn.style.position = 'absolute'
    btn.style.top = '-18px'
    btn.style.left = `${cellLeft + cellRect.width / 2}px`
    btn.style.transform = 'translateX(-50%)'
    btn.style.pointerEvents = 'auto'
  })
}

function refreshAllTables(editor: Editor) {
  const dom = editor.view.dom
  const tables = dom.querySelectorAll<HTMLElement>('table')
  const activeTables = new Set<HTMLElement>()

  tables.forEach((t) => {
    activeTables.add(t)
    ensureOverlay(editor, t)
  })

  // Clean up overlays for removed tables — not strictly needed since
  // WeakMap handles GC, but removes stale DOM nodes promptly.
  dom.querySelectorAll<HTMLElement>('[data-tc-overlay]').forEach((el) => {
    // Check if the overlay's table still exists
    const prev = el.previousElementSibling
    const tableInPrev = prev?.querySelector('table') ?? (prev?.tagName === 'TABLE' ? prev : null)
    if (!tableInPrev || !activeTables.has(tableInPrev as HTMLElement)) {
      el.remove()
    }
  })
}

// ── TipTap Extension ─────────────────────────────────────────────────
// Uses requestAnimationFrame to coalesce onUpdate calls. The overlay
// lives inside .tableWrapper (not inside <table>), so ProseMirror's DOM
// reconciliation leaves it alone and Yjs sync is not affected.

function scheduleRefresh(editor: Editor) {
  if ((editor as any)._tcRafId) return
  ;(editor as any)._tcRafId = requestAnimationFrame(() => {
    ;(editor as any)._tcRafId = null
    refreshAllTables(editor)
  })
}

export const TableControls = Extension.create({
  name: 'tableControls',

  onCreate() {
    scheduleRefresh(this.editor)
  },

  onUpdate() {
    scheduleRefresh(this.editor)
  },

  onDestroy() {
    const rafId = (this.editor as any)._tcRafId
    if (rafId) cancelAnimationFrame(rafId)
    ;(this.editor as any)._tcRafId = null
    // Remove all overlays
    const parent = this.editor.view.dom.parentElement
    if (parent) {
      parent.querySelectorAll('[data-tc-overlay]').forEach((el: Element) => el.remove())
    }
  },
})
