// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { probeSidecarAvailable, resetSidecarProbeCache } from './sidecar-probe'

describe('sidecar-probe', () => {
  afterEach(() => {
    resetSidecarProbeCache()
    vi.unstubAllGlobals()
  })

  it('returns true when health reports available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ available: true }), { status: 200 }),
      ),
    )

    await expect(probeSidecarAvailable()).resolves.toBe(true)
    await expect(probeSidecarAvailable()).resolves.toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns false when health is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status: 503 })))

    await expect(probeSidecarAvailable()).resolves.toBe(false)
  })

  it('returns false when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    await expect(probeSidecarAvailable()).resolves.toBe(false)
  })
})
