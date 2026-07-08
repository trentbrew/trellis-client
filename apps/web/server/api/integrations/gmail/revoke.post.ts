import { useTrellisKernel } from '../../../plugins/trellis-kernel'
import { requireConnectionOwner } from '../../../utils/connection-auth'
import { loadCredentials } from '../../../utils/google-oauth-credentials'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.connectionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing connectionId in request body.' })
  }

  await requireConnectionOwner(event, body.connectionId)

  const creds = await loadCredentials(body.connectionId)
  if (creds?.accessToken) {
    await $fetch(`https://oauth2.googleapis.com/revoke?token=${creds.accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).catch((err: any) => {
      console.warn('[gmail/revoke] Google token revocation failed (non-fatal):', err?.data?.error || err)
    })
  }

  const kernel = useTrellisKernel()
  await kernel.deleteNode(body.connectionId, { agentId: 'gmail-oauth' })

  console.log(`[gmail/revoke] Disconnected and deleted ${body.connectionId}`)
  return { ok: true }
})
