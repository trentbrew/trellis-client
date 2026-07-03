// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveEntityTransportMode, shouldAttemptLiveEntities } from './mode'

describe('entity transport mode', () => {
  it('uses fallback when no TrellisDb client', () => {
    expect(shouldAttemptLiveEntities(null)).toBe(false)
    expect(resolveEntityTransportMode(null, 5, false)).toBe('fallback')
  })

  it('uses live when client has hydrated browse rows', () => {
    expect(resolveEntityTransportMode({}, 3, false)).toBe('live')
  })

  it('uses fallback while live query is loading', () => {
    expect(resolveEntityTransportMode({}, 0, true)).toBe('fallback')
  })

  it('uses fallback when kernel-bridge returns zero browse rows after load', () => {
    expect(resolveEntityTransportMode({}, 0, false)).toBe('fallback')
  })
})
