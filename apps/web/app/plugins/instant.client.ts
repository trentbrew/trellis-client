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
import { getPersonalSeedItems } from '~/lib/personalSeedData'

export default defineNuxtPlugin(async () => {
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
    const FACILITY_ID = 'facility_auburn'

    const facilities = db._store.getAll('facilities')
    const existingFacility = facilities.find((f: any) => f.id === FACILITY_ID)
    if (!existingFacility) {
      await db.transact([
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

    const authUser: any = await db.getAuth()
    if (authUser?.id) {
      const members = db._store.getAll('facilityMembers')
      const existingMember = members.find((m: any) => m.userId === authUser.id && m.facilityId === FACILITY_ID)
      const memberId = existingMember?.id || `member-${FACILITY_ID}-${authUser.id}`
      const role = authUser.role || 'guest'

      if (!existingMember) {
        await db.transact([
          db.tx.facilityMembers[memberId].create({
            facilityId: FACILITY_ID,
            organizationId: 'org_northwind',
            userId: authUser.id,
            email: authUser.email,
            name: authUser.name,
            role,
            status: 'active',
          }),
        ])
      } else if (existingMember.role !== role) {
        await db.transact([
          db.tx.facilityMembers[existingMember.id].update({
            role,
          }),
        ])
      }
    }

    // ── Seed personal calendar items ────────────────────────────────
    const calItems = db._store.getAll('calendarItems')
    if (calItems.length === 0) {
      const seedItems = getPersonalSeedItems()
      const chunks = seedItems.map((item) => {
        const { id: itemId, ...fields } = item
        return db.tx.calendarItems[itemId].create({
          ...fields,
          ownerId: 'user-demo-admin',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })
      await db.transact(chunks)
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
