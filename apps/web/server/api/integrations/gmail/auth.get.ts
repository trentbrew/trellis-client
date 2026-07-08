const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const clientId = config.public.googleClientId
  const redirectUri = config.gmailRedirectUri

  if (!clientId || !redirectUri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Gmail integration is not configured. Set GOOGLE_CLIENT_ID and GMAIL_REDIRECT_URI.',
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

  setCookie(event, 'gmail_oauth_state', state, cookieOpts)

  const query = getQuery(event)
  const userId = typeof query.userId === 'string' ? query.userId : ''
  if (userId) setCookie(event, 'gmail_oauth_user', userId, cookieOpts)

  const returnTo = typeof query.returnTo === 'string' ? query.returnTo : ''
  if (returnTo) setCookie(event, 'gmail_oauth_return', returnTo, cookieOpts)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  const emailHint = typeof query.email === 'string' ? query.email : ''
  if (emailHint) params.set('login_hint', emailHint)

  return sendRedirect(event, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
})
