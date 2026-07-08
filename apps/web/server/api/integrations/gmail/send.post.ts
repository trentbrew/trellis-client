import { requireConnectionOwner } from '../../../utils/connection-auth'
import { getValidAccessToken } from '../../../utils/google-oauth-credentials'
import { base64UrlEncode, buildMimeMessage } from '../../../utils/gmail-mime'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.connectionId || !body?.to || !body?.subject) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: connectionId, to, subject.',
    })
  }

  await requireConnectionOwner(event, body.connectionId)
  const accessToken = await getValidAccessToken(body.connectionId)
  const mime = buildMimeMessage(body)
  const raw = base64UrlEncode(mime)

  try {
    const response = await $fetch<{ id: string; threadId: string }>(
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
