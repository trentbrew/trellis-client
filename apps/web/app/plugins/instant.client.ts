/**
 * Data adapter plugin — local-only (instant-local + TQL kernel).
 */

import { createLocalAdapter } from '~/lib/data-adapter'
import type { DataAdapter } from '~/lib/data-adapter'
import platformSchema from '~/lib/instant-local/platform-schema'

export default defineNuxtPlugin(async () => {
  const db: DataAdapter = createLocalAdapter({
    storageKey: 'platform-sandbox',
    schema: platformSchema,
    verbose: false,
  })

  if (import.meta.dev) {
    console.info(
      `✓ DataAdapter active (mode: ${db.mode}, entities: ${db.entityBackend}, ontologies: ${db.ontologyBackend})`,
    )
  }

  $fetch('/api/storage/init-local', { method: 'POST' }).catch((err) => {
    console.warn('[instant.client] Could not init local storage dir:', err?.message || err)
  })

  return {
    provide: {
      instantDb: db,
    },
  }
})
