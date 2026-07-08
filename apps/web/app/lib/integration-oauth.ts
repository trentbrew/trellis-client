/**
 * Start an OAuth flow for a Trellis integration slug (gmail, google-calendar, github, …).
 *
 * Always passes the caller's user id when available so the callback stores
 * `integration_connection.userId` correctly — without it the connection is
 * keyed to the Google/GitHub email and filtered out of the UI on return.
 */
export function startIntegrationOAuth(
  slug: string,
  opts?: { userId?: string | null; email?: string; returnTo?: string },
): void {
  const params = new URLSearchParams()
  if (opts?.userId) params.set('userId', opts.userId)
  if (opts?.email) params.set('email', opts.email)
  if (opts?.returnTo) params.set('returnTo', opts.returnTo)
  const qs = params.toString()
  window.location.href = `/api/integrations/${slug}/auth${qs ? `?${qs}` : ''}`
}
