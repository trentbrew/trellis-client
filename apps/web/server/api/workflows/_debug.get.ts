/**
 * GET /api/workflows/_debug
 *
 * Debug snapshot: how many mutation listeners are attached, how many active
 * triggers of each kind exist, and a preview of upcoming schedule firings.
 * Useful for verifying the workflow-scheduler plugin is wired in.
 */

import { getListenerCount } from '../../utils/tql-events'
import { listTriggers } from '../../utils/workflow-triggers'
import { isCronDue } from '../../utils/cron'

export default defineEventHandler(async () => {
  const all = await listTriggers()
  const byKind: Record<string, number> = {}
  for (const t of all) {
    byKind[t.kind] = (byKind[t.kind] || 0) + 1
  }

  const activeSchedule = all.filter((t) => t.active && t.kind === 'schedule')
  const now = new Date()
  const dueNow = activeSchedule.filter((t) => t.cron && isCronDue(t.cron, now))

  return {
    ok: true,
    mutationListeners: getListenerCount(),
    triggers: {
      total: all.length,
      byKind,
      activeSchedule: activeSchedule.length,
      dueRightNow: dueNow.length,
      dueRightNowIds: dueNow.map((t) => t.id),
    },
    now: now.toISOString(),
  }
})
