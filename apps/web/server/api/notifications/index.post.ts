/**
 * POST /api/notifications
 *
 * Create an in-app notification in the TQL graph.
 * Body: CreateNotificationInput (see app/types/notification.ts)
 */

import type { CreateNotificationInput } from '../../../app/types/notification'
import { createNotification } from '../../utils/notification-service'

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateNotificationInput & { agentId?: string }>(event)

  if (!body?.title || !body?.kind || !body?.source) {
    throw createError({ statusCode: 400, message: 'title, kind, and source are required' })
  }

  const agentId = body.agentId || 'browser'
  const notification = await createNotification(body, { agentId })
  return { ok: true, notification }
})
