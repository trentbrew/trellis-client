/**
 * Permission system utilities for role-based access control
 *
 * Roles: owner > admin > member > guest
 * Owner is a single, transferable role — not assignable via invite.
 */

import type { UserRole, PermissionLevel, RolePermissions, RoutePermissions } from '~/config/routes'

/**
 * Role permission matrix
 * Maps each role to their permission levels
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  owner: {
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
 * Higher index = higher role
 */
export const ROLE_HIERARCHY: UserRole[] = [
  'guest',
  'member',
  'admin',
  'owner',
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
 * Returns the RolePermissions for a given role.
 */
export function getMemberPermissions(role: UserRole): RolePermissions {
  return { ...ROLE_PERMISSIONS[role] }
}

// ── Membership Logic (pure functions) ────────────────────────────────────────

/**
 * Can `actorRole` change `targetRole` to `newRole`?
 *
 * Rules:
 * - No-op changes are rejected
 * - Nobody can promote to owner (use transfer instead)
 * - Owner can change any non-owner role to any non-owner role
 * - Admin can change roles strictly below admin (member ↔ guest)
 * - Member and guest cannot change any roles
 */
export function canChangeRole(
  actorRole: UserRole,
  targetRole: UserRole,
  newRole: UserRole,
): boolean {
  if (targetRole === newRole) return false
  if (newRole === 'owner') return false

  const actorLevel = getRoleHierarchy(actorRole)
  const targetLevel = getRoleHierarchy(targetRole)

  if (actorRole === 'owner') {
    return targetRole !== 'owner'
  }

  if (actorRole === 'admin') {
    return targetLevel < actorLevel && getRoleHierarchy(newRole) < actorLevel
  }

  return false
}

/**
 * Can `actorRole` remove a member with `targetRole`?
 *
 * Rules:
 * - Sole owner cannot be removed
 * - Owner can remove anyone except the sole owner (themselves)
 * - Admin can remove member/guest (strictly below admin)
 * - Member and guest cannot remove anyone
 */
export function canRemoveMember(
  actorRole: UserRole,
  targetRole: UserRole,
  isSoleOwner: boolean,
): boolean {
  if (targetRole === 'owner' && isSoleOwner) return false

  if (actorRole === 'owner') {
    return targetRole !== 'owner'
  }

  if (actorRole === 'admin') {
    return getRoleHierarchy(targetRole) < getRoleHierarchy('admin')
  }

  return false
}

/**
 * Can this role initiate an ownership transfer?
 * Only the current owner can transfer ownership.
 */
export function canTransferOwnership(actorRole: UserRole): boolean {
  return actorRole === 'owner'
}

/**
 * Is a direct role transition valid?
 *
 * Owner transitions are blocked — ownership changes must go
 * through the explicit transfer flow, not role reassignment.
 */
export function isValidRoleTransition(from: UserRole, to: UserRole): boolean {
  if (from === to) return false
  if (from === 'owner' || to === 'owner') return false
  return true
}

// ── Route Access ─────────────────────────────────────────────────────────────

/**
 * Check if user can access a route based on permissions
 */
export function canAccessRoute(
  userRole: UserRole,
  routePermissions: RoutePermissions | undefined,
  hasFacilityMembership: boolean = true,
): boolean {
  if (!routePermissions) {
    return true
  }

  if (routePermissions.requiresFacilityMembership && !hasFacilityMembership) {
    return false
  }

  if (routePermissions.check) {
    return routePermissions.check(userRole, ROLE_PERMISSIONS[userRole])
  }

  if (routePermissions.minRole && !hasMinimumRole(userRole, routePermissions.minRole)) {
    return false
  }

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
    if (!canAccessRoute(userRole, route.permissions, hasFacilityMembership)) {
      return false
    }

    if (route.visible && !route.visible()) {
      return false
    }

    if (route.children && route.children.length > 0) {
      route.children = filterRoutesByPermissions(route.children, userRole, hasFacilityMembership)
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
    if (section.items === 'pinned' || section.items === 'unpinned') {
      return true
    }

    if (typeof section.items === 'function') {
      return true
    }

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

  if (!permissions[action]) {
    return false
  }

  return true
}

/**
 * Get user-friendly permission descriptions
 */
export function getPermissionDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    owner: 'Full workspace control — settings, billing, members, content',
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
