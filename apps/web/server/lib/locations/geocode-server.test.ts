// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearGeocodeCache,
  geocodeQuery,
  getGeocodeCache,
  normalizeGeocodeQuery,
} from './geocode-server'

describe('geocode-server', () => {
  afterEach(() => {
    clearGeocodeCache()
  })

  it('normalizes query strings', () => {
    expect(normalizeGeocodeQuery('  San Francisco ')).toBe('san francisco')
  })

  it('returns cached result without second fetch', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            geometry: { coordinates: [-122.42, 37.77] },
            properties: { name: 'San Francisco', state: 'California', country: 'United States' },
          },
        ],
      }),
    })

    const first = await geocodeQuery('San Francisco', fetchFn)
    const second = await geocodeQuery('san francisco', fetchFn)

    expect(first).toEqual({
      lat: 37.77,
      lng: -122.42,
      placeName: 'San Francisco, California, United States',
    })
    expect(second).toEqual(first)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(getGeocodeCache('San Francisco')).toEqual(first)
  })

  it('returns null for empty query', async () => {
    expect(await geocodeQuery('  ')).toBeNull()
  })

  it('returns null when Photon responds with no features', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    })
    expect(await geocodeQuery('Nowhereville', fetchFn)).toBeNull()
  })
})
