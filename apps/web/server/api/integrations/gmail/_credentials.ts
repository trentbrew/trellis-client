/**
 * Shared Gmail credentials helper.
 *
 * - Loads stored OAuth credentials for a connection from TQL
 * - Refreshes the access token automatically when expired
 * - Persists refreshed tokens back to TQL
 *
 * Used by every /api/integrations/gmail/* route that needs a valid
 * access token.
 */

import { useTqlKernel } from '../../../plugins/tql'

export interface StoredCredentials {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scope: string
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000

export async function loadCredentials(connectionId: string): Promise<StoredCredentials | null> {
  const kernel = useTqlKernel()
  const entityId = connectionId.startsWith('entity:') ? connectionId : `entity:${connectionId}`

  // Retrieve facts directly from the EAV store — no EQL-S query needed for a known entity ID
  const facts = kernel.getStore().getFactsByEntity(entityId)
  const credentialsRef = facts.find((f: any) => f.a === 'credentialsRef')?.v as string | undefined

  if (!credentialsRef) return null

  try {
    return JSON.parse(credentialsRef) as StoredCredentials
  } catch {
    return null
  }
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; expiresAt: number }> {
  const tokenData: { access_token: string; expires_in: number } = await $fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    },
  })

  return {
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  }
}

/**
 * Loads credentials for a Gmail connection, refreshing the access token if
 * it has expired (or is within 5 min of expiration). Returns a usable
 * access token string.
 *
 * Throws createError on failure (no creds, no refresh token, refresh failed).
 */
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const config = useRuntimeConfig()
  const kernel = useTqlKernel()

  let creds = await loadCredentials(connectionId)
  if (!creds) {
    throw createError({ statusCode: 404, statusMessage: 'No credentials found for this connection.' })
  }

  if (creds.expiresAt < Date.now() + REFRESH_BUFFER_MS) {
    if (!creds.refreshToken) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Token expired and no refresh token available. Please reconnect.',
      })
    }

    try {
      const refreshed = await refreshAccessToken(
        creds.refreshToken,
        config.public.googleClientId,
        config.googleClientSecret,
      )

      const entityId = connectionId.startsWith('entity:') ? connectionId : `entity:${connectionId}`
      const updatedCreds: StoredCredentials = {
        ...creds,
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
      }
      await kernel.updateNode(entityId, {
        credentialsRef: JSON.stringify(updatedCreds),
      }, 'entity')

      creds = updatedCreds
    } catch (err: any) {
      console.error('[gmail/_credentials] Token refresh failed:', err?.data || err)
      throw createError({ statusCode: 401, statusMessage: 'Failed to refresh access token. Please reconnect.' })
    }
  }

  return creds.accessToken
}
