/**
 * GET /api/workflows/triggers
 *
 * List workflow triggers. Supports optional filters:
 *   ?workflowId=...
 *   ?kind=schedule|webhook|entity-change
 *   ?activeOnly=true
 */

import { listTriggers } from '../../../utils/workflow-triggers'
import type { TriggerKind } from '../../../utils/workflow-triggers'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const kind = typeof q.kind === 'string' ? (q.kind as TriggerKind) : undefined
  const workflowId = typeof q.workflowId === 'string' ? q.workflowId : undefined
  const activeOnly = String(q.activeOnly || '').toLowerCase() === 'true'

  const triggers = await listTriggers({ kind, workflowId, activeOnly })
  return { ok: true, triggers }
})
