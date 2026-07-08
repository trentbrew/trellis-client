const WMO_LABELS: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Drizzle',
  61: 'Rain',
  71: 'Snow',
  80: 'Showers',
  95: 'Thunderstorm',
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

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const lat = Number(query.lat)
  const lon = Number(query.lon)

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw createError({ statusCode: 400, statusMessage: 'lat and lon required' })
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('current', 'temperature_2m,weather_code')
  url.searchParams.set('temperature_unit', 'fahrenheit')

  let response: Response
  try {
    response = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Weather provider unavailable' })
  }

  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: 'Weather provider unavailable' })
  }

  const json = (await response.json()) as {
    current?: { temperature_2m?: number; weather_code?: number }
  }

  const code = json.current?.weather_code ?? 0
  const tempF = Math.round(json.current?.temperature_2m ?? 0)

  return {
    tempF,
    condition: WMO_LABELS[code] ?? 'Weather',
    icon: WMO_LUCIDE[code] ?? 'lucide:thermometer',
  }
})
