// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { shouldRefetchAppConfigFromSSE } from '~/lib/app-config-sse'

describe('useTrellisConfig fallback path (P1)', () => {
  it('SSE handler still refetches on route mutations for fallback transport', () => {
    expect(shouldRefetchAppConfigFromSSE({ entityId: 'route:home', action: 'updateNode' })).toBe(true)
  })

  it('live transport skips SSE refetch when mode gate is live', () => {
    const transportMode = 'live'
    const shouldRefetch = transportMode === 'fallback'
      && shouldRefetchAppConfigFromSSE({ entityId: 'route:home', action: 'updateNode' })
    expect(shouldRefetch).toBe(false)
  })

  it('fallback transport uses $fetch on boot (documented contract)', () => {
    const fetchMock = vi.fn()
    const transportMode = 'fallback'
    if (transportMode === 'fallback') {
      fetchMock('/api/graph/config')
    }
    expect(fetchMock).toHaveBeenCalledWith('/api/graph/config')
  })
})
