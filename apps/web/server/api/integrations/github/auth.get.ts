/**
 * GET /api/integrations/github/auth
 *
 * Initiates the GitHub OAuth 2.0 flow.
 * Scopes: repo (full repo access), read:user, read:org.
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const clientId = config.public.githubClientId as string
  const redirectUri = config.githubRedirectUri as string

  if (!clientId || !redirectUri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GitHub integration is not configured. Set GITHUB_CLIENT_ID and GITHUB_REDIRECT_URI.',
    })
  }

  const state = crypto.randomUUID()

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300,
    path: '/',
    sameSite: 'lax' as const,
  }

  setCookie(event, 'github_oauth_state', state, cookieOpts)

  const query = getQuery(event)
  const userId = typeof query.userId === 'string' ? query.userId : ''
  if (userId) setCookie(event, 'github_oauth_user', userId, cookieOpts)

  const returnTo = typeof query.returnTo === 'string' ? query.returnTo : ''
  if (returnTo) setCookie(event, 'github_oauth_return', returnTo, cookieOpts)

  // Default scopes — user can override via ?scopes=repo,read:user
  const scopesParam = typeof query.scopes === 'string' ? query.scopes : 'repo,read:user,read:org'
  const scope = scopesParam.split(',').map((s) => s.trim()).filter(Boolean).join(' ')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    // `allow_signup=true` keeps the sign-up option visible, matching default.
    allow_signup: 'true',
  })

  // Pre-populate the login field if provided
  const loginHint = typeof query.login === 'string' ? query.login : ''
  if (loginHint) params.set('login', loginHint)

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`

  return sendRedirect(event, authUrl)
})
