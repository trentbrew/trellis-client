// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { applyPinCollisionOffsets, extractPinCandidates } from './extract-pins'

describe('extractPinCandidates', () => {
  it('emits pin from latitude and longitude', () => {
    const pins = extractPinCandidates([
      {
        id: 'entity:event-1',
        type: 'event',
        title: 'Meetup',
        latitude: 37.77,
        longitude: -122.42,
      },
    ])
    expect(pins).toHaveLength(1)
    expect(pins[0]).toMatchObject({
      entityId: 'entity:event-1',
      fieldKey: 'coordinates',
      lat: 37.77,
      lng: -122.42,
      queryText: null,
    })
  })

  it('geocodes event location text when coords missing', () => {
    const pins = extractPinCandidates([
      { id: 'e1', type: 'event', title: 'Dinner', location: 'Oakland, CA' },
    ])
    expect(pins).toHaveLength(1)
    expect(pins[0]).toMatchObject({
      fieldKey: 'location',
      queryText: 'Oakland, CA',
      lat: null,
      lng: null,
    })
  })

  it('strips HTML from location fields', () => {
    const pins = extractPinCandidates([
      { id: 'e1', type: 'appointment', title: 'Visit', location: '<p>Clinic <b>SF</b></p>' },
    ])
    expect(pins[0]?.queryText).toBe('Clinic SF')
  })

  it('produces separate trip origin and destination pins', () => {
    const pins = extractPinCandidates([
      {
        id: 't1',
        type: 'trip',
        title: 'NYC trip',
        origin: 'SFO',
        destination: 'JFK',
      },
    ])
    expect(pins).toHaveLength(2)
    expect(pins.map((p) => p.fieldKey).sort()).toEqual(['destination', 'origin'])
    expect(pins.find((p) => p.fieldKey === 'origin')?.label).toContain('(origin)')
  })

  it('skips empty location text', () => {
    const pins = extractPinCandidates([
      { id: 'e1', type: 'event', title: 'No place', location: '   ' },
      { id: 'e2', type: 'event', title: 'Also empty', location: '<p></p>' },
    ])
    expect(pins).toHaveLength(0)
  })

  it('dedupes identical entityId+fieldKey', () => {
    const pins = extractPinCandidates([
      { id: 'e1', type: 'event', title: 'X', location: 'A' },
      { id: 'e1', type: 'event', title: 'X', location: 'A' },
    ])
    expect(pins).toHaveLength(1)
  })

  it('prefers coordinates over text fields', () => {
    const pins = extractPinCandidates([
      {
        id: 'e1',
        type: 'event',
        title: 'Both',
        latitude: 1,
        longitude: 2,
        location: 'Somewhere else',
      },
    ])
    expect(pins).toHaveLength(1)
    expect(pins[0]?.fieldKey).toBe('coordinates')
  })
})

describe('applyPinCollisionOffsets', () => {
  it('offsets pins at identical coordinates', () => {
    const base = {
      id: 'a:coordinates',
      entityId: 'a',
      entityType: 'event' as const,
      fieldKey: 'coordinates',
      label: 'A',
    }
    const pins = applyPinCollisionOffsets([
      { ...base, lat: 10, lng: 20 },
      { ...base, id: 'b:coordinates', entityId: 'b', label: 'B', lat: 10, lng: 20 },
    ])
    expect(pins[0]?.lat).toBe(10)
    expect(pins[1]?.lat).not.toBe(10)
  })
})
