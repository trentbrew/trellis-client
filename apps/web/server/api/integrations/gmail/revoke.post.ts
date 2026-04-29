/**
 * POST /api/integrations/gmail/revoke
 *
 * Revokes the Gmail OAuth token and deletes the
 * integration_connection entity from TQL.
 *
 * Body: { connectionId: string }
 */

import { useTqlKernel } from '../../../plugins/tql'
import { requireConnectionOwner } from '../../../utils/connection-auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ connectionId: string }>(event)

  if (!body?.connectionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId in request body.' })
  }

  // Prevent one user from revoking another user's Gmail token.
  await requireConnectionOwner(event, body.connectionId)

  const kernel = useTqlKernel()

  const entityId = body.connectionId.startsWith('entity:') ? body.connectionId : `entity:${body.connectionId}`
  const queryResult = kernel.query(`FIND entity AS ?c WHERE ?c["@id"] = "${entityId}" RETURN ?c.credentialsRef`) as any
  const rows = queryResult?.data || []
  const credentialsRef = rows[0]?.['?c.credentialsRef'] as string | undefined

  if (credentialsRef) {
    try {
      const creds = JSON.parse(credentialsRef)
      if (creds.accessToken) {
        await $fetch(`https://oauth2.googleapis.com/revoke?token=${creds.accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }).catch((err: any) => {
          console.warn('[gmail/revoke] Google token revocation failed (non-fatal):', err?.data?.error || err)
        })
      }
    } catch {
      console.warn('[gmail/revoke] Failed to parse credentials — skipping Google revocation')
    }
  }

  await kernel.deleteNode(body.connectionId)
  console.log(`[gmail/revoke] Disconnected and deleted ${body.connectionId}`)

  return { ok: true }
})
