/**
 * Composable for managing user roles in Trellis
 * Hierarchy: guest < member < admin < owner
 *
 * Resolution order:
 *   1. Local-first mode → any authenticated user is 'owner' (single-user substrate).
 *   2. Org ownerId matches user.id → 'owner' (fast path for cloud, no query needed).
 *   3. Member record lookup in current org → 'owner' | 'admin' | 'member' | 'guest'.
 *   4. Default → 'guest'.
 */

import type { UserRole } from '~/config/routes'

export function useUserRole() {
  // SSR-safe shared state via useState
  const _memberRole = useState<string | null>('userRole:memberRole', () => null)
  const _memberRoleLoading = useState<boolean>('userRole:loading', () => false)
  const _lastLookupKey = useState<string>('userRole:lastKey', () => '')

  const { user } = useInstantAuth()
  const currentOrg = useState<any>('currentOrg')
  const db = useInstantDb()
  const { isLocal } = useAdapterStatus()

  // Map member DB role string → UserRole
  const mapMemberRole = (dbRole: string | undefined, isOwner: boolean): UserRole => {
    if (isOwner) return 'owner'
    switch (dbRole) {
      case 'owner':
        return 'owner'
      case 'admin':
        return 'admin'
      case 'member':
        return 'member'
      case 'guest':
        return 'guest'
      default:
        return 'guest'
    }
  }

  // Check if the user is the org owner (fallback for pre-migration orgs)
  const isOrgOwner = computed(() => {
    if (!user.value?.id || !currentOrg.value) return false
    return currentOrg.value.ownerId === user.value.id
  })

  // Look up the member record when user or org changes
  const lookupKey = computed(() => `${user.value?.id || ''}:${currentOrg.value?.id || ''}`)

  watch(
    lookupKey,
    async (key) => {
      if (!key || key === ':') {
        _memberRole.value = null
        return
      }
      if (_lastLookupKey.value === key) return
      _lastLookupKey.value = key

      const userId = user.value?.id
      const orgId = currentOrg.value?.id
      if (!userId || !orgId) {
        _memberRole.value = null
        return
      }

      // Local-first mode: the authenticated user is always the owner of the substrate.
      // Skip the member-record query entirely — there's no remote to talk to.
      if (isLocal.value) {
        _memberRole.value = 'owner'
        return
      }

      // Org owners fallback — no need to query if ownerId matches
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
    },
    { immediate: true },
  )

  const userRole = computed<UserRole>(() => {
    if (!user.value) return 'guest'
    // Local-first: authenticated ⇒ owner. Treat the single user as the substrate owner.
    if (isLocal.value) return 'owner'
    return mapMemberRole(_memberRole.value || undefined, isOrgOwner.value)
  })

  const roleConfig = computed(() => {
    const configs: Record<UserRole, { label: string; color: string; icon: string }> = {
      owner: {
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
