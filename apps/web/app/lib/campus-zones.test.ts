import { describe, expect, test } from 'vitest'
import { CAMPUS_ZONES } from '~/composables/useZoneContext'
import { campusZoneMeta, zoneKindFromId } from './campus-zones'

describe('zoneKindFromId', () => {
  test('resolves known zone ids', () => {
    expect(zoneKindFromId(CAMPUS_ZONES.workshop)).toBe('workshop')
    expect(zoneKindFromId(CAMPUS_ZONES.vault)).toBe('vault')
  })

  test('falls back to lab', () => {
    expect(zoneKindFromId('entity:unknown')).toBe('lab')
    expect(zoneKindFromId(null)).toBe('lab')
  })
})

describe('campusZoneMeta', () => {
  test('returns label and home path for zone', () => {
    expect(campusZoneMeta(CAMPUS_ZONES.showroom).label).toBe('Showroom')
    expect(campusZoneMeta(CAMPUS_ZONES.showroom).homePath).toBe('/pages')
  })
})
