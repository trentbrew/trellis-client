/**
 * Composable for managing recently used icons
 * Stores icon usage in localStorage
 */
export const useRecentlyUsedIcons = () => {
  const storageKey = 'recently-used-icons'
  const maxRecentIcons = 12

  const getRecentlyUsed = (): string[] => {
    if (!import.meta.client) return []
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) return parsed
        return []
      }
    } catch (error) {
      console.error('Failed to load recently used icons:', error)
    }
    return []
  }

  const addRecentlyUsed = (icon: string) => {
    if (!import.meta.client) return
    try {
      const recent = getRecentlyUsed()
      // Remove if already exists
      const filtered = recent.filter((i) => i !== icon)
      // Add to front
      const updated = [icon, ...filtered].slice(0, maxRecentIcons)
      localStorage.setItem(storageKey, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to save recently used icon:', error)
    }
  }

  return {
    getRecentlyUsed,
    addRecentlyUsed,
  }
}
