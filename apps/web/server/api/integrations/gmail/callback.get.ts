import { useTrellisKernel } from '../../../plugins/trellis-kernel'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const state = query.state
  const savedState = getCookie(event, 'gmail_oauth_state')
  const oauthUserId = getCookie(event, 'gmail_oauth_user') || ''
  const returnTo = getCookie(event, 'gmail_oauth_return') || ''

  deleteCookie(event, 'gmail_oauth_state')
  deleteCookie(event, 'gmail_oauth_user')
  deleteCookie(event, 'gmail_oauth_return')

  const successRedirect = returnTo
    ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}connected=gmail`
    : '/settings/integrations?connected=gmail'
  const errorRedirect = (reason: string) =>
    returnTo
      ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}error=${reason}`
      : `/settings/integrations?error=${reason}`

  if (!state || state !== savedState) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid OAuth state — possible CSRF attack.' })
  }

  if (query.error) {
    console.error('[gmail/callback] OAuth error from Google:', query.error)
    return sendRedirect(event, errorRedirect('oauth_denied'))
  }

  const code = query.code
  if (!code || typeof code !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing authorization code.' })
  }

  const clientId = config.public.googleClientId
  const clientSecret = config.googleClientSecret
  const redirectUri = config.gmailRedirectUri

  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({ statusCode: 500, statusMessage: 'Gmail integration is not fully configured.' })
  }

  let tokenData: {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope?: string
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
    console.error('[gmail/callback] Token exchange failed:', err?.data || err)
    return sendRedirect(event, errorRedirect('token_exchange_failed'))
  }

  let email = 'unknown'
  try {
    const userInfo = await $fetch<{ email?: string }>('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    email = userInfo.email || 'unknown'
  } catch {
    console.warn('[gmail/callback] Failed to fetch user email — continuing with "unknown"')
  }

  const kernel = useTrellisKernel()
  const now = new Date().toISOString()
  const expiresAt = Date.now() + tokenData.expires_in * 1000
  const credentialsBlob = JSON.stringify({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || '',
    expiresAt,
    scope: tokenData.scope,
  })

  const connId = `entity:integration-conn-gmail-${email.replace(/[^a-z0-9]/gi, '-')}`
  // Prefer the Trellis user id captured at auth start — falling back to the
  // Google email breaks the client-side ownership filter (user-demo-admin ≠
  // trent@gmail.com) and makes the connection vanish from the UI.
  const userId = oauthUserId || undefined

  await kernel.createNode(
    connId,
    {
      type: 'integration_connection',
      title: `Gmail (${email})`,
      integrationId: 'gmail',
      connectionStatus: 'connected',
      connectedAt: now,
      lastSyncAt: now,
      syncEnabled: true,
      syncIntervalMs: 900_000,
      accountEmail: email,
      accountName: email,
      credentialsRef: credentialsBlob,
      syncedEntityCount: 0,
      ...(userId ? { userId } : {}),
    },
    'entity',
    { agentId: 'gmail-oauth' },
  )

  console.log(`[gmail/callback] Connected Gmail for ${email}`)
  return sendRedirect(event, successRedirect)
})
