import type { RouteConfig, UserRole } from '~/config/routes'

/**
 * Route template categories for the builder
 */
export type RouteCategory = 'page' | 'collection' | 'dashboard' | 'settings' | 'custom'

/**
 * Route template definition
 */
export interface RouteTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: RouteCategory
  /** Default route configuration for this template */
  defaults: Partial<RouteDefinition>
}

/**
 * Route definition for building new routes
 */
export interface RouteDefinition {
  /** Unique identifier (auto-generated from path) */
  id: string
  /** The route path (e.g., '/my-page') */
  path: string
  /** Display label */
  label: string
  /** Icon name */
  icon: string
  /** Icon color tint */
  tint?: string
  /** Show in rail navigation */
  inRail: boolean
  /** Rail position */
  railPosition: 'primary' | 'secondary'
  /** Show in command palette */
  inCommandPalette: boolean
  /** Display order (lower = first) */
  order: number
  /** Requires authentication */
  requiresAuth: boolean
  /** Minimum role required (or 'any' for any authenticated user) */
  minRole?: UserRole | 'any'
  /** Page metadata */
  meta: {
    title: string
    description: string
    subtitle?: string
  }
  /** Search keywords for command palette */
  searchKeywords: string[]
  /** Parent route path (for nested routes) */
  parentPath?: string
  /** Layout type */
  layoutType: 'default' | 'full-width' | 'sidebar' | 'dashboard'
}

/**
 * Category metadata for UI display
 */
export interface RouteCategoryMeta {
  id: RouteCategory
  label: string
  icon: string
  description: string
  color: string
}

/**
 * Composable for building and managing routes
 */
export const useRouteBuilder = () => {
  // Route templates by category
  const routeTemplates: RouteTemplate[] = [
    // Page templates
    {
      id: 'blank-page',
      name: 'Blank Page',
      description: 'Start with an empty page',
      icon: 'lucide:file',
      category: 'page',
      defaults: {
        icon: 'lucide:file-text',
        layoutType: 'default',
        inRail: false,
        inCommandPalette: true,
        requiresAuth: true,
      },
    },
    {
      id: 'content-page',
      name: 'Content Page',
      description: 'Rich text content with sections',
      icon: 'lucide:file-text',
      category: 'page',
      defaults: {
        icon: 'lucide:file-text',
        layoutType: 'default',
        inRail: false,
        inCommandPalette: true,
        requiresAuth: true,
      },
    },
    {
      id: 'landing-page',
      name: 'Landing Page',
      description: 'Full-width page for marketing content',
      icon: 'lucide:layout',
      category: 'page',
      defaults: {
        icon: 'lucide:layout',
        layoutType: 'full-width',
        inRail: false,
        inCommandPalette: true,
        requiresAuth: false,
      },
    },

    // Collection templates
    {
      id: 'data-table',
      name: 'Data Table',
      description: 'Table view for structured data',
      icon: 'lucide:table',
      category: 'collection',
      defaults: {
        icon: 'lucide:table',
        tint: 'text-blue-400',
        layoutType: 'default',
        inRail: false,
        inCommandPalette: true,
        requiresAuth: true,
      },
    },
    {
      id: 'card-grid',
      name: 'Card Grid',
      description: 'Grid of cards for visual content',
      icon: 'lucide:layout-grid',
      category: 'collection',
      defaults: {
        icon: 'lucide:layout-grid',
        tint: 'text-blue-400',
        layoutType: 'default',
        inRail: false,
        inCommandPalette: true,
        requiresAuth: true,
      },
    },
    {
      id: 'kanban-board',
      name: 'Kanban Board',
      description: 'Drag-and-drop board for workflow',
      icon: 'lucide:columns',
      category: 'collection',
      defaults: {
        icon: 'lucide:columns',
        tint: 'text-purple-400',
        layoutType: 'full-width',
        inRail: false,
        inCommandPalette: true,
        requiresAuth: true,
      },
    },

    // Dashboard templates
    {
      id: 'analytics-dashboard',
      name: 'Analytics Dashboard',
      description: 'Charts and metrics overview',
      icon: 'lucide:bar-chart-3',
      category: 'dashboard',
      defaults: {
        icon: 'lucide:bar-chart-3',
        tint: 'text-emerald-400',
        layoutType: 'dashboard',
        inRail: true,
        railPosition: 'primary',
        inCommandPalette: true,
        requiresAuth: true,
      },
    },
    {
      id: 'status-dashboard',
      name: 'Status Dashboard',
      description: 'Real-time status and KPIs',
      icon: 'lucide:activity',
      category: 'dashboard',
      defaults: {
        icon: 'lucide:activity',
        tint: 'text-emerald-400',
        layoutType: 'dashboard',
        inRail: true,
        railPosition: 'primary',
        inCommandPalette: true,
        requiresAuth: true,
      },
    },

    // Settings templates
    {
      id: 'settings-page',
      name: 'Settings Page',
      description: 'Configuration and preferences',
      icon: 'lucide:settings',
      category: 'settings',
      defaults: {
        icon: 'lucide:settings',
        layoutType: 'sidebar',
        inRail: false,
        railPosition: 'secondary',
        inCommandPalette: true,
        requiresAuth: true,
        minRole: 'admin',
      },
    },
    {
      id: 'admin-page',
      name: 'Admin Page',
      description: 'Administrative controls',
      icon: 'lucide:shield',
      category: 'settings',
      defaults: {
        icon: 'lucide:shield',
        tint: 'text-red-400',
        layoutType: 'default',
        inRail: false,
        railPosition: 'secondary',
        inCommandPalette: true,
        requiresAuth: true,
        minRole: 'super_admin',
      },
    },

    // Custom templates
    {
      id: 'custom-route',
      name: 'Custom Route',
      description: 'Fully customizable route',
      icon: 'lucide:code',
      category: 'custom',
      defaults: {
        icon: 'lucide:file',
        layoutType: 'default',
        inRail: false,
        inCommandPalette: true,
        requiresAuth: true,
      },
    },
  ]

  // Category metadata
  const categoryMeta: Record<RouteCategory, RouteCategoryMeta> = {
    page: {
      id: 'page',
      label: 'Pages',
      icon: 'lucide:file-text',
      description: 'Static and content pages',
      color: 'text-blue-500',
    },
    collection: {
      id: 'collection',
      label: 'Collections',
      icon: 'lucide:database',
      description: 'Data-driven views',
      color: 'text-purple-500',
    },
    dashboard: {
      id: 'dashboard',
      label: 'Dashboards',
      icon: 'lucide:layout-dashboard',
      description: 'Analytics and metrics',
      color: 'text-emerald-500',
    },
    settings: {
      id: 'settings',
      label: 'Settings',
      icon: 'lucide:settings',
      description: 'Configuration pages',
      color: 'text-orange-500',
    },
    custom: {
      id: 'custom',
      label: 'Custom',
      icon: 'lucide:code',
      description: 'Custom implementations',
      color: 'text-gray-500',
    },
  }

  // All categories
  const categories = computed(() => Object.keys(categoryMeta) as RouteCategory[])

  // Templates grouped by category
  const templatesByCategory = computed(() => {
    const grouped: Record<RouteCategory, RouteTemplate[]> = {
      page: [],
      collection: [],
      dashboard: [],
      settings: [],
      custom: [],
    }

    routeTemplates.forEach((template) => {
      grouped[template.category].push(template)
    })

    return grouped
  })

  // Icon suggestions for routes
  const suggestedIcons = [
    'lucide:home',
    'lucide:file-text',
    'lucide:folder',
    'lucide:database',
    'lucide:table',
    'lucide:layout-grid',
    'lucide:columns',
    'lucide:bar-chart-3',
    'lucide:activity',
    'lucide:settings',
    'lucide:users',
    'lucide:calendar',
    'lucide:inbox',
    'lucide:search',
    'lucide:star',
    'lucide:heart',
    'lucide:bookmark',
    'lucide:flag',
    'lucide:tag',
    'lucide:clock',
    'lucide:check-square',
    'lucide:list',
    'lucide:grid',
    'lucide:map',
    'lucide:globe',
    'lucide:link',
    'lucide:image',
    'lucide:video',
    'lucide:music',
    'lucide:file',
  ]

  // Color tint options
  const tintOptions = [
    { value: 'none', label: 'None' },
    { value: 'text-blue-400', label: 'Blue' },
    { value: 'text-purple-400', label: 'Purple' },
    { value: 'text-emerald-400', label: 'Emerald' },
    { value: 'text-amber-400', label: 'Amber' },
    { value: 'text-red-400', label: 'Red' },
    { value: 'text-pink-400', label: 'Pink' },
    { value: 'text-cyan-400', label: 'Cyan' },
    { value: 'text-orange-400', label: 'Orange' },
  ]

  // Role options for permissions
  const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'guest', label: 'Guest' },
    { value: 'developer', label: 'Developer' },
    { value: 'facility_manager', label: 'Facility Manager' },
    { value: 'admin', label: 'Admin' },
    { value: 'corporate_admin', label: 'Corporate Admin' },
    { value: 'super_admin', label: 'Super Admin' },
  ]

  // Layout type options
  const layoutOptions = [
    { value: 'default', label: 'Default', description: 'Standard page with sidebar' },
    { value: 'full-width', label: 'Full Width', description: 'Edge-to-edge content' },
    { value: 'sidebar', label: 'Sidebar', description: 'Two-column layout' },
    { value: 'dashboard', label: 'Dashboard', description: 'Widget grid layout' },
  ]

  /**
   * Create a new route definition from a template
   */
  const createRouteFromTemplate = (templateId: string): RouteDefinition => {
    const template = routeTemplates.find((t) => t.id === templateId)
    const defaults = template?.defaults || {}

    return {
      id: '',
      path: '',
      label: template?.name || 'New Route',
      icon: defaults.icon || 'lucide:file',
      tint: defaults.tint,
      inRail: defaults.inRail ?? false,
      railPosition: defaults.railPosition || 'primary',
      inCommandPalette: defaults.inCommandPalette ?? true,
      order: 0,
      requiresAuth: defaults.requiresAuth ?? true,
      minRole: defaults.minRole,
      meta: {
        title: template?.name || 'New Page',
        description: template?.description || '',
        subtitle: '',
      },
      searchKeywords: [],
      layoutType: defaults.layoutType || 'default',
    }
  }

  /**
   * Create a blank route definition
   */
  const createBlankRoute = (): RouteDefinition => {
    return {
      id: '',
      path: '',
      label: 'New Route',
      icon: 'lucide:file',
      inRail: false,
      railPosition: 'primary',
      inCommandPalette: true,
      order: 0,
      requiresAuth: true,
      meta: {
        title: 'New Page',
        description: '',
      },
      searchKeywords: [],
      layoutType: 'default',
    }
  }

  /**
   * Generate route ID from path
   */
  const generateRouteId = (path: string): string => {
    return `route:${path.replace(/^\//, '').replace(/\//g, '-').replace(/[^a-z0-9-]/gi, '')}`
  }

  /**
   * Generate path from label
   */
  const generatePathFromLabel = (label: string, parentPath?: string): string => {
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    return parentPath ? `${parentPath}/${slug}` : `/${slug}`
  }

  /**
   * Validate a route definition
   */
  const validateRoute = (route: RouteDefinition): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!route.path) {
      errors.push('Path is required')
    } else if (!route.path.startsWith('/')) {
      errors.push('Path must start with /')
    } else if (!/^\/[a-z0-9\-/]*$/i.test(route.path)) {
      errors.push('Path contains invalid characters')
    }

    if (!route.label || route.label.trim().length === 0) {
      errors.push('Label is required')
    }

    if (!route.icon) {
      errors.push('Icon is required')
    }

    if (!route.meta.title) {
      errors.push('Page title is required')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Convert RouteDefinition to JSON-LD format for app-config.jsonld
   */
  const toJsonLd = (route: RouteDefinition): Record<string, any> => {
    const id = generateRouteId(route.path)

    return {
      '@id': id,
      '@type': 'app:Route',
      routePath: route.path,
      label: route.label,
      icon: route.icon,
      ...(route.tint && route.tint !== 'none' && { tint: route.tint }),
      inRail: route.inRail,
      railPosition: route.railPosition,
      inCommandPalette: route.inCommandPalette,
      order: route.order,
      requiresAuth: route.requiresAuth,
      ...(route.minRole && route.minRole !== 'any' && {
        permissions: {
          minRole: route.minRole,
          permission: 'read',
        },
      }),
      meta: {
        title: route.meta.title,
        description: route.meta.description,
        ...(route.meta.subtitle && { subtitle: route.meta.subtitle }),
        ...(route.layoutType === 'full-width' && { fullWidth: true }),
        ...(route.layoutType === 'sidebar' && { secondarySidebar: true }),
      },
      ...(route.searchKeywords.length > 0 && { searchKeywords: route.searchKeywords }),
    }
  }

  /**
   * Convert RouteDefinition to RouteConfig format
   */
  const toRouteConfig = (route: RouteDefinition): RouteConfig => {
    return {
      path: route.path,
      label: route.label,
      icon: route.icon,
      tint: route.tint === 'none' ? undefined : route.tint,
      inRail: route.inRail,
      railPosition: route.railPosition,
      inCommandPalette: route.inCommandPalette,
      order: route.order,
      requiresAuth: route.requiresAuth,
      permissions: route.minRole && route.minRole !== 'any'
        ? {
            minRole: route.minRole as UserRole,
            permission: 'read',
          }
        : undefined,
      meta: {
        title: route.meta.title,
        description: route.meta.description,
        subtitle: route.meta.subtitle,
        fullWidth: route.layoutType === 'full-width',
        secondarySidebar: route.layoutType === 'sidebar',
      },
      searchKeywords: route.searchKeywords,
    }
  }

  return {
    // Templates
    routeTemplates,
    templatesByCategory,

    // Categories
    categories,
    categoryMeta,

    // Options
    suggestedIcons,
    tintOptions,
    roleOptions,
    layoutOptions,

    // Factory functions
    createRouteFromTemplate,
    createBlankRoute,

    // Utilities
    generateRouteId,
    generatePathFromLabel,
    validateRoute,

    // Serialization
    toJsonLd,
    toRouteConfig,
  }
}
