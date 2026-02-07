/**
 * Permission system utilities for role-based access control
 */

import type { UserRole, PermissionLevel, RolePermissions, RoutePermissions } from '~/config/routes'

/**
 * Role permission matrix based on the permission matrix image
 * Maps each role to their permission levels
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  superadmin: {
    read: true,
    write: true,
    admin: true,
  },
  admin: {
    read: true,
    write: true,
    admin: true,
  },
  member: {
    read: true,
    write: true,
    admin: false,
  },
  guest: {
    read: true,
    write: false,
    admin: false,
  },
}

/**
 * Role hierarchy for permission checking
 * Higher roles inherit permissions from lower roles
 */
export const ROLE_HIERARCHY: UserRole[] = [
  'guest',
  'member',
  'admin',
  'superadmin',
]

/**
 * Get role position in hierarchy (higher number = higher role)
 */
export function getRoleHierarchy(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role)
}

/**
 * Check if a role meets the minimum required role
 */
export function hasMinimumRole(userRole: UserRole, minRole: UserRole): boolean {
  return getRoleHierarchy(userRole) >= getRoleHierarchy(minRole)
}

/**
 * Check if a role has the required permission level
 */
export function hasPermissionLevel(userRole: UserRole, requiredLevel: PermissionLevel): boolean {
  const permissions = ROLE_PERMISSIONS[userRole]
  return permissions[requiredLevel]
}

/**
 * Check if user can access a route based on permissions
 */
export function canAccessRoute(
  userRole: UserRole,
  routePermissions: RoutePermissions | undefined,
  hasFacilityMembership: boolean = true,
): boolean {
  // If no permissions are defined, allow access (backward compatibility)
  if (!routePermissions) {
    return true
  }

  // Check facility membership requirement
  if (routePermissions.requiresFacilityMembership && !hasFacilityMembership) {
    return false
  }

  // Check custom permission function first
  if (routePermissions.check) {
    return routePermissions.check(userRole, ROLE_PERMISSIONS[userRole])
  }

  // Check minimum role requirement
  if (routePermissions.minRole && !hasMinimumRole(userRole, routePermissions.minRole)) {
    return false
  }

  // Check permission level requirement
  if (routePermissions.permission && !hasPermissionLevel(userRole, routePermissions.permission)) {
    return false
  }

  return true
}

/**
 * Filter routes based on user permissions
 */
export function filterRoutesByPermissions(
  routes: any[],
  userRole: UserRole,
  hasFacilityMembership: boolean = true,
): any[] {
  return routes.filter((route) => {
    // Check if route itself is accessible
    if (!canAccessRoute(userRole, route.permissions, hasFacilityMembership)) {
      return false
    }

    // Check if route has visible function that returns false
    if (route.visible && !route.visible()) {
      return false
    }

    // Recursively filter children
    if (route.children && route.children.length > 0) {
      route.children = filterRoutesByPermissions(route.children, userRole, hasFacilityMembership)
      // Keep parent if it has accessible children
      return route.children.length > 0
    }

    return true
  })
}

/**
 * Filter sidebar sections based on user permissions
 */
export function filterSidebarSectionsByPermissions(
  sections: any[],
  userRole: UserRole,
  hasFacilityMembership: boolean = true,
): any[] {
  return sections.filter((section) => {
    // Handle special section types
    if (section.items === 'pinned' || section.items === 'unpinned') {
      return true // These are handled separately
    }

    // Handle function-based items
    if (typeof section.items === 'function') {
      return true // These are handled separately
    }

    // Filter static items
    if (Array.isArray(section.items)) {
      section.items = filterRoutesByPermissions(section.items, userRole, hasFacilityMembership)
      return section.items.length > 0
    }

    return true
  })
}

/**
 * Get all routes a user can access
 */
export function getAccessibleRoutes(
  allRoutes: any[],
  userRole: UserRole,
  hasFacilityMembership: boolean = true,
): any[] {
  return filterRoutesByPermissions([...allRoutes], userRole, hasFacilityMembership)
}

/**
 * Check if user can perform a specific action on a resource
 */
export function canPerformAction(
  userRole: UserRole,
  action: 'read' | 'write' | 'admin',
  _resourceType?: string,
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole]

  // Basic permission check
  if (!permissions[action]) {
    return false
  }

  // Additional resource-specific checks can be added here
  // For example, sponsors might have limited write access to certain resources

  return true
}

/**
 * Get user-friendly permission descriptions
 */
export function getPermissionDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    superadmin: 'Full system access across all workspaces',
    admin: 'Can manage workspace settings, members, and content',
    member: 'Can create, edit, and manage content',
    guest: 'Read-only access to shared content',
  }
  return descriptions[role]
}

/**
 * Get available actions for a role
 */
export function getAvailableActions(role: UserRole): PermissionLevel[] {
  const permissions = ROLE_PERMISSIONS[role]
  const actions: PermissionLevel[] = []

  if (permissions.read) actions.push('read')
  if (permissions.write) actions.push('write')
  if (permissions.admin) actions.push('admin')

  return actions
}
