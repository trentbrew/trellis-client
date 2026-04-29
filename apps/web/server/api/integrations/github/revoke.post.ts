/**
 * POST /api/integrations/github/revoke
 *
 * Revokes the GitHub OAuth token and deletes the
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

  // Prevent one user from revoking another user's GitHub token.
  await requireConnectionOwner(event, body.connectionId)

  const config = useRuntimeConfig()
  const clientId = config.public.githubClientId as string
  const clientSecret = config.githubClientSecret as string

  const kernel = useTqlKernel()

  const entityId = body.connectionId.startsWith('entity:') ? body.connectionId : `entity:${body.connectionId}`
  const facts = kernel.getStore().getFactsByEntity(entityId)
  const credentialsRef = facts.find((f: any) => f.a === 'credentialsRef')?.v as string | undefined

  if (credentialsRef && clientId && clientSecret) {
    try {
      const creds = JSON.parse(credentialsRef)
      if (creds.accessToken) {
        // GitHub revokes via DELETE /applications/{client_id}/grant with Basic auth
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        await $fetch(`https://api.github.com/applications/${encodeURIComponent(clientId)}/grant`, {
          method: 'DELETE',
          headers: {
            Authorization: `Basic ${basic}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Trellis-Client',
          },
          body: { access_token: creds.accessToken },
        }).catch((err: any) => {
          console.warn('[github/revoke] GitHub token revocation failed (non-fatal):', err?.data || err?.message)
        })
      }
    } catch {
      console.warn('[github/revoke] Failed to parse credentials — skipping GitHub revocation')
    }
  }

  await kernel.deleteNode(body.connectionId)
  console.log(`[github/revoke] Disconnected and deleted ${body.connectionId}`)

  return { ok: true }
})
