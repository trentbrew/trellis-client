/**
 * GET /api/workspace-context?userId=xxx
 *
 * Server-side workspace resolver that bypasses client SDK permissions.
 * Used by the auth middleware when the target org (from lastOrgId) isn't
 * visible to the client SDK yet — typically right after an invite is accepted
 * and the admin SDK has created the org→member link but the client's
 * permission-gated query hasn't caught up.
 *
 * Returns: { org, apps } — the resolved org + its applications.
 */

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const userId = query.userId as string | undefined

  const config = useRuntimeConfig()
  const dataMode = (config.public.dataMode || process.env.TRELLIS_DATA_MODE || 'local') as 'local' | 'cloud'

  if (dataMode === 'local') {
    return { ok: true, org: null, apps: [], lastOrgId: null, lastAppId: null }
  }

  const db = useInstantAdmin()

  try {
    // Read the user's lastOrgId + lastAppId settings
    const settingsResp = await db.query({
      settings: {
        $: {
          where: {
            ownerId: userId,
          },
        },
      },
    })

    const settings = (settingsResp as any)?.settings || []
    let lastOrgId: string | null = null
    let lastAppId: string | null = null

    for (const s of settings) {
      if (s.key === 'lastOrgId' && typeof s.value === 'string') lastOrgId = s.value
      if (s.key === 'lastAppId' && typeof s.value === 'string') lastAppId = s.value
    }

    if (!lastOrgId) {
      return { ok: true, org: null, apps: [], lastOrgId: null, lastAppId: null }
    }

    // Fetch the org directly using admin SDK (bypasses permissions)
    const orgResp = await db.query({
      organizations: {
        $: { where: { id: lastOrgId } },
      },
    })

    const orgs = (orgResp as any)?.organizations || []
    const org = orgs[0] || null

    if (!org) {
      return { ok: true, org: null, apps: [], lastOrgId, lastAppId }
    }

    // Fetch apps belonging to this org
    const appsResp = await db.query({
      applications: {
        $: { where: { orgId: lastOrgId } },
      },
    })

    const apps = (appsResp as any)?.applications || []

    return {
      ok: true,
      org,
      apps,
      lastOrgId,
      lastAppId,
    }
  } catch (err: any) {
    console.error('[workspace-context] Error:', err?.message || err)
    throw createError({ statusCode: 500, message: 'Failed to resolve workspace context' })
  }
})
