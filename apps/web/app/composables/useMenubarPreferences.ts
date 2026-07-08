/**
 * Menubar widget visibility — persisted in localStorage.
 */
export function useMenubarPreferences() {
  const STORAGE_KEY = 'menubar-preferences'

  const showClock = useState<boolean>('menubar:showClock', () => true)
  const showWeather = useState<boolean>('menubar:showWeather', () => true)
  const showHostStats = useState<boolean>('menubar:showHostStats', () => true)

  if (import.meta.client) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<{
          showClock: boolean
          showWeather: boolean
          showHostStats: boolean
        }>
        if (typeof parsed.showClock === 'boolean') showClock.value = parsed.showClock
        if (typeof parsed.showWeather === 'boolean') showWeather.value = parsed.showWeather
        if (typeof parsed.showHostStats === 'boolean') showHostStats.value = parsed.showHostStats
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
        showClock: showClock.value,
        showWeather: showWeather.value,
        showHostStats: showHostStats.value,
      }),
    )
  }

  const setShowClock = (v: boolean) => {
    showClock.value = v
    persist()
  }
  const setShowWeather = (v: boolean) => {
    showWeather.value = v
    persist()
  }
  const setShowHostStats = (v: boolean) => {
    showHostStats.value = v
    persist()
  }

  const resetMenubarPreferences = () => {
    setShowClock(true)
    setShowWeather(true)
    setShowHostStats(true)
  }

  return {
    showClock: readonly(showClock),
    showWeather: readonly(showWeather),
    showHostStats: readonly(showHostStats),
    setShowClock,
    setShowWeather,
    setShowHostStats,
    resetMenubarPreferences,
  }
}
