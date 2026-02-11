/**
 * Weather composable.
 *
 * Uses browser Geolocation API to get coordinates, then fetches current
 * conditions from /api/weather (Open-Meteo proxy). Refreshes every 15 min.
 * Gracefully degrades if geolocation is denied or unavailable.
 */

export interface WeatherData {
  temperature: number | null
  feelsLike: number | null
  humidity: number | null
  windSpeed: number | null
  weatherCode: number
  isDay: number
  high: number | null
  low: number | null
  unit: string
}

export type WeatherStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'error'

// WMO Weather interpretation codes → icon + label
// https://open-meteo.com/en/docs#weathervariables
const WMO_MAP: Record<number, { icon: string; iconNight?: string; label: string }> = {
  0:  { icon: 'lucide:sun',          iconNight: 'lucide:moon',        label: 'Clear' },
  1:  { icon: 'lucide:sun',          iconNight: 'lucide:moon',        label: 'Mostly clear' },
  2:  { icon: 'lucide:cloud-sun',    iconNight: 'lucide:cloud-moon',  label: 'Partly cloudy' },
  3:  { icon: 'lucide:cloud',                                         label: 'Overcast' },
  45: { icon: 'lucide:cloud-fog',                                     label: 'Fog' },
  48: { icon: 'lucide:cloud-fog',                                     label: 'Rime fog' },
  51: { icon: 'lucide:cloud-drizzle',                                 label: 'Light drizzle' },
  53: { icon: 'lucide:cloud-drizzle',                                 label: 'Drizzle' },
  55: { icon: 'lucide:cloud-drizzle',                                 label: 'Heavy drizzle' },
  61: { icon: 'lucide:cloud-rain',                                    label: 'Light rain' },
  63: { icon: 'lucide:cloud-rain',                                    label: 'Rain' },
  65: { icon: 'lucide:cloud-rain',                                    label: 'Heavy rain' },
  66: { icon: 'lucide:cloud-rain',                                    label: 'Freezing rain' },
  67: { icon: 'lucide:cloud-rain',                                    label: 'Heavy freezing rain' },
  71: { icon: 'lucide:cloud-snow',                                    label: 'Light snow' },
  73: { icon: 'lucide:cloud-snow',                                    label: 'Snow' },
  75: { icon: 'lucide:cloud-snow',                                    label: 'Heavy snow' },
  77: { icon: 'lucide:cloud-snow',                                    label: 'Snow grains' },
  80: { icon: 'lucide:cloud-rain',                                    label: 'Rain showers' },
  81: { icon: 'lucide:cloud-rain',                                    label: 'Rain showers' },
  82: { icon: 'lucide:cloud-rain',                                    label: 'Heavy showers' },
  85: { icon: 'lucide:cloud-snow',                                    label: 'Snow showers' },
  86: { icon: 'lucide:cloud-snow',                                    label: 'Heavy snow showers' },
  95: { icon: 'lucide:cloud-lightning',                               label: 'Thunderstorm' },
  96: { icon: 'lucide:cloud-lightning',                               label: 'Thunderstorm w/ hail' },
  99: { icon: 'lucide:cloud-lightning',                               label: 'Thunderstorm w/ heavy hail' },
}

function resolveWMO(code: number, isDay: number) {
  const entry = WMO_MAP[code] || WMO_MAP[0]!
  const icon = (!isDay && entry.iconNight) ? entry.iconNight : entry.icon
  return { icon, label: entry.label }
}

const REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes

export function useWeather() {
  const weather = ref<WeatherData | null>(null)
  const status = ref<WeatherStatus>('idle')

  const weatherIcon = computed(() => {
    if (!weather.value) return 'lucide:cloud'
    return resolveWMO(weather.value.weatherCode, weather.value.isDay).icon
  })

  const weatherLabel = computed(() => {
    if (!weather.value) return ''
    return resolveWMO(weather.value.weatherCode, weather.value.isDay).label
  })

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  async function fetchWeather(lat: number, lon: number) {
    try {
      status.value = 'loading'
      const data = await $fetch<WeatherData>('/api/weather', {
        params: { lat, lon },
      })
      weather.value = data
      status.value = 'ready'
    } catch {
      status.value = 'error'
    }
  }

  function init() {
    if (!import.meta.client) return
    if (!navigator.geolocation) {
      status.value = 'error'
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        fetchWeather(latitude, longitude)

        // Refresh every 15 min
        refreshTimer = setInterval(() => {
          fetchWeather(latitude, longitude)
        }, REFRESH_INTERVAL)
      },
      () => {
        status.value = 'denied'
      },
      { timeout: 10000, maximumAge: 300000 },
    )
  }

  if (import.meta.client) {
    init()

    onScopeDispose(() => {
      if (refreshTimer) clearInterval(refreshTimer)
    })
  }

  return {
    weather,
    status,
    weatherIcon,
    weatherLabel,
  }
}
