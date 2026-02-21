/**
 * Email utility — thin Resend wrapper.
 *
 * Returns early (no-op) if RESEND_API_KEY is not set so the app works
 * without email configured. Set RESEND_FROM to override the sender address.
 *
 * Usage:
 *   import { sendEmail } from '~/server/utils/email'
 *   await sendEmail({ to: 'user@example.com', subject: 'Hello', html: '<p>Hi</p>' })
 */

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ ok: boolean; id?: string; error?: string }> {
  const config = useRuntimeConfig()
  const apiKey = config.resendApiKey as string | undefined

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send')
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  const from = opts.from || (config.resendFrom as string | undefined) || 'Trellis <noreply@trellis.app>'

  try {
    const res = await $fetch<{ id: string }>('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        from,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      },
    })
    return { ok: true, id: res.id }
  } catch (err: any) {
    console.error('[email] Resend send failed:', err?.message)
    return { ok: false, error: err?.message }
  }
}
