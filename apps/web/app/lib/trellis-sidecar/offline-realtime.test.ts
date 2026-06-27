// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGuardedSubscribe, type RealtimePatchedDb } from './offline-realtime'
import { resetSidecarProbeCache } from './sidecar-probe'

function mockDb(): RealtimePatchedDb {
  return {
    opts: { url: 'http://localhost:8230' },
    _subCallbacks: new Map(),
    _subQueries: new Map(),
    _ws: null,
    _wsPromise: null,
    _ensureWs: vi.fn().mockRejectedValue(new Error('Sidecar unavailable')),
  }
}

describe('offline-realtime guard', () => {
  afterEach(() => {
    resetSidecarProbeCache()
    vi.unstubAllGlobals()
  })

  it('delivers empty snapshot when ensureWs fails', async () => {
    const db = mockDb()
    const subscribe = createGuardedSubscribe(db)
    const callback = vi.fn()

    subscribe('FIND Page AS ?p', callback)

    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalled()
    })

    expect(callback).toHaveBeenCalledWith(
      [],
      { added: [], updated: [], removed: [] },
      { resolved: true },
    )
  })
})
