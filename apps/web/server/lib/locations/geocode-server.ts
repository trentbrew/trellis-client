export interface GeocodeResult {
  lat: number
  lng: number
  placeName: string
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map<string, { data: GeocodeResult; expires: number }>()

export function normalizeGeocodeQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function getGeocodeCache(query: string): GeocodeResult | null {
  const key = normalizeGeocodeQuery(query)
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expires < Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function setGeocodeCache(query: string, data: GeocodeResult) {
  const key = normalizeGeocodeQuery(query)
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS })
}

export function clearGeocodeCache() {
  cache.clear()
}

function formatPhotonPlaceName(
  props: Record<string, string | undefined>,
  fallback: string,
): string {
  const parts = [props.name, props.city, props.state, props.country].filter(Boolean)
  return parts.length ? parts.join(', ') : fallback
}

/** Geocode via Photon (Komoot/OSM) — free, no API key. */
export async function geocodeQuery(
  query: string,
  fetchFn: typeof fetch = fetch,
): Promise<GeocodeResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const cached = getGeocodeCache(trimmed)
  if (cached) return cached

  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', trimmed)
  url.searchParams.set('limit', '1')
  url.searchParams.set('lang', 'en')

  const resp = await fetchFn(url.toString(), {
    headers: { 'User-Agent': 'Trellis/1.0 (locations map; local-first)' },
  })
  if (!resp.ok) return null

  const raw = (await resp.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] }
      properties?: Record<string, string | undefined>
    }>
  }
  const feature = raw.features?.[0]
  const coords = feature?.geometry?.coordinates
  if (!coords || coords.length < 2) return null

  const [lng, lat] = coords
  const result: GeocodeResult = {
    lat,
    lng,
    placeName: formatPhotonPlaceName(feature.properties ?? {}, trimmed),
  }
  setGeocodeCache(trimmed, result)
  return result
}
