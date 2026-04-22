/**
 * Shared GitHub credentials helper.
 *
 * - Loads stored OAuth credentials for a connection from TQL
 * - Refreshes the access token when it has an expiry and is near expiration
 *   (GitHub OAuth apps may opt into expiring tokens with refresh support —
 *   classic tokens never expire, in which case we skip refresh)
 * - Persists refreshed tokens back to TQL
 *
 * Used by every /api/integrations/github/* route that needs a valid
 * access token.
 */

import { useTqlKernel } from '../../../plugins/tql'

export interface StoredCredentials {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  refreshTokenExpiresAt?: number
  scope: string
  tokenType?: string
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000

export async function loadCredentials(connectionId: string): Promise<StoredCredentials | null> {
  const kernel = useTqlKernel()
  const entityId = connectionId.startsWith('entity:') ? connectionId : `entity:${connectionId}`

  const facts = kernel.getStore().getFactsByEntity(entityId)
  const credentialsRef = facts.find((f: any) => f.a === 'credentialsRef')?.v as string | undefined
  if (!credentialsRef) return null

  try {
    return JSON.parse(credentialsRef) as StoredCredentials
  } catch {
    return null
  }
}

interface GithubTokenResponse {
  access_token: string
  token_type: string
  scope: string
  expires_in?: number
  refresh_token?: string
  refresh_token_expires_in?: number
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  refreshTokenExpiresAt?: number
  scope: string
  tokenType: string
}> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const tokenData = await $fetch<GithubTokenResponse>(
    `https://github.com/login/oauth/access_token?${params.toString()}`,
    {
      method: 'POST',
      headers: { Accept: 'application/json' },
    },
  )

  if (!tokenData?.access_token) {
    throw new Error('GitHub refresh response missing access_token')
  }

  const now = Date.now()
  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: typeof tokenData.expires_in === 'number' ? now + tokenData.expires_in * 1000 : undefined,
    refreshTokenExpiresAt:
      typeof tokenData.refresh_token_expires_in === 'number'
        ? now + tokenData.refresh_token_expires_in * 1000
        : undefined,
    scope: tokenData.scope,
    tokenType: tokenData.token_type,
  }
}

/**
 * Loads credentials for a GitHub connection, refreshing the access token if
 * it has an expiry and is within 5 min of expiration. Returns a usable
 * access token string.
 *
 * Throws createError on failure (no creds, expired token with no refresh, etc).
 */
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const config = useRuntimeConfig()
  const kernel = useTqlKernel()

  let creds = await loadCredentials(connectionId)
  if (!creds) {
    throw createError({ statusCode: 404, statusMessage: 'No credentials found for this connection.' })
  }

  // Classic (non-expiring) tokens have no expiresAt — just use them.
  if (!creds.expiresAt) {
    return creds.accessToken
  }

  if (creds.expiresAt >= Date.now() + REFRESH_BUFFER_MS) {
    return creds.accessToken
  }

  // Token expired/near-expiry — refresh.
  if (!creds.refreshToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'GitHub access token expired and no refresh token available. Please reconnect.',
    })
  }

  try {
    const refreshed = await refreshAccessToken(
      creds.refreshToken,
      config.public.githubClientId as string,
      config.githubClientSecret as string,
    )

    const entityId = connectionId.startsWith('entity:') ? connectionId : `entity:${connectionId}`
    const updatedCreds: StoredCredentials = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? creds.refreshToken,
      expiresAt: refreshed.expiresAt,
      refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt ?? creds.refreshTokenExpiresAt,
      scope: refreshed.scope || creds.scope,
      tokenType: refreshed.tokenType || creds.tokenType,
    }
    await kernel.updateNode(
      entityId,
      { credentialsRef: JSON.stringify(updatedCreds) },
      'entity',
    )

    creds = updatedCreds
    return creds.accessToken
  } catch (err: any) {
    console.error('[github/_credentials] Token refresh failed:', err?.data || err)
    throw createError({
      statusCode: 401,
      statusMessage: 'Failed to refresh GitHub access token. Please reconnect.',
    })
  }
}
