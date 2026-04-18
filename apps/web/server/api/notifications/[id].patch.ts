/**
 * PATCH /api/notifications/:id
 *
 * Update a notification's status (mark read, archive, snooze, etc.).
 */

import type { TrellisNotification } from '../../../app/types/notification'
import { updateNotificationStatus } from '../../utils/notification-service'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing notification id' })

  const body = await readBody<Partial<Pick<TrellisNotification, 'status' | 'readAt' | 'snoozeUntil' | 'archivedAt'>> & { agentId?: string }>(event)
  const { agentId, ...patch } = body || {}

  await updateNotificationStatus(id, patch, { agentId: agentId || 'browser' })
  return { ok: true, id }
})
