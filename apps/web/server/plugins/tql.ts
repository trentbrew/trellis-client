/**
 * TQL Server Plugin
 *
 * Boots a TrellisKernel instance on the Nuxt server with:
 * - better-sqlite3 persistence at .data/trellis.db
 * - Ontology definitions for all entity types
 * - Seed data on first boot
 *
 * The kernel is stored as a Nitro global so server API routes can access it.
 */

import { resolve } from 'node:path'
import { mkdirSync, existsSync } from 'node:fs'
import { TrellisKernel } from '@toolkit/tql'
import { BetterSqliteBackend } from '@toolkit/tql/persist/better-sqlite'
import { createWorkspaceConfig } from '../utils/tql-ontologies'
import { getPersonalSeedItems } from './tql-seed'

declare module 'nitropack' {
  interface NitroApp {
    tql: TrellisKernel
  }
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

  // Expose kernel globally
  nitro.tql = kernel

  // Clean up on shutdown
  nitro.hooks.hook('close', () => {
    kernel.close()
    console.log('[tql] Kernel closed')
  })

  console.log('[tql] TrellisKernel ready')
})
