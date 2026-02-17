/**
 * Weather proxy endpoint.
 *
 * GET /api/weather?lat=41.88&lon=-87.63
 *
 * Proxies to Open-Meteo (free, no API key) and returns current conditions
 * plus today's high/low. Caches responses for 15 minutes per coordinate pair.
 */

const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const lat = parseFloat(query.lat as string)
  const lon = parseFloat(query.lon as string)

  if (isNaN(lat) || isNaN(lon)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing or invalid ?lat and ?lon parameters' })
  }

  // Round to 2 decimal places for cache key (≈1km precision)
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day')
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min')
  url.searchParams.set('temperature_unit', 'fahrenheit')
  url.searchParams.set('wind_speed_unit', 'mph')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '1')

  try {
    const resp = await fetch(url.toString())
    if (!resp.ok) {
      throw createError({ statusCode: 502, statusMessage: `Open-Meteo returned ${resp.status}` })
    }

    const raw = await resp.json() as any

    const data = {
      temperature: raw.current?.temperature_2m ?? null,
      feelsLike: raw.current?.apparent_temperature ?? null,
      humidity: raw.current?.relative_humidity_2m ?? null,
      windSpeed: raw.current?.wind_speed_10m ?? null,
      weatherCode: raw.current?.weather_code ?? 0,
      isDay: raw.current?.is_day ?? 1,
      high: raw.daily?.temperature_2m_max?.[0] ?? null,
      low: raw.daily?.temperature_2m_min?.[0] ?? null,
      unit: '°F',
    }

    cache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL })
    return data
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 502, statusMessage: `Weather fetch failed: ${err.message}` })
  }
})
