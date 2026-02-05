/**
 * Dashboard Builder Composable
 *
 * Provides widget-based dashboard composition functionality.
 * Supports data aggregation, charts, metrics, and custom layouts.
 */

// Widget categories
export type WidgetCategory = 'metrics' | 'charts' | 'lists' | 'activity' | 'custom'

// Widget size presets
export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

// Base widget interface
export interface DashboardWidget {
  id: string
  type: string
  category: WidgetCategory
  title: string
  size: WidgetSize
  position: { row: number; col: number }
  config: Record<string, any>
}

// Widget type definition for the picker
export interface WidgetTypeDefinition {
  type: string
  label: string
  description: string
  icon: string
  category: WidgetCategory
  defaultSize: WidgetSize
  defaultConfig: Record<string, any>
  configSchema?: {
    fields: Array<{
      key: string
      label: string
      type: 'text' | 'number' | 'boolean' | 'select' | 'collection' | 'field' | 'color'
      options?: Array<{ value: string; label: string }>
      default?: any
    }>
  }
}

// Dashboard definition
export interface DashboardDefinition {
  id: string
  title: string
  slug: string
  icon?: string
  description?: string
  widgets: DashboardWidget[]
  settings: {
    columns: 4 | 6 | 12
    gap: 'sm' | 'md' | 'lg'
    refreshInterval?: number
  }
  createdAt: number
  updatedAt: number
}

// Aggregation types for data widgets
export type AggregationType = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'latest'

export function useDashboardBuilder() {
  const { currentOrganization } = useOrganizations()

  // Built-in widget type definitions
  const builtInWidgetTypes: WidgetTypeDefinition[] = [
    // Metrics widgets
    {
      type: 'stat-number',
      label: 'Number Stat',
      description: 'Display a single numeric metric',
      icon: 'lucide:hash',
      category: 'metrics',
      defaultSize: 'sm',
      defaultConfig: { title: 'Metric', collectionId: '', field: '', aggregation: 'count', prefix: '', suffix: '' },
      configSchema: {
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'collectionId', label: 'Collection', type: 'collection' },
          { key: 'field', label: 'Field', type: 'field' },
          {
            key: 'aggregation',
            label: 'Aggregation',
            type: 'select',
            options: [
              { value: 'count', label: 'Count' },
              { value: 'sum', label: 'Sum' },
              { value: 'avg', label: 'Average' },
              { value: 'min', label: 'Minimum' },
              { value: 'max', label: 'Maximum' },
            ],
          },
          { key: 'prefix', label: 'Prefix', type: 'text' },
          { key: 'suffix', label: 'Suffix', type: 'text' },
        ],
      },
    },
    {
      type: 'stat-trend',
      label: 'Trend Stat',
      description: 'Metric with change indicator',
      icon: 'lucide:trending-up',
      category: 'metrics',
      defaultSize: 'sm',
      defaultConfig: { title: 'Trend', collectionId: '', field: '', aggregation: 'count', comparePeriod: '7d' },
      configSchema: {
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'collectionId', label: 'Collection', type: 'collection' },
          {
            key: 'comparePeriod',
            label: 'Compare Period',
            type: 'select',
            options: [
              { value: '1d', label: 'Yesterday' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
            ],
          },
        ],
      },
    },
    {
      type: 'stat-progress',
      label: 'Progress',
      description: 'Progress bar toward a goal',
      icon: 'lucide:target',
      category: 'metrics',
      defaultSize: 'sm',
      defaultConfig: { title: 'Progress', current: 0, target: 100, collectionId: '' },
      configSchema: {
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'target', label: 'Target', type: 'number', default: 100 },
          { key: 'collectionId', label: 'Collection (for current)', type: 'collection' },
        ],
      },
    },

    // Chart widgets
    {
      type: 'chart-bar',
      label: 'Bar Chart',
      description: 'Vertical bar chart',
      icon: 'lucide:bar-chart-2',
      category: 'charts',
      defaultSize: 'md',
      defaultConfig: { title: 'Bar Chart', collectionId: '', groupBy: '', valueField: '' },
      configSchema: {
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'collectionId', label: 'Collection', type: 'collection' },
          { key: 'groupBy', label: 'Group By', type: 'field' },
          { key: 'valueField', label: 'Value Field', type: 'field' },
        ],
      },
    },
    {
      type: 'chart-line',
      label: 'Line Chart',
      description: 'Time series line chart',
      icon: 'lucide:line-chart',
      category: 'charts',
      defaultSize: 'md',
      defaultConfig: { title: 'Line Chart', collectionId: '', dateField: '', valueField: '' },
      configSchema: {
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'collectionId', label: 'Collection', type: 'collection' },
          { key: 'dateField', label: 'Date Field', type: 'field' },
          { key: 'valueField', label: 'Value Field', type: 'field' },
        ],
      },
    },
    {
      type: 'chart-pie',
      label: 'Pie Chart',
      description: 'Pie or donut chart',
      icon: 'lucide:pie-chart',
      category: 'charts',
      defaultSize: 'md',
      defaultConfig: { title: 'Pie Chart', collectionId: '', groupBy: '', donut: false },
      configSchema: {
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'collectionId', label: 'Collection', type: 'collection' },
          { key: 'groupBy', label: 'Group By', type: 'field' },
          { key: 'donut', label: 'Donut Style', type: 'boolean' },
        ],
      },
    },
    {
      type: 'chart-area',
      label: 'Area Chart',
      description: 'Stacked area chart',
      icon: 'lucide:area-chart',
      category: 'charts',
      defaultSize: 'lg',
      defaultConfig: { title: 'Area Chart', collectionId: '', dateField: '', valueField: '' },
    },

    // List widgets
    {
      type: 'list-table',
      label: 'Data Table',
      description: 'Compact table view',
      icon: 'lucide:table',
      category: 'lists',
      defaultSize: 'lg',
      defaultConfig: { title: 'Table', collectionId: '', fields: [], limit: 10 },
      configSchema: {
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'collectionId', label: 'Collection', type: 'collection' },
          { key: 'limit', label: 'Max Rows', type: 'number', default: 10 },
        ],
      },
    },
    {
      type: 'list-cards',
      label: 'Card List',
      description: 'List as cards',
      icon: 'lucide:layout-grid',
      category: 'lists',
      defaultSize: 'md',
      defaultConfig: { title: 'Cards', collectionId: '', titleField: '', subtitleField: '', limit: 6 },
    },
    {
      type: 'list-ranked',
      label: 'Ranked List',
      description: 'Numbered ranking list',
      icon: 'lucide:list-ordered',
      category: 'lists',
      defaultSize: 'sm',
      defaultConfig: { title: 'Top Items', collectionId: '', labelField: '', valueField: '', limit: 5 },
    },

    // Activity widgets
    {
      type: 'activity-feed',
      label: 'Activity Feed',
      description: 'Recent activity timeline',
      icon: 'lucide:activity',
      category: 'activity',
      defaultSize: 'md',
      defaultConfig: { title: 'Recent Activity', limit: 10, types: [] },
      configSchema: {
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'limit', label: 'Max Items', type: 'number', default: 10 },
        ],
      },
    },
    {
      type: 'activity-calendar',
      label: 'Activity Calendar',
      description: 'GitHub-style heatmap',
      icon: 'lucide:calendar-days',
      category: 'activity',
      defaultSize: 'lg',
      defaultConfig: { title: 'Activity', collectionId: '', dateField: '' },
    },
    {
      type: 'activity-tasks',
      label: 'Task Summary',
      description: 'Task completion overview',
      icon: 'lucide:check-square',
      category: 'activity',
      defaultSize: 'sm',
      defaultConfig: { title: 'Tasks', collectionId: '', statusField: '' },
    },

    // Custom widgets
    {
      type: 'custom-text',
      label: 'Text Block',
      description: 'Custom text or markdown',
      icon: 'lucide:text',
      category: 'custom',
      defaultSize: 'sm',
      defaultConfig: { content: 'Enter text here...' },
      configSchema: {
        fields: [{ key: 'content', label: 'Content', type: 'text' }],
      },
    },
    {
      type: 'custom-embed',
      label: 'Embed',
      description: 'Embed external content',
      icon: 'lucide:frame',
      category: 'custom',
      defaultSize: 'md',
      defaultConfig: { url: '', height: 300 },
      configSchema: {
        fields: [
          { key: 'url', label: 'URL', type: 'text' },
          { key: 'height', label: 'Height', type: 'number', default: 300 },
        ],
      },
    },
    {
      type: 'custom-links',
      label: 'Quick Links',
      description: 'Navigation shortcuts',
      icon: 'lucide:link',
      category: 'custom',
      defaultSize: 'sm',
      defaultConfig: { title: 'Quick Links', links: [] },
    },
  ]

  // Group widget types by category
  const widgetTypesByCategory = computed(() => {
    const grouped: Record<string, WidgetTypeDefinition[]> = {
      metrics: [],
      charts: [],
      lists: [],
      activity: [],
      custom: [],
    }

    for (const widgetType of builtInWidgetTypes) {
      const category = grouped[widgetType.category]
      if (category) {
        category.push(widgetType)
      }
    }

    return grouped
  })

  // All available widget types
  const allWidgetTypes = computed(() => builtInWidgetTypes)

  // Create a new widget from a type definition
  const createWidgetFromType = (typeDef: WidgetTypeDefinition): DashboardWidget => {
    return {
      id: crypto.randomUUID(),
      type: typeDef.type,
      category: typeDef.category,
      title: typeDef.defaultConfig.title || typeDef.label,
      size: typeDef.defaultSize,
      position: { row: 0, col: 0 },
      config: { ...typeDef.defaultConfig },
    }
  }

  // Create default dashboard definition
  const createDefaultDashboard = (title: string = 'New Dashboard'): DashboardDefinition => {
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return {
      id: crypto.randomUUID(),
      title,
      slug,
      icon: 'lucide:layout-dashboard',
      widgets: [],
      settings: {
        columns: 12,
        gap: 'md',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  // Size to grid span mapping
  const sizeToSpan: Record<WidgetSize, number> = {
    sm: 3,
    md: 4,
    lg: 6,
    xl: 8,
    full: 12,
  }

  // Get grid span for a widget size
  const getWidgetSpan = (size: WidgetSize): number => sizeToSpan[size] || 4

  // Validate dashboard structure
  const validateDashboard = (dashboard: DashboardDefinition): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!dashboard.title?.trim()) {
      errors.push('Dashboard title is required')
    }

    if (!dashboard.slug?.trim()) {
      errors.push('Dashboard slug is required')
    }

    // Check for duplicate widget IDs
    const widgetIds = new Set<string>()
    for (const widget of dashboard.widgets) {
      if (widgetIds.has(widget.id)) {
        errors.push(`Duplicate widget ID: ${widget.id}`)
      }
      widgetIds.add(widget.id)
    }

    return { valid: errors.length === 0, errors }
  }

  // Serialize dashboard to JSON-LD for storage
  const serializeDashboardToJsonLd = (dashboard: DashboardDefinition): object => {
    return {
      '@context': {
        '@vocab': 'https://schema.org/',
        dashboard: 'https://cal.app/ontology/dashboard#',
      },
      '@type': 'dashboard:Dashboard',
      '@id': `dashboard:${dashboard.id}`,
      'dashboard:title': dashboard.title,
      'dashboard:slug': dashboard.slug,
      'dashboard:icon': dashboard.icon,
      'dashboard:description': dashboard.description,
      'dashboard:widgets': dashboard.widgets.map((widget) => ({
        '@type': 'dashboard:Widget',
        'dashboard:widgetType': widget.type,
        'dashboard:category': widget.category,
        'dashboard:title': widget.title,
        'dashboard:size': widget.size,
        'dashboard:position': widget.position,
        'dashboard:config': widget.config,
      })),
      'dashboard:settings': dashboard.settings,
      'dashboard:createdAt': dashboard.createdAt,
      'dashboard:updatedAt': dashboard.updatedAt,
    }
  }

  return {
    // Widget types
    builtInWidgetTypes,
    widgetTypesByCategory,
    allWidgetTypes,

    // Widget operations
    createWidgetFromType,
    getWidgetSpan,

    // Dashboard operations
    createDefaultDashboard,
    validateDashboard,
    serializeDashboardToJsonLd,

    // Context
    currentOrganization,
  }
}
