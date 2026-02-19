/**
 * GET /api/integrations/google-calendar/callback
 *
 * OAuth 2.0 callback handler. Exchanges the authorization code for tokens,
 * fetches the user's email, stores credentials in TQL as an
 * integration_connection entity, and redirects back to settings.
 */

import { useTqlKernel } from '../../../plugins/tql'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  // ── Validate state ──────────────────────────────────────────────────
  const state = query.state as string | undefined
  const savedState = getCookie(event, 'gcal_oauth_state')
  const oauthUserId = getCookie(event, 'gcal_oauth_user') || ''
  const returnTo = getCookie(event, 'gcal_oauth_return') || ''
  deleteCookie(event, 'gcal_oauth_state')
  deleteCookie(event, 'gcal_oauth_user')
  deleteCookie(event, 'gcal_oauth_return')

  // Determine where to redirect after completion
  const successRedirect = returnTo
    ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}connected=google-calendar`
    : '/settings/integrations?connected=google-calendar'
  const errorRedirect = (reason: string) => returnTo
    ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}error=${reason}`
    : `/settings/integrations?error=${reason}`

  if (!state || state !== savedState) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid OAuth state — possible CSRF attack.' })
  }

  // ── Check for errors from Google ────────────────────────────────────
  if (query.error) {
    console.error('[gcal/callback] OAuth error from Google:', query.error)
    return sendRedirect(event, errorRedirect('oauth_denied'))
  }

  const code = query.code as string
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing authorization code.' })
  }

  // ── Exchange code for tokens ────────────────────────────────────────
  const clientId = config.public.googleClientId
  const clientSecret = config.googleClientSecret
  const redirectUri = config.googleCalendarRedirectUri

  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({ statusCode: 500, statusMessage: 'Google Calendar integration is not fully configured.' })
  }

  let tokenData: {
    access_token: string
    refresh_token?: string
    expires_in: number
    token_type: string
    scope: string
  }

  try {
    tokenData = await $fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
    })
  } catch (err: any) {
    console.error('[gcal/callback] Token exchange failed:', err?.data || err)
    return sendRedirect(event, errorRedirect('token_exchange_failed'))
  }

  // ── Fetch user email ────────────────────────────────────────────────
  let email = 'unknown'
  try {
    const userInfo: { email?: string } = await $fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    email = userInfo.email || 'unknown'
  } catch {
    console.warn('[gcal/callback] Failed to fetch user email — continuing with "unknown"')
  }

  // ── Store credentials + create connection in TQL ────────────────────
  const kernel = useTqlKernel()
  const now = new Date().toISOString()
  const expiresAt = Date.now() + tokenData.expires_in * 1000

  // Credentials are stored as a JSON blob in a server-only field.
  // In production, this should be encrypted at rest.
  const credentialsBlob = JSON.stringify({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || '',
    expiresAt,
    scope: tokenData.scope,
  })

  // Use the email as a stable key so re-connecting the same account
  // updates the existing connection instead of creating duplicates.
  const connId = `entity:integration-conn-google-calendar-${email.replace(/[^a-z0-9]/gi, '-')}`

  // In cloud mode the client passes its InstantDB userId through a cookie;
  // in local mode (no auth) fall back to the Google email.
  const userId = oauthUserId || email

  await kernel.createNode(connId, {
    type: 'integration_connection',
    title: `Google Calendar (${email})`,
    integrationId: 'google-calendar',
    userId,
    connectionStatus: 'connected',
    connectedAt: now,
    lastSyncAt: now,
    syncEnabled: true,
    syncIntervalMs: 900000,
    accountEmail: email,
    accountName: email,
    credentialsRef: credentialsBlob,
    syncedEntityCount: 0,
  }, 'entity')

  console.log(`[gcal/callback] Connected Google Calendar for ${email}`)

  return sendRedirect(event, successRedirect)
})
