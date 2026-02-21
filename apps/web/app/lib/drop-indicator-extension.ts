import { Extension } from '@tiptap/core'

interface DropIndicatorHandlers {
  handleDragOver: (_e: DragEvent) => void
  handleDragLeave: (_e: DragEvent) => void
  handleDrop: () => void
  handleDragEnd: () => void
}

let indicatorEl: HTMLElement | null = null

function getIndicator(): HTMLElement {
  if (!indicatorEl) {
    indicatorEl = document.createElement('div')
    indicatorEl.className = 'tiptap-drop-indicator'
    indicatorEl.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'z-index:9999',
      'height:2px',
      'border-radius:1px',
      'background:var(--primary)',
      'display:none',
      'transition:top 0.08s ease, left 0.08s ease, width 0.08s ease',
    ].join(';')
    document.body.appendChild(indicatorEl)
  }
  return indicatorEl
}

function showIndicator(rect: DOMRect, position: 'before' | 'after') {
  const el = getIndicator()
  const y = position === 'before' ? rect.top - 1 : rect.bottom - 1
  el.style.display = 'block'
  el.style.left = `${rect.left}px`
  el.style.width = `${rect.width}px`
  el.style.top = `${y}px`
}

function hideIndicator() {
  if (indicatorEl) indicatorEl.style.display = 'none'
}

function getTopLevelBlock(editorDom: Element, view: any, pos: number): Element | null {
  try {
    const resolvedPos = view.state.doc.resolve(pos)
    const depth = resolvedPos.depth > 0 ? 1 : 0
    const startPos = resolvedPos.start(depth)
    const domInfo = view.domAtPos(startPos)
    let node: Node | null = domInfo.node
    while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentElement
    if (!node) return null
    const el = node as Element
    if (!editorDom.contains(el) || el === editorDom) return null
    let topLevel: Element = el
    while (topLevel.parentElement && topLevel.parentElement !== editorDom) {
      topLevel = topLevel.parentElement
    }
    return topLevel
  } catch {
    return null
  }
}

export const DropIndicator = Extension.create({
  name: 'dropIndicator',

  addStorage() {
    return { handlers: null as DropIndicatorHandlers | null }
  },

  onCreate() {
    const view = this.editor.view
    const editorDom = view.dom as HTMLElement
    let lastTarget: Element | null = null
    let lastPosition: 'before' | 'after' | null = null

    const handleDragOver = (event: DragEvent) => {
      const coords = { left: event.clientX, top: event.clientY }
      const posResult = view.posAtCoords(coords)
      if (!posResult) { hideIndicator(); lastTarget = null; lastPosition = null; return }

      const blockEl = getTopLevelBlock(editorDom, view, posResult.pos)
      if (!blockEl) { hideIndicator(); lastTarget = null; lastPosition = null; return }

      const rect = blockEl.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      const position: 'before' | 'after' = event.clientY < midY ? 'before' : 'after'

      if (lastTarget !== blockEl || lastPosition !== position) {
        lastTarget = blockEl
        lastPosition = position
        showIndicator(rect, position)
      }
    }

    const handleDragLeave = (event: DragEvent) => {
      const related = event.relatedTarget as Element | null
      if (!related || !editorDom.contains(related)) {
        hideIndicator()
        lastTarget = null
        lastPosition = null
      }
    }

    const handleDrop = () => { hideIndicator(); lastTarget = null; lastPosition = null }
    const handleDragEnd = () => { hideIndicator(); lastTarget = null; lastPosition = null }

    editorDom.addEventListener('dragover', handleDragOver)
    editorDom.addEventListener('dragleave', handleDragLeave)
    editorDom.addEventListener('drop', handleDrop)
    editorDom.addEventListener('dragend', handleDragEnd)

    this.storage.handlers = { handleDragOver, handleDragLeave, handleDrop, handleDragEnd }
  },

  onDestroy() {
    const view = this.editor?.view
    if (!view || !this.storage.handlers) return
    const { handleDragOver, handleDragLeave, handleDrop, handleDragEnd } = this.storage.handlers
    const editorDom = view.dom as HTMLElement
    editorDom.removeEventListener('dragover', handleDragOver)
    editorDom.removeEventListener('dragleave', handleDragLeave)
    editorDom.removeEventListener('drop', handleDrop)
    editorDom.removeEventListener('dragend', handleDragEnd)
    hideIndicator()
  },
})
