/**
 * TQL Server Plugin
 *
 * Boots a TrellisKernel instance on the Nuxt server with:
 * - better-sqlite3 persistence at .data/trellis.db
 * - Ontology definitions for all entity types
 * - Seed data on first boot
 *
 * The kernel is stored in a module-level singleton so server API routes
 * can import it via `useTqlKernel()`.
 */

import { resolve } from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'
import { TrellisKernel } from '@toolkit/tql'
import { BetterSqliteBackend } from '@toolkit/tql/persist/better-sqlite'
import { createWorkspaceConfig } from '../utils/tql-ontologies'
import { getPersonalSeedItems } from './tql-seed'

// Module-level singleton — accessible from API routes via useTqlKernel()
let _kernel: TrellisKernel | null = null

export function useTqlKernel(): TrellisKernel {
  if (!_kernel) {
    throw new Error('[tql] Kernel not initialized — server plugin has not run yet')
  }
  return _kernel
}

export default defineNitroPlugin(async (nitro) => {
  const dataDir = resolve(process.cwd(), '.data')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  const dbPath = resolve(dataDir, 'trellis.db')
  const backend = new BetterSqliteBackend({ filename: dbPath })

  const kernel = new TrellisKernel({
    backend,
    autoReplay: true,
  })

  // Boot with workspace config (ontologies + projections)
  const workspaceConfig = createWorkspaceConfig()
  await kernel.boot(workspaceConfig)

  // Seed data on first boot (if the store is empty)
  const store = kernel.getStore()
  const existingFacts = store.getAllFacts()
  let factCount = 0
  for (const _ of existingFacts) {
    factCount++
    if (factCount > 0) break
  }

  if (factCount === 0) {
    console.log('[tql] First boot — seeding personal calendar items...')
    const seedItems = getPersonalSeedItems()

    for (const item of seedItems) {
      const entityId = `calendaritem:${item.id}`
      const { id: _id, ...data } = item
      await kernel.createNode(entityId, data, 'calendaritem')
    }

    console.log(`[tql] Seeded ${seedItems.length} calendar items`)
    await kernel.checkpoint()
  } else {
    console.log('[tql] Kernel restored from existing data')
  }

  // Store in module singleton
  _kernel = kernel

  // Clean up on shutdown
  nitro.hooks.hook('close', () => {
    kernel.close()
    _kernel = null
    console.log('[tql] Kernel closed')
  })

  console.log('[tql] TrellisKernel ready')
})
