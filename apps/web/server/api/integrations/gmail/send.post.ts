/**
 * POST /api/integrations/gmail/send
 *
 * Sends a new email or a reply via Gmail's users.messages.send API.
 * Constructs an RFC 2822 message and base64url-encodes it per Gmail's
 * requirements.
 *
 * Body: {
 *   connectionId: string,
 *   to: string,
 *   subject: string,
 *   body: string (plain text or HTML),
 *   cc?: string,
 *   bcc?: string,
 *   threadId?: string,       // include to post as a reply
 *   inReplyTo?: string,      // Message-ID of the message being replied to
 *   references?: string,     // Message-IDs for threading
 *   isHtml?: boolean,        // defaults to false (plain text)
 * }
 */

import { getValidAccessToken } from './_credentials'

interface SendBody {
  connectionId: string
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
  threadId?: string
  inReplyTo?: string
  references?: string
  isHtml?: boolean
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function buildMimeMessage(opts: SendBody): string {
  const lines: string[] = []
  lines.push(`To: ${opts.to}`)
  if (opts.cc) lines.push(`Cc: ${opts.cc}`)
  if (opts.bcc) lines.push(`Bcc: ${opts.bcc}`)
  lines.push(`Subject: ${opts.subject}`)
  lines.push('MIME-Version: 1.0')
  lines.push(`Content-Type: ${opts.isHtml ? 'text/html' : 'text/plain'}; charset="UTF-8"`)
  lines.push('Content-Transfer-Encoding: 7bit')
  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`)
  if (opts.references) lines.push(`References: ${opts.references}`)
  lines.push('')
  lines.push(opts.body)
  return lines.join('\r\n')
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SendBody>(event)

  if (!body?.connectionId || !body.to || !body.subject) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: connectionId, to, subject.',
    })
  }

  const accessToken = await getValidAccessToken(body.connectionId)

  const mime = buildMimeMessage(body)
  const raw = base64UrlEncode(mime)

  try {
    const response = await $fetch<{ id: string; threadId: string; labelIds?: string[] }>(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          raw,
          ...(body.threadId ? { threadId: body.threadId } : {}),
        },
      },
    )

    return { ok: true, messageId: response.id, threadId: response.threadId }
  } catch (err: any) {
    console.error('[gmail/send] Send failed:', err?.data || err)
    throw createError({
      statusCode: 502,
      statusMessage: err?.data?.error?.message || 'Failed to send message via Gmail.',
    })
  }
})
