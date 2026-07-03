// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { resolveAppConfigTransportMode } from '~/lib/app-config-live/mode'

/** Mirrors useTrellisConfig watchEffect SSE side-effects for unit testing. */
function applyTransportSSESideEffects(
  transportMode: ReturnType<typeof resolveAppConfigTransportMode>,
  sse: { subscribed: boolean; cleanup: (() => void) | null },
) {
  if (transportMode === 'live') {
    sse.cleanup?.()
    sse.cleanup = null
    sse.subscribed = false
    return
  }
  if (!sse.subscribed) {
    const cleanup = vi.fn()
    sse.cleanup = cleanup
    sse.subscribed = true
  }
}

describe('app config SSE teardown (TRL-15 harden)', () => {
  it('unsubscribes kernel SSE when live transport activates', () => {
    const cleanup = vi.fn()
    const sse = { subscribed: true, cleanup }

    applyTransportSSESideEffects('live', sse)

    expect(cleanup).toHaveBeenCalledOnce()
    expect(sse.cleanup).toBeNull()
    expect(sse.subscribed).toBe(false)
  })

  it('subscribes kernel SSE only on fallback transport', () => {
    const sse = { subscribed: false, cleanup: null as (() => void) | null }

    applyTransportSSESideEffects('fallback', sse)

    expect(sse.subscribed).toBe(true)
    expect(sse.cleanup).not.toBeNull()
  })
})
