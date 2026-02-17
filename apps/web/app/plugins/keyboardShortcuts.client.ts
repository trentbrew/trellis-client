/**
 * Global keyboard shortcut dispatcher.
 * Registers a single keydown listener that routes events through the shortcut registry.
 * Shows a lightweight toast for shortcut feedback.
 */
import { formatKeyChord } from '~/types/shortcuts'

export default defineNuxtPlugin(() => {
  const { dispatch } = useKeyboardShortcuts()

  const handler = (e: KeyboardEvent) => {
    const result = dispatch(e)
    if (!result) return

    const { shortcut, target } = result

    // Show toast feedback if configured
    const toastConfig = shortcut.showToast
    if (toastConfig === false) return

    const keyDisplay = formatKeyChord(shortcut.keys)
    const message = typeof toastConfig === 'string' ? toastConfig : shortcut.label

    _showShortcutToast(message, keyDisplay, target)
  }

  document.addEventListener('keydown', handler)
})

/** Lightweight DOM toast — bypasses vue-sonner module duplication in Vite dev mode */
function _showShortcutToast(message: string, keyChord: string, target?: string) {
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'hsl(var(--popover))',
    color: 'hsl(var(--popover-foreground))',
    border: '1px solid hsl(var(--border))',
    boxShadow: '0 4px 12px rgba(0,0,0,.15)',
    fontSize: '13px',
    lineHeight: '1.4',
    opacity: '0',
    transform: 'translateY(8px)',
    transition: 'opacity .2s, transform .2s',
    pointerEvents: 'none',
    maxWidth: '320px',
  })

  const targetHtml = target
    ? `<div style="opacity:.7;font-size:12px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_escapeHtml(target)}</div>`
    : ''
  el.innerHTML = `<div style="display:flex;align-items:baseline;gap:8px"><span style="font-weight:500">${_escapeHtml(message)}</span><span style="opacity:.4;font-size:11px">${keyChord}</span></div>${targetHtml}`
  document.body.appendChild(el)

  requestAnimationFrame(() => {
    el.style.opacity = '1'
    el.style.transform = 'translateY(0)'
  })

  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(8px)'
    setTimeout(() => el.remove(), 200)
  }, 2500)
}

/** Escape HTML special characters to prevent XSS in innerHTML */
function _escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
