/**
 * Global middleware to handle URL context extraction
 *
 * Extracts workspace and app from URL and syncs with composable state.
 * URL structure: /[workspace]/[app]/path
 */

import { parseFullPath } from '~/config/routes'

export default defineNuxtRouteMiddleware((to) => {
  const { workspace, app } = parseFullPath(to.path)

  if (workspace) {
    const currentWorkspaceSlug = useState<string | null>('currentWorkspaceSlug')
    currentWorkspaceSlug.value = workspace
    // Deprecated alias for backward compatibility
    const currentOrgSlug = useState<string | null>('currentOrgSlug')
    currentOrgSlug.value = workspace
  }

  if (app) {
    const currentAppSlug = useState<string | null>('currentAppSlug')
    currentAppSlug.value = app
    // Deprecated alias for backward compatibility
    const currentFacilitySlug = useState<string | null>('currentFacilitySlug')
    currentFacilitySlug.value = app
  }
})
