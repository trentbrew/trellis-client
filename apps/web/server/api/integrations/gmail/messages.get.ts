import { requireConnectionOwner } from '../../../utils/connection-auth'
import { getValidAccessToken } from '../../../utils/google-oauth-credentials'
import { getGmailHeader, normalizeThread } from '../../../utils/gmail-mime'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const connectionId = query.connectionId

  if (!connectionId || typeof connectionId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId query parameter.' })
  }

  await requireConnectionOwner(event, connectionId)
  const accessToken = await getValidAccessToken(connectionId)
  const authHeaders = { Authorization: `Bearer ${accessToken}` }

  const threadId = query.threadId
  if (threadId && typeof threadId === 'string') {
    try {
      const thread = await $fetch<{ id: string; messages: Parameters<typeof normalizeThread>[0]['messages'] }>(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`,
        { headers: authHeaders },
      )
      return normalizeThread(thread)
    } catch (err: any) {
      console.error('[gmail/messages] Failed to fetch thread:', err?.data || err)
      throw createError({ statusCode: 502, statusMessage: 'Failed to fetch thread from Gmail.' })
    }
  }

  const labelId = (typeof query.labelId === 'string' ? query.labelId : 'INBOX') || 'INBOX'
  const maxResults = Number(query.maxResults) || 50
  const q = typeof query.q === 'string' ? query.q : undefined
  const pageToken = typeof query.pageToken === 'string' ? query.pageToken : undefined

  const listParams = new URLSearchParams({
    maxResults: String(maxResults),
    labelIds: labelId,
  })
  if (q) listParams.set('q', q)
  if (pageToken) listParams.set('pageToken', pageToken)

  let listResponse: {
    threads?: Array<{ id: string; snippet?: string }>
    nextPageToken?: string
    resultSizeEstimate?: number
  }

  try {
    listResponse = await $fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads?${listParams.toString()}`,
      { headers: authHeaders },
    )
  } catch (err: any) {
    console.error('[gmail/messages] Failed to list threads:', err?.data || err)
    throw createError({ statusCode: 502, statusMessage: 'Failed to list threads from Gmail.' })
  }

  const threadRefs = listResponse.threads || []
  if (threadRefs.length === 0) {
    return { threads: [], nextPageToken: listResponse.nextPageToken }
  }

  const summaries = await Promise.all(
    threadRefs.map(async (ref) => {
      try {
        const thread = await $fetch<{
          id: string
          messages: Array<{
            id: string
            snippet?: string
            labelIds?: string[]
            internalDate?: string
            payload?: { headers?: Array<{ name: string; value: string }> }
          }>
        }>(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(ref.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: authHeaders },
        )

        const messages = thread.messages || []
        if (messages.length === 0) return null

        const lastMsg = messages[messages.length - 1]!
        const allLabels = Array.from(new Set(messages.flatMap((m) => m.labelIds || [])))
        const headers = lastMsg.payload?.headers
        const internalDateMs = lastMsg.internalDate ? Number(lastMsg.internalDate) : 0

        return {
          id: thread.id,
          subject: getGmailHeader(headers, 'Subject'),
          from: getGmailHeader(headers, 'From'),
          snippet: ref.snippet || lastMsg.snippet || '',
          date: getGmailHeader(headers, 'Date') || (internalDateMs ? new Date(internalDateMs).toISOString() : ''),
          unread: allLabels.includes('UNREAD'),
          labelIds: allLabels,
        }
      } catch (err) {
        console.warn('[gmail/messages] Failed to hydrate thread summary:', ref.id, err)
        return null
      }
    }),
  )

  return {
    threads: summaries.filter((s) => s !== null),
    nextPageToken: listResponse.nextPageToken,
    resultSizeEstimate: listResponse.resultSizeEstimate,
  }
})
