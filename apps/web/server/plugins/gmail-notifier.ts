/**
 * Gmail Notifier
 *
 * Background poller that watches every connected Gmail account and:
 *   1. Persists newly-arrived unread threads as `email` entities in TQL.
 *   2. Runs an AI enrichment pass (summary, entity extraction, importance
 *      classification, topical labels) and caches the result on the entity.
 *   3. Emits an in-app notification whose body + priority reflect the AI
 *      output — so the bell shows a clean preview and important emails ring
 *      louder than newsletters.
 *
 * - Poll interval: 3 minutes (initial delay 30s after boot).
 * - Dedupes by (source=email, sourceId=`threadId:internalDate`): won't
 *   double-notify on replies to an already-seen thread.
 * - Updates connection.lastSyncAt after each successful poll to checkpoint.
 */

import { useTqlKernel } from './tql'
import { getValidAccessToken } from '../api/integrations/gmail/_credentials'
import { createNotification, createSystemAlert } from '../utils/notification-service'
import { NOTIFICATION_NAMESPACE } from '../utils/tql-ontologies'
import { ingestThread, importanceToNotificationPriority } from '../utils/gmail-ingest'
import { normalizeThread, type GmailMessageRaw } from '../utils/gmail-mime'

const POLL_INTERVAL_MS = 3 * 60 * 1000
const INITIAL_DELAY_MS = 30 * 1000
const MAX_THREADS_PER_POLL = 25
// Hard cap on enrichments per poll — LLM calls are cheap locally but we
// don't want a 100-thread backlog to stall the notifier. Excess threads
// still notify (using raw snippet) and get enriched on open via the manual
// Scan button.
const MAX_ENRICHMENTS_PER_POLL = 10

let _handle: NodeJS.Timeout | null = null
let _running = false

// ─── Types ─────────────────────────────────────────────────────────────────

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

/**
 * List the unread INBOX thread refs for the given account. Cheap single call
 * that returns just the thread IDs + snippets — we fetch full bodies only
 * for threads we haven't seen yet (see `fetchFullThread`).
 */
async function listUnreadThreadRefs(accessToken: string): Promise<GmailThreadRef[]> {
  const headers = { Authorization: `Bearer ${accessToken}` }
  const listUrl =
    `https://gmail.googleapis.com/gmail/v1/users/me/threads` +
    `?maxResults=${MAX_THREADS_PER_POLL}&labelIds=INBOX&labelIds=UNREAD`
  const listRes = await $fetch<{ threads?: GmailThreadRef[] }>(listUrl, { headers })
  return listRes.threads || []
}

/**
 * Fetch the full (body-bearing) thread for a given id, normalized into the
 * shared `NormalizedGmailThread` shape. Returns null on failure.
 */
async function fetchFullThread(accessToken: string, threadId: string) {
  const headers = { Authorization: `Bearer ${accessToken}` }
  try {
    const raw = await $fetch<{ id: string; messages: GmailMessageRaw[] }>(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`,
      { headers },
    )
    if (!raw.messages || raw.messages.length === 0) return null
    return normalizeThread(raw)
  } catch (err) {
    console.warn('[gmail-notifier] failed to fetch full thread', threadId, err)
    return null
  }
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
  const refs = await listUnreadThreadRefs(accessToken)

  let emitted = 0
  let enrichedSoFar = 0

  for (const ref of refs) {
    // Stage 1: cheap dedupe using just the ref.id and our already-notified
    // set. We can't know internalDate without fetching the thread, so the
    // uniqueness check below happens post-fetch.
    // Skip entirely if every source id starting with `${ref.id}:` is already
    // notified — handled after fetch via the composed sourceId.

    // Stage 2: fetch full thread so we have body text for ingest + enrich.
    const thread = await fetchFullThread(accessToken, ref.id)
    if (!thread) continue

    const lastMsg = thread.messages[thread.messages.length - 1]!
    const internalDate = lastMsg.internalDate || 0
    const sourceId = `${thread.id}:${internalDate}`

    if (notifiedIds.has(sourceId)) continue
    if (lastSyncMs && internalDate && internalDate <= lastSyncMs) continue

    const fromName = prettyFrom(lastMsg.from)

    // Stage 3: persist + enrich. Enrichment is capped per poll so a big
    // backlog doesn't stall the notifier. Over-cap threads still notify
    // (with the raw snippet) and get enriched on open via the Scan button.
    const shouldEnrich = enrichedSoFar < MAX_ENRICHMENTS_PER_POLL
    let enrichment: Awaited<ReturnType<typeof ingestThread>>['enrichment'] = null
    try {
      if (shouldEnrich) {
        const result = await ingestThread(thread, conn.id)
        enrichment = result.enrichment
        enrichedSoFar++
      } else {
        // Persist without enrichment — still gets the entity into the graph
        // for linking, and enrichment will kick in via the client "Scan"
        // button on first open.
        await ingestThread({ ...thread, messages: thread.messages.slice(0, 1) }, conn.id).catch((err) =>
          console.warn('[gmail-notifier] persist-without-enrich failed:', err),
        )
      }
    } catch (err) {
      console.warn('[gmail-notifier] ingest failed for', thread.id, err)
    }

    // Stage 4: notify. Body prefers the AI summary over the raw snippet;
    // priority mirrors the AI importance classification.
    const notificationPriority = enrichment ? importanceToNotificationPriority(enrichment.importance) : 'normal'
    const notificationBody =
      (enrichment?.summary || '').trim() || lastMsg.snippet || (fromName ? `From ${fromName}` : undefined)

    await createNotification(
      {
        title: lastMsg.subject || `New email from ${fromName}`,
        body: notificationBody,
        kind: 'email',
        source: 'email',
        sourceId,
        priority: notificationPriority,
        url: `/mail?label=INBOX&thread=${encodeURIComponent(thread.id)}`,
        actions: [
          {
            id: 'open',
            kind: 'link',
            label: 'Open',
            icon: 'lucide:external-link',
            target: `/mail?label=INBOX&thread=${encodeURIComponent(thread.id)}`,
          },
          { id: 'mark-read', kind: 'mark_read', label: 'Mark read', icon: 'lucide:check' },
          { id: 'snooze-1h', kind: 'snooze', label: 'Snooze 1h', icon: 'lucide:clock', minutes: 60 },
        ],
        metadata: {
          connectionId: conn.id,
          accountEmail: conn.email,
          from: lastMsg.from,
          fromName,
          internalDate,
          summary: enrichment?.summary,
          aiLabels: enrichment?.aiLabels,
          importance: enrichment?.importance,
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
