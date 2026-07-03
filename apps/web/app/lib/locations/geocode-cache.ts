import type { GeocodeResult } from './types'

const cache = new Map<string, { data: GeocodeResult; expires: number }>()

export function normalizeGeocodeQuery(query: string): string {
  return query.trim().toLowerCase()
}

export function getClientGeocodeCache(query: string): GeocodeResult | null {
  const key = normalizeGeocodeQuery(query)
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expires < Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function setClientGeocodeCache(query: string, data: GeocodeResult, ttlMs = 24 * 60 * 60 * 1000) {
  const key = normalizeGeocodeQuery(query)
  cache.set(key, { data, expires: Date.now() + ttlMs })
}

export function clearClientGeocodeCache() {
  cache.clear()
}
