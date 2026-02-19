/**
 * POST /api/integrations/google-calendar/revoke
 *
 * Revokes the Google Calendar OAuth token and deletes the
 * integration_connection entity from TQL.
 *
 * Body: { connectionId: string }
 */

import { useTqlKernel } from '../../../plugins/tql'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ connectionId: string }>(event)

  if (!body?.connectionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId in request body.' })
  }

  const kernel = useTqlKernel()

  // Fetch the connection node to get credentials via the graph API
  const entityId = body.connectionId.startsWith('entity:') ? body.connectionId : `entity:${body.connectionId}`
  const queryResult = kernel.query(`FIND entity AS ?c WHERE ?c["@id"] = "${entityId}" RETURN ?c.credentialsRef`) as any
  const rows = queryResult?.data || []
  const credentialsRef = rows[0]?.['?c.credentialsRef'] as string | undefined

  if (credentialsRef) {
    try {
      const creds = JSON.parse(credentialsRef)
      if (creds.accessToken) {
        // Revoke the token with Google
        await $fetch(`https://oauth2.googleapis.com/revoke?token=${creds.accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }).catch((err: any) => {
          // Non-fatal — token may already be expired/revoked
          console.warn('[gcal/revoke] Google token revocation failed (non-fatal):', err?.data?.error || err)
        })
      }
    } catch {
      console.warn('[gcal/revoke] Failed to parse credentials — skipping Google revocation')
    }
  }

  // Delete the connection entity from TQL
  await kernel.deleteNode(body.connectionId)
  console.log(`[gcal/revoke] Disconnected and deleted ${body.connectionId}`)

  return { ok: true }
})
