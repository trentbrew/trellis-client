/**
 * Calendar Notifier
 *
 * Background poller that emits reminder notifications for upcoming events
 * on every connected Google Calendar account.
 *
 * - Tick every 60s (aligned to :00).
 * - Pulls events in [now - 1min, now + 60min] window.
 * - Honors `event.reminders.overrides[].minutes` when `useDefault` is false;
 *   otherwise falls back to a single 10-min heads-up.
 * - Dedupes by (eventId, minutesBefore) via the notification `sourceId` field.
 */

import { useTqlKernel } from './tql'
import { getValidAccessToken } from '../api/integrations/google-calendar/_credentials'
import { createNotification, createSystemAlert } from '../utils/notification-service'
import { NOTIFICATION_NAMESPACE } from '../utils/tql-ontologies'

const TICK_INTERVAL_MS = 60 * 1000
const LOOKAHEAD_MS = 60 * 60 * 1000
const DEFAULT_REMINDER_MINUTES = [10]

let _handle: NodeJS.Timeout | null = null
let _running = false

// ─── Types ─────────────────────────────────────────────────────────────────

interface GcalReminderOverride {
  method?: string
  minutes: number
}
interface GcalReminders {
  useDefault?: boolean
  overrides?: GcalReminderOverride[]
}
interface GcalEventTime {
  dateTime?: string
  date?: string
  timeZone?: string
}
interface GcalEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  status?: string
  htmlLink?: string
  start?: GcalEventTime
  end?: GcalEventTime
  reminders?: GcalReminders
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>
}

interface ConnectionRow {
  id: string
  email?: string
  syncEnabled?: boolean
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function listConnectedCalendarAccounts(): ConnectionRow[] {
  const kernel = useTqlKernel()
  try {
    const result = kernel.query(
      `FIND entity AS ?c WHERE ?c.type = "integration_connection" AND ?c.integrationId = "google-calendar" AND ?c.connectionStatus = "connected"`,
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
          syncEnabled: get('syncEnabled') !== false,
        }
      })
      .filter((c): c is ConnectionRow => c !== null)
  } catch (err) {
    console.error('[calendar-notifier] list connections failed:', err)
    return []
  }
}

function alreadyNotifiedCalendarKeys(): Set<string> {
  const kernel = useTqlKernel()
  try {
    const result = kernel.query(
      `FIND ${NOTIFICATION_NAMESPACE} AS ?n WHERE ?n.source = "calendar" RETURN ?n.sourceId`,
    ) as any
    const rows: Array<Record<string, any>> = result?.rows || []
    const ids = new Set<string>()
    for (const r of rows) {
      const v = r['?n.sourceId'] || r.sourceId
      if (typeof v === 'string' && v) ids.add(v)
    }
    return ids
  } catch (err) {
    console.error('[calendar-notifier] dedupe load failed:', err)
    return new Set()
  }
}

function resolveReminderMinutes(ev: GcalEvent): number[] {
  const r = ev.reminders
  if (!r) return DEFAULT_REMINDER_MINUTES
  if (r.useDefault) return DEFAULT_REMINDER_MINUTES
  const overrides = (r.overrides || [])
    .map((o) => (typeof o.minutes === 'number' ? o.minutes : null))
    .filter((n): n is number => n !== null && n >= 0)
  return overrides.length > 0 ? overrides : DEFAULT_REMINDER_MINUTES
}

function eventStartMs(ev: GcalEvent): number | null {
  const s = ev.start
  if (!s) return null
  if (s.dateTime) {
    const ms = Date.parse(s.dateTime)
    return Number.isFinite(ms) ? ms : null
  }
  if (s.date) {
    const ms = Date.parse(`${s.date}T00:00:00`)
    return Number.isFinite(ms) ? ms : null
  }
  return null
}

function humanizeMinutes(minutes: number): string {
  if (minutes <= 0) return 'now'
  if (minutes < 60) return `in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (rem === 0) return `in ${hours}h`
  return `in ${hours}h ${rem}m`
}

async function fetchUpcomingEvents(accessToken: string, now: number): Promise<GcalEvent[]> {
  const timeMin = new Date(now - 60_000).toISOString()
  const timeMax = new Date(now + LOOKAHEAD_MS).toISOString()
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })
  const res = await $fetch<{ items?: GcalEvent[] }>(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  return res.items || []
}

async function pollConnection(conn: ConnectionRow, notified: Set<string>, now: number): Promise<number> {
  let accessToken: string
  try {
    accessToken = await getValidAccessToken(conn.id)
  } catch (err: any) {
    const msg = err?.statusMessage || err?.message || 'Authentication failed'
    console.warn(`[calendar-notifier] token unavailable for ${conn.email || conn.id}:`, msg)
    await createSystemAlert({
      title: `Calendar disconnected${conn.email ? `: ${conn.email}` : ''}`,
      body: `${msg} — reconnect to resume calendar reminders.`,
      sourceId: `gcal-auth-failed:${conn.id}`,
      source: 'calendar',
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
      agentId: 'calendar-notifier',
    }).catch(() => {
      /* non-fatal */
    })
    return 0
  }

  let events: GcalEvent[]
  try {
    events = await fetchUpcomingEvents(accessToken, now)
  } catch (err: any) {
    console.warn(`[calendar-notifier] fetch events failed for ${conn.email || conn.id}:`, err?.data || err?.message)
    return 0
  }

  let emitted = 0
  for (const ev of events) {
    if (ev.status === 'cancelled') continue
    const startMs = eventStartMs(ev)
    if (!startMs) continue

    for (const minutes of resolveReminderMinutes(ev)) {
      const fireAt = startMs - minutes * 60_000
      // Fire if we've crossed into the reminder window (within the last 2 ticks)
      // and the event is still in the future.
      if (now < fireAt) continue
      if (now - fireAt > 2 * TICK_INTERVAL_MS) continue
      if (startMs <= now - 60_000) continue

      const sourceId = `${conn.id}:${ev.id}:${minutes}`
      if (notified.has(sourceId)) continue

      const startLabel = new Date(startMs).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
      const title = ev.summary ? `${ev.summary} — ${humanizeMinutes(minutes)}` : `Event ${humanizeMinutes(minutes)}`
      const bodyParts: string[] = [`Starts ${startLabel}`]
      if (ev.location) bodyParts.push(ev.location)

      await createNotification(
        {
          title,
          body: bodyParts.join(' · '),
          kind: minutes === 0 ? 'calendar' : 'reminder',
          source: 'calendar',
          sourceId,
          priority: minutes <= 5 ? 'high' : 'normal',
          url: ev.htmlLink,
          actions: [
            ev.htmlLink
              ? { id: 'open', kind: 'link', label: 'Open', icon: 'lucide:external-link', target: ev.htmlLink }
              : null,
            { id: 'snooze-5', kind: 'snooze', label: 'Snooze 5m', icon: 'lucide:clock', minutes: 5 },
            { id: 'dismiss', kind: 'dismiss', label: 'Dismiss', icon: 'lucide:x' },
          ].filter(Boolean) as any,
          metadata: {
            connectionId: conn.id,
            accountEmail: conn.email,
            eventId: ev.id,
            startMs,
            minutesBefore: minutes,
            location: ev.location,
          },
          groupKey: `calendar:${conn.id}:${ev.id}`,
        },
        { agentId: 'calendar-notifier' },
      )
      notified.add(sourceId)
      emitted++
    }
  }
  return emitted
}

async function tick(now: number = Date.now()): Promise<void> {
  if (_running) return
  _running = true
  try {
    const conns = listConnectedCalendarAccounts()
    if (conns.length === 0) return
    const notified = alreadyNotifiedCalendarKeys()
    let total = 0
    for (const conn of conns) {
      try {
        total += await pollConnection(conn, notified, now)
      } catch (err) {
        console.error('[calendar-notifier] poll failed for', conn.email || conn.id, err)
      }
    }
    if (total > 0) {
      console.log(`[calendar-notifier] emitted ${total} reminder(s) across ${conns.length} account(s)`)
    }
  } catch (err) {
    console.error('[calendar-notifier] tick failed:', err)
  } finally {
    _running = false
  }
}

// ─── Plugin ────────────────────────────────────────────────────────────────

export default defineNitroPlugin((nitroApp) => {
  const now = Date.now()
  const msUntilNextMinute = 60_000 - (now % 60_000)

  setTimeout(() => {
    tick().catch((err) => console.error('[calendar-notifier] initial tick error:', err))
    _handle = setInterval(() => {
      tick().catch((err) => console.error('[calendar-notifier] tick error:', err))
    }, TICK_INTERVAL_MS)
  }, msUntilNextMinute)

  nitroApp.hooks.hook('close', () => {
    if (_handle) {
      clearInterval(_handle)
      _handle = null
    }
  })

  console.log(
    `[calendar-notifier] started — first tick in ${Math.round(msUntilNextMinute / 1000)}s, interval ${TICK_INTERVAL_MS / 1000}s`,
  )
})

export async function tickCalendarNotifierNow(now?: number): Promise<void> {
  await tick(now)
}
