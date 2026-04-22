/**
 * Shared Gmail MIME + header helpers.
 *
 * Used by both the request-time `/api/integrations/gmail/messages` route
 * and the background `gmail-notifier` plugin so thread normalization is
 * consistent across all code paths.
 */

export interface GmailHeader {
  name: string
  value: string
}

export interface GmailMessagePart {
  partId?: string
  mimeType?: string
  filename?: string
  headers?: GmailHeader[]
  body?: { size?: number; data?: string; attachmentId?: string }
  parts?: GmailMessagePart[]
}

export interface GmailMessageRaw {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: GmailMessagePart
}

export interface NormalizedGmailMessage {
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
  internalDate?: number
}

export interface NormalizedGmailThread {
  id: string
  labelIds: string[]
  messages: NormalizedGmailMessage[]
}

export function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers) return ''
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

export function decodeBase64Url(data: string): string {
  try {
    const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(normalized, 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

/**
 * Walk the MIME tree depth-first collecting text/plain and text/html bodies.
 * Returns the first of each type encountered.
 */
export function extractBody(payload: GmailMessagePart | undefined): { text?: string; html?: string } {
  if (!payload) return {}
  const result: { text?: string; html?: string } = {}

  const walk = (part: GmailMessagePart) => {
    if (part.mimeType === 'text/plain' && part.body?.data && !result.text) {
      result.text = decodeBase64Url(part.body.data)
    } else if (part.mimeType === 'text/html' && part.body?.data && !result.html) {
      result.html = decodeBase64Url(part.body.data)
    }
    if (part.parts) for (const sub of part.parts) walk(sub)
  }

  walk(payload)
  return result
}

export function normalizeMessage(msg: GmailMessageRaw): NormalizedGmailMessage {
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
    internalDate: internalDateMs || undefined,
  }
}

export function normalizeThread(raw: { id: string; messages: GmailMessageRaw[] }): NormalizedGmailThread {
  return {
    id: raw.id,
    labelIds: Array.from(new Set(raw.messages.flatMap((m) => m.labelIds || []))),
    messages: raw.messages.map(normalizeMessage),
  }
}
