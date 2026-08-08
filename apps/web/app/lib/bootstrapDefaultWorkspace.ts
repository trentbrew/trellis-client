import type { Organization } from '~/types/database'

type InstantDb = ReturnType<typeof useInstantDb>
type UpsertSetting = (
  entityType: 'user' | 'org' | 'app' | 'collection',
  entityId: string,
  key: string,
  value: any,
) => Promise<void>

const generateSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

/**
 * Skip the onboarding wizard: resolve invites, reuse an existing org if present,
 * or create a minimal default workspace (org + app + home collection).
 */
export async function bootstrapDefaultWorkspace(
  instant: InstantDb,
  user: { id: string; email?: string | null; name?: string | null },
  upsertSetting: UpsertSetting,
  log: (...args: any[]) => void,
) {
  const tx = instant.tx as any

  const resp = await instant.queryOnce({
    organizations: {},
    applications: {},
    members: { $: { where: { userId: user.id } } },
  })

  const orgs = ((resp.data as any)?.organizations || []) as Organization[]
  const apps = ((resp.data as any)?.applications || []) as any[]
  const members = ((resp.data as any)?.members || []) as any[]

  if (orgs.length > 0) {
    const org = orgs[0]!
    const orgApps = apps.filter((a) => a.orgId === org.id)
    await upsertSetting('user', user.id, 'onboardingComplete', true)
    await upsertSetting('user', user.id, 'lastOrgId', org.id)
    if (orgApps[0]?.id) {
      await upsertSetting('user', user.id, 'lastAppId', orgApps[0].id)
    }
    log('bootstrap: reusing existing org', org.id)
    return
  }

  const memberOrgId = members.find((m) => m.orgId)?.orgId
  if (memberOrgId) {
    const memberApps = apps.filter((a) => a.orgId === memberOrgId)
    await upsertSetting('user', user.id, 'onboardingComplete', true)
    await upsertSetting('user', user.id, 'lastOrgId', memberOrgId)
    if (memberApps[0]?.id) {
      await upsertSetting('user', user.id, 'lastAppId', memberApps[0].id)
    }
    log('bootstrap: using membership org', memberOrgId)
    return
  }

  const now = Date.now()
  const orgName = 'My Workspace'
  const appName = 'Default Space'
  const orgId = crypto.randomUUID()
  const appId = crypto.randomUUID()
  const homeCollectionId = crypto.randomUUID()
  const ownerMemberId = crypto.randomUUID()
  const displayName = user.name?.trim() || user.email || 'Owner'

  const org: Organization = {
    id: orgId,
    ownerId: user.id,
    name: orgName,
    slug: generateSlug(orgName) || crypto.randomUUID(),
    plan: 'free',
    createdAt: now,
    updatedAt: now,
  }

  const app = {
    id: appId,
    orgId,
    name: appName,
    slug: generateSlug(appName) || crypto.randomUUID(),
    icon: 'lucide:layout',
    color: 'bg-primary',
    description: 'My first world',
    accessLevel: 'open',
    createdAt: now,
    updatedAt: now,
  }

  await instant.transact([
    tx.organizations[org.id].update({
      ownerId: user.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    }),
    tx.members[ownerMemberId].update({
      ownerId: user.id,
      orgId: org.id,
      userId: user.id,
      name: displayName,
      role: 'owner',
      status: 'active',
      invitedAt: org.createdAt,
      joinedAt: org.createdAt,
      orgName: org.name,
    }),
    tx.organizations[org.id].link({ members: ownerMemberId }),
    tx.applications[app.id].update({
      ownerId: user.id,
      orgId: org.id,
      name: app.name,
      slug: app.slug,
      icon: app.icon,
      color: app.color,
      description: app.description,
      accessLevel: app.accessLevel,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    }),
    tx.applications[app.id].link({ organization: org.id }),
    tx.collections[homeCollectionId].update({
      ownerId: user.id,
      appId: app.id,
      parentId: null,
      title: 'Home',
      slug: 'home',
      icon: 'lucide:home',
      type: 'database',
      order: 1,
      isPublished: true,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    }),
    tx.collections[homeCollectionId].link({ application: app.id }),
  ])

  await upsertSetting('user', user.id, 'onboardingComplete', true)
  await upsertSetting('user', user.id, 'lastOrgId', org.id)
  await upsertSetting('user', user.id, 'lastAppId', app.id)

  log('bootstrap: created default workspace', org.id, app.id)
}
