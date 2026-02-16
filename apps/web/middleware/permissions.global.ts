/**
 * Global middleware for enforcing route permissions
 */

import type { UserRole } from '../config/routes'
import { canAccessRoute } from '../lib/permissions'

export default defineNuxtRouteMiddleware((to: any) => {
  // Skip permission check for non-authenticated routes
  if (to.meta.requiresAuth === false) {
    return
  }

  const { user } = useInstantAuth()
  const { userRole } = useUserRole()

  // Redirect to login if not authenticated
  if (!user.value) {
    return navigateTo('/auth/login')
  }

  // Get route permissions from meta
  const routePermissions = to.meta.permissions

  // Check if user has permission to access this route
  const canAccess = canAccessRoute(userRole.value, routePermissions)

  if (!canAccess) {
    console.warn(`[Permissions] User ${user.value.email} (${userRole.value}) denied access to ${to.path}`)
    return navigateTo('/unauthorized')
  }
})

/**
 * Create a runtime error page for unauthorized access
 */
export const createUnauthorizedPage = () => {
  return defineNuxtRouteMiddleware(() => {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access Denied',
      message: 'You do not have permission to access this page.',
    })
  })
}
