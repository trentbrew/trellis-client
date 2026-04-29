// @vitest-environment node
/**
 * Kernel checkpoint policy — pure-logic tests.
 *
 * Regression coverage for the auto-checkpoint-on-boot fix. Without this
 * policy, the Nuxt dev server was being silently SIGKILL'd by macOS
 * jetsam mid-replay on large op logs (see debug session 2026-04-24).
 *
 * The policy is pure so we can exercise the decision table directly
 * without spinning up a kernel or SQLite backend.
 */

import { describe, it, expect } from 'vitest'
import {
  shouldAutoCheckpoint,
  DEFAULT_CHECKPOINT_THRESHOLD,
} from '../../server/utils/kernel-checkpoint'

describe('shouldAutoCheckpoint', () => {
  it('skips when no ops are pending (snapshot already current)', () => {
    const decision = shouldAutoCheckpoint({ opsSinceSnapshot: 0, hasSnapshot: true })
    expect(decision.shouldCheckpoint).toBe(false)
    expect(decision.reason).toMatch(/current/)
  })

  it('skips when no ops and no snapshot (fresh empty database)', () => {
    const decision = shouldAutoCheckpoint({ opsSinceSnapshot: 0, hasSnapshot: false })
    expect(decision.shouldCheckpoint).toBe(false)
  })

  it('checkpoints when there is no snapshot but ops exist', () => {
    const decision = shouldAutoCheckpoint({ opsSinceSnapshot: 1, hasSnapshot: false })
    expect(decision.shouldCheckpoint).toBe(true)
    expect(decision.reason).toMatch(/no snapshot/)
  })

  it('skips small gaps (HMR churn protection)', () => {
    const decision = shouldAutoCheckpoint({ opsSinceSnapshot: 50, hasSnapshot: true })
    expect(decision.shouldCheckpoint).toBe(false)
    expect(decision.reason).toMatch(/<\s*threshold/)
  })

  it('checkpoints at or above the default threshold', () => {
    const atThreshold = shouldAutoCheckpoint({
      opsSinceSnapshot: DEFAULT_CHECKPOINT_THRESHOLD,
      hasSnapshot: true,
    })
    expect(atThreshold.shouldCheckpoint).toBe(true)

    const wayAbove = shouldAutoCheckpoint({
      opsSinceSnapshot: DEFAULT_CHECKPOINT_THRESHOLD * 10,
      hasSnapshot: true,
    })
    expect(wayAbove.shouldCheckpoint).toBe(true)
    expect(wayAbove.reason).toMatch(new RegExp(`≥\\s*threshold\\s*${DEFAULT_CHECKPOINT_THRESHOLD}`))
  })

  it('honours a custom threshold override', () => {
    const below = shouldAutoCheckpoint({
      opsSinceSnapshot: 100,
      hasSnapshot: true,
      threshold: 500,
    })
    expect(below.shouldCheckpoint).toBe(false)

    const above = shouldAutoCheckpoint({
      opsSinceSnapshot: 750,
      hasSnapshot: true,
      threshold: 500,
    })
    expect(above.shouldCheckpoint).toBe(true)
    expect(above.reason).toMatch(/750/)
    expect(above.reason).toMatch(/500/)
  })

  it('treats negative opsSinceSnapshot as "no work to do"', () => {
    // Shouldn't happen in practice, but the backend could theoretically
    // report a negative number if an op is removed between the
    // loadLatestSnapshot and countOpsAfter calls. Fail closed.
    const decision = shouldAutoCheckpoint({ opsSinceSnapshot: -5, hasSnapshot: true })
    expect(decision.shouldCheckpoint).toBe(false)
  })
})
