/**
 * Set current user as admin for Speak Minneapolis
 * Run with: tsx scripts/set-admin-role.ts
 */

const init = (_args: any): any => {
  throw new Error('InstantDB has been removed from this prototype. This script is deprecated.')
}

const APP_ID = process.env.INSTANT_APP_ID || 'def5bfe2-f194-49d0-81f9-53f794eaba67'
const ADMIN_TOKEN = process.env.INSTANT_SECRET || 'e481d91f-e1fd-4836-a688-c1a9fa9012dc'

const db: any = init({
  appId: APP_ID,
  adminToken: ADMIN_TOKEN,
})

async function setAdminRole() {
  console.log('[SetAdminRole] Fetching stations...')

  // Get Speak Minneapolis station
  const stationsResult = await db.query({ stations: {} })
  const stations = (stationsResult as any)?.stations || []
  const speakMpls = stations.find((s: any) => s.tenantId === 'speakmpls')

  if (!speakMpls) {
    console.error('[SetAdminRole] Speak Minneapolis station not found')
    process.exit(1)
  }

  console.log(`[SetAdminRole] Found station: ${speakMpls.name} (${speakMpls.id})`)

  // Get current user (you'll need to provide your user ID)
  // For now, we'll fetch all users and let you choose
  const usersResult = await db.query({ $users: {} })
  const users = (usersResult as any)?.$users || []

  if (users.length === 0) {
    console.error('[SetAdminRole] No users found')
    process.exit(1)
  }

  console.log('\n[SetAdminRole] Available users:')
  users.forEach((user: any, index: number) => {
    console.log(`  ${index + 1}. ${user.email || user.id}`)
  })

  // Find tbrew212@gmail.com specifically
  const user = users.find((u: any) => u.email === 'tbrew212@gmail.com')

  if (!user) {
    console.error('[SetAdminRole] tbrew212@gmail.com not found in users list')
    process.exit(1)
  }

  console.log(`\n[SetAdminRole] Setting ${user.email} as admin for ${speakMpls.name}`)

  // Check if membership already exists
  const membersResult = await db.query({
    stationMembers: {
      $: {
        where: {
          stationId: speakMpls.id,
          userId: user.id,
        },
      },
    },
  })

  const existingMembers = (membersResult as any)?.stationMembers || []

  if (existingMembers.length > 0) {
    // Update existing membership
    const member = existingMembers[0]
    console.log('[SetAdminRole] Updating existing membership...')

    await db.transact([
      db.tx.stationMembers[member.id].update({
        role: 'admin',
        status: 'active',
        updatedAt: Date.now(),
      }),
    ])

    console.log('[SetAdminRole] ✓ Role updated to admin')
  } else {
    // Create new membership
    console.log('[SetAdminRole] Creating new admin membership...')

    const memberId = crypto.randomUUID()
    const now = Date.now()

    await db.transact([
      db.tx.stationMembers[memberId].update({
        stationId: speakMpls.id,
        userId: user.id,
        email: user.email,
        role: 'admin',
        status: 'active',
        invitedBy: user.id,
        invitedAt: now,
        joinedAt: now,
        updatedAt: now,
      }),
    ])

    console.log('[SetAdminRole] ✓ Admin membership created')
  }

  console.log('\n[SetAdminRole] Done! You are now an admin for Speak Minneapolis.')
  console.log('Refresh your browser to see the admin badge.')
  process.exit(0)
}

setAdminRole().catch((error) => {
  console.error('[SetAdminRole] Error:', error)
  process.exit(1)
})

export {}
