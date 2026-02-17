/**
 * POST /api/admin/purge-seed-data
 *
 * Deletes known seeded organizations and applications from InstantDB.
 * Uses the admin SDK so it bypasses permissions.
 *
 * Body: { userId?: string, dryRun?: boolean }
 *   - userId: if provided, only purge data owned by this user
 *   - dryRun: if true, report what would be deleted without deleting
 *
 * Known seed slugs that will be purged:
 *   Orgs: org_turtle_labs, any with slug matching known demo slugs
 *   Apps: life, work, game-dev-project, health, learning, personal,
 *         connector-hub, trip-planner, family-finance, workspace (if ownerId = 'user-demo-admin')
 */

const SEED_APP_SLUGS = new Set([
  'life',
  'work',
  'game-dev-project',
  'health',
  'learning',
  'connector-hub',
  'trip-planner',
  'family-finance',
])

const SEED_ORG_IDS = new Set([
  'org_turtle_labs',
])

const SEED_APP_IDS = new Set([
  'app_turtle_labs_workspace',
])

export default defineEventHandler(async (event) => {
  const body = await readBody(event) || {}
  const dryRun = body.dryRun === true
  const userId = body.userId as string | undefined

  const db = useInstantAdmin()

  try {
    // Fetch all orgs and apps
    const [orgsResp, appsResp] = await Promise.all([
      db.query({ organizations: {} }),
      db.query({ applications: {} }),
    ])

    const allOrgs = (orgsResp as any)?.organizations || []
    const allApps = (appsResp as any)?.applications || []

    // Identify seed orgs to delete
    const orgsToDelete = allOrgs.filter((org: any) => {
      // Known seed org IDs
      if (SEED_ORG_IDS.has(org.id)) return true
      // Orgs with no ownerId (orphaned seed data)
      if (!org.ownerId) return true
      // If userId filter is active, only purge orgs owned by that user that look seeded
      if (userId && org.ownerId === userId) {
        // Don't auto-purge user orgs — only explicit seed IDs
        return false
      }
      return false
    })

    // Identify seed apps to delete
    const deletedOrgIds = new Set(orgsToDelete.map((o: any) => o.id))
    const appsToDelete = allApps.filter((app: any) => {
      // Known seed app IDs
      if (SEED_APP_IDS.has(app.id)) return true
      // Known seed slugs
      if (SEED_APP_SLUGS.has(app.slug)) return true
      // Apps belonging to orgs being deleted
      if (deletedOrgIds.has(app.orgId)) return true
      // Apps with ownerId = 'user-demo-admin' (local mode seed artifact)
      if (app.ownerId === 'user-demo-admin') return true
      return false
    })

    const report = {
      orgsToDelete: orgsToDelete.map((o: any) => ({ id: o.id, name: o.name, slug: o.slug })),
      appsToDelete: appsToDelete.map((a: any) => ({ id: a.id, name: a.name, slug: a.slug, orgId: a.orgId })),
      totalOrgs: orgsToDelete.length,
      totalApps: appsToDelete.length,
      dryRun,
    }

    if (dryRun) {
      return { ok: true, ...report, message: 'Dry run — nothing was deleted' }
    }

    // Delete apps first (they reference orgs)
    const tx = db.tx as any
    const deleteTxs: any[] = []

    for (const app of appsToDelete) {
      deleteTxs.push(tx.applications[app.id].delete())
    }
    for (const org of orgsToDelete) {
      deleteTxs.push(tx.organizations[org.id].delete())
    }

    if (deleteTxs.length > 0) {
      await db.transact(deleteTxs)
    }

    return { ok: true, ...report, message: `Deleted ${orgsToDelete.length} orgs and ${appsToDelete.length} apps` }
  } catch (err: any) {
    console.error('[purge-seed-data] Error:', err?.message || err)
    throw createError({ statusCode: 500, message: 'Failed to purge seed data' })
  }
})
