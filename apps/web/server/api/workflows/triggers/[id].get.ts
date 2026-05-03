/** GET /api/workflows/triggers/:id — fetch one trigger. */

import { getTrigger } from '../../../utils/workflow-triggers'
import { parseApiRouterParams } from '../../../utils/api-validation'
import { WorkflowTriggerIdParamsSchema } from '../../../utils/workflow-api-schemas'

export default defineEventHandler(async (event) => {
  const { id } = parseApiRouterParams(event, WorkflowTriggerIdParamsSchema)

  const trigger = await getTrigger(id)
  if (!trigger) throw createError({ statusCode: 404, message: `Trigger ${id} not found` })

  return { ok: true, trigger }
})
