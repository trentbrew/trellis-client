/**
 * Migration: Backfill owner member records
 *
 * For every organization, ensures the org.ownerId user has a
 * corresponding `members` record with role: 'owner'.
 *
 * Usage:
 *   INSTANTDB_APP_ID=xxx INSTANTDB_APP_SECRET=xxx npx tsx apps/web/scripts/migrate-owner-members.ts
 *   INSTANTDB_APP_ID=xxx INSTANTDB_APP_SECRET=xxx npx tsx apps/web/scripts/migrate-owner-members.ts --dry-run
 *
 * Requires: @instantdb/admin
 */

import { init, id } from '@instantdb/admin'

const DRY_RUN = process.argv.includes('--dry-run')

const appId = process.env.INSTANTDB_APP_ID || process.env.INSTANT_APP_ID || ''
const adminToken = process.env.INSTANTDB_APP_SECRET || process.env.INSTANT_ADMIN_TOKEN || ''

if (!appId || !adminToken) {
  console.error('❌ Missing env vars: INSTANTDB_APP_ID and INSTANTDB_APP_SECRET')
  process.exit(1)
}

const db = init({ appId, adminToken })

async function migrate() {
  console.log(`\n🔄 Migrate Owner Members ${DRY_RUN ? '(DRY RUN)' : ''}\n`)

  // 1. Fetch all organizations
  const orgResult = await db.query({ organizations: {} })
  const orgs = (orgResult as any)?.organizations || []
  console.log(`Found ${orgs.length} organizations\n`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const org of orgs) {
    const orgId = org.id
    const ownerId = org.ownerId
    const orgName = org.name || org.slug || 'Unnamed'

    if (!ownerId) {
      console.log(`  ⚠️  ${orgName} (${orgId}) — no ownerId, skipping`)
      skipped++
      continue
    }

    // 2. Check if an owner member record already exists
    const memberResult = await db.query({
      members: {
        $: {
          where: {
            orgId,
            userId: ownerId,
          },
        },
      },
    })

    const existingMembers = (memberResult as any)?.members || []
    const hasOwnerRecord = existingMembers.some((m: any) => m.role === 'owner')

    if (hasOwnerRecord) {
      console.log(`  ✅ ${orgName} — owner member record exists`)
      skipped++
      continue
    }

    // Check if the owner has any member record at all (might have a different role)
    const existingOwnerMember = existingMembers.find((m: any) => m.userId === ownerId)

    if (existingOwnerMember) {
      // Upgrade existing member record to owner
      console.log(`  🔄 ${orgName} — upgrading existing member record (${existingOwnerMember.role} → owner)`)
      if (!DRY_RUN) {
        try {
          await db.transact(
            db.tx.members[existingOwnerMember.id].update({
              role: 'owner',
              status: 'active',
              joinedAt: existingOwnerMember.joinedAt || org.createdAt || Date.now(),
            }),
          )
          created++
        } catch (err) {
          console.error(`  ❌ ${orgName} — failed to upgrade: ${(err as Error).message}`)
          errors++
        }
      } else {
        created++
      }
      continue
    }

    // 3. Create a new owner member record
    console.log(`  ➕ ${orgName} — creating owner member record for ${ownerId}`)
    if (!DRY_RUN) {
      try {
        const memberId = id()
        await db.transact([
          db.tx.members[memberId].update({
            ownerId,
            orgId,
            userId: ownerId,
            name: org.name || '',
            role: 'owner',
            status: 'active',
            invitedAt: org.createdAt || Date.now(),
            joinedAt: org.createdAt || Date.now(),
            orgName: org.name || '',
          }),
          // Link the member to the organization
          db.tx.organizations[orgId].link({ members: memberId }),
        ])
        created++
      } catch (err) {
        console.error(`  ❌ ${orgName} — failed to create: ${(err as Error).message}`)
        errors++
      }
    } else {
      created++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Created/upgraded: ${created}`)
  console.log(`   Skipped (already exists): ${skipped}`)
  console.log(`   Errors: ${errors}`)
  if (DRY_RUN) console.log(`   (dry run — no changes made)`)
  console.log('')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
