/**
 * Route Permission Guard
 *
 * Enforces route-level permissions defined in tql-routes.ts.
 * Runs after the auth middleware. If the user's role doesn't meet
 * the route's minRole requirement, they're redirected to /workspace.
 */

import { canAccessRoute } from '~/lib/permissions'
import { getCleanPath } from '~/config/routes'
import type { UserRole } from '~/config/routes'

// Routes with permission requirements (mirrors tql-routes.ts)
// These are checked at navigation time as a runtime guard.
const ROUTE_PERMISSIONS: Record<string, { minRole: UserRole; permission: 'read' | 'write' | 'admin' }> = {
  '/database': { minRole: 'admin', permission: 'read' },
  '/graph': { minRole: 'admin', permission: 'read' },
  '/members': { minRole: 'admin', permission: 'admin' },
  '/settings/project': { minRole: 'admin', permission: 'admin' },
  '/settings/pages': { minRole: 'admin', permission: 'admin' },
  '/settings/integrations': { minRole: 'admin', permission: 'admin' },
  '/settings/marketplace': { minRole: 'admin', permission: 'admin' },
  '/settings/branding': { minRole: 'admin', permission: 'admin' },
}

export default defineNuxtRouteMiddleware((to) => {
  // Only run on client
  if (!import.meta.client) return

  const path = to.path

  // Skip non-app routes (handle both flat and /w/:orgSlug prefixed paths)
  if (path.startsWith('/auth/') || path.startsWith('/invite/') || path === '/onboarding' || path.startsWith('/welcome')) return

  // Strip /w/:orgSlug/ prefix for permission matching
  const cleanPath = getCleanPath(path)

  // Find matching permission rule (exact match or prefix match for nested routes)
  let matchedPermission: typeof ROUTE_PERMISSIONS[string] | null = null

  // Check exact match first
  if (ROUTE_PERMISSIONS[cleanPath]) {
    matchedPermission = ROUTE_PERMISSIONS[cleanPath]
  } else {
    // Check prefix matches (e.g., /database/task matches /database)
    for (const [routePath, perms] of Object.entries(ROUTE_PERMISSIONS)) {
      if (cleanPath.startsWith(routePath + '/') || cleanPath === routePath) {
        matchedPermission = perms
        break
      }
    }
  }

  if (!matchedPermission) return

  // Get the current user role
  const { userRole, isRoleLoading } = useUserRole()

  // Don't block during initial role resolution — the role may not have loaded yet.
  // Once resolved, subsequent navigations will be properly guarded.
  if (isRoleLoading.value) return

  const allowed = canAccessRoute(userRole.value, matchedPermission)

  if (!allowed) {
    console.warn(`[permissions] Blocked ${userRole.value} from accessing ${cleanPath} (requires ${matchedPermission.minRole}+)`)
    const { wp } = useWorkspacePath()
    return navigateTo(wp('/workspace'))
  }
})
