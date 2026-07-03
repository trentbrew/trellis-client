import { ref } from 'vue'

const clampWidth = (width: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(width)))

/**
 * Per-table column widths persisted to localStorage under `storageKey`.
 * Widths are clamped to [min, max]; `resetColumnWidth` restores the default.
 */
export function useColumnWidths(storageKey: string, bounds: { min: number; max: number }) {
  const widths = ref<Record<string, number>>({})

  if (import.meta.client) {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          for (const [key, value] of Object.entries(parsed)) {
            if (typeof value === 'number' && Number.isFinite(value)) widths.value[key] = value
          }
        }
      }
    } catch {
      // Ignore corrupt storage; fall back to defaults.
    }
  }

  const persist = () => {
    if (!import.meta.client) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(widths.value))
    } catch {
      // Storage may be unavailable (private mode, quota); widths stay in-memory.
    }
  }

  const setColumnWidth = (key: string, width: number, min = bounds.min, max = bounds.max) => {
    widths.value = { ...widths.value, [key]: clampWidth(width, min, max) }
    persist()
  }

  const resetColumnWidth = (key: string) => {
    widths.value = Object.fromEntries(Object.entries(widths.value).filter(([k]) => k !== key))
    persist()
  }

  return { widths, setColumnWidth, resetColumnWidth }
}
