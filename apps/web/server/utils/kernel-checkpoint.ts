/**
 * Kernel checkpoint policy — pure decision logic.
 *
 * Auto-checkpointing exists because `TrellisKernel.open()` rebuilds the
 * in-memory EAV store by replaying every op newer than the latest
 * snapshot. On large databases this can push Node's heap past the OS
 * limit mid-boot; macOS jetsam then SIGKILLs the process before any
 * error surfaces (see `apps/web/server/plugins/tql.ts` for wiring).
 *
 * Policy:
 *   - Checkpoint when the op gap exceeds `threshold` (default 5000).
 *   - Checkpoint when there are ops but no snapshot exists at all.
 *   - Otherwise skip — frequent snapshots from dev HMR churn the
 *     snapshots table and cost disk + JSON-serialization time.
 *
 * Pure so it can be unit-tested without a running kernel or backend.
 */

export const DEFAULT_CHECKPOINT_THRESHOLD = 5_000

export interface CheckpointPolicyInput {
  /** Ops in the log that weren't covered by the latest snapshot. */
  opsSinceSnapshot: number
  /** Whether any snapshot exists in the backend. */
  hasSnapshot: boolean
  /** Override the default op-gap threshold. */
  threshold?: number
}

export interface CheckpointPolicyDecision {
  shouldCheckpoint: boolean
  reason: string
}

export function shouldAutoCheckpoint(input: CheckpointPolicyInput): CheckpointPolicyDecision {
  const threshold = input.threshold ?? DEFAULT_CHECKPOINT_THRESHOLD

  if (input.opsSinceSnapshot <= 0) {
    return { shouldCheckpoint: false, reason: 'no unreplayed ops — snapshot already current' }
  }

  if (!input.hasSnapshot) {
    return {
      shouldCheckpoint: true,
      reason: `no snapshot exists and ${input.opsSinceSnapshot} ops in log`,
    }
  }

  if (input.opsSinceSnapshot >= threshold) {
    return {
      shouldCheckpoint: true,
      reason: `op gap ${input.opsSinceSnapshot} ≥ threshold ${threshold}`,
    }
  }

  return {
    shouldCheckpoint: false,
    reason: `op gap ${input.opsSinceSnapshot} < threshold ${threshold}`,
  }
}
