/**
 * GET /api/workflows/triggers
 *
 * List workflow triggers. Supports optional filters:
 *   ?workflowId=...
 *   ?kind=schedule|webhook|entity-change
 *   ?activeOnly=true
 */

import { listTriggers } from '../../../utils/workflow-triggers'
import { parseApiQuery } from '../../../utils/api-validation'
import { WorkflowTriggerListQuerySchema } from '../../../utils/workflow-api-schemas'

export default defineEventHandler(async (event) => {
  const { kind, workflowId, activeOnly } = parseApiQuery(event, WorkflowTriggerListQuerySchema)

  const triggers = await listTriggers({ kind, workflowId, activeOnly })
  return { ok: true, triggers }
})
