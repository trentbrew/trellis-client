/**
 * GET /api/integrations/google-calendar/events
 *
 * Proxy endpoint that fetches events from Google Calendar API using
 * stored OAuth tokens. Handles token refresh automatically.
 *
 * Query params:
 *   - connectionId: TQL entity ID of the integration_connection
 *   - timeMin: ISO date string (start of range)
 *   - timeMax: ISO date string (end of range)
 *   - calendarId: Google Calendar ID (default: 'primary')
 *   - listCalendars: if 'true', returns calendar list instead of events
 */

import { useTqlKernel } from '../../../plugins/tql'
import { requireConnectionOwner } from '../../../utils/connection-auth'

interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
}

interface StoredCredentials {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scope: string
}

async function getCredentials(kernel: any, connectionId: string): Promise<StoredCredentials | null> {
  const entityId = connectionId.startsWith('entity:') ? connectionId : `entity:${connectionId}`

  // Retrieve facts directly from the EAV store — no EQL-S query needed for a known entity ID
  const facts = kernel.getStore().getFactsByEntity(entityId)
  const credentialsRef = facts.find((f: any) => f.a === 'credentialsRef')?.v as string | undefined

  if (!credentialsRef) return null

  try {
    return JSON.parse(credentialsRef) as StoredCredentials
  } catch {
    return null
  }
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; expiresAt: number }> {
  const tokenData: GoogleTokenResponse = await $fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    },
  })

  return {
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const connectionId = query.connectionId as string

  if (!connectionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId query parameter.' })
  }

  // ── Ownership check (multi-tenant isolation) ────────────────────────
  // Throws 403 if the caller (X-User-Id header) is not the stored owner
  // of this integration_connection entity. See `connection-auth.ts` for
  // the full policy and the 2026-04-24 incident this guards against.
  await requireConnectionOwner(event, connectionId)

  const kernel = useTqlKernel()
  let creds = await getCredentials(kernel, connectionId)

  if (!creds) {
    throw createError({ statusCode: 404, statusMessage: 'No credentials found for this connection.' })
  }

  // ── Refresh token if expired (with 5 min buffer) ────────────────────
  const REFRESH_BUFFER_MS = 5 * 60 * 1000
  if (creds.expiresAt < Date.now() + REFRESH_BUFFER_MS) {
    if (!creds.refreshToken) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token expired and no refresh token available. Please reconnect.',
      })
    }

    try {
      const refreshed = await refreshAccessToken(
        creds.refreshToken,
        config.public.googleClientId,
        config.googleClientSecret,
      )

      // Update stored credentials in TQL
      const entityId = connectionId.startsWith('entity:') ? connectionId : `entity:${connectionId}`
      const updatedCreds: StoredCredentials = {
        ...creds,
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
      }
      await kernel.updateNode(
        entityId,
        {
          credentialsRef: JSON.stringify(updatedCreds),
        },
        'entity',
      )

      creds = updatedCreds
    } catch (err: any) {
      console.error('[gcal/events] Token refresh failed:', err?.data || err)
      throw createError({ statusCode: 401, statusMessage: 'Failed to refresh access token. Please reconnect.' })
    }
  }

  const accessToken = creds.accessToken

  // ── List calendars mode ─────────────────────────────────────────────
  if (query.listCalendars === 'true') {
    try {
      const calendarList = await $fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      return calendarList
    } catch (err: any) {
      console.error('[gcal/events] Failed to list calendars:', err?.data || err)
      throw createError({ statusCode: 502, statusMessage: 'Failed to fetch calendar list from Google.' })
    }
  }

  // ── Fetch events ────────────────────────────────────────────────────
  const calendarId = (query.calendarId as string) || 'primary'
  const timeMin = (query.timeMin as string) || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = (query.timeMax as string) || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '2500',
  })

  try {
    const eventsResponse = await $fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    return eventsResponse
  } catch (err: any) {
    console.error('[gcal/events] Failed to fetch events:', err?.data || err)
    throw createError({ statusCode: 502, statusMessage: 'Failed to fetch events from Google Calendar.' })
  }
})
