/**
 * Menubar widget visibility — persisted in localStorage.
 */
export function useMenubarPreferences() {
  const STORAGE_KEY = 'menubar-preferences'

  const showWeather = useState<boolean>('menubar:showWeather', () => true)

  if (import.meta.client) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<{
          showWeather: boolean
        }>
        if (typeof parsed.showWeather === 'boolean') showWeather.value = parsed.showWeather
      } catch {
        // ignore
      }
    }
  }

  const persist = () => {
    if (!import.meta.client) return
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        showWeather: showWeather.value,
      }),
    )
  }

  const setShowWeather = (v: boolean) => {
    showWeather.value = v
    persist()
  }

  const resetMenubarPreferences = () => {
    setShowWeather(true)
  }

  return {
    showWeather: readonly(showWeather),
    setShowWeather,
    resetMenubarPreferences,
  }
}
