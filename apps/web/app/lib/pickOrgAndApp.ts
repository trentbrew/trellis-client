export const pickOrgAndApp = (args: { orgs: any[]; apps: any[]; lastOrgId: unknown; lastAppId: unknown }) => {
  const orgs = Array.isArray(args.orgs) ? args.orgs : []
  const allApps = Array.isArray(args.apps) ? args.apps : []
  const lastOrgId = args.lastOrgId
  const lastAppId = args.lastAppId

  if (orgs.length === 0) {
    return { org: null, app: null }
  }

  const pickOrg = () => {
    if (typeof lastOrgId === 'string' && lastOrgId) {
      const found = orgs.find((o) => o?.id === lastOrgId)
      if (found) return found
    }
    return orgs[0]
  }

  const orgFallback = pickOrg()

  if (typeof lastAppId === 'string' && lastAppId) {
    const appById = allApps.find((a) => a?.id === lastAppId)
    if (appById) {
      const orgForApp = orgs.find((o) => o?.id === appById?.orgId) ?? orgFallback
      return { org: orgForApp, app: appById }
    }
  }

  const org = orgFallback

  const appsForOrg = allApps.filter((a) => a?.orgId === org?.id)
  const pickAppFrom = (apps: any[]) => {
    if (!Array.isArray(apps) || apps.length === 0) return null
    if (typeof lastAppId === 'string' && lastAppId) {
      const found = apps.find((a) => a?.id === lastAppId)
      if (found) return found
    }
    return apps[0]
  }

  let app = pickAppFrom(appsForOrg)
  if (!app) app = pickAppFrom(allApps)

  if (!app) {
    return { org, app: null }
  }

  const orgForApp = orgs.find((o) => o?.id === app?.orgId) ?? org
  return { org: orgForApp, app }
}
