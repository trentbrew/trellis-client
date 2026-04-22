/**
 * GET /api/integrations/github/callback
 *
 * OAuth 2.0 callback handler. Exchanges the authorization code for tokens,
 * fetches the user's GitHub profile, stores credentials in TQL as an
 * integration_connection entity, and redirects back to settings.
 */

import { useTqlKernel } from '../../../plugins/tql'

interface GithubTokenResponse {
  access_token: string
  token_type: string
  scope: string
  expires_in?: number
  refresh_token?: string
  refresh_token_expires_in?: number
  error?: string
  error_description?: string
}

interface GithubUserResponse {
  id: number
  login: string
  name?: string
  email?: string
  avatar_url?: string
  type: 'User' | 'Organization'
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  // ── Validate state ──────────────────────────────────────────────────
  const state = query.state as string | undefined
  const savedState = getCookie(event, 'github_oauth_state')
  const oauthUserId = getCookie(event, 'github_oauth_user') || ''
  const returnTo = getCookie(event, 'github_oauth_return') || ''
  deleteCookie(event, 'github_oauth_state')
  deleteCookie(event, 'github_oauth_user')
  deleteCookie(event, 'github_oauth_return')

  const successRedirect = returnTo
    ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}connected=github`
    : '/settings/integrations?connected=github'
  const errorRedirect = (reason: string) =>
    returnTo
      ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}error=${reason}`
      : `/settings/integrations?error=${reason}`

  if (!state || state !== savedState) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid OAuth state — possible CSRF attack.' })
  }

  if (query.error) {
    console.error('[github/callback] OAuth error from GitHub:', query.error, query.error_description)
    return sendRedirect(event, errorRedirect('oauth_denied'))
  }

  const code = query.code as string
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing authorization code.' })
  }

  // ── Exchange code for tokens ────────────────────────────────────────
  const clientId = config.public.githubClientId as string
  const clientSecret = config.githubClientSecret as string
  const redirectUri = config.githubRedirectUri as string

  if (!clientId || !clientSecret || !redirectUri) {
    throw createError({ statusCode: 500, statusMessage: 'GitHub integration is not fully configured.' })
  }

  let tokenData: GithubTokenResponse
  try {
    tokenData = await $fetch<GithubTokenResponse>('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      },
    })
  } catch (err: any) {
    console.error('[github/callback] Token exchange failed:', err?.data || err)
    return sendRedirect(event, errorRedirect('token_exchange_failed'))
  }

  if (!tokenData?.access_token) {
    console.error('[github/callback] Token response missing access_token:', tokenData)
    return sendRedirect(event, errorRedirect(tokenData?.error || 'no_access_token'))
  }

  // ── Fetch user profile ──────────────────────────────────────────────
  let profile: GithubUserResponse | null = null
  try {
    profile = await $fetch<GithubUserResponse>('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Trellis-Client',
      },
    })
  } catch (err) {
    console.warn('[github/callback] Failed to fetch GitHub user — continuing without profile', err)
  }

  const login = profile?.login || 'unknown'
  const displayName = profile?.name || profile?.login || 'GitHub'
  const accountEmail = profile?.email || ''
  const avatarUrl = profile?.avatar_url || ''

  // ── Store credentials + create connection in TQL ────────────────────
  const kernel = useTqlKernel()
  const now = new Date().toISOString()
  const expiresAt =
    typeof tokenData.expires_in === 'number' ? Date.now() + tokenData.expires_in * 1000 : undefined
  const refreshTokenExpiresAt =
    typeof tokenData.refresh_token_expires_in === 'number'
      ? Date.now() + tokenData.refresh_token_expires_in * 1000
      : undefined

  const credentialsBlob = JSON.stringify({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || undefined,
    expiresAt,
    refreshTokenExpiresAt,
    scope: tokenData.scope,
    tokenType: tokenData.token_type,
  })

  // Use GitHub login as the stable key so re-connecting the same account
  // updates the existing connection instead of creating duplicates.
  const slug = login.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const connId = `entity:integration-conn-github-${slug}`

  const userId = oauthUserId || login

  await kernel.createNode(
    connId,
    {
      type: 'integration_connection',
      title: `GitHub (${login})`,
      integrationId: 'github',
      userId,
      connectionStatus: 'connected',
      connectedAt: now,
      lastSyncAt: now,
      syncEnabled: true,
      syncIntervalMs: 900000,
      accountEmail,
      accountName: displayName,
      avatar: avatarUrl,
      ownerLogin: login,
      credentialsRef: credentialsBlob,
      syncedEntityCount: 0,
    },
    'entity',
  )

  console.log(`[github/callback] Connected GitHub for @${login}`)

  return sendRedirect(event, successRedirect)
})
