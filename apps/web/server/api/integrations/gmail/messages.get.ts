/**
 * GET /api/integrations/gmail/messages
 *
 * Dual-purpose proxy:
 *   - List threads:          ?connectionId=...&labelId=INBOX&maxResults=50
 *   - Fetch single thread:   ?connectionId=...&threadId=abc123
 *   - Search:                ?connectionId=...&q=from:alice
 *
 * Returns a normalized shape regardless of Gmail's raw response format.
 */

import { getValidAccessToken } from './_credentials'
import { requireConnectionOwner } from '../../../utils/connection-auth'

// ── Types ─────────────────────────────────────────────────────────────

interface GmailHeader {
  name: string
  value: string
}

interface GmailMessagePart {
  partId?: string
  mimeType?: string
  filename?: string
  headers?: GmailHeader[]
  body?: { size?: number; data?: string; attachmentId?: string }
  parts?: GmailMessagePart[]
}

interface GmailMessageRaw {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: GmailMessagePart
}

interface GmailThreadListItem {
  id: string
  snippet?: string
  historyId?: string
}

// Our normalized shapes (must match types declared in useGmail composable)

interface NormalizedThreadSummary {
  id: string
  subject: string
  from: string
  snippet: string
  date: string
  unread: boolean
  labelIds: string[]
}

interface NormalizedMessage {
  id: string
  messageId: string
  subject: string
  from: string
  to: string
  cc?: string
  date: string
  snippet: string
  labelIds: string[]
  bodyText?: string
  bodyHtml?: string
}

interface NormalizedThreadFull {
  id: string
  labelIds: string[]
  messages: NormalizedMessage[]
}

// ── Helpers ───────────────────────────────────────────────────────────

function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers) return ''
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

function decodeBase64Url(data: string): string {
  try {
    const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(normalized, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

/**
 * Walk MIME tree depth-first, collecting text/plain and text/html bodies.
 */
function extractBody(payload: GmailMessagePart | undefined): { text?: string; html?: string } {
  if (!payload) return {}

  const result: { text?: string; html?: string } = {}

  const walk = (part: GmailMessagePart) => {
    if (part.mimeType === 'text/plain' && part.body?.data && !result.text) {
      result.text = decodeBase64Url(part.body.data)
    } else if (part.mimeType === 'text/html' && part.body?.data && !result.html) {
      result.html = decodeBase64Url(part.body.data)
    }
    if (part.parts) {
      for (const sub of part.parts) walk(sub)
    }
  }

  walk(payload)
  return result
}

function normalizeMessage(msg: GmailMessageRaw): NormalizedMessage {
  const headers = msg.payload?.headers
  const body = extractBody(msg.payload)
  const dateHeader = getHeader(headers, 'Date')
  const internalDateMs = msg.internalDate ? Number(msg.internalDate) : 0
  const date = dateHeader || (internalDateMs ? new Date(internalDateMs).toISOString() : '')

  return {
    id: msg.id,
    messageId: getHeader(headers, 'Message-ID'),
    subject: getHeader(headers, 'Subject'),
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To'),
    cc: getHeader(headers, 'Cc') || undefined,
    date,
    snippet: msg.snippet || '',
    labelIds: msg.labelIds || [],
    bodyText: body.text,
    bodyHtml: body.html,
  }
}

// ── Handler ───────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const connectionId = query.connectionId as string

  if (!connectionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId query parameter.' })
  }

  // Multi-tenant guard: deny reads of another user's Gmail connection.
  await requireConnectionOwner(event, connectionId)

  const accessToken = await getValidAccessToken(connectionId)
  const authHeaders = { Authorization: `Bearer ${accessToken}` }

  // ── Single thread mode ────────────────────────────────────────────
  const threadId = query.threadId as string | undefined
  if (threadId) {
    try {
      const thread = await $fetch<{ id: string; messages: GmailMessageRaw[] }>(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`,
        { headers: authHeaders },
      )

      const normalized: NormalizedThreadFull = {
        id: thread.id,
        labelIds: Array.from(new Set(thread.messages.flatMap((m) => m.labelIds || []))),
        messages: thread.messages.map(normalizeMessage),
      }
      return normalized
    } catch (err: any) {
      console.error('[gmail/messages] Failed to fetch thread:', err?.data || err)
      throw createError({ statusCode: 502, statusMessage: 'Failed to fetch thread from Gmail.' })
    }
  }

  // ── Thread list mode ──────────────────────────────────────────────
  const labelId = (query.labelId as string) || 'INBOX'
  const maxResults = Number(query.maxResults) || 50
  const q = query.q as string | undefined
  const pageToken = query.pageToken as string | undefined

  const listParams = new URLSearchParams({
    maxResults: String(maxResults),
    labelIds: labelId,
  })
  if (q) listParams.set('q', q)
  if (pageToken) listParams.set('pageToken', pageToken)

  let listResponse: { threads?: GmailThreadListItem[]; nextPageToken?: string; resultSizeEstimate?: number }
  try {
    listResponse = await $fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads?${listParams.toString()}`, {
      headers: authHeaders,
    })
  } catch (err: any) {
    console.error('[gmail/messages] Failed to list threads:', err?.data || err)
    throw createError({ statusCode: 502, statusMessage: 'Failed to list threads from Gmail.' })
  }

  const threadRefs = listResponse.threads || []
  if (threadRefs.length === 0) {
    return { threads: [] as NormalizedThreadSummary[], nextPageToken: listResponse.nextPageToken }
  }

  // Fetch metadata for each thread in parallel — only the most recent
  // message's headers + snippet are needed for the list view.
  const summaries = await Promise.all(
    threadRefs.map(async (ref): Promise<NormalizedThreadSummary | null> => {
      try {
        const thread = await $fetch<{ id: string; messages: GmailMessageRaw[] }>(
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
          subject: getHeader(headers, 'Subject'),
          from: getHeader(headers, 'From'),
          snippet: ref.snippet || lastMsg.snippet || '',
          date: getHeader(headers, 'Date') || (internalDateMs ? new Date(internalDateMs).toISOString() : ''),
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
    threads: summaries.filter((s): s is NormalizedThreadSummary => s !== null),
    nextPageToken: listResponse.nextPageToken,
    resultSizeEstimate: listResponse.resultSizeEstimate,
  }
})
