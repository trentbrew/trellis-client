/**
 * Centralized Route Configuration
 *
 * This file serves as the single source of truth for all application routes.
 * It drives:
 * - Rail navigation (left icon rail)
 * - Sidebar navigation (collapsible sections)
 * - Command palette search (cmd+k)
 * - Breadcrumb generation
 * - Page metadata (title, description, SEO)
 * - Empty states and placeholders
 *
 * Architecture Benefits:
 * - Single source of truth for navigation
 * - Type-safe route definitions
 * - Automatic generation of navigation components
 * - Consistent metadata across the app
 * - Easier to maintain and update routes
 * - Can generate breadcrumbs automatically
 *
 * Considerations:
 * - Need to keep route definitions in sync with actual page files
 * - Large route trees might need hierarchical organization
 * - Dynamic routes (/:id) need special handling
 * - Permissions/visibility logic can be centralized here
 */

import { filterRoutesByPermissions } from '~/lib/permissions'
import { buildRouteConfigTree } from '~/lib/appConfig'

export interface BadgeConfig {
  label: string | number
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'accent' | 'success' | 'warning'
  color?: string // custom CSS color or tailwind class
}

export interface RouteConfig {
  /** The route path (e.g., '/forms/feed') */
  path: string
  /** Display label for the route */
  label: string
  /** Icon name (e.g., 'lucide:home') */
  icon: string
  /** Optional color tint for icon */
  tint?: string
  /** Optional badge text or configuration */
  badge?: string | number | BadgeConfig | (() => string | number | BadgeConfig | undefined)
  /** Page metadata */
  meta?: {
    /** Page title */
    title?: string
    /** Page description */
    description?: string
    /** SEO title (if different from display title) */
    seoTitle?: string
    /** SEO description */
    seoDescription?: string
    /** Subtitle for Page component */
    subtitle?: string
    /** Show back button */
    showBackButton?: boolean
    /** Full width page */
    fullWidth?: boolean
    /** Hide sidebar for this page */
    hideSidebar?: boolean
    /** Hide header for this page */
    hideHeader?: boolean
    /** Enable secondary sidebar slot */
    secondarySidebar?: boolean
    sidebarSectionPath?: string
  }
  /** Whether this route should appear in rail navigation */
  inRail?: boolean
  /** Whether sidebar should be collapsed by default for this route */
  collapseSidebar?: boolean
  /** Rail position: 'primary' | 'secondary' */
  railPosition?: 'primary' | 'secondary'
  /** Whether this route should appear in command palette */
  inCommandPalette?: boolean
  /** Command palette search keywords (for better search) */
  searchKeywords?: string[]
  /** Child routes (for nested navigation) */
  children?: RouteConfig[]
  /** Whether this route requires authentication */
  requiresAuth?: boolean
  /** Permission configuration for role-based access */
  permissions?: RoutePermissions
  /** Custom visibility function */
  visible?: () => boolean
  /** Order in navigation (lower = appears first) */
  order?: number
  /** Whether this route allows creating new items in sidebar */
  editable?: boolean
  /** Function to load dynamic children (e.g., from database) */
  loadChildren?: () => Promise<RouteConfig[]>
  /** Tabs to display on this page (sub-sections within the page, not sibling routes) */
  tabs?: Array<{
    /** Tab label */
    label: string
    /** Route path or hash anchor for the tab */
    to: string
    /** Icon name */
    icon?: string
  }>
  /** Define multiple sidebar sections for this route */
  sidebarSections?: Array<{
    /** Section label (e.g., "PINNED", "FACILITY", "RECENT") */
    label: string
    /** Section key for collapse state */
    key: string
    /** Icon name for section header */
    icon?: string
    /** Items to show in this section (can be static array, function, or special keyword like 'pinned') */
    items?: RouteConfig[] | (() => RouteConfig[] | Promise<RouteConfig[]>) | 'pinned' | 'unpinned'
    /** Whether section is collapsible */
    collapsible?: boolean
    /** Default collapsed state */
    defaultCollapsed?: boolean
    /** Show "Add New" button */
    editable?: boolean
    /** Order in sidebar (lower = appears first) */
    order?: number
  }>
  /** Semantic graph metadata (JSON-LD) */
  jsonLd?: {
    /** Schema.org type (e.g., 'BroadcastService', 'CollectionPage') */
    '@type': string
    /** Additional structured data properties mapping to Schema.org */
    [key: string]: any
  }
}

// Doc category definitions with their child pages
const docCategories = {
  'getting-started': {
    label: 'Getting Started',
    icon: 'lucide:rocket',
    order: 10,
    children: [] as RouteConfig[],
  },
  architecture: {
    label: 'Architecture',
    icon: 'lucide:boxes',
    order: 20,
    children: [
      { path: '/docs/architecture/app_config', label: 'Unified App Config (JSON-LD)' },
      { path: '/docs/architecture/architecture', label: 'Route Configuration' },
      { path: '/docs/architecture/graph_driven_pages_implementation', label: 'Graph-Driven Pages' },
      { path: '/docs/architecture/json_ld_architecture', label: 'JSON-LD Architecture' },
      { path: '/docs/architecture/route_config_analysis', label: 'Route Config Analysis' },
    ] as RouteConfig[],
  },
  data: {
    label: 'Data',
    icon: 'lucide:database',
    order: 30,
    children: [] as RouteConfig[],
  },
  components: {
    label: 'Components',
    icon: 'lucide:component',
    order: 40,
    children: [] as RouteConfig[],
  },
  implementation: {
    label: 'Implementation',
    icon: 'lucide:code',
    order: 50,
    children: [] as RouteConfig[],
  },
  planning: {
    label: 'Planning',
    icon: 'lucide:map',
    order: 60,
    children: [] as RouteConfig[],
  },
  research: {
    label: 'Research',
    icon: 'lucide:graduation-cap',
    order: 70,
    children: [] as RouteConfig[],
  },
  notes: {
    label: 'Notes',
    icon: 'lucide:sticky-note',
    order: 80,
    children: [] as RouteConfig[],
  },
}

// Build flat list of doc routes for command palette
const docsChildRoutes: RouteConfig[] = Object.entries(docCategories).map(([key, cat]) => ({
  path: `/docs/${key}`,
  label: cat.label,
  icon: cat.icon,
  requiresAuth: false,
  inCommandPalette: true,
  order: cat.order,
  children: cat.children,
  meta: {
    title: cat.label,
    description: `${cat.label} documentation`,
  },
}))

// Build sidebar sections - each category is its own collapsible section
const docsSidebarSections = Object.entries(docCategories).map(([key, cat]) => ({
  label: cat.label,
  key: `docs-${key}`,
  icon: cat.icon,
  collapsible: true,
  order: cat.order,
  items: [
    {
      path: `/docs/${key}`,
      label: 'Overview',
      icon: 'lucide:file-text',
    },
    ...cat.children.map((child) => ({
      ...child,
      icon: 'lucide:file-text',
    })),
  ],
}))

/**
 * User roles for permission checking
 * Hierarchy: guest < developer < facility_manager < admin < corporate_admin < super_admin
 */
export type UserRole = 'guest' | 'developer' | 'facility_manager' | 'admin' | 'corporate_admin' | 'super_admin'

/**
 * Permission levels for routes
 */
export type PermissionLevel = 'read' | 'write' | 'admin'

/**
 * Role permission mapping
 * Defines what each role can access
 */
export interface RolePermissions {
  read: boolean
  write: boolean
  admin: boolean
}

/**
 * Permission configuration for a route
 */
export interface RoutePermissions {
  /** Minimum role required to access this route */
  minRole?: UserRole
  /** Specific permission level required */
  permission?: PermissionLevel
  /** Custom permission check function */
  // eslint-disable-next-line no-unused-vars
  check?: (userRole: UserRole, userPermissions: RolePermissions) => boolean
  /** Whether this route requires facility membership */
  requiresFacilityMembership?: boolean
}

/**
 * Hierarchical route configuration
 * Organized by top-level sections
 */
// Static routes that are always available (not from JSON-LD config)
const staticRoutes: RouteConfig[] = [
  {
    path: '/docs',
    label: 'Documentation',
    icon: 'lucide:book-open',
    inRail: false,
    railPosition: 'secondary',
    inCommandPalette: true,
    requiresAuth: false,
    order: 50,
    children: docsChildRoutes,
    sidebarSections: docsSidebarSections,
    meta: {
      title: 'Documentation',
      description: 'Toolkit UI documentation and guides',
    },
  },
]

export const routeConfig: RouteConfig[] = [...buildRouteConfigTree(), ...staticRoutes]

// Route config now sourced from app-config.jsonld via buildRouteConfigTree() plus static routes.

export const ROUTE_PATHS = {
  personal: {
    root: '/personal',
    today: '/personal/today',
    inbox: '/personal/inbox',
    tasks: '/personal/tasks',
    calendar: '/personal/calendar',
    notes: '/personal/notes',
  },
  app: {
    root: '/app',
    tasks: '/app/tasks',
    calendar: '/app/calendar',
    schedule: '/app/scheduled-tasks',
    suggested: '/app/suggested-tasks',
    folders: '/app/folders',
    permitIndexing: '/app/permit-indexing',
    permitApplication: '/app/permit-applications',
    reviews: '/app/file-review',
    templates: '/app/templates',
    setupOverview: '/app/setup',
    reports: {
      root: '/app/reports',
      inspection: '/app/reports/inspection',
      kpi: '/app/reports/kpi',
      regulatory: '/app/reports/regulatory',
      summary: '/app/reports/summary',
      top11: '/app/reports/top11',
      selfAssessments: '/app/reports/self-assessments',
    },
  },
  /** @deprecated Use ROUTE_PATHS.app instead */
  facility: {
    root: '/app',
    tasks: '/app/tasks',
    calendar: '/app/calendar',
    schedule: '/app/scheduled-tasks',
    suggested: '/app/suggested-tasks',
    folders: '/app/folders',
    permitIndexing: '/app/permit-indexing',
    permitApplication: '/app/permit-applications',
    reviews: '/app/file-review',
    templates: '/app/templates',
    setupOverview: '/app/setup',
    reports: {
      root: '/app/reports',
      inspection: '/app/reports/inspection',
      kpi: '/app/reports/kpi',
      regulatory: '/app/reports/regulatory',
      summary: '/app/reports/summary',
      top11: '/app/reports/top11',
      selfAssessments: '/app/reports/self-assessments',
    },
  },
  graph: {
    root: '/graph',
    dashboard: '/graph/dashboard',
    explorer: '/graph/explorer',
    query: '/graph/query',
    ontology: '/graph/ontology',
    activity: '/graph/activity',
  },
  neu: '/neu',
  admin: {
    root: '/admin',
    overview: '/admin/overview',
    settings: '/admin/settings',
    users: '/admin/users',
    roles: '/admin/roles',
    auditLogs: '/admin/audit-logs',
    integrations: '/admin/integrations',
  },
  setup: {
    root: '/setup',
    selfAssessments: '/setup/self-assessments',
    selfAssessmentOverview: '/setup/self-assessment-overview',
    fesEscalations: '/setup/fes-escalations',
    cea: '/setup/cea',
    emails: '/setup/emails',
    queue: '/setup/queue',
    epaImport: '/setup/epa-import',
    dataImportStatus: '/setup/data-import-status',
    newFesTask: '/setup/new-fes-task',
  },
  settings: {
    root: '/settings',
    project: '/settings/project',
    profile: '/settings/profile',
    appearance: '/settings/appearance',
    theme: '/settings/theme',
    notifications: '/settings/notifications',
  },
  help: '/help',
} as const

/**
 * Flatten route tree for easier access
 * Only includes routes that are actual pages (not parent containers)
 */
export function flattenRoutes(routes: RouteConfig[]): RouteConfig[] {
  const flattened: RouteConfig[] = []

  function traverse(route: RouteConfig) {
    // Recursively process children first
    if (route.children && route.children.length > 0) {
      route.children.forEach(traverse)
    }

    // Only add routes that have a path
    if (route.path) {
      const hasChildren = route.children && route.children.length > 0
      if (!hasChildren) {
        flattened.push(route)
      } else {
        if (route.inRail || route.inCommandPalette !== false) {
          flattened.push(route)
        }
      }
    }
  }

  routes.forEach(traverse)
  return flattened.filter((route) => route && route.path)
}

/**
 * Get all routes for command palette
 */
export function getCommandPaletteRoutes(): RouteConfig[] {
  return flattenRoutes(routeConfig)
    .filter((route) => route?.path && route.inCommandPalette !== false)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
}

export function getFilteredCommandPaletteRoutes(
  userRole: UserRole,
  hasFacilityMembership: boolean = true,
): RouteConfig[] {
  const routes = flattenRoutes(routeConfig)
    .filter((route) => route?.path && route.inCommandPalette !== false)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))

  return filterRoutesByPermissions(routes, userRole, hasFacilityMembership)
}

/**
 * Get routes for rail navigation
 */
export function getRailRoutes(position: 'primary' | 'secondary'): RouteConfig[] {
  return flattenRoutes(routeConfig)
    .filter((route) => route?.path && route.inRail && route.railPosition === position)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
}

export function getFilteredRailRoutes(
  position: 'primary' | 'secondary',
  userRole: UserRole,
  hasFacilityMembership: boolean = true,
): RouteConfig[] {
  const routes = flattenRoutes(routeConfig)
    .filter((route) => route?.path && route.inRail && route.railPosition === position)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))

  return filterRoutesByPermissions(routes, userRole, hasFacilityMembership)
}

/**
 * Get sidebar section for a given path
 * Handles paths: /[org]/[year]/[facility]/path
 */
export function getSidebarSection(path: string): RouteConfig | null {
  const { cleanPath } = parseFullPath(path)

  const exact = flattenRoutes(routeConfig).find((r) => r?.path === cleanPath)
  const override = exact?.meta?.sidebarSectionPath
  if (override) {
    const section = routeConfig.find((s) => s?.path === override)
    if (section) return section
  }

  // Find the section that matches the path prefix
  const sections = routeConfig.filter((section) => cleanPath.startsWith(section.path))

  if (sections.length === 0) return null

  // Return the most specific match (longest path)
  return sections.reduce((prev, current) => (current.path.length > prev.path.length ? current : prev))
}

/**
 * Recursively find a route by path in the route config tree.
 * Supports dynamic segments (e.g. /:id) by using regex.
 */
function findRouteByPath(routes: RouteConfig[], targetPath: string): RouteConfig | null {
  for (const route of routes) {
    // Exact match
    if (route.path === targetPath) {
      return route
    }

    // Dynamic segment match
    if (route.path.includes(':')) {
      const pattern = route.path.replace(/:[^/]+/g, '[^/]+').replace(/\//g, '\\/')
      const regex = new RegExp(`^${pattern}$`)
      if (regex.test(targetPath)) {
        return route
      }
    }

    if (route.children) {
      const found = findRouteByPath(route.children, targetPath)
      if (found) return found
    }
  }
  return null
}

/**
 * Helper to strip workspace/app prefix from a path
 * Paths can be in format /[workspace]/[app]/path
 */

interface ParsedPath {
  workspace: string | null
  app: string | null
  cleanPath: string
  /** @deprecated Use workspace instead */
  org: string | null
  /** @deprecated Removed - no longer used */
  year: null
  /** @deprecated Use app instead */
  facility: string | null
}

export function buildNavPath(
  cleanPath: string,
  workspace: string | null,
  app: string | null,
): string {
  if (workspace && app && cleanPath.startsWith('/app')) {
    const subPath = cleanPath.replace(/^\/app/, '')
    return `/${workspace}/${app}${subPath}`
  }
  return cleanPath
}

export function parseFullPath(path: string): ParsedPath {
  const segments = path.split('/').filter(Boolean)

  // Check for [workspace]/[app]/... pattern (2+ segments where first is not a known top-level route)
  const knownTopLevelRoutes = ['docs', 'settings', 'admin', 'auth', 'collections', 'workflows', 'help', 'personal', 'welcome', 'onboarding', 'notifications', 'permits', 'types', 'apptool', 'playground', 'components', 'embed', 'archive', 'members', 'learn', 'graph']

  if (segments.length >= 2 && segments[0] && !knownTopLevelRoutes.includes(segments[0])) {
    // It's a workspace/app route: /[workspace]/[app]/path...
    // Map it back to /app/path...
    const workspace = segments[0]
    const app = segments[1] ?? null
    const cleanPath = segments.length > 2 ? '/app/' + segments.slice(2).join('/') : '/app'
    return {
      workspace,
      app,
      cleanPath,
      // Deprecated aliases for backward compatibility
      org: workspace,
      year: null,
      facility: app,
    }
  }

  return { workspace: null, app: null, cleanPath: path, org: null, year: null, facility: null }
}

/**
 * Get the logical (clean) path from a full URL path.
 * Strip workspace/app segments if present.
 */
export function getCleanPath(path: string): string {
  return parseFullPath(path).cleanPath
}

/** @deprecated Year is no longer used in route structure */
export function stripYearFromPath(path: string): { year: null; cleanPath: string } {
  const parsed = parseFullPath(path)
  return { year: null, cleanPath: parsed.cleanPath }
}

/**
 * Get breadcrumbs for a given path
 * Builds breadcrumbs dynamically from path segments after workspace/app
 * Handles paths: /[workspace]/[app]/path
 */
export function getBreadcrumbs(path: string): Array<{ label: string; path?: string }> {
  const breadcrumbs: Array<{ label: string; path?: string }> = []
  const { workspace, app, cleanPath } = parseFullPath(path)

  // Split the clean path into segments
  const segments = cleanPath.split('/').filter(Boolean)

  if (segments.length === 0) return breadcrumbs

  // Build breadcrumbs for each path segment
  for (let i = 0; i < segments.length; i++) {
    // Build the logical route path for lookup
    const segmentPath = '/' + segments.slice(0, i + 1).join('/')

    // Skip the generic '/app' root breadcrumb if we're in an app context
    // as it's redundant with the app switcher
    if (segmentPath === '/app' && workspace && app) continue

    // Find the route config for this path segment
    const route = findRouteByPath(routeConfig, segmentPath)

    if (route) {
      const isLastSegment = i === segments.length - 1
      const navPath = buildNavPath(segmentPath, workspace, app)

      breadcrumbs.push({
        label: route.label,
        path: isLastSegment ? undefined : navPath,
      })
    }
  }

  return breadcrumbs
}

/**
 * Get route metadata for a given path
 * Handles paths: /[workspace]/[app]/path
 */
export function getRouteMeta(path: string): RouteConfig['meta'] | null {
  const { cleanPath } = parseFullPath(path)
  const allRoutes = flattenRoutes(routeConfig)
  const route = allRoutes.find((r) => r.path === cleanPath)
  return route?.meta || null
}
