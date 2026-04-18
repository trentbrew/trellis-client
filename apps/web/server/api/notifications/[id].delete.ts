/**
 * DELETE /api/notifications/:id
 */

import { deleteNotification } from '../../utils/notification-service'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing notification id' })
  const agentId = getQuery(event).agentId?.toString() || 'browser'
  await deleteNotification(id, { agentId })
  return { ok: true, id }
})
