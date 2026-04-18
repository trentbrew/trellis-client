/**
 * InstantDB plugin — data adapter injection.
 *
 * Selects the appropriate DataAdapter based on `TRELLIS_DATA_MODE`:
 *   - 'local' (default) → LocalAdapter (instant-local + TQL kernel)
 *   - 'cloud'           → CloudAdapter (@instantdb/core with real auth & sync)
 *
 * In cloud mode, entities + platform data + user ontologies all live in InstantDB.
 * Core/system ontologies are always served by the TQL kernel via /api/graph/ontologies.
 *
 * All downstream composables receive the adapter via `useInstantDb()`.
 */

import { createLocalAdapter, createCloudAdapter } from '~/lib/data-adapter'
import type { DataAdapter, DataMode } from '~/lib/data-adapter'
import schema from '~~/instant.schema'

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const dataMode = (config.public.dataMode || 'local') as DataMode
  const instantAppId = config.public.instantAppId as string

  let db: DataAdapter

  if (dataMode === 'cloud' && instantAppId) {
    db = createCloudAdapter({
      appId: instantAppId,
      schema,
      verbose: import.meta.dev,
      devtool: false,
    })
  } else {
    db = createLocalAdapter({
      storageKey: 'platform-sandbox',
      schema,
      verbose: false,
    })
  }

  // ── Local mode note ────────────────────────────────────────────────
  // No hardcoded seed data is created here. In local mode, users go
  // through onboarding to create their org + app. Cloud mode gets its
  // data from InstantDB. The auto-create fallback in useInstantData.ts
  // handles the case where an authenticated user has no org/app yet.

  if (import.meta.dev) {
    console.info(`✓ DataAdapter active (mode: ${db.mode}, entities: ${db.entityBackend}, ontologies: ${db.ontologyBackend})`)
  }

  // ── Initialize local file storage directory ────────────────────────
  // Ensures ~/.nodebook/files/ exists. Idempotent — safe to call every boot.
  if (dataMode === 'local') {
    $fetch('/api/storage/init-local', { method: 'POST' }).catch((err) => {
      console.warn('[instant.client] Could not init local storage dir:', err?.message || err)
    })
  }

  return {
    provide: {
      instantDb: db,
    },
  }
})
