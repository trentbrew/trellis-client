/**
 * Composable for managing user roles in Platform Sandbox
 * Hierarchy: guest < member < admin < superadmin
 *
 * The role is resolved from the member record in the current org.
 * Org owners are mapped to 'superadmin'.
 */

export type UserRole = 'guest' | 'member' | 'admin' | 'superadmin'

export function useUserRole() {
  // SSR-safe shared state via useState
  const _memberRole = useState<string | null>('userRole:memberRole', () => null)
  const _memberRoleLoading = useState<boolean>('userRole:loading', () => false)
  const _lastLookupKey = useState<string>('userRole:lastKey', () => '')

  const { user } = useInstantAuth()
  const currentOrg = useState<any>('currentOrg')
  const db = useInstantDb()

  // Map member DB roles → UserRole hierarchy
  const mapMemberRole = (dbRole: string | undefined, isOwner: boolean): UserRole => {
    if (isOwner) return 'superadmin'
    switch (dbRole) {
      case 'owner': return 'superadmin'
      case 'admin': return 'admin'
      case 'member': return 'member'
      case 'guest': return 'guest'
      default: return 'guest'
    }
  }

  // Check if the user is the org owner
  const isOrgOwner = computed(() => {
    if (!user.value?.id || !currentOrg.value) return false
    return currentOrg.value.ownerId === user.value.id
  })

  // Look up the member record when user or org changes
  const lookupKey = computed(() => `${user.value?.id || ''}:${currentOrg.value?.id || ''}`)

  watch(lookupKey, async (key) => {
    if (!key || key === ':') {
      _memberRole.value = null
      return
    }
    // Avoid duplicate lookups for the same user+org
    if (_lastLookupKey.value === key) return
    _lastLookupKey.value = key

    const userId = user.value?.id
    const orgId = currentOrg.value?.id
    if (!userId || !orgId) {
      _memberRole.value = null
      return
    }

    // Org owners are always superadmin — no need to query
    if (isOrgOwner.value) {
      _memberRole.value = 'owner'
      return
    }

    _memberRoleLoading.value = true
    try {
      const resp = await db.queryOnce({
        members: {
          $: {
            where: {
              userId,
              orgId,
            },
          },
        },
      })
      const members = (resp.data as any)?.members || []
      _memberRole.value = members[0]?.role || null
    } catch (err) {
      console.warn('[useUserRole] member lookup failed:', (err as any)?.message)
      _memberRole.value = null
    } finally {
      _memberRoleLoading.value = false
    }
  }, { immediate: true })

  const userRole = computed<UserRole>(() => {
    if (!user.value) return 'guest'
    return mapMemberRole(_memberRole.value || undefined, isOrgOwner.value)
  })

  const roleConfig = computed(() => {
    const configs: Record<UserRole, { label: string; color: string; icon: string }> = {
      superadmin: {
        label: 'Owner',
        color: 'bg-primary/10 text-primary border-primary/20',
        icon: 'lucide:shield',
      },
      admin: {
        label: 'Admin',
        color: 'bg-primary/10 text-primary border-primary/20',
        icon: 'lucide:shield-check',
      },
      member: {
        label: 'Member',
        color: 'bg-primary/10 text-primary border-primary/20',
        icon: 'lucide:user',
      },
      guest: {
        label: 'Guest',
        color: 'bg-primary/10 text-primary border-primary/20',
        icon: 'lucide:eye',
      },
    }
    return configs[userRole.value]
  })

  return {
    userRole,
    roleConfig,
    isOrgOwner,
    isRoleLoading: computed(() => _memberRoleLoading.value),
  }
}
