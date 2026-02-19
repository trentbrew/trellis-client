const STORAGE_KEY = 'trellis:pinned-settings'

export function usePinnedSettings() {
  const pinnedPaths = useState<string[]>('pinned-settings', () => {
    if (!import.meta.client) return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  function persist() {
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedPaths.value))
    } catch {
      // ignore write errors
    }
  }

  function isPinned(path: string): boolean {
    return pinnedPaths.value.includes(path)
  }

  function pin(path: string) {
    if (!pinnedPaths.value.includes(path)) {
      pinnedPaths.value = [...pinnedPaths.value, path]
      persist()
    }
  }

  function unpin(path: string) {
    pinnedPaths.value = pinnedPaths.value.filter((p) => p !== path)
    persist()
  }

  function togglePin(path: string) {
    if (isPinned(path)) unpin(path)
    else pin(path)
  }

  return { pinnedPaths, isPinned, pin, unpin, togglePin }
}
