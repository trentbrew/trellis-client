/** PATCH /api/workflows/triggers/:id — partial update. */

import { updateTrigger } from '../../../utils/workflow-triggers'
import { parseApiBody, parseApiRouterParams } from '../../../utils/api-validation'
import { WorkflowTriggerIdParamsSchema, WorkflowTriggerUpdateBodySchema } from '../../../utils/workflow-api-schemas'

export default defineEventHandler(async (event) => {
  const { id } = parseApiRouterParams(event, WorkflowTriggerIdParamsSchema)
  const body = await parseApiBody(event, WorkflowTriggerUpdateBodySchema)

  try {
    const trigger = await updateTrigger(id, body, { agentId: body.agentId })
    return { ok: true, trigger }
  } catch (err: any) {
    throw createError({ statusCode: 400, message: err?.message || 'updateTrigger failed' })
  }
})
