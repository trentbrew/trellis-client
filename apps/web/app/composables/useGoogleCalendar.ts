/**
 * useGoogleCalendar — Sync composable for Google Calendar integration.
 *
 * Responsibilities:
 * - Read stored connection from useIntegrations()
 * - Fetch events via server proxy (/api/integrations/google-calendar/events)
 * - Map Google events → TQL entity nodes (type: 'event', source: 'google-calendar')
 * - Enrichment layer: separate TQL nodes linked to GCal events
 * - Auto-sync on mount + configurable interval
 * - Polling fallback (push notifications handled server-side)
 */

import type { IntegrationConnection } from '~/types/database'
import { entityId as toEntityId, entityQuery } from '~/lib/tql-namespace'

// ── Google Calendar API types ─────────────────────────────────────────

interface GCalEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  start?: { date?: string; dateTime?: string; timeZone?: string }
  end?: { date?: string; dateTime?: string; timeZone?: string }
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>
  status?: string
  created?: string
  updated?: string
  recurringEventId?: string
  organizer?: { email?: string; displayName?: string }
}

interface GCalEventsResponse {
  items?: GCalEvent[]
  nextPageToken?: string
  summary?: string
}

// ── Sync status ───────────────────────────────────────────────────────

export type GCalSyncStatus = 'idle' | 'syncing' | 'error'

// ── GCal event → TQL entity mapping ──────────────────────────────────

function mapGCalEventToEntityData(gcalEvent: GCalEvent, calendarId: string): Record<string, any> {
  const isAllDay = !!gcalEvent.start?.date
  const startDate = isAllDay
    ? gcalEvent.start!.date!
    : gcalEvent.start?.dateTime?.slice(0, 10) || ''
  const endDate = isAllDay
    ? gcalEvent.end?.date || startDate
    : gcalEvent.end?.dateTime?.slice(0, 10) || startDate

  const startTime = !isAllDay && gcalEvent.start?.dateTime
    ? gcalEvent.start.dateTime.slice(11, 16)
    : undefined
  const endTime = !isAllDay && gcalEvent.end?.dateTime
    ? gcalEvent.end.dateTime.slice(11, 16)
    : undefined

  return {
    type: 'event',
    title: gcalEvent.summary || '(No title)',
    description: gcalEvent.description || '',
    startDate,
    endDate,
    startTime,
    endTime,
    allDay: isAllDay,
    location: gcalEvent.location || '',
    tags: ['google-calendar'],
    source: 'google-calendar',
    googleEventId: gcalEvent.id,
    googleCalendarId: calendarId,
    htmlLink: gcalEvent.htmlLink || '',
    googleStatus: gcalEvent.status || 'confirmed',
    googleUpdatedAt: gcalEvent.updated || '',
    gcalDeleted: false,
  }
}

function gcalEntityId(googleEventId: string): string {
  return `gcal-${googleEventId}`
}

function enrichmentEntityId(googleEventId: string): string {
  return `gcal-enrich-${googleEventId}`
}

// ── Composable ────────────────────────────────────────────────────────

export function useGoogleCalendar() {
  const { query, fetchNodes, mutate } = useTrellisGraph()
  const { getConnection, getConnections, updateConnection } = useIntegrations()
  const { user } = useInstantAuth()

  // ── Reactive state ──────────────────────────────────────────────────

  const syncStatus = ref<GCalSyncStatus>('idle')
  const syncError = ref<string | null>(null)
  const lastSyncAt = ref<string | null>(null)
  const syncedEventCount = ref(0)
  let isSyncing = false

  // ── Connection accessors ────────────────────────────────────────────

  const connections = computed<IntegrationConnection[]>(() =>
    getConnections('google-calendar'),
  )

  const activeConnections = computed(() =>
    connections.value.filter((c) => c.connectionStatus === 'connected'),
  )

  const connection = computed<IntegrationConnection | undefined>(() =>
    getConnection('google-calendar'),
  )

  const isConnected = computed(() =>
    activeConnections.value.length > 0,
  )

  // ── Reactive query: all synced GCal events ──────────────────────────
  // Note: We query all event-type entities and filter client-side for
  // source='google-calendar' because the 'source' attribute isn't in the
  // EAV catalog until the first GCal event is synced. Querying by
  // ?e.source would throw "Unknown attribute" on an empty store.

  const allEventsQuery = `${entityQuery('?e')} WHERE ?e.type = "event"`
  const { data: allEventIds } = query(allEventsQuery)

  const gcalEvents = ref<Record<string, any>[]>([])

  watch(allEventIds, async (ids) => {
    if (!ids || ids.length === 0) { gcalEvents.value = []; return }
    try {
      const idList = ids.map((row) => (row as any)['?e'] as string)
      const nodes = await fetchNodes(idList)
      // Filter client-side for GCal-synced events
      gcalEvents.value = nodes.filter((n) => n.source === 'google-calendar')
    } catch (err) {
      console.error('[useGoogleCalendar] Failed to hydrate gcal events:', err)
      gcalEvents.value = []
    }
  }, { immediate: true })

  // ── Sync: fetch from Google → upsert into TQL ──────────────────────

  async function syncEvents(opts?: {
    timeMin?: string
    timeMax?: string
    calendarId?: string
    connectionId?: string
  }): Promise<void> {
    // Re-entrancy guard: prevent cascading syncs
    if (isSyncing) return

    // Sync a specific connection or the primary one
    const conn = opts?.connectionId
      ? connections.value.find((c) => c.id === opts.connectionId)
      : connection.value
    if (!conn || conn.connectionStatus !== 'connected') {
      syncError.value = 'Not connected to Google Calendar'
      return
    }

    isSyncing = true
    syncStatus.value = 'syncing'
    syncError.value = null

    try {
      const params = new URLSearchParams({
        connectionId: conn.id.startsWith('entity:') ? conn.id : `entity:${conn.id}`,
      })
      if (opts?.timeMin) params.set('timeMin', opts.timeMin)
      if (opts?.timeMax) params.set('timeMax', opts.timeMax)
      if (opts?.calendarId) params.set('calendarId', opts.calendarId)

      const response = await $fetch<GCalEventsResponse>(
        `/api/integrations/google-calendar/events?${params.toString()}`,
      )

      const events = response.items || []
      const calendarId = opts?.calendarId || 'primary'
      let upsertCount = 0

      for (const gcalEvent of events) {
        if (!gcalEvent.id) continue

        const entityData = mapGCalEventToEntityData(gcalEvent, calendarId)
        const eid = toEntityId(gcalEntityId(gcalEvent.id))

        await mutate({
          action: 'createNode', // idempotent: replaces existing
          entityId: eid,
          type: 'entity',
          data: entityData,
        })
        upsertCount++
      }

      syncedEventCount.value = upsertCount
      lastSyncAt.value = new Date().toISOString()

      // Update the connection's lastSyncAt and syncedEntityCount
      await updateConnection(conn.id, {
        lastSyncAt: lastSyncAt.value,
        syncedEntityCount: upsertCount,
      })

      syncStatus.value = 'idle'
    } catch (err: any) {
      syncStatus.value = 'error'
      syncError.value = err?.message || 'Sync failed'
      console.error('[useGoogleCalendar] Sync failed:', err)
    } finally {
      isSyncing = false
    }
  }

  // ── List calendars ──────────────────────────────────────────────────

  async function listCalendars(): Promise<any[]> {
    const conn = connection.value
    if (!conn) return []

    try {
      const response = await $fetch<{ items?: any[] }>(
        `/api/integrations/google-calendar/events?connectionId=${encodeURIComponent(conn.id)}&listCalendars=true`,
      )
      return response.items || []
    } catch (err) {
      console.error('[useGoogleCalendar] Failed to list calendars:', err)
      return []
    }
  }

  // ── Enrichment layer ────────────────────────────────────────────────

  async function enrichEvent(
    googleEventId: string,
    patch: Record<string, any>,
  ): Promise<void> {
    const enrichId = toEntityId(enrichmentEntityId(googleEventId))
    const gcalId = toEntityId(gcalEntityId(googleEventId))

    // Create or update the enrichment node
    await mutate({
      action: 'createNode',
      entityId: enrichId,
      type: 'entity',
      data: {
        type: 'event',
        title: `Enrichment: ${googleEventId}`,
        source: 'google-calendar-enrichment',
        googleEventId,
        ...patch,
      },
    })

    // Link the enrichment node to the GCal event
    await mutate({
      action: 'link',
      e1: gcalId,
      relation: 'enrichedBy',
      e2: enrichId,
    })
  }

  async function getEnrichment(googleEventId: string): Promise<Record<string, any> | null> {
    const enrichId = toEntityId(enrichmentEntityId(googleEventId))
    try {
      const nodes = await fetchNodes([enrichId])
      return nodes[0] || null
    } catch {
      return null
    }
  }

  // ── Disconnect ──────────────────────────────────────────────────────

  async function disconnect(connectionId?: string): Promise<void> {
    const conn = connectionId
      ? connections.value.find((c) => c.id === connectionId)
      : connection.value
    if (!conn) return

    try {
      await $fetch('/api/integrations/google-calendar/revoke', {
        method: 'POST',
        body: { connectionId: conn.id.startsWith('entity:') ? conn.id : `entity:${conn.id}` },
      })
    } catch (err) {
      console.error('[useGoogleCalendar] Disconnect failed:', err)
      throw err
    }
  }

  // ── Connect (redirect to OAuth) ────────────────────────────────────

  function connect(opts?: { email?: string; returnTo?: string }): void {
    const params = new URLSearchParams()
    const userId = user.value?.id
    if (userId) params.set('userId', userId)
    if (opts?.email) params.set('email', opts.email)
    if (opts?.returnTo) params.set('returnTo', opts.returnTo)
    const qs = params.toString()
    window.location.href = `/api/integrations/google-calendar/auth${qs ? `?${qs}` : ''}`
  }

  // ── Auto-sync on mount ──────────────────────────────────────────────

  let syncInterval: ReturnType<typeof setInterval> | null = null

  // Stable string of active connection IDs — prevents watcher from
  // re-firing when connection objects change but the ID set hasn't.
  const activeConnIds = computed(() =>
    activeConnections.value.map((c) => c.id).sort().join(','),
  )

  async function syncAllConnections() {
    for (const conn of activeConnections.value) {
      await syncEvents({ connectionId: conn.id })
    }
  }

  if (import.meta.client) {
    watch(activeConnIds, (ids) => {
      if (syncInterval) { clearInterval(syncInterval); syncInterval = null }
      if (!ids) return

      // Initial sync (serialized, with re-entrancy guard)
      syncAllConnections()

      // Polling interval (fallback — push notifications handled server-side)
      const intervalMs = activeConnections.value[0]?.syncIntervalMs || 900000
      syncInterval = setInterval(() => syncAllConnections(), intervalMs)
    }, { immediate: true })

    onScopeDispose(() => {
      if (syncInterval) clearInterval(syncInterval)
    })
  }

  return {
    // State
    connection,
    connections,
    activeConnections,
    isConnected,
    syncStatus: computed(() => syncStatus.value),
    syncError: computed(() => syncError.value),
    lastSyncAt: computed(() => lastSyncAt.value),
    syncedEventCount: computed(() => syncedEventCount.value),

    // GCal events from TQL (reactive)
    gcalEvents: computed(() => gcalEvents.value),

    // Actions
    connect,
    disconnect,
    syncEvents,
    listCalendars,
    enrichEvent,
    getEnrichment,
  }
}
