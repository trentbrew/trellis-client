/** GET /api/workflows/triggers/:id — fetch one trigger. */

import { getTrigger } from '../../../utils/workflow-triggers'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '"id" required' })

  const trigger = await getTrigger(id)
  if (!trigger) throw createError({ statusCode: 404, message: `Trigger ${id} not found` })

  return { ok: true, trigger }
})
