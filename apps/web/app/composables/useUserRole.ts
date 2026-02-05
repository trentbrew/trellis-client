/**
 * Composable for managing user roles in Platform Sandbox
 * Hierarchy: guest < developer < facility_manager < admin < corporate_admin < super_admin
 */

export type UserRole = 'guest' | 'developer' | 'facility_manager' | 'admin' | 'corporate_admin' | 'super_admin'

export interface FacilityMember {
  id: string
  facilityId: string
  organizationId: string
  userId: string
  email?: string
  name?: string
  role: UserRole
  status?: string
  invitedBy?: string
  invitedAt?: number
  joinedAt?: number
  updatedAt?: number
}

export function useUserRole() {
  const { user } = useInstantAuth()
  const { currentFacility } = useFacilities()
  const instant = useInstantDb()

  const membership = ref<FacilityMember | null>(null)
  const isLoading = ref(false)

  // Fetch user's membership for current facility
  const fetchMembership = async () => {
    if (!user.value?.id || !currentFacility.value?.id) {
      membership.value = null
      return
    }

    isLoading.value = true
    try {
      const result = await instant.queryOnce({
        facilityMembers: {
          $: {
            where: {
              facilityId: currentFacility.value.id,
              userId: user.value.id,
            },
          },
        },
      })

      const members = (result.data as any)?.facilityMembers || []
      membership.value = members[0] || null
    } catch (error) {
      console.error('[useUserRole] Failed to fetch membership:', error)
      membership.value = null
    } finally {
      isLoading.value = false
    }
  }

  // Watch for changes in user or facility
  watch(
    () => [user.value?.id, currentFacility.value?.id],
    () => {
      fetchMembership()
    },
    { immediate: true },
  )

  const userRole = computed<UserRole>(() => {
    if (!user.value) return 'guest'
    if (membership.value?.role) return membership.value.role as UserRole
    return 'guest'
  })

  const roleConfig = computed(() => {
    const configs: Record<UserRole, { label: string; color: string; icon: string }> = {
      super_admin: {
        label: 'Super Admin',
        color: 'bg-primary/10 text-primary border-primary/20',
        icon: 'lucide:shield',
      },
      corporate_admin: {
        label: 'Corporate Admin',
        color: 'bg-primary/10 text-primary border-primary/20',
        icon: 'lucide:building-2',
      },
      admin: {
        label: 'Admin',
        color: 'bg-primary/10 text-primary border-primary/20',
        icon: 'lucide:shield-check',
      },
      facility_manager: {
        label: 'Facility Manager',
        color: 'bg-primary/10 text-primary border-primary/20',
        icon: 'lucide:factory',
      },
      developer: {
        label: 'Developer',
        color: 'bg-primary/10 text-primary border-primary/20',
        icon: 'lucide:code',
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
    membership,
    isLoading,
    refresh: fetchMembership,
  }
}
