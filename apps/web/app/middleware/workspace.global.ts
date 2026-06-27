import { bootstrapDefaultWorkspace } from '~/lib/bootstrapDefaultWorkspace'
import { CURRENT_DATA_VERSION, migrateUserToV1, migrateUserToV2, migrateUserToV3, migrateUserToV4 } from '~/lib/instantDataMigrations'
import { pickOrgAndApp } from '~/lib/pickOrgAndApp'
import { parseHybridSlug } from '~/composables/useWorkspacePath'

const PUBLIC_PREFIXES = ['/docs', '/guide', '/explore', '/embed', '/playground']

export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return

  const isPublicRoute =
    to.path === '/' ||
    PUBLIC_PREFIXES.some((prefix) => to.path.startsWith(prefix))

  const workspaceInitialized = useState<boolean>('workspace:initialized', () => false)
  const instant = useInstantDb()
  const tx = instant.tx as any
  const { wp } = useWorkspacePath()

  const log = (...args: unknown[]) => {
    if (import.meta.dev) console.log('[workspace.global]', ...args)
  }

  const resolveOrgFromSlug = async (orgSlugParam: string) => {
    const currentOrg = useState<any>('currentOrg')
    const currentHybrid = currentOrg.value?.id
      ? `${currentOrg.value.slug}-${currentOrg.value.id.substring(0, 8)}`
      : null
    if (currentHybrid === orgSlugParam) return

    try {
      const parsed = parseHybridSlug(orgSlugParam)
      const orgsResp = await instant.queryOnce({ organizations: {} })
      const allOrgs = ((orgsResp.data as any)?.organizations || []) as any[]
      let matchedOrg: any = null
      if (parsed) {
        matchedOrg = allOrgs.find((o: any) => o.id.startsWith(parsed.idPrefix))
      }
      if (!matchedOrg) {
        matchedOrg = allOrgs.find((o: any) => o.slug === orgSlugParam)
      }
      if (matchedOrg) {
        currentOrg.value = matchedOrg
        const currentApp = useState<any>('currentApp')
        const appResp = await instant.queryOnce({
          applications: { $: { where: { orgId: matchedOrg.id } } },
        })
        const orgApps = ((appResp.data as any)?.applications || []) as any[]
        if (orgApps.length > 0) currentApp.value = orgApps[0]
      }
    } catch {
      // non-fatal
    }
  }

  if (to.path === '/') {
    return navigateTo(wp('/workspace'))
  }

  const orgSlugParam = to.params?.orgSlug as string | undefined
  if (workspaceInitialized.value && orgSlugParam) {
    await resolveOrgFromSlug(orgSlugParam)
    return
  }
  if (workspaceInitialized.value && !isPublicRoute) return
  if (workspaceInitialized.value && isPublicRoute) return

  const user = (await instant.getAuth()) || useState<any>('auth:user').value
  if (!user?.id) return

  const getSetting = async (entityType: 'user' | 'org' | 'app' | 'collection', entityId: string, key: string) => {
    const settingKey = `${entityType}:${entityId}:${key}`
    const resp = await instant.queryOnce({
      settings: { $: { where: { settingKey } } },
    })
    return (resp.data as any)?.settings?.[0]?.value
  }

  const upsertSetting = async (
    entityType: 'user' | 'org' | 'app' | 'collection',
    entityId: string,
    key: string,
    value: unknown,
  ) => {
    const settingKey = `${entityType}:${entityId}:${key}`
    const resp = await instant.queryOnce({
      settings: { $: { where: { settingKey } } },
    })
    const existing = (resp.data as any)?.settings?.[0]
    const now = Date.now()
    const ownerId = user.id

    if (existing?.id) {
      await instant.transact([
        tx.settings[existing.id].update({
          ownerId,
          settingKey,
          entityType,
          entityId,
          key,
          value,
          updatedAt: now,
        }),
      ])
      return
    }

    const id = crypto.randomUUID()
    await instant.transact([
      tx.settings[id].create({
        ownerId,
        settingKey,
        entityType,
        entityId,
        key,
        value,
        updatedAt: now,
      }),
    ])
  }

  let onboardingComplete = (await getSetting('user', user.id, 'onboardingComplete')) === true
  if (!onboardingComplete) {
    log('bootstrapping default workspace')
    await bootstrapDefaultWorkspace(instant, user, upsertSetting, log)
    onboardingComplete = true
  }

  try {
    const rawDataVersion = await getSetting('user', user.id, 'dataVersion')
    let dataVersion = typeof rawDataVersion === 'number' ? rawDataVersion : 0

    if (dataVersion < 1) {
      await migrateUserToV1(instant, user.id)
      dataVersion = 1
    }
    if (dataVersion < 2) {
      await migrateUserToV2(instant, user.id)
      dataVersion = 2
    }
    if (dataVersion < 3) {
      const migrationOrgId = await getSetting('user', user.id, 'lastOrgId')
      if (typeof migrationOrgId === 'string' && migrationOrgId) {
        await migrateUserToV3(instant, user.id, migrationOrgId)
      }
      dataVersion = 3
    }
    if (dataVersion < 4) {
      const migrationOrgId = await getSetting('user', user.id, 'lastOrgId')
      if (typeof migrationOrgId === 'string' && migrationOrgId) {
        await migrateUserToV4(instant, user.id, migrationOrgId)
      }
      dataVersion = 4
    }
    if (dataVersion !== rawDataVersion && dataVersion === CURRENT_DATA_VERSION) {
      await upsertSetting('user', user.id, 'dataVersion', CURRENT_DATA_VERSION)
    }
  } catch (err) {
    console.warn('[workspace.global] Data migration failed (non-fatal):', (err as any)?.message || err)
  }

  const currentOrg = useState<any>('currentOrg')
  const currentApp = useState<any>('currentApp')
  const lastOrgId = await getSetting('user', user.id, 'lastOrgId')
  const lastAppId = await getSetting('user', user.id, 'lastAppId')

  const resp = await instant.queryOnce({ organizations: {}, applications: {} })
  const orgs = ((resp.data as any)?.organizations || []) as any[]
  const allApps = ((resp.data as any)?.applications || []) as any[]
  const picked = pickOrgAndApp({ orgs, apps: allApps, lastOrgId, lastAppId })
  currentOrg.value = picked.org
  currentApp.value = picked.app

  if (orgSlugParam) {
    await resolveOrgFromSlug(orgSlugParam)
  }

  workspaceInitialized.value = true
  useState<any>('auth:user').value = user
})
