import type { RouterConfig } from 'nuxt/schema'

/**
 * ID-based workspace routing.
 *
 * Clones workspace-scoped routes under `/w/:orgSlug/...` so the workspace
 * context is encoded in the URL (like Notion/Slack). The original flat
 * routes (e.g. `/workspace/notes`) still work as a fallback using the
 * user's `lastOrgId` from settings.
 *
 * Example:
 *   /workspace/notes          → flat route (uses lastOrgId)
 *   /w/trent-ws/workspace/notes → workspace-scoped (orgSlug in URL)
 */
export default <RouterConfig>{
  /**
   * Entity dialog hashes (`#entity:…`) are not DOM anchors. Vue Router's default
   * scroll uses querySelector on the hash and throws when IDs contain `:`.
   */
  scrollBehavior(to, _from, savedPosition) {
    const hash = to.hash
    if (!hash) {
      return savedPosition ?? { top: 0, left: 0 }
    }
    if (hash.startsWith('#entity:') || hash.startsWith('#calendaritem:')) {
      return savedPosition ?? { top: 0, left: 0 }
    }
    try {
      const el = document.querySelector(hash)
      if (el) {
        return { el, behavior: 'smooth' as const }
      }
    } catch {
      // Invalid CSS selector — ignore
    }
    return savedPosition ?? { top: 0, left: 0 }
  },

  routes: (_routes) => {
    // Top-level path segments that should be workspace-scoped
    const WORKSPACE_SCOPED = new Set([
      'agent',
      'home',
      'workspace',
      'calendar',
      'collections',
      'database',
      'documents',
      'graph',
      'locations',
      'mail',
      'members',
      'messages',
      'notifications',
      'ontologies',
      'pages',
      'query',
      'settings',
      'sheets',
      'decks',
      'canvases',
      'types',
      'workflows',
    ])

    function cloneRoute(route: any): any {
      return {
        ...route,
        path: `/w/:orgSlug${route.path}`,
        name: route.name ? `w-${String(route.name)}` : undefined,
        children: route.children?.map((child: any) => ({
          ...child,
          name: child.name ? `w-${String(child.name)}` : undefined,
        })),
        alias: [],
      }
    }

    const clones: any[] = []

    for (const route of _routes) {
      const firstSegment = route.path.replace(/^\//, '').split('/')[0]
      if (WORKSPACE_SCOPED.has(firstSegment)) {
        clones.push(cloneRoute(route))
      }
    }

    return [..._routes, ...clones]
  },
}
