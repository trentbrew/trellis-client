/**
 * Gmail Notifier
 *
 * Background poller that watches every connected Gmail account and emits
 * in-app notifications for new unread threads.
 *
 * - Poll interval: 3 minutes (initial delay 30s after boot).
 * - Dedupes by (source=email, sourceId=threadId): won't double-notify.
 * - Updates connection.lastSyncAt after each successful poll to checkpoint.
 */

import { useTqlKernel } from './tql'
import { getValidAccessToken } from '../api/integrations/gmail/_credentials'
import { createNotification, createSystemAlert } from '../utils/notification-service'
import { NOTIFICATION_NAMESPACE } from '../utils/tql-ontologies'

const POLL_INTERVAL_MS = 3 * 60 * 1000
const INITIAL_DELAY_MS = 30 * 1000
const MAX_THREADS_PER_POLL = 25

let _handle: NodeJS.Timeout | null = null
let _running = false

// ─── Types ─────────────────────────────────────────────────────────────────

interface GmailHeader {
  name: string
  value: string
}
interface GmailMessageRaw {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: { headers?: GmailHeader[] }
}
interface GmailThreadRef {
  id: string
  snippet?: string
  historyId?: string
}

interface ConnectionRow {
  id: string
  email?: string
  lastSyncAt?: string
  syncEnabled?: boolean
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers) return ''
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

function prettyFrom(raw: string): string {
  if (!raw) return 'Unknown sender'
  // "Alice <alice@x.com>" → "Alice"; fallback to email local part
  const m = raw.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/)
  if (m?.[1]) return m[1].trim()
  const at = raw.indexOf('@')
  return at > 0 ? raw.slice(0, at).trim() : raw.trim()
}

function listConnectedGmailAccounts(): ConnectionRow[] {
  const kernel = useTqlKernel()
  try {
    const result = kernel.query(
      `FIND entity AS ?c WHERE ?c.type = "integration_connection" AND ?c.integrationId = "gmail" AND ?c.connectionStatus = "connected"`,
    ) as any
    const rows: Array<Record<string, any>> = result?.rows || []
    const store = kernel.getStore()
    return rows
      .map((r): ConnectionRow | null => {
        const id = (r['?c'] || r['@id']) as string | undefined
        if (!id) return null
        const facts = store.getFactsByEntity(id)
        const get = (a: string) => facts.find((f: any) => f.a === a)?.v as any
        if (get('syncEnabled') === false) return null
        return {
          id,
          email: get('accountEmail') || get('title'),
          lastSyncAt: get('lastSyncAt'),
          syncEnabled: get('syncEnabled') !== false,
        }
      })
      .filter((c): c is ConnectionRow => c !== null)
  } catch (err) {
    console.error('[gmail-notifier] listConnectedGmailAccounts failed:', err)
    return []
  }
}

function alreadyNotifiedThreadIds(): Set<string> {
  const kernel = useTqlKernel()
  try {
    const result = kernel.query(
      `FIND ${NOTIFICATION_NAMESPACE} AS ?n WHERE ?n.source = "email" RETURN ?n.sourceId`,
    ) as any
    const rows: Array<Record<string, any>> = result?.rows || []
    const ids = new Set<string>()
    for (const r of rows) {
      const v = r['?n.sourceId'] || r.sourceId
      if (typeof v === 'string' && v) ids.add(v)
    }
    return ids
  } catch (err) {
    console.error('[gmail-notifier] alreadyNotifiedThreadIds failed:', err)
    return new Set()
  }
}

async function fetchUnreadThreadMetas(accessToken: string): Promise<
  Array<{
    threadId: string
    subject: string
    from: string
    snippet: string
    internalDate: number
  }>
> {
  const headers = { Authorization: `Bearer ${accessToken}` }

  // Only fetch unread threads in INBOX — most efficient query for our use.
  const listUrl =
    `https://gmail.googleapis.com/gmail/v1/users/me/threads` +
    `?maxResults=${MAX_THREADS_PER_POLL}&labelIds=INBOX&labelIds=UNREAD`

  const listRes = await $fetch<{ threads?: GmailThreadRef[] }>(listUrl, { headers })
  const refs = listRes.threads || []
  if (refs.length === 0) return []

  const metas = await Promise.all(
    refs.map(async (ref) => {
      try {
        const thread = await $fetch<{ id: string; messages: GmailMessageRaw[] }>(
          `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(ref.id)}` +
            `?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers },
        )
        const messages = thread.messages || []
        if (messages.length === 0) return null
        const lastMsg = messages[messages.length - 1]!
        const hdrs = lastMsg.payload?.headers
        return {
          threadId: thread.id,
          subject: getHeader(hdrs, 'Subject') || '(no subject)',
          from: getHeader(hdrs, 'From'),
          snippet: ref.snippet || lastMsg.snippet || '',
          internalDate: lastMsg.internalDate ? Number(lastMsg.internalDate) : 0,
        }
      } catch (err) {
        console.warn('[gmail-notifier] failed to hydrate thread', ref.id, err)
        return null
      }
    }),
  )

  return metas.filter((m): m is NonNullable<typeof m> => m !== null)
}

async function pollConnection(conn: ConnectionRow, notifiedIds: Set<string>): Promise<number> {
  const kernel = useTqlKernel()

  let accessToken: string
  try {
    accessToken = await getValidAccessToken(conn.id)
  } catch (err: any) {
    const msg = err?.statusMessage || err?.message || 'Authentication failed'
    console.warn(`[gmail-notifier] access token unavailable for ${conn.email || conn.id}:`, msg)
    // Surface an alert so the user knows to reconnect (dedup by connection id)
    await createSystemAlert({
      title: `Gmail disconnected${conn.email ? `: ${conn.email}` : ''}`,
      body: `${msg} — reconnect to resume email notifications.`,
      sourceId: `gmail-auth-failed:${conn.id}`,
      source: 'email',
      severity: 'warning',
      url: '/settings/integrations',
      actions: [
        {
          id: 'reconnect',
          kind: 'link',
          label: 'Reconnect',
          icon: 'lucide:plug',
          target: '/settings/integrations',
          closesNotification: true,
        },
      ],
      metadata: { connectionId: conn.id, accountEmail: conn.email, reason: msg },
      agentId: 'gmail-notifier',
    }).catch(() => {
      /* non-fatal */
    })
    return 0
  }

  const lastSyncMs = conn.lastSyncAt ? Date.parse(conn.lastSyncAt) : 0
  const metas = await fetchUnreadThreadMetas(accessToken)

  let emitted = 0
  for (const m of metas) {
    // Unique per (thread, latest-message) — new replies bump internalDate, so
    // replies on an already-notified thread still surface a fresh notification.
    const sourceId = `${m.threadId}:${m.internalDate || 0}`
    if (notifiedIds.has(sourceId)) continue
    if (lastSyncMs && m.internalDate && m.internalDate <= lastSyncMs) continue

    const fromName = prettyFrom(m.from)
    await createNotification(
      {
        title: m.subject || `New email from ${fromName}`,
        body: m.snippet || (fromName ? `From ${fromName}` : undefined),
        kind: 'email',
        source: 'email',
        sourceId,
        priority: 'normal',
        url: `/mail?label=INBOX&thread=${encodeURIComponent(m.threadId)}`,
        actions: [
          {
            id: 'open',
            kind: 'link',
            label: 'Open',
            icon: 'lucide:external-link',
            target: `/mail?label=INBOX&thread=${encodeURIComponent(m.threadId)}`,
          },
          { id: 'mark-read', kind: 'mark_read', label: 'Mark read', icon: 'lucide:check' },
          { id: 'snooze-1h', kind: 'snooze', label: 'Snooze 1h', icon: 'lucide:clock', minutes: 60 },
        ],
        metadata: {
          connectionId: conn.id,
          accountEmail: conn.email,
          from: m.from,
          fromName,
          internalDate: m.internalDate,
        },
        groupKey: `email:${conn.id}`,
      },
      { agentId: 'gmail-notifier' },
    )
    notifiedIds.add(sourceId)
    emitted++
  }

  // Checkpoint lastSyncAt so subsequent polls skip older threads we may have
  // already surfaced but got renotified edge-cases.
  try {
    await kernel.updateNode(conn.id, { lastSyncAt: new Date().toISOString() }, 'entity', { agentId: 'gmail-notifier' })
  } catch (err) {
    console.warn('[gmail-notifier] failed to update lastSyncAt for', conn.id, err)
  }

  return emitted
}

async function tick(): Promise<void> {
  if (_running) return
  _running = true
  try {
    const conns = listConnectedGmailAccounts()
    if (conns.length === 0) return

    const notified = alreadyNotifiedThreadIds()
    let total = 0
    for (const conn of conns) {
      try {
        total += await pollConnection(conn, notified)
      } catch (err) {
        console.error('[gmail-notifier] poll failed for', conn.email || conn.id, err)
      }
    }
    if (total > 0) {
      console.log(`[gmail-notifier] emitted ${total} email notification(s) across ${conns.length} account(s)`)
    }
  } catch (err) {
    console.error('[gmail-notifier] tick failed:', err)
  } finally {
    _running = false
  }
}

// ─── Plugin ────────────────────────────────────────────────────────────────

export default defineNitroPlugin((nitroApp) => {
  setTimeout(() => {
    tick().catch((err) => console.error('[gmail-notifier] initial tick error:', err))
    _handle = setInterval(() => {
      tick().catch((err) => console.error('[gmail-notifier] tick error:', err))
    }, POLL_INTERVAL_MS)
  }, INITIAL_DELAY_MS)

  nitroApp.hooks.hook('close', () => {
    if (_handle) {
      clearInterval(_handle)
      _handle = null
    }
  })

  console.log(
    `[gmail-notifier] started — first poll in ${INITIAL_DELAY_MS / 1000}s, interval ${POLL_INTERVAL_MS / 1000}s`,
  )
})

export async function tickGmailNotifierNow(): Promise<void> {
  await tick()
}
