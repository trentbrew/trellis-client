/** PATCH /api/workflows/triggers/:id — partial update. */

import { updateTrigger } from '../../../utils/workflow-triggers'
import type { TriggerUpdateInput } from '../../../utils/workflow-triggers'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '"id" required' })

  const body = (await readBody(event).catch(() => ({}))) as TriggerUpdateInput & {
    agentId?: string
  }

  try {
    const trigger = await updateTrigger(id, body, { agentId: body.agentId })
    return { ok: true, trigger }
  } catch (err: any) {
    throw createError({ statusCode: 400, message: err?.message || 'updateTrigger failed' })
  }
})
