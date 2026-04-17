/** DELETE /api/workflows/triggers/:id — delete a trigger. */

import { deleteTrigger } from '../../../utils/workflow-triggers'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '"id" required' })

  const q = getQuery(event)
  const agentId = typeof q.agentId === 'string' ? q.agentId : undefined

  await deleteTrigger(id, { agentId })
  return { ok: true }
})
