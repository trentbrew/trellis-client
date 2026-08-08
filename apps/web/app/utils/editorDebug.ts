const FLAG_KEY = 'trellis:debug:editor'

let cachedEnabled: boolean | null = null

export function isEditorDebugEnabled(): boolean {
  if (cachedEnabled !== null) return cachedEnabled
  if (typeof window === 'undefined') {
    cachedEnabled = false
    return cachedEnabled
  }
  try {
    const stored = window.localStorage.getItem(FLAG_KEY)
    cachedEnabled = stored === '1' || stored === 'true' || (window as any).__TRELLIS_DEBUG_EDITOR === true
  } catch {
    cachedEnabled = (window as any).__TRELLIS_DEBUG_EDITOR === true
  }
  return cachedEnabled
}

export function setEditorDebugEnabled(enabled: boolean): void {
  cachedEnabled = enabled
  if (typeof window === 'undefined') return
  try {
    if (enabled) window.localStorage.setItem(FLAG_KEY, '1')
    else window.localStorage.removeItem(FLAG_KEY)
  } catch {
    /* ignore */
  }
  ;(window as any).__TRELLIS_DEBUG_EDITOR = enabled
}

export function editorLog(scope: string, event: string, detail?: Record<string, unknown>): void {
  if (!isEditorDebugEnabled()) return
  const stamp = typeof performance !== 'undefined' ? performance.now().toFixed(1) : ''
  if (detail) console.log(`[${scope}] ${event} +${stamp}ms`, detail)
  else console.log(`[${scope}] ${event} +${stamp}ms`)
}

export function summarizeHtml(html: string | undefined | null): string {
  if (!html) return '<empty>'
  const flat = html.replace(/\s+/g, ' ').trim()
  return flat.length > 120 ? `${flat.slice(0, 120)}…(${flat.length})` : `${flat} (${flat.length})`
}

if (typeof window !== 'undefined') {
  ;(window as any).__trellisEditorDebug = {
    enable: () => setEditorDebugEnabled(true),
    disable: () => setEditorDebugEnabled(false),
    status: () => isEditorDebugEnabled(),
  }
}
