/** DELETE /api/workflows/triggers/:id — delete a trigger. */

import { deleteTrigger } from '../../../utils/workflow-triggers'
import { parseApiQuery, parseApiRouterParams } from '../../../utils/api-validation'
import { WorkflowTriggerDeleteQuerySchema, WorkflowTriggerIdParamsSchema } from '../../../utils/workflow-api-schemas'

export default defineEventHandler(async (event) => {
  const { id } = parseApiRouterParams(event, WorkflowTriggerIdParamsSchema)
  const { agentId } = parseApiQuery(event, WorkflowTriggerDeleteQuerySchema)

  await deleteTrigger(id, { agentId })
  return { ok: true }
})
