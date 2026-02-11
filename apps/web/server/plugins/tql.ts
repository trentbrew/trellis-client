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
import { getPersonalSeedItems, getTrellisProjectTasks, getPeopleSeedItems, getOrganizationSeedItems, getFileSeedItems, getProjectSeedItems } from '../utils/tql-seed'

import type { WorkspaceConfig } from '@toolkit/tql'

// Module-level singleton — accessible from API routes via useTqlKernel()
let _kernel: TrellisKernel | null = null
let _workspaceConfig: WorkspaceConfig | null = null

export function useTqlKernel(): TrellisKernel {
  if (!_kernel) {
    throw new Error('[tql] Kernel not initialized — server plugin has not run yet')
  }
  return _kernel
}

export function useWorkspaceConfig(): WorkspaceConfig {
  if (!_workspaceConfig) {
    throw new Error('[tql] Workspace config not initialized — server plugin has not run yet')
  }
  return _workspaceConfig
}

// Mutation log ring buffer
export interface MutationLogEntry {
  timestamp: string
  action: string
  entityId?: string
  type?: string
  data?: Record<string, any>
}

const MAX_LOG_ENTRIES = 200
const _mutationLog: MutationLogEntry[] = []

export function pushMutationLog(entry: Omit<MutationLogEntry, 'timestamp'>) {
  _mutationLog.push({ ...entry, timestamp: new Date().toISOString() })
  if (_mutationLog.length > MAX_LOG_ENTRIES) {
    _mutationLog.splice(0, _mutationLog.length - MAX_LOG_ENTRIES)
  }
}

export function getMutationLog(): MutationLogEntry[] {
  return _mutationLog
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

  // Boot with workspace config (ontologies + projections + routes + app)
  const workspaceConfig = createWorkspaceConfig()
  _workspaceConfig = workspaceConfig
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

  // ── Seed Trellis project tasks (dogfooding) ──────────────────────
  // Targeted seed: runs even on existing databases if trellis-dt-* items
  // don't exist yet. This lets us add project tracking tasks without
  // requiring a database reset.
  try {
    const probeResult = await kernel.query('FIND calendaritem AS ?e WHERE ?e.folder = "Trellis"')
    const hasTrellisTasks = probeResult.rows && probeResult.rows.length > 0
    if (!hasTrellisTasks) {
      const projectTasks = getTrellisProjectTasks()
      for (const item of projectTasks) {
        const entityId = `calendaritem:${item.id}`
        const { id: _id, ...data } = item
        await kernel.createNode(entityId, data, 'calendaritem')
      }
      console.log(`[tql] Seeded ${projectTasks.length} Trellis project tasks (dogfooding)`)
      await kernel.checkpoint()
    }
  } catch (err) {
    console.warn('[tql] Could not seed Trellis project tasks:', err)
  }

  // ── Seed people (actor class) ───────────────────────────────────
  try {
    const peopleProbe = await kernel.query('FIND calendaritem AS ?e WHERE ?e.type = "person"')
    const hasPeople = peopleProbe.rows && peopleProbe.rows.length > 0
    if (!hasPeople) {
      const people = getPeopleSeedItems()
      for (const item of people) {
        const entityId = `calendaritem:${item.id}`
        const { id: _id, ...data } = item
        await kernel.createNode(entityId, data, 'calendaritem')
      }
      console.log(`[tql] Seeded ${people.length} people`)
      await kernel.checkpoint()
    }
  } catch (err) {
    console.warn('[tql] Could not seed people:', err)
  }

  // ── Seed organizations (actor class) ────────────────────────────
  try {
    const orgProbe = await kernel.query('FIND calendaritem AS ?e WHERE ?e.type = "organization"')
    const hasOrgs = orgProbe.rows && orgProbe.rows.length > 0
    if (!hasOrgs) {
      const orgs = getOrganizationSeedItems()
      for (const item of orgs) {
        const entityId = `calendaritem:${item.id}`
        const { id: _id, ...data } = item
        await kernel.createNode(entityId, data, 'calendaritem')
      }
      console.log(`[tql] Seeded ${orgs.length} organizations`)
      await kernel.checkpoint()
    }
  } catch (err) {
    console.warn('[tql] Could not seed organizations:', err)
  }

  // ── Seed files (document class) ─────────────────────────────────
  try {
    const fileProbe = await kernel.query('FIND calendaritem AS ?e WHERE ?e.type = "file"')
    const hasFiles = fileProbe.rows && fileProbe.rows.length > 0
    if (!hasFiles) {
      const files = getFileSeedItems()
      for (const item of files) {
        const entityId = `calendaritem:${item.id}`
        const { id: _id, ...data } = item
        await kernel.createNode(entityId, data, 'calendaritem')
      }
      console.log(`[tql] Seeded ${files.length} files`)
      await kernel.checkpoint()
    }
  } catch (err) {
    console.warn('[tql] Could not seed files:', err)
  }

  // ── Seed projects (container class) ─────────────────────────────
  try {
    const projectProbe = await kernel.query('FIND calendaritem AS ?e WHERE ?e.type = "project"')
    const hasProjects = projectProbe.rows && projectProbe.rows.length > 0
    if (!hasProjects) {
      const projects = getProjectSeedItems()
      for (const item of projects) {
        const entityId = `calendaritem:${item.id}`
        const { id: _id, ...data } = item
        await kernel.createNode(entityId, data, 'calendaritem')
      }
      console.log(`[tql] Seeded ${projects.length} projects`)
      await kernel.checkpoint()
    }
  } catch (err) {
    console.warn('[tql] Could not seed projects:', err)
  }

  // ── Seed slide deck items ─────────────────────────────────────────
  // Targeted seed: runs even on existing databases if slide_deck items
  // don't exist yet. This lets us add slide decks without a DB reset.
  try {
    const slideDeckProbe = await kernel.query('FIND calendaritem AS ?e WHERE ?e.type = "slide_deck"')
    const hasSlideDeckItems = slideDeckProbe.rows && slideDeckProbe.rows.length > 0
    if (!hasSlideDeckItems) {
      const allSeedItems = getPersonalSeedItems()
      const slideDeckItems = allSeedItems.filter((i: any) => i.type === 'slide_deck')
      for (const item of slideDeckItems) {
        const entityId = `calendaritem:${item.id}`
        const { id: _id, ...data } = item
        await kernel.createNode(entityId, data, 'calendaritem')
      }
      if (slideDeckItems.length > 0) {
        console.log(`[tql] Seeded ${slideDeckItems.length} slide deck items`)
        await kernel.checkpoint()
      }
    }
  } catch (err) {
    console.warn('[tql] Could not seed slide deck items:', err)
  }

  // Store in module singleton
  _kernel = kernel

  // Clean up on shutdown
  nitro.hooks.hook('close', () => {
    kernel.close()
    _kernel = null
    console.log('[tql] Kernel closed')
  })

  console.log('[tql] TrellisKernel ready (v2 — expanded seed)')
})
