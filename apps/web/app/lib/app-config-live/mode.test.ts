// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveAppConfigTransportMode, shouldAttemptLiveAppConfig } from './mode'

describe('app config transport mode', () => {
  it('uses fallback when no TrellisDb client', () => {
    expect(shouldAttemptLiveAppConfig(null)).toBe(false)
    expect(resolveAppConfigTransportMode(null, 5, false)).toBe('fallback')
  })

  it('uses live when client has hydrated config rows', () => {
    expect(resolveAppConfigTransportMode({}, 3, false)).toBe('live')
  })

  it('uses fallback while live query is loading', () => {
    expect(resolveAppConfigTransportMode({}, 0, true)).toBe('fallback')
  })

  it('uses fallback when sidecar has zero config rows after load', () => {
    expect(resolveAppConfigTransportMode({}, 0, false)).toBe('fallback')
  })
})
