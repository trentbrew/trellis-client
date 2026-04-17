/**
 * Workflow Scheduler + Entity-Change Dispatcher.
 *
 * Runs inside the Nuxt server process and is responsible for automatically
 * firing workflow triggers:
 *
 *   1. Schedule triggers   — ticks every minute; matches cron expressions
 *   2. Entity-change triggers — subscribes to the TQL mutation bus
 *
 * Webhook triggers are fired on-demand by `POST /api/workflows/webhook/:token`
 * and don't need a background task.
 *
 * All executions are best-effort: errors are logged + recorded on the trigger
 * (`lastError` + `lastFiredAt`) but never crash the server.
 */

import { listTriggers, recordTriggerFire } from '../utils/workflow-triggers'
import type { TriggerEntity } from '../utils/workflow-triggers'
import { executeWorkflow } from '../utils/workflow-executor'
import { onMutation } from '../utils/tql-events'
import type { MutationEvent } from '../utils/tql-events'
import { isCronDue } from '../utils/cron'

const TICK_INTERVAL_MS = 60 * 1000 // 1 minute

let _tickHandle: NodeJS.Timeout | null = null
let _tickRunning = false

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fireTrigger(trigger: TriggerEntity, input: Record<string, unknown>): Promise<void> {
  const agentId = trigger.agentId || `trigger:${trigger.kind}`
  try {
    const run = await executeWorkflow({
      workflowId: trigger.workflowId,
      workflowName: trigger.workflowName,
      graph: trigger.graph,
      input,
      agentId,
      ownerId: trigger.ownerId,
      orgId: trigger.orgId,
      notifyOnSuccess: trigger.notifyOnSuccess,
    })
    await recordTriggerFire(trigger.id, {
      runId: run.id,
      error: run.status === 'failed' ? run.error || 'run failed' : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[workflow-scheduler] trigger ${trigger.id} execution failed:`, msg)
    await recordTriggerFire(trigger.id, { error: msg }).catch(() => {})
  }
}

// ─── Schedule ticker ─────────────────────────────────────────────────────────

async function runTick(now: Date = new Date()): Promise<void> {
  if (_tickRunning) return
  _tickRunning = true
  try {
    const triggers = await listTriggers({ kind: 'schedule', activeOnly: true })
    const due = triggers.filter((t) => t.cron && isCronDue(t.cron, now))

    if (due.length === 0) return

    console.log(`[workflow-scheduler] tick ${now.toISOString()}: ${due.length} schedule trigger(s) due`)

    // Fire in parallel — each trigger gets its own error isolation
    await Promise.all(
      due.map((t) =>
        fireTrigger(t, {
          trigger: { id: t.id, kind: 'schedule', cron: t.cron, firedAt: now.toISOString() },
        }),
      ),
    )
  } catch (err) {
    console.error('[workflow-scheduler] tick failed:', err)
  } finally {
    _tickRunning = false
  }
}

// ─── Entity-change dispatcher ────────────────────────────────────────────────

function matchesEntityChange(trigger: TriggerEntity, ev: MutationEvent): boolean {
  if (trigger.watchAction && trigger.watchAction !== 'any' && trigger.watchAction !== ev.action) {
    return false
  }
  // `watchType` is the entity `type` attribute, not the TQL `type` column
  // (which is always 'entity'). We look at the mutation payload.
  if (trigger.watchType) {
    const actualType = (ev.data?.type as string | undefined) ?? undefined
    if (actualType !== trigger.watchType) return false
  }
  if (trigger.watchAttribute) {
    const touched = ev.data ? Object.keys(ev.data) : []
    if (!touched.includes(trigger.watchAttribute)) return false
  }
  return true
}

async function handleMutation(ev: MutationEvent): Promise<void> {
  // Fast path: ignore our own trigger-write mutations to avoid loops
  if (ev.entityId?.startsWith('entity:trigger-')) return
  if (ev.entityId?.startsWith('entity:run-')) return
  // Only react to node-level mutations
  if (!['createNode', 'updateNode', 'deleteNode'].includes(ev.action)) return

  try {
    const triggers = await listTriggers({ kind: 'entity-change', activeOnly: true })
    const matches = triggers.filter((t) => matchesEntityChange(t, ev))
    if (matches.length === 0) return

    console.log(`[workflow-scheduler] entity-change ${ev.action} ${ev.entityId}: ${matches.length} trigger(s) matched`)

    for (const trigger of matches) {
      fireTrigger(trigger, {
        trigger: {
          id: trigger.id,
          kind: 'entity-change',
          action: ev.action,
          entityId: ev.entityId,
          entityData: ev.data,
          agentId: ev.agentId,
          firedAt: ev.timestamp,
        },
      }).catch(() => {}) // already logged inside fireTrigger
    }
  } catch (err) {
    console.error('[workflow-scheduler] handleMutation failed:', err)
  }
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

export default defineNitroPlugin((nitroApp) => {
  // Align first tick to the start of the next minute so we fire near :00 seconds
  const now = Date.now()
  const msUntilNextMinute = 60_000 - (now % 60_000)

  setTimeout(() => {
    // Kick off first tick, then a steady 60s interval
    runTick().catch((err) => console.error('[workflow-scheduler] initial tick error:', err))
    _tickHandle = setInterval(() => {
      runTick().catch((err) => console.error('[workflow-scheduler] tick error:', err))
    }, TICK_INTERVAL_MS)
  }, msUntilNextMinute)

  const unsubMutations = onMutation((ev) => {
    // Fire and forget — any error is logged inside handleMutation
    handleMutation(ev).catch(() => {})
  })

  nitroApp.hooks.hook('close', () => {
    if (_tickHandle) {
      clearInterval(_tickHandle)
      _tickHandle = null
    }
    unsubMutations()
  })

  console.log(
    `[workflow-scheduler] started — first tick in ${Math.round(msUntilNextMinute / 1000)}s, interval ${TICK_INTERVAL_MS / 1000}s`,
  )
})

// Expose the one-shot tick for testing / on-demand fires
export async function tickSchedulerNow(now?: Date): Promise<void> {
  await runTick(now)
}
