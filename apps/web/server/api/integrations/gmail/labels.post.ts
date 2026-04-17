/**
 * POST /api/integrations/gmail/labels
 *
 * Create a new Gmail label OR modify labels on a message.
 *
 * Create a label:
 *   { connectionId, action: 'create', name: 'Custom Label' }
 *
 * Modify labels on a message:
 *   { connectionId, action: 'modify', messageId: 'abc', addLabelIds: ['Label_1'], removeLabelIds: ['UNREAD'] }
 *
 * Modify labels on a thread:
 *   { connectionId, action: 'modify', threadId: 'abc', addLabelIds: [...], removeLabelIds: [...] }
 */

import { getValidAccessToken } from './_credentials'

interface LabelsBody {
  connectionId: string
  action: 'create' | 'modify'
  name?: string
  messageId?: string
  threadId?: string
  addLabelIds?: string[]
  removeLabelIds?: string[]
  labelListVisibility?: 'labelShow' | 'labelHide' | 'labelShowIfUnread'
  messageListVisibility?: 'show' | 'hide'
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LabelsBody>(event)

  if (!body?.connectionId || !body.action) {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId or action.' })
  }

  const accessToken = await getValidAccessToken(body.connectionId)
  const authHeaders = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  if (body.action === 'create') {
    if (!body.name) {
      throw createError({ statusCode: 400, statusMessage: 'Missing label name.' })
    }

    try {
      const label = await $fetch<{ id: string; name: string; type: string }>(
        'https://gmail.googleapis.com/gmail/v1/users/me/labels',
        {
          method: 'POST',
          headers: authHeaders,
          body: {
            name: body.name,
            labelListVisibility: body.labelListVisibility || 'labelShow',
            messageListVisibility: body.messageListVisibility || 'show',
          },
        },
      )
      return { ok: true, label }
    } catch (err: any) {
      console.error('[gmail/labels] Create failed:', err?.data || err)
      throw createError({
        statusCode: 502,
        statusMessage: err?.data?.error?.message || 'Failed to create label.',
      })
    }
  }

  if (body.action === 'modify') {
    if (!body.messageId && !body.threadId) {
      throw createError({ statusCode: 400, statusMessage: 'Must provide messageId or threadId.' })
    }

    const resource = body.threadId
      ? `threads/${encodeURIComponent(body.threadId)}/modify`
      : `messages/${encodeURIComponent(body.messageId!)}/modify`

    try {
      const result = await $fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${resource}`, {
        method: 'POST',
        headers: authHeaders,
        body: {
          addLabelIds: body.addLabelIds || [],
          removeLabelIds: body.removeLabelIds || [],
        },
      })
      return { ok: true, result }
    } catch (err: any) {
      console.error('[gmail/labels] Modify failed:', err?.data || err)
      throw createError({
        statusCode: 502,
        statusMessage: err?.data?.error?.message || 'Failed to modify labels.',
      })
    }
  }

  throw createError({ statusCode: 400, statusMessage: `Unknown action: ${body.action}` })
})
