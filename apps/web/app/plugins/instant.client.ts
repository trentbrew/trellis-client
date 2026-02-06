/**
 * InstantDB plugin — local-first adapter.
 *
 * Uses `instant-local` to provide the same API surface as @instantdb/core
 * with in-memory storage persisted to localStorage. When ready to migrate
 * to the real InstantDB cloud, replace `createLocalInstantDB()` with
 * `init({ appId, schema })` from `@instantdb/core`.
 *
 * See apps/web/app/lib/instant-local/index.ts for the adapter source.
 */

import { createLocalInstantDB } from '~/lib/instant-local'
import schema from '~~/instant.schema'

export default defineNuxtPlugin(() => {
  const db = createLocalInstantDB({
    storageKey: 'platform-sandbox',
    schema,
    verbose: false,
  })

  // ── Seed minimum data on first boot ─────────────────────────────────
  // This ensures ECMS pages have the facility / membership data they
  // expect, matching the old hardcoded mock. Data is persisted to
  // localStorage so this only runs once.

  if (import.meta.client) {
    const FACILITY_ID = 'platform-sandbox-facility-1'
    const MEMBER_ID = 'member-1'

    const facilities = db._store.getAll('facilities')
    if (facilities.length === 0) {
      void db.transact([
        db.tx.facilities[FACILITY_ID].create({
          facilityID: FACILITY_ID,
          facility: 'Auburn',
          abbr: 'AUB',
          group: 'northwind',
          active: true,
          slug: 'auburn',
          organizationId: 'org_northwind',
          city: 'Auburn',
          state: 'WA',
        }),
      ])
    }

    const members = db._store.getAll('facilityMembers')
    if (members.length === 0) {
      const user = db.demoUsers.admin
      void db.transact([
        db.tx.facilityMembers[MEMBER_ID].create({
          facilityId: FACILITY_ID,
          organizationId: 'org_northwind',
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: 'active',
        }),
      ])
    }
  }

  if (import.meta.dev) {
    console.info('✓ instant-local adapter active (localStorage-backed)')
  }

  return {
    provide: {
      instantDb: db,
    },
  }
})
