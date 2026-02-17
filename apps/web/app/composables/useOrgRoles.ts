/**
 * Batch role lookup for the current user across all visible organizations.
 * Returns a reactive Map<orgId, role> for use in picker badges.
 *
 * Role resolution:
 *   - 'owner'  → user's ID matches org.ownerId
 *   - 'admin'  → member record with role 'admin'
 *   - 'member' → member record with role 'member'
 *   - 'guest'  → fallback (invited but not yet active, or no membership)
 */

export type OrgRole = 'owner' | 'admin' | 'member' | 'guest'

export interface OrgRoleInfo {
  role: OrgRole
  label: string
  color: string
}

const ROLE_CONFIGS: Record<OrgRole, Omit<OrgRoleInfo, 'role'>> = {
  owner: { label: 'Owner', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  admin: { label: 'Admin', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  member: { label: 'Member', color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  guest: { label: 'Guest', color: 'bg-muted text-muted-foreground' },
}

export function useOrgRoles() {
  const { user } = useInstantAuth()
  const db = useInstantDb()
  const { organizations } = useInstantData()

  const roleMap = useState<Map<string, OrgRole>>('orgRoles:map', () => new Map())
  const memberCountMap = useState<Map<string, number>>('orgRoles:memberCounts', () => new Map())
  const isLoading = useState<boolean>('orgRoles:loading', () => false)
  const _lastUserId = useState<string>('orgRoles:lastUserId', () => '')

  const refreshRoles = async () => {
    const userId = user.value?.id
    if (!userId) {
      roleMap.value = new Map()
      return
    }

    isLoading.value = true
    try {
      // Query all member records for this user
      const resp = await db.queryOnce({
        members: {
          $: {
            where: { userId },
          },
        },
      })
      const members = (resp.data as any)?.members || []

      const next = new Map<string, OrgRole>()

      // Also query all active members across visible orgs for member counts
      const allMembersResp = await db.queryOnce({
        members: {
          $: {
            where: { status: 'active' },
          },
        },
      })
      const allMembers = (allMembersResp.data as any)?.members || []
      const counts = new Map<string, number>()
      for (const m of allMembers) {
        if (m.orgId) {
          counts.set(m.orgId, (counts.get(m.orgId) || 0) + 1)
        }
      }
      // +1 for the owner (who may not have a member record)
      for (const org of organizations.value || []) {
        counts.set(org.id, (counts.get(org.id) || 0) + 1)
      }
      memberCountMap.value = counts

      // First pass: mark ownership from org data
      for (const org of organizations.value || []) {
        if (org.ownerId === userId) {
          next.set(org.id, 'owner')
        }
      }

      // Second pass: overlay member records (don't downgrade owner)
      for (const m of members) {
        if (m.orgId && !next.has(m.orgId)) {
          const dbRole = m.role as string
          if (dbRole === 'admin') next.set(m.orgId, 'admin')
          else if (dbRole === 'member') next.set(m.orgId, 'member')
          else next.set(m.orgId, 'guest')
        }
      }

      roleMap.value = next
    } catch (err) {
      console.warn('[useOrgRoles] Failed to fetch roles:', (err as any)?.message)
    } finally {
      isLoading.value = false
    }
  }

  // Re-fetch when user or orgs change
  const lookupKey = computed(() => `${user.value?.id || ''}:${(organizations.value || []).length}`)
  watch(lookupKey, (key) => {
    const userId = user.value?.id || ''
    if (!userId) return
    if (_lastUserId.value === key) return
    _lastUserId.value = key
    refreshRoles()
  }, { immediate: true })

  const getRoleForOrg = (orgId: string): OrgRole => {
    return roleMap.value.get(orgId) || 'guest'
  }

  const getRoleInfo = (orgId: string): OrgRoleInfo => {
    const role = getRoleForOrg(orgId)
    return { role, ...ROLE_CONFIGS[role] }
  }

  const isOwnedByMe = (orgId: string): boolean => {
    return getRoleForOrg(orgId) === 'owner'
  }

  const getMemberCount = (orgId: string): number => {
    return memberCountMap.value.get(orgId) || 1
  }

  return {
    roleMap: readonly(roleMap),
    memberCountMap: readonly(memberCountMap),
    isLoading: computed(() => isLoading.value),
    getRoleForOrg,
    getRoleInfo,
    isOwnedByMe,
    getMemberCount,
    refreshRoles,
  }
}
