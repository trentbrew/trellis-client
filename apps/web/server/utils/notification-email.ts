/**
 * Notification → Email dispatcher.
 *
 * Called from API routes after a notification record has been created.
 * Looks up the recipient's email + prefs and fires a Resend email if
 * the user has email enabled for the given type.
 *
 * All operations are best-effort — failures are logged, never thrown,
 * so the caller's transaction never rolls back if email delivery fails.
 *
 * Picks an email template based on the notification type:
 *   - mention           → mentionEmailHtml
 *   - comment           → commentEmailHtml
 *   - entity_updated    → assignedEmailHtml (task assigned)
 *   - workflow_failed   → workflowFailedEmailHtml (uses metadata.error)
 *   - workflow_completed→ workflowCompletedEmailHtml
 *   - <everything else> → notificationEmailHtml (generic)
 *
 * Types not in `DEFAULT_EMAIL_TYPES` are skipped unless the user has
 * explicitly enabled them via `emailMutedTypes`.
 */

import { useInstantAdmin } from './instant-admin'
import { sendEmail } from './email'
import {
  mentionEmailHtml,
  commentEmailHtml,
  assignedEmailHtml,
  workflowFailedEmailHtml,
  workflowCompletedEmailHtml,
  notificationEmailHtml,
} from './email-templates'

// Types allowed to send email by default. Mirrors DEFAULT_EMAIL_TYPES in
// useNotifications.ts — if you change one, change the other.
const DEFAULT_EMAIL_TYPES = new Set<string>([
  'invite_accepted',
  'member_joined',
  'mention',
  'comment',
  'entity_updated',
  'workflow_failed',
])

export interface NotificationEmailInput {
  recipientId: string
  type: string
  title: string
  message: string
  actionUrl?: string
  actorName?: string
  orgName?: string
  metadata?: Record<string, any>
}

interface UserPrefs {
  emailEnabled: boolean
  emailMutedTypes: string[]
}

// ── Small helpers ─────────────────────────────────────────────────────

async function getRecipientEmail(userId: string): Promise<string | null> {
  try {
    const db = useInstantAdmin()
    const res = await db.auth.getUser({ id: userId })
    const email = (res as any)?.user?.email
    return typeof email === 'string' && email.includes('@') ? email.toLowerCase() : null
  } catch (err: any) {
    console.warn(`[notification-email] getRecipientEmail failed for ${userId}:`, err?.message)
    return null
  }
}

async function getUserEmailPrefs(userId: string): Promise<UserPrefs> {
  const fallback: UserPrefs = { emailEnabled: true, emailMutedTypes: [] }
  try {
    const db = useInstantAdmin()
    const settingKey = `user:${userId}:notificationPrefs`
    const result = await db.query({
      settings: { $: { where: { settingKey } } },
    })
    const setting = (result as any)?.settings?.[0]
    const value = setting?.value || {}
    return {
      emailEnabled: value.emailEnabled ?? true,
      emailMutedTypes: Array.isArray(value.emailMutedTypes) ? value.emailMutedTypes : [],
    }
  } catch (err: any) {
    console.warn(`[notification-email] getUserEmailPrefs failed for ${userId}:`, err?.message)
    return fallback
  }
}

function shouldDispatchEmail(type: string, prefs: UserPrefs): boolean {
  if (!prefs.emailEnabled) return false
  if (prefs.emailMutedTypes.includes(type)) return false
  if (!DEFAULT_EMAIL_TYPES.has(type)) return false
  return true
}

function pickSubject(input: NotificationEmailInput): string {
  const orgTag = input.orgName ? `[${input.orgName}] ` : ''
  switch (input.type) {
    case 'mention':
      return `${orgTag}${input.actorName || 'Someone'} mentioned you`
    case 'comment':
      return `${orgTag}${input.title}`
    case 'entity_updated':
      return `${orgTag}${input.title}`
    case 'workflow_failed':
      return `${orgTag}Workflow failed: ${input.title}`
    case 'workflow_completed':
      return `${orgTag}Workflow completed: ${input.title}`
    case 'invite_accepted':
      return `${orgTag}${input.title}`
    default:
      return `${orgTag}${input.title}`
  }
}

function pickHtml(input: NotificationEmailInput): string {
  const actorName = input.actorName || 'Someone'
  const actionUrl = input.actionUrl
  const meta = input.metadata || {}

  switch (input.type) {
    case 'mention':
      return mentionEmailHtml({
        actorName,
        entityTitle: input.title.replace(/^[@#]/, '') || 'Trellis',
        actionUrl: actionUrl || 'https://app.trellis.app',
      })

    case 'comment':
      return commentEmailHtml({
        actorName,
        entityTitle: typeof meta.entityTitle === 'string' ? meta.entityTitle : input.title,
        commentSnippet: input.message.replace(/^[^:]+:\s*/, '').slice(0, 300),
        actionUrl: actionUrl || 'https://app.trellis.app',
      })

    case 'entity_updated':
      return assignedEmailHtml({
        actorName,
        taskTitle: typeof meta.entityTitle === 'string' ? meta.entityTitle : input.title,
        actionUrl: actionUrl || 'https://app.trellis.app',
      })

    case 'workflow_failed':
      return workflowFailedEmailHtml({
        workflowName:
          typeof meta.workflowName === 'string' ? meta.workflowName : input.title,
        error: typeof meta.error === 'string' ? meta.error : input.message,
        runId: typeof meta.runId === 'string' ? meta.runId : undefined,
        actionUrl,
      })

    case 'workflow_completed':
      return workflowCompletedEmailHtml({
        workflowName:
          typeof meta.workflowName === 'string' ? meta.workflowName : input.title,
        stepCount: typeof meta.stepCount === 'number' ? meta.stepCount : 0,
        durationMs: typeof meta.durationMs === 'number' ? meta.durationMs : 0,
        actionUrl,
      })

    default:
      return notificationEmailHtml({
        title: input.title,
        message: input.message,
        actionUrl,
        actorName: input.actorName,
      })
  }
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Dispatch an email for a notification if the recipient's prefs allow it.
 * Returns `{ sent: boolean, reason?: string }` — `reason` explains why
 * the email was skipped when `sent === false`.
 */
export async function dispatchNotificationEmail(
  input: NotificationEmailInput,
): Promise<{ sent: boolean; reason?: string; id?: string }> {
  if (!input.recipientId || !input.type || !input.title) {
    return { sent: false, reason: 'missing-fields' }
  }

  const prefs = await getUserEmailPrefs(input.recipientId)
  if (!shouldDispatchEmail(input.type, prefs)) {
    return { sent: false, reason: 'pref-muted' }
  }

  const to = await getRecipientEmail(input.recipientId)
  if (!to) {
    return { sent: false, reason: 'no-email' }
  }

  const result = await sendEmail({
    to,
    subject: pickSubject(input),
    html: pickHtml(input),
  })

  if (!result.ok) {
    return { sent: false, reason: result.error || 'send-failed' }
  }

  return { sent: true, id: result.id }
}

/**
 * Fire-and-forget variant — dispatches in the background and logs warnings.
 * Use this from hot request paths (e.g. inside `/api/notify`) where you
 * don't want to block the response on email delivery.
 */
export function dispatchNotificationEmailAsync(input: NotificationEmailInput): void {
  dispatchNotificationEmail(input)
    .then((res) => {
      if (!res.sent && res.reason && res.reason !== 'pref-muted' && res.reason !== 'no-email') {
        console.warn(
          `[notification-email] ${input.type} → ${input.recipientId} skipped: ${res.reason}`,
        )
      }
    })
    .catch((err: any) => {
      console.error('[notification-email] dispatch failed:', err?.message || err)
    })
}

// Exposed for tests
export const __testables = {
  DEFAULT_EMAIL_TYPES,
  shouldDispatchEmail,
  pickSubject,
  pickHtml,
}
