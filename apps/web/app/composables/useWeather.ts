export interface WeatherSnapshot {
  tempF: number
  condition: string
  icon: string
  locationLabel?: string
}

const CACHE_MS = 15 * 60 * 1000
const LAST_COORDS_KEY = 'menubar:weatherCoords'

function readStoredCoords(): { lat: number; lon: number } | null {
  if (!import.meta.client) return null
  try {
    const raw = window.localStorage.getItem(LAST_COORDS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { lat?: number; lon?: number }
    if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
      return { lat: parsed.lat, lon: parsed.lon }
    }
  } catch {
    // ignore
  }
  return null
}

const WMO_LUCIDE: Record<number, string> = {
  0: 'lucide:sun',
  1: 'lucide:sun',
  2: 'lucide:cloud-sun',
  3: 'lucide:cloud',
  45: 'lucide:cloud-fog',
  48: 'lucide:cloud-fog',
  51: 'lucide:cloud-drizzle',
  61: 'lucide:cloud-rain',
  71: 'lucide:cloud-snow',
  80: 'lucide:cloud-rain',
  95: 'lucide:cloud-lightning',
}

/**
 * Ambient weather chip — Open-Meteo via server proxy; 15min client cache (singleton).
 */
export function useWeather() {
  const data = useState<WeatherSnapshot | null>('menubar:weather', () => null)
  const loading = useState<boolean>('menubar:weatherLoading', () => false)
  const failed = useState<boolean>('menubar:weatherFailed', () => false)
  const cacheKey = useState<string>('menubar:weatherCacheKey', () => '')
  const cacheAt = useState<number>('menubar:weatherCacheAt', () => 0)
  const started = useState<boolean>('menubar:weatherStarted', () => false)

  async function load(lat: number, lon: number) {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
    const now = Date.now()
    if (cacheKey.value === key && data.value && now - cacheAt.value < CACHE_MS) {
      return
    }

    loading.value = true
    failed.value = false
    try {
      const result = await $fetch<WeatherSnapshot>('/api/ambient/weather', {
        query: { lat, lon },
      })
      cacheKey.value = key
      cacheAt.value = now
      data.value = result
    } catch {
      failed.value = true
      data.value = null
    } finally {
      loading.value = false
    }
  }

  function requestLocation() {
    if (!import.meta.client || !navigator.geolocation) {
      failed.value = true
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          window.localStorage.setItem(
            LAST_COORDS_KEY,
            JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          )
        } catch {
          // ignore
        }
        void load(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        failed.value = true
      },
      { maximumAge: CACHE_MS, timeout: 8000 },
    )
  }

  if (import.meta.client && !started.value) {
    started.value = true
    const stored = readStoredCoords()
    if (stored) void load(stored.lat, stored.lon)
    // Geolocation requires a user gesture in Brave/Safari — use refresh() from UI.
  }

  const visible = computed(() => !!data.value && !failed.value)

  return {
    data: readonly(data),
    loading: readonly(loading),
    failed: readonly(failed),
    visible,
    refresh: requestLocation,
  }
}
