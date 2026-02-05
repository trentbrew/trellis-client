/**
 * Composable for managing favorite icons
 * Stores favorite icons in localStorage
 */
export const useFavoriteIcons = () => {
  const storageKey = 'favorite-icons'

  const getFavorites = (): string[] => {
    if (!import.meta.client) return []
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.every((v) => typeof v === 'string')) return parsed
        return []
      }
    } catch (error) {
      console.error('Failed to load favorite icons:', error)
    }
    return []
  }

  const addFavorite = (icon: string) => {
    if (!import.meta.client) return
    try {
      const favorites = getFavorites()
      if (!favorites.includes(icon)) {
        favorites.push(icon)
        localStorage.setItem(storageKey, JSON.stringify(favorites))
      }
    } catch (error) {
      console.error('Failed to save favorite icon:', error)
    }
  }

  const removeFavorite = (icon: string) => {
    if (!import.meta.client) return
    try {
      const favorites = getFavorites()
      const filtered = favorites.filter((i) => i !== icon)
      localStorage.setItem(storageKey, JSON.stringify(filtered))
    } catch (error) {
      console.error('Failed to remove favorite icon:', error)
    }
  }

  const toggleFavorite = (icon: string) => {
    const favorites = getFavorites()
    if (favorites.includes(icon)) {
      removeFavorite(icon)
    } else {
      addFavorite(icon)
    }
  }

  const isFavorite = (icon: string): boolean => {
    return getFavorites().includes(icon)
  }

  return {
    getFavorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  }
}
