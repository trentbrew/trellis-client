import {
  flattenRoutes,
  getBreadcrumbs,
  getCleanPath,
  getCommandPaletteRoutes,
  getRouteMeta,
  getSidebarSection,
  routeConfig,
} from '~/config/routes'
import type { BadgeConfig, RouteConfig } from '~/config/routes'
import { PLATFORM_TYPES } from '~/lib/systemTypes'
import { filterRoutesByPermissions } from '~/lib/permissions'
import { useOntologyRegistry } from '~/composables/useOntologyRegistry'
import { useTrellisConfig } from '~/composables/useTrellisConfig'
import { useSidebarTree } from '~/composables/useSidebarTree'
import type { SidebarTreeNode } from '~/composables/useSidebarTree'

type RailConfig = {
  primary: string[]
  secondary: string[]
}

const MAX_RAIL_ITEMS_TOTAL = 12

const _sanitizeRailConfig = (config: RailConfig): RailConfig => {
  return {
    primary: Array.isArray(config?.primary) ? [...config.primary] : [],
    secondary: Array.isArray(config?.secondary) ? [...config.secondary] : [],
  }
}

/**
 * Composable for accessing route configuration
 */
export const useRoutes = () => {
  const route = useRoute()

  const pinned = usePinnedItems()
  const sidebarOrder = useSidebarOrder()
  const { userRole } = useUserRole()
  const sidebarTree = useSidebarTree('workspace')

  const currentOrg = useState<any>('currentOrg')
  const currentApp = useState<any>('currentApp')

  const railConfig = ref<RailConfig | null>(null)

  // Server-sourced routes (primary) with static fallback
  const { routeConfigTree: serverRoutes } = useTrellisConfig()

  // Merge server routes with static routes — docs route is static-only
  const effectiveRouteConfig = computed<RouteConfig[]>(() => {
    const server = serverRoutes.value
    if (server.length > 0) {
      // Server routes replace the app-config.jsonld routes; keep static-only routes (docs)
      const staticOnly = routeConfig.filter((r) => !server.some((s) => s.path === r.path))
      return [...server, ...staticOnly]
    }
    return routeConfig
  })

  // All users have access (facility membership check removed)
  const hasFacilityMembership = computed(() => true)

  // Get collections reactively from InstantDB
  const { collections: instantCollections, customTypes, workflows } = useInstantData()

  // Get user-created pages
  const { pages } = usePages()

  const pagesChildren = computed<RouteConfig[]>(() => {
    return (pages.value || []).map((p) => ({
      path: `/workspace/pages/${p.id}`,
      label: p.title,
      icon: p.icon || 'lucide:file-text',
      tint: 'text-emerald-300',
      meta: {
        title: p.title,
        subtitle: 'Page',
      },
    }))
  })

  const collectionsChildren = computed<RouteConfig[]>(() => {
    if (!instantCollections.value) return []

    return instantCollections.value
      .filter((c) => !c.parentId)
      .map((col) => ({
        path: `/collections/${col.slug}`,
        label: col.title,
        icon: col.icon || 'lucide:database',
        tint: 'text-blue-300',
        meta: {
          title: col.title,
          subtitle: col.type,
        },
      }))
  })

  /**
   * Dynamic children for types (custom types)
   * TODO: Fetch from InstantDB when types collection is ready
   */
  const typesChildren = computed<RouteConfig[]>(() => {
    return (customTypes.value || []).map((t) => ({
      path: `/types/${t.id}`,
      label: t.name,
      icon: t.icon || 'lucide:boxes',
      tint: 'text-violet-300',
      meta: {
        title: t.name,
        subtitle: 'Types',
      },
    }))
  })

  const platformTypeIds = new Set(PLATFORM_TYPES.map((t) => t.id.toLowerCase()))

  const entityTypesChildren = computed<RouteConfig[]>(() => {
    return serverOntologyTypes.value
      .filter((t) => t.tier === 'system' && !isDynamicType(t.type) && !platformTypeIds.has(t.type.toLowerCase()))
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((t) => ({
        path: `/database/${t.type}`,
        label: t.label,
        icon: t.icon || 'lucide:box',
        tint: `text-${t.color}-300`,
        order: -100,
        meta: {
          title: t.label,
          subtitle: t.class,
        },
      }))
  })

  const platformTypesChildren = computed<RouteConfig[]>(() => {
    return PLATFORM_TYPES.map((t) => ({
      path: `/database/${t.id.toLowerCase()}`,
      label: t.name,
      icon: t.icon || 'lucide:cog',
      tint: 'text-muted-foreground',
      order: 100,
      meta: {
        title: t.name,
        subtitle: 'System',
      },
    }))
  })

  // Keep backward compat alias
  const systemTypesChildren = entityTypesChildren

  const workflowsChildren = computed<RouteConfig[]>(() => {
    return (workflows.value || []).map((w) => ({
      path: `/workflows/${w.id}`,
      label: w.name,
      icon: w.icon || 'lucide:workflow',
      tint: 'text-amber-300',
      meta: {
        title: w.name,
        subtitle: 'Workflows',
      },
    }))
  })

  /**
   * Dynamic children from ontology-derived entity types.
   * These are types created at runtime via CLI or MCP that auto-appear in the sidebar.
   */
  const { serverTypes: serverOntologyTypes, filteredDynamicTypes: ontologyTypes, isDynamicType } = useOntologyRegistry()

  // ── App-scoped sidebar filtering ──────────────────────────────────────
  // Maps sidebar route paths to the entity type slugs they depend on.
  // A sidebar item shows if ANY of its mapped types is in the app's enabled list.
  // Items with no mapping (e.g. Overview, Feed) always show.
  // Empty/null currentApp.ontologies → show ALL (backward compat for default Workspace app).
  const ROUTE_ENTITY_TYPES: Record<string, string[]> = {
    '/workspace/calendar': ['task', 'event', 'trip', 'payment', 'appointment', 'reminder', 'deadline', 'milestone'],
    '/workspace/tasks': ['task'],
    '/workspace/notes': ['note'],
    '/workspace/projects': ['project'],
    '/workspace/people': ['person', 'contact', 'organization', 'vendor'],
    '/workspace/documents': ['note', 'file', 'page', 'template', 'slide_deck'],
    '/workspace/bookmarks': ['bookmark'],
  }

  const isRouteEnabledForApp = (path: string): boolean => {
    const enabledTypes = currentApp.value?.ontologies
    // No filtering if ontologies is empty/null/undefined
    if (!enabledTypes || enabledTypes.length === 0) return true
    const requiredTypes = ROUTE_ENTITY_TYPES[path]
    // No mapping → always show (meta pages like Overview, Feed, Places)
    if (!requiredTypes) return true
    const enabledSet = new Set(enabledTypes)
    return requiredTypes.some((t) => enabledSet.has(t))
  }

  const ontologyTypeChildren = computed<RouteConfig[]>(() => {
    return (ontologyTypes.value || []).map((t) => ({
      path: `/database/${t.type}`,
      label: t.label,
      icon: t.icon || 'lucide:database',
      tint: `text-${t.color}-300`,
      meta: {
        title: t.label,
        subtitle: 'Custom',
      },
    }))
  })

  const railRoutesByPath = computed(() => {
    const map = new Map<string, RouteConfig>()

    // Filter and keep section roots as rail items
    const filteredSections = filterRoutesByPermissions(
      effectiveRouteConfig.value,
      userRole.value,
      hasFacilityMembership.value,
    )
    filteredSections.forEach((section) => {
      if (section?.path) map.set(section.path, section)
    })

    // Also allow dynamic collection routes to live in the rail (with permission filtering)
    if (collectionsChildren.value) {
      const filteredCollections = filterRoutesByPermissions(
        collectionsChildren.value,
        userRole.value,
        hasFacilityMembership.value,
      )
      filteredCollections.forEach((child) => {
        if (child?.path) map.set(child.path, child)
      })
    }

    // Allow dynamic types routes to live in the rail (with permission filtering)
    if (typesChildren.value) {
      const filteredTypes = filterRoutesByPermissions(typesChildren.value, userRole.value, hasFacilityMembership.value)
      filteredTypes.forEach((child) => {
        if (child?.path) map.set(child.path, child)
      })
    }

    return map
  })

  const isStaticSectionPath = (path: string) => {
    return effectiveRouteConfig.value.some((section) => section?.path === path)
  }

  const getCollectionSlugFromPath = (path: string): string | null => {
    const match = /^\/database\/collections\/([^/]+)$/.exec(path)
    return match?.[1] || null
  }

  const getCollectionSlugFromRoutePath = (path: string): string | null => {
    const match = /^\/database\/collections\/([^/]+)(?:\/|$)/.exec(path)
    return match?.[1] || null
  }

  const validateRailItem = (path: string): { valid: boolean; pending: boolean; reason?: string } => {
    if (typeof path !== 'string' || !path) return { valid: false, pending: false, reason: 'Invalid path' }

    if (isStaticSectionPath(path)) return { valid: true, pending: false }

    const slug = getCollectionSlugFromPath(path)
    if (!slug) return { valid: false, pending: false, reason: 'Not a pinnable rail path' }

    const found = (instantCollections.value || []).find((c: any) => c?.slug === slug)
    if (!found) return { valid: true, pending: true }
    if (found.parentId) return { valid: false, pending: false, reason: 'Only root collections can be pinned' }

    return { valid: true, pending: false }
  }

  const _railConfigsEqual = (a: RailConfig, b: RailConfig) => {
    if (a.primary.length !== b.primary.length || a.secondary.length !== b.secondary.length) return false
    return a.primary.every((p, i) => p === b.primary[i]) && a.secondary.every((p, i) => p === b.secondary[i])
  }

  const enforceRailConstraints = (config: RailConfig, priority: 'primary' | 'secondary' = 'primary'): RailConfig => {
    const out: RailConfig = { primary: [], secondary: [] }
    const seen = new Set<string>()
    let total = 0

    const applyList = (position: 'primary' | 'secondary', paths: string[]) => {
      paths.forEach((raw) => {
        const path = typeof raw === 'string' ? raw : ''
        if (!path) return
        if (seen.has(path)) return
        const validation = validateRailItem(path)
        if (!validation.valid) {
          if (import.meta.dev)
            console.warn(
              `[rail] Dropping invalid rail item: ${path}${validation.reason ? ` (${validation.reason})` : ''}`,
            )
          return
        }
        if (total >= MAX_RAIL_ITEMS_TOTAL) {
          if (import.meta.dev)
            console.warn(`[rail] Dropping rail item due to max limit (${MAX_RAIL_ITEMS_TOTAL}): ${path}`)
          return
        }

        seen.add(path)
        out[position].push(path)
        total += 1
      })
    }

    const first: 'primary' | 'secondary' = priority
    const second: 'primary' | 'secondary' = priority === 'primary' ? 'secondary' : 'primary'

    applyList(first, config[first] || [])
    applyList(second, config[second] || [])

    return out
  }

  const saveRailConfig = async (config: RailConfig) => {
    if (!import.meta.client) return

    // Rail is currently code-driven (not user-editable). Keep the function for forward compatibility,
    // but do not persist anything.
    void config
  }

  const setRailSpaces = async (position: 'primary' | 'secondary', spacePaths: string[]) => {
    const next = (railConfig.value || seedRailConfigFromDefaults()) as RailConfig

    const candidate: RailConfig = {
      primary: position === 'primary' ? [...spacePaths] : [...(next.primary || [])],
      secondary: position === 'secondary' ? [...spacePaths] : [...(next.secondary || [])],
    }

    const enforced = enforceRailConstraints(candidate, position)
    railConfig.value = enforced
    await saveRailConfig(enforced)
  }

  const _getRailSettingsKey = () => {
    // Rail is configured per org+app. A "space" is the first path segment (e.g. /forms).
    // Keeping the key structured makes it easy to evolve without breaking storage.
    const orgId = currentOrg.value?.id || 'unknown-org'
    const appId = currentApp.value?.id || 'unknown-app'
    return `nav.railSpaces.v1.org:${orgId}.app:${appId}`
  }

  const getSpaceForPath = (path: string): string | null => {
    const section = getSidebarSection(path)
    return section?.path || null
  }

  const getDefaultRailSpaces = (position: 'primary' | 'secondary'): string[] => {
    // Default rail items are derived from the existing route config.
    // - If a top-level section is inRail, it is a rail "space".
    // - If any child is inRail, the parent section becomes the rail "space".
    const spaces: Array<{ path: string; order: number }> = []

    effectiveRouteConfig.value.forEach((section) => {
      if (!section?.path) return

      const isSpaceInRail = section.inRail && section.railPosition === position
      const hasChildInRail = !!section.children?.some((child) => child?.inRail && child.railPosition === position)

      if (isSpaceInRail || hasChildInRail) {
        spaces.push({ path: section.path, order: section.order ?? 999 })
      }
    })

    return spaces.sort((a, b) => a.order - b.order).map((s) => s.path)
  }

  const seedRailConfigFromDefaults = (): RailConfig => {
    const primary = getDefaultRailSpaces('primary')
    const secondary = getDefaultRailSpaces('secondary')
    return { primary, secondary }
  }

  const _migrateRailConfigToSpaces = (value: any): RailConfig | null => {
    if (!value || !Array.isArray(value.primary) || !Array.isArray(value.secondary)) return null

    const toSpaceList = (paths: any[]): string[] => {
      const out: string[] = []
      const seen = new Set<string>()

      paths.forEach((p) => {
        if (typeof p !== 'string') return

        // Preserve dynamic collection routes as rail items.
        if (p.startsWith('/collections/') && p.length > '/collections/'.length) {
          if (!seen.has(p)) {
            seen.add(p)
            out.push(p)
          }
          return
        }

        // If it's already a space path (matches a top-level section), keep it.
        const directMatch = effectiveRouteConfig.value.some((s) => s?.path === p)
        const spacePath = directMatch ? p : getSpaceForPath(p)
        if (!spacePath) return

        if (!seen.has(spacePath)) {
          seen.add(spacePath)
          out.push(spacePath)
        }
      })

      return out
    }

    return {
      primary: toSpaceList(value.primary),
      secondary: toSpaceList(value.secondary),
    }
  }

  const loadRailConfig = async () => {
    if (!import.meta.client) return

    const seeded = seedRailConfigFromDefaults()
    railConfig.value = enforceRailConstraints(seeded)
  }

  /**
   * Get all routes for command palette
   */
  const commandPaletteRoutes = computed(() => {
    const routes = getCommandPaletteRoutes(effectiveRouteConfig.value)
    return filterRoutesByPermissions(routes, userRole.value, hasFacilityMembership.value)
  })

  /**
   * Get primary rail routes
   */
  const primaryRailRoutes = computed(() => {
    const paths = railConfig.value?.primary
    if (!paths) {
      const defaults = seedRailConfigFromDefaults().primary
      return defaults.map((p) => railRoutesByPath.value.get(p)).filter(Boolean) as RouteConfig[]
    }

    return paths.map((p) => railRoutesByPath.value.get(p)).filter(Boolean) as RouteConfig[]
  })

  /**
   * Get secondary rail routes
   */
  const secondaryRailRoutes = computed(() => {
    const paths = railConfig.value?.secondary
    if (!paths) {
      const defaults = seedRailConfigFromDefaults().secondary
      return defaults.map((p) => railRoutesByPath.value.get(p)).filter(Boolean) as RouteConfig[]
    }

    return paths.map((p) => railRoutesByPath.value.get(p)).filter(Boolean) as RouteConfig[]
  })

  /**
   * Get current sidebar section
   */
  const currentSidebarSection = computed(() => getSidebarSection(route.path, effectiveRouteConfig.value))

  /**
   * Dynamic children for collections - now reactive via InstantDB
   */
  // Re-seed rail when org/app changes OR when server routes arrive
  watch([currentOrg, currentApp, serverRoutes], loadRailConfig, { immediate: true })

  /**
   * Get current section's children (for sidebar)
   * Merges static and dynamic children based on current section
   */
  const currentSectionLinks = computed(() => {
    const section = currentSidebarSection.value
    if (!section?.path) return []

    let dynamicChildren: RouteConfig[] = []

    // Get dynamic children based on section
    switch (section.path) {
      case '/workspace':
        dynamicChildren = [...pagesChildren.value]
        break
      case '/database':
        dynamicChildren = [
          ...systemTypesChildren.value,
          ...collectionsChildren.value,
          ...typesChildren.value,
          ...ontologyTypeChildren.value,
        ]
        break
      case '/workflows':
        dynamicChildren = workflowsChildren.value
        break
    }

    // Merge static children (from config) with dynamic children
    const adopted = flattenRoutes(effectiveRouteConfig.value).filter(
      (r) => r?.path && r.meta?.sidebarSectionPath === section.path,
    )

    const allChildren = [...dynamicChildren, ...(section.children || []), ...adopted]

    // Filter by permissions
    const filteredChildren = filterRoutesByPermissions(allChildren, userRole.value, hasFacilityMembership.value)

    const seen = new Set<string>()
    return filteredChildren
      .filter((child) => child?.path && child.visible?.() !== false)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .filter((child) => {
        if (!child?.path) return false
        if (seen.has(child.path)) return false
        seen.add(child.path)
        return true
      })
  })

  /**
   * Get current section label
   */
  const currentSectionLabel = computed(() => {
    return currentSidebarSection.value?.label || 'Navigation'
  })

  /**
   * Get breadcrumbs for current route
   */
  const { pages: _breadcrumbPages } = usePages()
  const breadcrumbs = computed(() => {
    const base = getBreadcrumbs(route.path, effectiveRouteConfig.value)

    // Custom pages: /workspace/pages/:pageId → append page title
    const cleanPath = getCleanPath(route.path)
    const pageMatch = cleanPath.match(/^\/workspace\/pages\/(.+)$/)
    if (pageMatch) {
      const pageId = pageMatch[1]
      const page = (_breadcrumbPages.value || []).find((p: any) => p.id === pageId)
      const pagesBase = [
        { label: 'Workspace', path: '/workspace' },
        { label: 'Pages', path: '/workspace' },
        { label: page?.title || 'Untitled' },
      ]
      return pagesBase
    }

    const slug = getCollectionSlugFromRoutePath(route.path)
    if (!slug) return base

    const collection = (instantCollections.value || []).find((c: any) => c?.slug === slug)
    const label = collection?.title || slug

    return [...base, { label }]
  })

  /**
   * Get metadata for current route
   */
  const currentRouteMeta = computed(() => getRouteMeta(route.path, effectiveRouteConfig.value))

  /**
   * Check if a route is active
   */
  const isRouteActive = (path: string) => {
    const currentClean = getCleanPath(route.path)
    if (currentClean === path || currentClean.startsWith(path + '/')) return true

    // Check if the current route has a sidebarSectionPath that matches
    const meta = getRouteMeta(route.path, effectiveRouteConfig.value)
    if (meta?.sidebarSectionPath === path) return true

    return false
  }

  const isRouteExactlyActive = (path: string) => {
    return getCleanPath(route.path) === path
  }

  /**
   * Get badge value for a route (handles static, dynamic, and expressive badges)
   */
  const getRouteBadge = (route: RouteConfig): string | number | BadgeConfig | undefined => {
    if (!route.badge) return undefined
    if (typeof route.badge === 'function') {
      const result = route.badge()
      return result || undefined
    }
    return route.badge
  }

  /**
   * Get all routes (flattened) with permission filtering
   */
  const allRoutes = computed(() => {
    const routes = flattenRoutes(effectiveRouteConfig.value)
    return filterRoutesByPermissions(routes, userRole.value, hasFacilityMembership.value)
  })

  /**
   * Find a route by path
   */
  const findRoute = (path: string): RouteConfig | undefined => {
    return allRoutes.value.find((r) => r.path === path)
  }

  /**
   * Get tabs for the current route from route config
   * Returns the tabs defined on the current route, or undefined if none
   */
  const currentRouteTabs = computed(() => {
    const currentRoute = findRoute(route.path)
    return currentRoute?.tabs
  })

  // ── Tree-driven workspace sidebar resolver ─────────────────────────────

  /**
   * Convert SidebarTreeNode[] into the resolved section shape that AppSidebar expects.
   * Each top-level node (nodeType === 'section') becomes a section; its children become items.
   * Special items (pinned, pages) are resolved dynamically.
   */
  const resolveWorkspaceSidebarFromTree = (treeNodes: SidebarTreeNode[]): any[] | null => {
    if (treeNodes.length === 0) return null // fallback to legacy

    const pinnedPaths = new Set(pinned.getPinnedItems(currentSectionLinks.value).map((item) => item.path))

    // Deduplicate section nodes by sectionKey (or id as fallback) to prevent duplicate sections
    // This can happen if the TQL graph has multiple sidebar_node entities with the same sectionKey
    const seenSectionKeys = new Set<string>()
    const uniqueSectionNodes = treeNodes
      .filter((n) => n.nodeType === 'section')
      .filter((n) => {
        const key = n.sectionKey || n.id
        if (seenSectionKeys.has(key)) return false
        seenSectionKeys.add(key)
        return true
      })

    const sections = uniqueSectionNodes.map((sectionNode) => {
      let items: RouteConfig[] = []

      // Resolve special items
      if (sectionNode.specialItems === 'pinned') {
        items = pinned.getPinnedItems(currentSectionLinks.value)
      } else if (sectionNode.specialItems === 'pages') {
        items = [...pagesChildren.value]
      } else {
        // Convert child tree nodes to RouteConfig items (including groups with nested children)
        items = sectionNode.children
          .filter((child) => child.nodeType === 'item' || child.nodeType === 'group')
          .map((child) => ({
            path: child.routePath || '',
            label: child.label,
            icon: child.icon,
            _treeNodeId: child.id,
            _locked: child.locked,
            _nodeType: child.nodeType,
            _children: child.nodeType === 'group' ? child.children : undefined,
            _collapsed: child.collapsed,
          }))
      }

      // Filter out pinned items from non-pinned sections
      if (sectionNode.specialItems !== 'pinned') {
        items = items.filter((item) => !pinnedPaths.has(item.path))
      }

      // Apply permission filtering
      items = filterRoutesByPermissions(items, userRole.value, hasFacilityMembership.value)

      // Apply app-scoped entity type filtering
      items = items.filter((item) => !item?.path || isRouteEnabledForApp(item.path))

      let resolvedItems = items.filter((item) => item?.path && item.visible?.() !== false)

      // Apply user-defined item order
      const key = sectionNode.sectionKey || sectionNode.id
      resolvedItems = sidebarOrder.applyItemOrder(key, resolvedItems)

      return {
        label: sectionNode.label,
        key: sectionNode.sectionKey || sectionNode.id,
        icon: sectionNode.icon,
        collapsible: sectionNode.nodeType === 'section',
        defaultCollapsed: sectionNode.collapsed,
        editable: sectionNode.editable,
        order: sectionNode.order,
        items: resolvedItems,
        itemsMode: sectionNode.specialItems || undefined,
        locked: sectionNode.locked,
        _treeNodeId: sectionNode.id,
        _locked: sectionNode.locked,
      }
    })

    // Merge in user-created custom sections from localStorage
    const customSections = sidebarOrder.getCustomSections('/workspace')
    for (const cs of customSections) {
      sections.push({
        label: cs.label,
        key: cs.key,
        icon: cs.icon,
        collapsible: true,
        editable: true,
        order: cs.order,
        items: [],
        itemsMode: undefined,
        isCustom: true,
      } as any)
    }

    // Filter empty sections
    const filtered = sections.filter((s) => {
      if ((s as any).isCustom) return true
      if (s.editable) return true
      return s.items.length > 0
    })

    // Apply user-defined section order
    const ordered = sidebarOrder.applySectionOrder('/workspace', filtered)

    // Pinned section always stays at the top
    const pinnedIdx = ordered.findIndex((s) => s.key === 'personal-pinned')
    if (pinnedIdx > 0) {
      const pinnedSection = ordered[pinnedIdx]!
      ordered.splice(pinnedIdx, 1)
      ordered.unshift(pinnedSection)
    }

    return ordered
  }

  /**
   * Get sidebar sections for the current route
   * Returns sections defined in route config, with resolved items.
   * For /workspace: uses graph-backed tree nodes when available, otherwise legacy.
   */
  const currentSidebarSections = computed(() => {
    const section = currentSidebarSection.value
    if (!section?.sidebarSections) return null

    // Route type flags
    const isDatabase = section.path === '/database'
    const isWorkspace = section.path === '/workspace'

    // ── Tree-driven workspace sidebar ──────────────────────────────────
    if (isWorkspace && sidebarTree.initialized.value) {
      const treeResult = resolveWorkspaceSidebarFromTree(sidebarTree.tree.value)
      if (treeResult) return treeResult
    }

    // ── Legacy fallback (hardcoded sections) ───────────────────────────
    const pinnedPaths = new Set(pinned.getPinnedItems(currentSectionLinks.value).map((item) => item.path))

    // Only suppress pinned items from non-pinned sections when this route
    // actually has a dedicated PINNED section to receive them. Otherwise
    // items would be filtered out with nowhere to land (disappear entirely).
    const hasPinnedSection = section.sidebarSections.some((s) => s.items === 'pinned')

    const resolved = section.sidebarSections.map((sectionDef) => {
      let items: RouteConfig[] = []

      if (isDatabase && sectionDef.key === 'database-entities') {
        // ENTITIES section gets schema.org-derived entity types
        items = [...entityTypesChildren.value]
      } else if (isDatabase && sectionDef.key === 'database-system') {
        // SYSTEM section gets platform constructs
        items = [...platformTypesChildren.value]
      } else if (isDatabase && sectionDef.key === 'database-custom') {
        // CUSTOM section gets collections + custom types + ontology types
        items = [...collectionsChildren.value, ...typesChildren.value, ...ontologyTypeChildren.value]
      } else if (isDatabase && sectionDef.key === 'database-tools') {
        // TOOLS section uses static items from route config (explorer, query, ontology, activity)
        items = Array.isArray(sectionDef.items) ? [...sectionDef.items] : []
      } else if (sectionDef.key === 'personal-pages') {
        // PAGES section gets user-created pages
        items = [...pagesChildren.value]
      } else if (sectionDef.key === 'workflows') {
        // WORKFLOWS section gets user-created workflows
        items = [...workflowsChildren.value]
      }
      // Handle special keywords
      else if (sectionDef.items === 'pinned') {
        items = pinned.getPinnedItems(currentSectionLinks.value)
      } else if (sectionDef.items === 'unpinned') {
        items = pinned.getUnpinnedItems(currentSectionLinks.value)
      }
      // Resolve items (can be static array or function)
      else if (typeof sectionDef.items === 'function') {
        const result = sectionDef.items()
        items = Array.isArray(result) ? result : []
      } else if (Array.isArray(sectionDef.items)) {
        items = sectionDef.items
      }

      // Filter out pinned items from non-pinned sections only when a PINNED
      // section exists in this route to catch them. Skip for database routes
      // since those sections manage their own item resolution.
      if (sectionDef.items !== 'pinned' && !isDatabase && hasPinnedSection) {
        items = items.filter((item) => !pinnedPaths.has(item.path))
      }

      // Apply permission filtering to static items
      if (Array.isArray(items)) {
        items = filterRoutesByPermissions(items, userRole.value, hasFacilityMembership.value)
      }

      // Apply app-scoped entity type filtering
      items = items.filter((item) => !item?.path || isRouteEnabledForApp(item.path))

      let resolvedItems = items.filter((item) => item?.path && item.visible?.() !== false)

      // Apply user-defined item order within this section
      // Only for: workspace sections (all) + database-custom
      const canReorderItems = isWorkspace || (isDatabase && sectionDef.key === 'database-custom')
      if (canReorderItems) {
        resolvedItems = sidebarOrder.applyItemOrder(sectionDef.key, resolvedItems)
      }

      return {
        ...sectionDef,
        items: resolvedItems,
        itemsMode: sectionDef.items,
      }
    })

    // Merge in user-created custom sections (workspace only)
    if (isWorkspace) {
      const customSections = sidebarOrder.getCustomSections('/workspace')
      for (const cs of customSections) {
        resolved.push({
          label: cs.label,
          key: cs.key,
          icon: cs.icon,
          collapsible: true,
          editable: true,
          order: cs.order,
          items: [], // custom sections start empty — items added via drag
          itemsMode: undefined,
          isCustom: true,
        } as any)
      }
    }

    // Filter empty sections, then apply ordering
    const filtered = resolved.filter((resolvedSection) => {
      // Always show custom sections (even if empty) so user can drag items in
      if ((resolvedSection as any).isCustom) return true
      // Always show editable sections (e.g. PAGES) so the + button is accessible
      if (resolvedSection.editable) return true
      // Hide empty built-in sections
      return resolvedSection.items.length > 0
    })

    // Apply user-defined section order (workspace only), else use config order
    const ordered = isWorkspace
      ? sidebarOrder.applySectionOrder('/workspace', filtered)
      : filtered.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))

    // Pinned section always stays at the top regardless of user reordering
    if (isWorkspace) {
      const pinnedIdx = ordered.findIndex((s) => s.key === 'personal-pinned')
      if (pinnedIdx > 0) {
        const pinnedSection = ordered[pinnedIdx]!
        ordered.splice(pinnedIdx, 1)
        ordered.unshift(pinnedSection)
      }
    }

    return ordered
  })

  return {
    // Route data
    commandPaletteRoutes,
    primaryRailRoutes,
    secondaryRailRoutes,
    currentSidebarSection,
    currentSectionLinks,
    currentSectionLabel,
    currentSidebarSections,
    typesSystemLinks: systemTypesChildren,
    typesCustomLinks: typesChildren,
    breadcrumbs,
    currentRouteMeta,
    isRouteActive,
    isRouteExactlyActive,
    getRouteBadge,
    allRoutes,
    findRoute,
    currentRouteTabs,

    // Rail configuration
    setRailSpaces,

    // Sidebar tree (graph-backed)
    sidebarTree,
  }
}
