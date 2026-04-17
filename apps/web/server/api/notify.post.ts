/**
 * POST /api/notify
 *
 * Creates notification records via the admin SDK (bypasses client perms).
 * Supports single recipient or batch (multiple recipients with the same content).
 *
 * After each record is persisted, an email is dispatched asynchronously
 * via `dispatchNotificationEmailAsync` — it respects per-user email prefs
 * and defaults to off for types outside `DEFAULT_EMAIL_TYPES`.
 *
 * Body:
 *   Single:  { recipientId, orgId, type, title, message, ... }
 *   Batch:   { recipients: string[], orgId, type, title, message, ... }
 *   Add `skipEmail: true` to suppress email delivery for this call only.
 */

import { dispatchNotificationEmailAsync } from '../utils/notification-email'

interface NotifyBody {
  recipientId?: string
  recipients?: string[]
  orgId: string
  orgName?: string
  type: string
  title: string
  message: string
  actionUrl?: string
  icon?: string
  variant?: string
  actorId?: string
  actorName?: string
  metadata?: Record<string, any>
  /** If true, skip the email dispatch step. Default false. */
  skipEmail?: boolean
}

export default defineEventHandler(async (event) => {
  const body = await readBody<NotifyBody>(event)

  if (!body?.orgId || !body?.type || !body?.title || !body?.message) {
    throw createError({ statusCode: 400, message: 'orgId, type, title, and message are required' })
  }

  const recipientIds = body.recipients?.length ? body.recipients : body.recipientId ? [body.recipientId] : []

  if (!recipientIds.length) {
    throw createError({ statusCode: 400, message: 'recipientId or recipients[] is required' })
  }

  const db = useInstantAdmin()
  const now = Date.now()
  const created: string[] = []

  for (const recipientId of recipientIds) {
    try {
      const notifId = crypto.randomUUID()

      await db.transact(
        db.tx.notifications[notifId].update({
          recipientId,
          orgId: body.orgId,
          orgName: body.orgName || '',
          type: body.type,
          title: body.title,
          message: body.message,
          actionUrl: body.actionUrl || '',
          icon: body.icon || '',
          variant: body.variant || 'default',
          isRead: false,
          actorId: body.actorId || '',
          actorName: body.actorName || '',
          metadata: body.metadata || {},
          createdAt: now,
        }),
      )

      // Link to organization (non-fatal)
      try {
        await db.transact(db.tx.organizations[body.orgId].link({ notifications: notifId }))
      } catch (linkErr: any) {
        console.warn(`[notify] Org link failed for notification ${notifId} (non-fatal):`, linkErr?.message)
      }

      // Fire email asynchronously — respects per-user prefs, never blocks the response
      if (!body.skipEmail) {
        dispatchNotificationEmailAsync({
          recipientId,
          type: body.type,
          title: body.title,
          message: body.message,
          actionUrl: body.actionUrl,
          actorName: body.actorName,
          orgName: body.orgName,
          metadata: body.metadata,
        })
      }

      created.push(notifId)
    } catch (err: any) {
      console.error(`[notify] Failed to create notification for ${recipientId}:`, err?.message)
    }
  }

  return {
    ok: true,
    created: created.length,
    ids: created,
  }
})
