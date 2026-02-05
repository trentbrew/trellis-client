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
import { SYSTEM_TYPES } from '~/lib/systemTypes'
import { filterRoutesByPermissions } from '~/lib/permissions'

type RailConfig = {
  primary: string[]
  secondary: string[]
}

const MAX_RAIL_ITEMS_TOTAL = 12

const sanitizeRailConfig = (config: RailConfig): RailConfig => {
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
  const { userRole, membership } = useUserRole()

  const currentOrg = useState<any>('currentOrg')
  const currentApp = useState<any>('currentApp')

  const railConfig = ref<RailConfig | null>(null)

  // Check if user has facility membership
  const hasFacilityMembership = computed(() => !!membership.value)

  // Get collections reactively from InstantDB
  const { collections: instantCollections, customTypes, workflows } = useInstantData()

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

  const systemTypesChildren = computed<RouteConfig[]>(() => {
    return SYSTEM_TYPES.map((t) => ({
      path: `/types/system/${t.id}`,
      label: t.name,
      icon: t.icon || 'lucide:network',
      tint: 'text-violet-300',
      order: -100,
      meta: {
        title: t.name,
        subtitle: 'System Types',
        showBackButton: true,
      },
    }))
  })

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

  const railRoutesByPath = computed(() => {
    const map = new Map<string, RouteConfig>()

    // Filter and keep section roots as rail items
    const filteredSections = filterRoutesByPermissions(routeConfig, userRole.value, hasFacilityMembership.value)
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
    return routeConfig.some((section) => section?.path === path)
  }

  const getCollectionSlugFromPath = (path: string): string | null => {
    const match = /^\/collections\/([^/]+)$/.exec(path)
    return match?.[1] || null
  }

  const getCollectionSlugFromRoutePath = (path: string): string | null => {
    const match = /^\/collections\/([^/]+)(?:\/|$)/.exec(path)
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
    return

    try {
      const instantDb = useInstantDb()
      const tx = instantDb.tx as any
      const key = getRailSettingsKey()
      const appId = currentApp.value?.id
      if (!appId) return

      const authUser = await instantDb.getAuth()
      const ownerId = authUser?.id
      if (!ownerId) return

      const safeConfig = sanitizeRailConfig(config)
      const settingId = `app-${appId}-${key}`

      const existing = await instantDb.queryOnce({
        settings: {
          $: {
            where: {
              settingKey: settingId,
            },
          },
        },
      })

      const found = (existing.data as any)?.settings?.[0]
      const now = Date.now()

      if (found?.id) {
        await instantDb.transact([
          tx.settings[found.id].update({
            ownerId,
            entityType: 'app',
            entityId: appId,
            key,
            value: safeConfig,
            updatedAt: now,
          }),
        ])
      } else {
        const id = crypto.randomUUID()
        await instantDb.transact([
          tx.settings[id].create({
            ownerId,
            settingKey: settingId,
            entityType: 'app',
            entityId: appId,
            key,
            value: safeConfig,
            updatedAt: now,
          }),
        ])
      }
    } catch (error) {
      console.error('Failed to save rail config:', error)
    }
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

  const getRailSettingsKey = () => {
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

    routeConfig.forEach((section) => {
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
        const directMatch = routeConfig.some((s) => s?.path === p)
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
    const routes = getCommandPaletteRoutes()
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
  const currentSidebarSection = computed(() => getSidebarSection(route.path))

  /**
   * Dynamic children for collections - now reactive via InstantDB
   */
  watch([currentOrg, currentApp], loadRailConfig, { immediate: true })

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
      case '/collections':
        dynamicChildren = collectionsChildren.value
        break
      case '/types':
        dynamicChildren = [...systemTypesChildren.value, ...typesChildren.value]
        break
      case '/workflows':
        dynamicChildren = workflowsChildren.value
        break
    }

    // Merge static children (from config) with dynamic children
    const adopted = flattenRoutes(routeConfig).filter((r) => r?.path && r.meta?.sidebarSectionPath === section.path)

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
  const breadcrumbs = computed(() => {
    const base = getBreadcrumbs(route.path)
    const slug = getCollectionSlugFromRoutePath(route.path)
    if (!slug) return base

    const collection = (instantCollections.value || []).find((c: any) => c?.slug === slug)
    const label = collection?.title || slug

    return [...base, { label }]
  })

  /**
   * Get metadata for current route
   */
  const currentRouteMeta = computed(() => getRouteMeta(route.path))

  /**
   * Check if a route is active
   */
  const isRouteActive = (path: string) => {
    const currentClean = getCleanPath(route.path)
    if (currentClean === path || currentClean.startsWith(path + '/')) return true

    // Check if the current route has a sidebarSectionPath that matches
    const meta = getRouteMeta(route.path)
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
    const routes = flattenRoutes(routeConfig)
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

  /**
   * Get sidebar sections for the current route
   * Returns sections defined in route config, with resolved items
   */
  const currentSidebarSections = computed(() => {
    const section = currentSidebarSection.value
    if (!section?.sidebarSections) return null

    const pinnedPaths = new Set(pinned.getPinnedItems(currentSectionLinks.value).map((item) => item.path))

    return section.sidebarSections
      .map((sectionDef) => {
        let items: RouteConfig[] = []

        // Handle special keywords
        if (sectionDef.items === 'pinned') {
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

        // Filter out pinned items from non-pinned sections
        if (sectionDef.items !== 'pinned') {
          items = items.filter((item) => !pinnedPaths.has(item.path))
        }

        // Apply permission filtering to static items
        if (Array.isArray(items)) {
          items = filterRoutesByPermissions(items, userRole.value, hasFacilityMembership.value)
        }

        const resolvedItems = items.filter((item) => item?.path && item.visible?.() !== false)

        return {
          ...sectionDef,
          items: resolvedItems,
          itemsMode: sectionDef.items,
        }
      })
      .filter((resolvedSection) => {
        // Hide empty sections completely (no header, no spacing)
        return resolvedSection.items.length > 0
      })
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
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
  }
}
