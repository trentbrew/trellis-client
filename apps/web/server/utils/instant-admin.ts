/**
 * InstantDB Admin SDK — server-side singleton.
 *
 * Used by Nitro API routes that need privileged access to InstantDB
 * (e.g. sending magic codes, creating member records, looking up users).
 *
 * Reads credentials from Nuxt runtimeConfig (server-only keys).
 */

import { init } from '@instantdb/admin'

let _db: ReturnType<typeof init> | null = null

export function useInstantAdmin() {
  if (_db) return _db

  // Try runtimeConfig first, fall back to process.env (monorepo root .env loaded by runner)
  const config = useRuntimeConfig()
  const appId = (config.instantAppId as string) || process.env.INSTANTDB_APP_ID || process.env.INSTANT_APP_ID || ''
  const adminToken = (config.instantAppSecret as string) || process.env.INSTANTDB_APP_SECRET || ''

  if (!appId || !adminToken) {
    throw new Error(
      '[instant-admin] Missing InstantDB credentials. ' +
      'Set INSTANTDB_APP_ID and INSTANTDB_APP_SECRET in your .env file.',
    )
  }

  _db = init({ appId, adminToken })
  return _db
}
