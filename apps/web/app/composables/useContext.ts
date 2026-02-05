/**
 * Composable for managing workspace/app context
 *
 * Provides reactive access to the current workspace and app context.
 * Context is derived from the URL: /[workspace]/[app]/path
 */

import { parseFullPath, buildNavPath } from '~/config/routes'

const WORKSPACE_STORAGE_KEY = 'platform-sandbox-current-workspace'
const APP_STORAGE_KEY = 'platform-sandbox-current-app'

/**
 * useContext - Manages workspace and app context from URL
 */
export function useContext() {
  const route = useRoute()
  const router = useRouter()

  // Extract context from URL path
  const contextFromUrl = computed(() => {
    return parseFullPath(route.path)
  })

  // Current workspace from URL or state
  const currentWorkspace = useState<string | null>('currentWorkspaceSlug', () => {
    if (import.meta.client) {
      return localStorage.getItem(WORKSPACE_STORAGE_KEY)
    }
    return null
  })

  // Current app from URL or state
  const currentApp = useState<string | null>('currentAppSlug', () => {
    if (import.meta.client) {
      return localStorage.getItem(APP_STORAGE_KEY)
    }
    return null
  })

  // Sync context with URL when URL changes
  watch(
    contextFromUrl,
    (ctx) => {
      if (ctx.workspace && ctx.workspace !== currentWorkspace.value) {
        currentWorkspace.value = ctx.workspace
        if (import.meta.client) {
          localStorage.setItem(WORKSPACE_STORAGE_KEY, ctx.workspace)
        }
      }
      if (ctx.app && ctx.app !== currentApp.value) {
        currentApp.value = ctx.app
        if (import.meta.client) {
          localStorage.setItem(APP_STORAGE_KEY, ctx.app)
        }
      }
    },
    { immediate: true },
  )

  // Navigate to a different workspace/app
  const navigateToContext = (workspace: string, app: string, subPath: string = '') => {
    const path = subPath ? `/${workspace}/${app}${subPath}` : `/${workspace}/${app}`
    router.push(path)
  }

  // Build a path within the current context
  const buildContextPath = (logicalPath: string) => {
    return buildNavPath(logicalPath, currentWorkspace.value, currentApp.value)
  }

  // Check if we're in a workspace/app context
  const hasContext = computed(() => {
    return Boolean(contextFromUrl.value.workspace && contextFromUrl.value.app)
  })

  return {
    // Current context
    workspace: computed(() => contextFromUrl.value.workspace),
    app: computed(() => contextFromUrl.value.app),
    cleanPath: computed(() => contextFromUrl.value.cleanPath),
    hasContext,

    // State (for when not in URL)
    currentWorkspace: computed(() => currentWorkspace.value),
    currentApp: computed(() => currentApp.value),

    // Navigation helpers
    navigateToContext,
    buildContextPath,

    // Deprecated aliases for backward compatibility
    /** @deprecated Use workspace instead */
    org: computed(() => contextFromUrl.value.workspace),
    /** @deprecated Use app instead */
    facility: computed(() => contextFromUrl.value.app),
  }
}

/**
 * @deprecated Use useContext instead
 */
export function useYear() {
  const ctx = useContext()
  const currentYear = new Date().getFullYear()

  return {
    selectedYear: computed(() => currentYear),
    availableYears: computed(() => [currentYear]),
    yearFromUrl: computed(() => null),
    selectYear: (_year: number) => {
      console.warn('[useYear] Year selection is deprecated. Use useContext instead.')
    },
    buildYearPath: (basePath: string) => basePath,
    stripYearFromPath: (path: string) => path,
    hasYearPrefix: (_path: string) => false,
    currentYear,
    // Forward to new context
    ...ctx,
  }
}
