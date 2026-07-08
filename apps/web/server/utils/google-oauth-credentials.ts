/**
 * OAuth credential load + refresh for Google-backed integrations (Gmail, Calendar).
 */

import { useTrellisKernel } from '../plugins/trellis-kernel'

const REFRESH_BUFFER_MS = 5 * 60 * 1000

export interface OAuthCredentials {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scope?: string
}

export async function loadCredentials(connectionId: string): Promise<OAuthCredentials | null> {
  const kernel = useTrellisKernel()
  const entityId = connectionId.startsWith('entity:') ? connectionId : `entity:${connectionId}`
  const facts = kernel.getStore().getFactsByEntity(entityId)
  const credentialsRef = facts.find((f) => f.a === 'credentialsRef')?.v
  if (!credentialsRef || typeof credentialsRef !== 'string') return null
  try {
    return JSON.parse(credentialsRef) as OAuthCredentials
  } catch {
    return null
  }
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ accessToken: string; expiresAt: number }> {
  const tokenData = await $fetch<{
    access_token: string
    expires_in: number
  }>('https://oauth2.googleapis.com/token', {
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

export async function getValidAccessToken(connectionId: string): Promise<string> {
  const config = useRuntimeConfig()
  const kernel = useTrellisKernel()
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
      const updatedCreds: OAuthCredentials = {
        ...creds,
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
      }
      await kernel.updateNode(entityId, { credentialsRef: JSON.stringify(updatedCreds) }, 'entity')
      creds = updatedCreds
    } catch (err: any) {
      console.error('[google-oauth] Token refresh failed:', err?.data || err)
      throw createError({
        statusCode: 401,
        statusMessage: 'Failed to refresh access token. Please reconnect.',
      })
    }
  }

  return creds.accessToken
}
