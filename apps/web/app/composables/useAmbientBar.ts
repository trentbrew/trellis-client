/**
 * Aggregates sky-layer menubar data sources.
 */
export function useAmbientBar() {
  const status = useStatusBar()
  const { timezone } = useUserProfile()
  const weather = useWeather()
  const host = useSystemStats()
  const prefs = useMenubarPreferences()

  return {
    status,
    timezone,
    weather,
    host,
    prefs,
  }
}
