/**
 * Composable for managing user roles in Platform Sandbox
 * Hierarchy: guest < member < admin < superadmin
 */

export type UserRole = 'guest' | 'member' | 'admin' | 'superadmin'

export function useUserRole() {
  const { user } = useInstantAuth()

  const userRole = computed<UserRole>(() => {
    if (!user.value) return 'guest'
    const authRole = (user.value as any)?.role
    if (authRole) return authRole as UserRole
    return 'guest'
  })

  const roleConfig = computed(() => {
    const configs: Record<UserRole, { label: string; color: string; icon: string }> = {
      superadmin: {
        label: 'Super Admin',
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
  }
}
