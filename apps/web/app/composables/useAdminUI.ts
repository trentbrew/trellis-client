/**
 * Composable for role-based admin UI visibility
 *
 * Provides reactive flags for showing/hiding builder controls
 * based on user role and edit mode state.
 */

import { hasMinimumRole, canPerformAction } from '~/lib/permissions'
import type { UserRole } from './useUserRole'

const EDIT_MODE_KEY = 'platform-sandbox-edit-mode'

/**
 * Check if user is the owner of the current workspace
 */
function useIsOwner() {
  const { user } = useInstantAuth()
  const { currentOrganization } = useOrganizations()

  return computed(() => {
    if (!user.value?.id || !currentOrganization.value) return false
    return currentOrganization.value.ownerId === user.value.id
  })
}

/**
 * Main composable for admin UI controls
 */
export function useAdminUI() {
  const { userRole } = useUserRole()
  const isOwner = useIsOwner()

  // Edit mode state (persisted in localStorage)
  const isInEditMode = useState<boolean>('adminEditMode', () => {
    if (import.meta.client) {
      const stored = localStorage.getItem(EDIT_MODE_KEY)
      return stored === 'true'
    }
    return false
  })

  // Toggle edit mode
  const toggleEditMode = () => {
    isInEditMode.value = !isInEditMode.value
    if (import.meta.client) {
      localStorage.setItem(EDIT_MODE_KEY, String(isInEditMode.value))
    }
  }

  // Enable edit mode
  const enableEditMode = () => {
    isInEditMode.value = true
    if (import.meta.client) {
      localStorage.setItem(EDIT_MODE_KEY, 'true')
    }
  }

  // Disable edit mode
  const disableEditMode = () => {
    isInEditMode.value = false
    if (import.meta.client) {
      localStorage.setItem(EDIT_MODE_KEY, 'false')
    }
  }

  // Role-based capability flags
  const canViewContent = computed(() => canPerformAction(userRole.value, 'read'))

  const canEditContent = computed(() => canPerformAction(userRole.value, 'write'))

  const canAdminister = computed(() => canPerformAction(userRole.value, 'admin'))

  // Minimum role checks
  const isAdmin = computed(() => hasMinimumRole(userRole.value, 'admin'))

  const isSuperAdmin = computed(() => hasMinimumRole(userRole.value, 'super_admin'))

  // Specific capability flags for self-building features
  const canCreateCollections = computed(() => {
    // Admin+ can create collections
    return isAdmin.value
  })

  const canCreatePages = computed(() => {
    // Super admin+ can create pages
    return isSuperAdmin.value
  })

  const canCreateRoutes = computed(() => {
    // Only workspace owner can create routes
    return isOwner.value
  })

  const canManageOntologies = computed(() => {
    // Only workspace owner can manage ontologies
    return isOwner.value
  })

  const canManageIntegrations = computed(() => {
    // Owner or super admin can manage integrations
    return isOwner.value || isSuperAdmin.value
  })

  const canManageBrand = computed(() => {
    // Only workspace owner can manage brand settings
    return isOwner.value
  })

  const canManageMembers = computed(() => {
    // Admin+ can manage members
    return isAdmin.value
  })

  const canManageWorkflows = computed(() => {
    // Admin+ can manage workflows
    return isAdmin.value
  })

  // Check if user can see admin controls at all
  const canSeeAdminControls = computed(() => {
    return isAdmin.value || isOwner.value
  })

  // Check if user can toggle edit mode
  const canToggleEditMode = computed(() => {
    return canSeeAdminControls.value
  })

  // Combined check: can see AND is in edit mode
  const showBuilderUI = computed(() => {
    return canSeeAdminControls.value && isInEditMode.value
  })

  return {
    // Edit mode
    isInEditMode: readonly(isInEditMode),
    toggleEditMode,
    enableEditMode,
    disableEditMode,
    canToggleEditMode,

    // Role checks
    isOwner,
    isAdmin,
    isSuperAdmin,

    // Basic permissions
    canViewContent,
    canEditContent,
    canAdminister,

    // Self-building capabilities
    canCreateCollections,
    canCreatePages,
    canCreateRoutes,
    canManageOntologies,
    canManageIntegrations,
    canManageBrand,
    canManageMembers,
    canManageWorkflows,

    // UI visibility
    canSeeAdminControls,
    showBuilderUI,
  }
}

/**
 * Helper to check if current user meets minimum role
 */
export function useMinRole(minRole: UserRole) {
  const { userRole } = useUserRole()
  return computed(() => hasMinimumRole(userRole.value, minRole))
}

/**
 * Helper to check if current user is workspace owner
 */
export function useIsWorkspaceOwner() {
  return useIsOwner()
}
