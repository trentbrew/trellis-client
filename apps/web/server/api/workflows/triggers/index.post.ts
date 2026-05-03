/**
 * POST /api/workflows/triggers
 *
 * Create a workflow trigger. Request body mirrors `TriggerCreateInput`.
 *
 * Webhook triggers: `token` is auto-generated if omitted.
 */

import { createTrigger } from '../../../utils/workflow-triggers'
import type { TriggerCreateInput } from '../../../utils/workflow-triggers'
import { parseApiBody } from '../../../utils/api-validation'
import { WorkflowTriggerCreateBodySchema } from '../../../utils/workflow-api-schemas'

export default defineEventHandler(async (event) => {
  const body = await parseApiBody(event, WorkflowTriggerCreateBodySchema)

  try {
    const trigger = await createTrigger(body as TriggerCreateInput, { agentId: body.agentId })
    return { ok: true, trigger }
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      message: err?.message || 'createTrigger failed',
    })
  }
})
