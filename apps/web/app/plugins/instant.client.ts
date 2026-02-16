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
import { getPersonalSeedItems, getTrellisProjectTasks } from '~/lib/personalSeedData'
import { getBookmarkSeedItems } from '~/lib/bookmarkSeedData'
import { getTrellisPitchDeckContent, SLIDE_DECK_SCHEMA_FIELDS } from '~/lib/slideDeckSeedData'
import { getPeopleSeedItems, getOrganizationSeedItems, getFileSeedItems, getProjectSeedItems } from '~/lib/entitySeedData'

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
      devtool: import.meta.dev,
    })
  } else {
    db = createLocalAdapter({
      storageKey: 'platform-sandbox',
      schema,
      verbose: false,
    })
  }

  // ── Seed minimum data on first boot (local mode only) ──────────────
  // Data is persisted to localStorage so this only runs once.
  // Cloud mode gets its data from InstantDB — no local seeding needed.

  if (import.meta.client && db.mode === 'local') {
    // ── Seed default organization + application ─────────────────────
    // Matches the demo org in useOrganizations.ts so the InstantDB data
    // layer (useInstantData) has a valid org/app for scoping collections.
    const ORG_ID = 'org_turtle_labs'
    const APP_ID = 'app_turtle_labs_workspace'

    const existingOrgs = db._store.getAll('organizations')
    if (!existingOrgs.find((o: any) => o.id === ORG_ID)) {
      const now = Date.now()
      await db.transact([
        db.tx.organizations[ORG_ID].create({
          name: 'Turtle Labs LLC',
          slug: 'turtle-labs',
          description: 'Design & development studio.',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        }),
      ])
    }

    const existingApps = db._store.getAll('applications')
    if (!existingApps.find((a: any) => a.id === APP_ID)) {
      const now = Date.now()
      await db.transact([
        db.tx.applications[APP_ID].create({
          ownerId: 'user-demo-admin',
          orgId: ORG_ID,
          name: 'Workspace',
          slug: 'workspace',
          icon: 'lucide:layout-grid',
          color: '#6366f1',
          createdAt: now,
          updatedAt: now,
        }),
      ])
    }

    // ── Seed personal calendar items ────────────────────────────────
    const calItems = db._store.getAll('entities')
    if (calItems.length === 0) {
      const seedItems = getPersonalSeedItems()
      const chunks = seedItems.map((item) => {
        const { id: itemId, ...fields } = item
        return db.tx.entities[itemId].create({
          ...fields,
          ownerId: 'user-demo-admin',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })
      await db.transact(chunks)
    }

    // ── Seed Trellis project tasks (dogfooding) ──────────────────────
    const hasTrellisProjectTasks = calItems.some((i: any) => typeof i.id === 'string' && i.id.startsWith('trellis-dt-'))
    if (!hasTrellisProjectTasks) {
      const projectTasks = getTrellisProjectTasks()
      const projectChunks = projectTasks.map((item) => {
        const { id: itemId, ...fields } = item
        return db.tx.entities[itemId].create({
          ...fields,
          ownerId: 'user-demo-admin',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })
      await db.transact(projectChunks)
    }

    // ── Seed people (actor class) ─────────────────────────────────
    const hasPeople = calItems.some((i: any) => typeof i.id === 'string' && i.id.startsWith('person-'))
    if (!hasPeople) {
      const peopleItems = getPeopleSeedItems()
      const peopleChunks = peopleItems.map((item) => {
        const { id: itemId, ...fields } = item
        return db.tx.entities[itemId].create({
          ...fields,
          ownerId: 'user-demo-admin',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })
      await db.transact(peopleChunks)
      console.info(`✓ Seeded ${peopleItems.length} people`)
    }

    // ── Seed organizations (actor class) ────────────────────────
    const hasOrgs = calItems.some((i: any) => typeof i.id === 'string' && i.id.startsWith('org-'))
    if (!hasOrgs) {
      const orgItems = getOrganizationSeedItems()
      const orgChunks = orgItems.map((item) => {
        const { id: itemId, ...fields } = item
        return db.tx.entities[itemId].create({
          ...fields,
          ownerId: 'user-demo-admin',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })
      await db.transact(orgChunks)
      console.info(`✓ Seeded ${orgItems.length} organizations`)
    }

    // ── Seed files (document class) ──────────────────────────────
    const hasFiles = calItems.some((i: any) => typeof i.id === 'string' && i.id.startsWith('file-'))
    if (!hasFiles) {
      const fileItems = getFileSeedItems()
      const fileChunks = fileItems.map((item) => {
        const { id: itemId, ...fields } = item
        return db.tx.entities[itemId].create({
          ...fields,
          ownerId: 'user-demo-admin',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })
      await db.transact(fileChunks)
      console.info(`✓ Seeded ${fileItems.length} files`)
    }

    // ── Seed projects (container class) ──────────────────────────
    const hasProjects = calItems.some((i: any) => typeof i.id === 'string' && i.id.startsWith('project-'))
    if (!hasProjects) {
      const projectItems = getProjectSeedItems()
      const projectChunks = projectItems.map((item) => {
        const { id: itemId, ...fields } = item
        return db.tx.entities[itemId].create({
          ...fields,
          ownerId: 'user-demo-admin',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })
      await db.transact(projectChunks)
      console.info(`✓ Seeded ${projectItems.length} projects`)
    }

    // ── Seed bookmarks (migration: replace old bookmark-* with bm-*) ──
    const hasNewBookmarks = calItems.some((i: any) => typeof i.id === 'string' && i.id.startsWith('bm-'))
    if (!hasNewBookmarks) {
      // Remove old placeholder bookmarks
      const oldBookmarks = calItems.filter((i: any) => typeof i.id === 'string' && i.id.startsWith('bookmark-'))
      if (oldBookmarks.length > 0) {
        await db.transact(oldBookmarks.map((i: any) => db.tx.entities[i.id].delete()))
      }
      // Seed new bookmarks from Raindrop.io CSV
      const bookmarkItems = getBookmarkSeedItems()
      const bmChunks = bookmarkItems.map((item) => {
        const { id: itemId, ...fields } = item
        return db.tx.entities[itemId].create({
          ...fields,
          ownerId: 'user-demo-admin',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })
      await db.transact(bmChunks)
      console.info(`✓ Seeded ${bookmarkItems.length} bookmarks from Raindrop.io export`)
    }

    // ── Seed Trellis Pitch Deck slide-deck collection ─────────────────
    const PITCH_DECK_COLLECTION_ID = 'collection-trellis-pitch-deck'
    const existingCollections = db._store.getAll('collections')
    if (!existingCollections.find((c: any) => c.id === PITCH_DECK_COLLECTION_ID)) {
      const now = Date.now()
      const ownerId = 'user-demo-admin'

      // Create the collection
      await db.transact([
        db.tx.collections[PITCH_DECK_COLLECTION_ID].create({
          ownerId,
          appId: APP_ID,
          parentId: null,
          title: 'Trellis Pitch Deck',
          slug: 'trellis-pitch-deck',
          description: 'A semantic operating system for knowledge work — presented from within Trellis itself.',
          icon: 'lucide:presentation',
          type: 'database',
          order: 0,
        isPublished: true,
          createdBy: ownerId,
          content: getTrellisPitchDeckContent(),
          createdAt: now,
          updatedAt: now,
        }),
        db.tx.applications[APP_ID].link({ collections: PITCH_DECK_COLLECTION_ID }),
      ])

      // Schema setting
      const schemaSettingId = `setting-pitchdeck-schema`
      await db.transact([
        db.tx.settings[schemaSettingId].create({
          ownerId,
          settingKey: `collection:${PITCH_DECK_COLLECTION_ID}:schema`,
          entityType: 'collection',
          entityId: PITCH_DECK_COLLECTION_ID,
          key: 'schema',
          value: {
            id: '',
            collectionId: PITCH_DECK_COLLECTION_ID,
            fields: SLIDE_DECK_SCHEMA_FIELDS,
            views: [],
            createdAt: now,
            updatedAt: now,
          },
          updatedAt: now,
        }),
      ])

      // Projections setting — slide-deck as default, plus table and code for editing
      const projSettingId = `setting-pitchdeck-projections`
      await db.transact([
        db.tx.settings[projSettingId].create({
          ownerId,
          settingKey: `collection:${PITCH_DECK_COLLECTION_ID}:projections`,
          entityType: 'collection',
          entityId: PITCH_DECK_COLLECTION_ID,
          key: 'projections',
          value: [
            {
              id: 'proj-pitchdeck-slides',
              type: 'slide-deck',
              name: 'Slide Deck',
              icon: 'lucide:presentation',
              config: { slideTheme: 'dark', slideTransition: 'fade' },
              isDefault: true,
              order: 0,
            },
            {
              id: 'proj-pitchdeck-table',
              type: 'table',
              name: 'Data Table',
              icon: 'lucide:table',
              config: {},
              isDefault: false,
              order: 1,
            },
            {
              id: 'proj-pitchdeck-code',
              type: 'code',
              name: 'JSON-LD',
              icon: 'lucide:code-2',
              config: {},
              isDefault: false,
              order: 2,
            },
          ],
          updatedAt: now,
        }),
      ])

      console.info('✓ Seeded Trellis Pitch Deck slide-deck collection')
    }
  }

  if (import.meta.dev) {
    console.info(`✓ DataAdapter active (mode: ${db.mode}, entities: ${db.entityBackend}, ontologies: ${db.ontologyBackend})`)
  }

  return {
    provide: {
      instantDb: db,
    },
  }
})
