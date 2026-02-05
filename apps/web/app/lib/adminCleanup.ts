/**
 * Admin utilities for cleaning up deprecated/orphaned data from InstantDB
 *
 * Usage:
 * - Call scanDeprecatedData() to see what would be cleaned
 * - Call purgeDeprecatedData({ dryRun: false }) to actually delete
 * - Optionally filter by orgId, appId, or userId
 */

export interface CleanupReport {
  orphanedCollections: Array<{ id: string; title: string; reason: string }>
  orphanedSettings: Array<{ id: string; settingKey: string; reason: string }>
  orphanedApps: Array<{ id: string; name: string; reason: string }>
  orphanedOrgs: Array<{ id: string; name: string; reason: string }>
  totalOrphaned: number
}

export interface CleanupOptions {
  dryRun?: boolean
  userId?: string
  orgId?: string
  appId?: string
  collectionId?: string
}

/**
 * Scan for deprecated/orphaned data without deleting anything
 */
export async function scanDeprecatedData(instant: any, options: CleanupOptions = {}): Promise<CleanupReport> {
  const report: CleanupReport = {
    orphanedCollections: [],
    orphanedSettings: [],
    orphanedApps: [],
    orphanedOrgs: [],
    totalOrphaned: 0,
  }

  // Fetch all data for the user
  const where: any = {}
  if (options.userId) where.ownerId = options.userId

  const orgWhere: any = {}
  if (options.userId) orgWhere.ownerId = options.userId
  if (options.orgId) orgWhere.id = options.orgId

  const appWhere: any = {}
  if (options.userId) appWhere.ownerId = options.userId
  if (options.appId) appWhere.id = options.appId

  const [orgsResp, appsResp, collectionsResp, settingsResp] = await Promise.all([
    instant.queryOnce({ organizations: { $: { where: orgWhere } } }),
    instant.queryOnce({ applications: { $: { where: appWhere } } }),
    instant.queryOnce({ collections: { $: { where } } }),
    instant.queryOnce({ settings: { $: { where } } }),
  ])

  const orgs = ((orgsResp.data as any)?.organizations || []) as any[]
  const apps = ((appsResp.data as any)?.applications || []) as any[]
  const collections = ((collectionsResp.data as any)?.collections || []) as any[]
  const settings = ((settingsResp.data as any)?.settings || []) as any[]

  const orgIds = new Set(orgs.map((o) => o.id).filter(Boolean))
  const appIds = new Set(apps.map((a) => a.id).filter(Boolean))
  const collectionIds = new Set(collections.map((c) => c.id).filter(Boolean))

  // Check orphaned organizations (no apps)
  for (const org of orgs) {
    const orgApps = apps.filter((a) => a.orgId === org.id)
    if (orgApps.length === 0) {
      report.orphanedOrgs.push({
        id: org.id,
        name: org.name || 'Untitled',
        reason: 'No applications',
      })
    }
  }

  // Check orphaned applications (no parent org or no collections)
  for (const app of apps) {
    if (app.orgId && !orgIds.has(app.orgId)) {
      report.orphanedApps.push({
        id: app.id,
        name: app.name || 'Untitled',
        reason: `Parent org ${app.orgId} not found`,
      })
    } else {
      const appCollections = collections.filter((c) => c.appId === app.id)
      if (appCollections.length === 0) {
        report.orphanedApps.push({
          id: app.id,
          name: app.name || 'Untitled',
          reason: 'No collections',
        })
      }
    }
  }

  // Check orphaned collections (no parent app)
  for (const collection of collections) {
    if (options.collectionId && collection.id !== options.collectionId) continue

    if (collection.appId && !appIds.has(collection.appId)) {
      report.orphanedCollections.push({
        id: collection.id,
        title: collection.title || 'Untitled',
        reason: `Parent app ${collection.appId} not found`,
      })
    }
  }

  // Check orphaned settings (no parent collection/app/org)
  for (const setting of settings) {
    if (setting.entityType === 'collection' && setting.entityId && !collectionIds.has(setting.entityId)) {
      report.orphanedSettings.push({
        id: setting.id,
        settingKey: setting.settingKey || 'unknown',
        reason: `Parent collection ${setting.entityId} not found`,
      })
    } else if (setting.entityType === 'application' && setting.entityId && !appIds.has(setting.entityId)) {
      report.orphanedSettings.push({
        id: setting.id,
        settingKey: setting.settingKey || 'unknown',
        reason: `Parent app ${setting.entityId} not found`,
      })
    } else if (setting.entityType === 'organization' && setting.entityId && !orgIds.has(setting.entityId)) {
      report.orphanedSettings.push({
        id: setting.id,
        settingKey: setting.settingKey || 'unknown',
        reason: `Parent org ${setting.entityId} not found`,
      })
    }
  }

  report.totalOrphaned =
    report.orphanedCollections.length +
    report.orphanedSettings.length +
    report.orphanedApps.length +
    report.orphanedOrgs.length

  return report
}

/**
 * Purge deprecated/orphaned data (dry-run by default)
 */
export async function purgeDeprecatedData(
  instant: any,
  options: CleanupOptions = { dryRun: true },
): Promise<CleanupReport> {
  const report = await scanDeprecatedData(instant, options)

  if (options.dryRun !== false) {
    console.log('[AdminCleanup] DRY RUN - no data will be deleted')
    console.log('[AdminCleanup] Report:', report)
    return report
  }

  const tx = instant.tx as any
  const chunks: any[] = []

  // Delete orphaned settings
  for (const item of report.orphanedSettings) {
    chunks.push(tx.settings[item.id].delete())
  }

  // Delete orphaned collections
  for (const item of report.orphanedCollections) {
    chunks.push(tx.collections[item.id].delete())
  }

  // Delete orphaned apps
  for (const item of report.orphanedApps) {
    chunks.push(tx.applications[item.id].delete())
  }

  // Delete orphaned orgs
  for (const item of report.orphanedOrgs) {
    chunks.push(tx.organizations[item.id].delete())
  }

  if (chunks.length > 0) {
    console.log(`[AdminCleanup] Deleting ${chunks.length} orphaned records...`)
    await instant.transact(chunks)
    console.log('[AdminCleanup] Cleanup complete')
  } else {
    console.log('[AdminCleanup] No orphaned data found')
  }

  return report
}

/**
 * Nuclear option: delete ALL data for a user (dry-run by default)
 */
export async function resetUserData(
  instant: any,
  userId: string,
  options: { dryRun?: boolean } = { dryRun: true },
): Promise<void> {
  if (options.dryRun !== false) {
    console.log('[AdminCleanup] DRY RUN - would reset all data for user:', userId)
    return
  }

  const tx = instant.tx as any

  const [orgsResp, appsResp, collectionsResp, settingsResp] = await Promise.all([
    instant.queryOnce({ organizations: { $: { where: { ownerId: userId } } } }),
    instant.queryOnce({ applications: { $: { where: { ownerId: userId } } } }),
    instant.queryOnce({ collections: { $: { where: { ownerId: userId } } } }),
    instant.queryOnce({ settings: { $: { where: { ownerId: userId } } } }),
  ])

  const orgs = ((orgsResp.data as any)?.organizations || []) as any[]
  const apps = ((appsResp.data as any)?.applications || []) as any[]
  const collections = ((collectionsResp.data as any)?.collections || []) as any[]
  const settings = ((settingsResp.data as any)?.settings || []) as any[]

  const chunks: any[] = []

  settings.forEach((s) => chunks.push(tx.settings[s.id].delete()))
  collections.forEach((c) => chunks.push(tx.collections[c.id].delete()))
  apps.forEach((a) => chunks.push(tx.applications[a.id].delete()))
  orgs.forEach((o) => chunks.push(tx.organizations[o.id].delete()))

  if (chunks.length > 0) {
    console.log(`[AdminCleanup] Deleting ${chunks.length} records for user ${userId}...`)
    await instant.transact(chunks)
    console.log('[AdminCleanup] User data reset complete')
  }
}
