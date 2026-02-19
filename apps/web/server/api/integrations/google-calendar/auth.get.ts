/**
 * GET /api/integrations/google-calendar/auth
 *
 * Initiates the Google Calendar OAuth 2.0 flow.
 * Generates a consent URL and redirects the user to Google.
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const clientId = config.public.googleClientId
  const redirectUri = config.googleCalendarRedirectUri

  if (!clientId || !redirectUri) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google Calendar integration is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CALENDAR_REDIRECT_URI.',
    })
  }

  // Generate a random state token to prevent CSRF
  const state = crypto.randomUUID()

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300,
    path: '/',
    sameSite: 'lax' as const,
  }

  // Store state in a short-lived cookie (5 min) for validation in callback
  setCookie(event, 'gcal_oauth_state', state, cookieOpts)

  // In cloud mode, the client passes its InstantDB userId so the callback
  // can associate the connection with the correct user.
  const query = getQuery(event)
  const userId = typeof query.userId === 'string' ? query.userId : ''
  if (userId) {
    setCookie(event, 'gcal_oauth_user', userId, cookieOpts)
  }

  // Allow the client to specify where to redirect after OAuth completes
  const returnTo = typeof query.returnTo === 'string' ? query.returnTo : ''
  if (returnTo) {
    setCookie(event, 'gcal_oauth_return', returnTo, cookieOpts)
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  // Pre-select the user's Google account if an email hint was provided
  const emailHint = typeof query.email === 'string' ? query.email : ''
  if (emailHint) {
    params.set('login_hint', emailHint)
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return sendRedirect(event, authUrl)
})
