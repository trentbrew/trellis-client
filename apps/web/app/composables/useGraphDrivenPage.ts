import type { PageStat } from '~/components/layout/Page.vue'
import type { ViewModeOption } from '~/lib/projections'
import { buildPageConfigFromRoute, buildPageConfigFromSlug, type DerivedPageConfig } from '~/lib/appConfig'
import { buildViewModeOptions } from '~/lib/projections'
import { useBrowse } from '~/composables/useBrowse'
import { useFacilityEntities } from '~/composables/useFacilityEntities'
import { useGlobalDetailSheet } from '~/composables/useGlobalDetailSheet'

/**
 * Route path to entity type slug mapping
 */
const ROUTE_ENTITY_MAP: Record<string, string> = {
  '/facility/tasks': 'task',
  '/facility/scheduled-tasks': 'task-generator',
  '/facility/suggested-tasks': 'external-task',
  '/facility/templates': 'task-template',
  '/facility/folders': 'folder',
  '/facility/calendar': 'task', // Calendar is a view mode of tasks
}

/**
 * Extract entity type from route path
 */
function getEntityTypeFromRoute(routePath: string): string | null {
  // Direct mapping
  if (ROUTE_ENTITY_MAP[routePath]) {
    return ROUTE_ENTITY_MAP[routePath]
  }

  // Try to extract from path segment (e.g., /facility/browse/tasks → task)
  const match = routePath.match(/\/browse\/([^/]+)/)
  if (match) {
    const slug = match[1]
    // Convert plural to singular: tasks → task
    return slug.endsWith('s') ? slug.slice(0, -1) : slug
  }

  return null
}

export interface UseGraphDrivenPageOptions {
  routePath: string
  facilityId?: string | null
  defaultViewMode?: string
}

export interface UseGraphDrivenPageReturn {
  // Page configuration from JSON-LD
  pageConfig: ComputedRef<DerivedPageConfig | null>
  isConfigured: ComputedRef<boolean>

  // Entity data
  items: Ref<any[]>
  filteredItems: ComputedRef<any[]>
  loading: Ref<boolean>
  error: Ref<string | null>

  // Browse state (search, filters, sorting, view mode)
  browseState: ReturnType<typeof useBrowse>
  viewMode: ComputedRef<string>
  viewModeOptions: ComputedRef<ViewModeOption[]>

  // Stats for page header
  stats: ComputedRef<PageStat[]>

  // Actions
  openDetail: (item: any, options?: { mode?: 'view' | 'edit' | 'create' }) => void
  createItem: () => void
  refresh: () => Promise<void>
}

/**
 * Composable for graph-driven pages
 *
 * Combines:
 * - Page configuration from JSON-LD (title, icon, schema, projections)
 * - Entity data from useFacilityEntities
 * - Browse state (search, filters, view modes)
 * - Actions (detail sheet, create, etc.)
 */
export function useGraphDrivenPage(options: UseGraphDrivenPageOptions): UseGraphDrivenPageReturn {
  const { routePath, facilityId, defaultViewMode = 'table' } = options

  // Derive page config from route or slug
  const pageConfig = computed<DerivedPageConfig | null>(() => {
    // Try route-based config first
    const routeConfig = buildPageConfigFromRoute(routePath)
    if (routeConfig) return routeConfig

    // Fall back to slug-based config
    const entityType = getEntityTypeFromRoute(routePath)
    if (entityType) {
      return buildPageConfigFromSlug(entityType)
    }

    return null
  })

  const isConfigured = computed(() => pageConfig.value !== null)

  // Get entity type for data fetching
  const entityType = computed(() => {
    const direct = getEntityTypeFromRoute(routePath)
    if (direct) return direct

    // Try to extract from pageConfig.entityTypeId (e.g., "type:Task" → "task")
    const typeId = pageConfig.value?.entityTypeId
    if (typeId) {
      const match = typeId.match(/type:(\w+)/)
      if (match) return match[1].toLowerCase()
    }

    return null
  })

  // Stable refs for entity data
  const items = ref<any[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const entityStats = ref<{ total: number; overdue?: number; dueSoon?: number; completed?: number }>({ total: 0 })

  // Load entity data when entity type is available
  const loadEntityData = async () => {
    const type = entityType.value
    if (!type) {
      items.value = []
      loading.value = false
      entityStats.value = { total: 0 }
      return
    }

    loading.value = true
    error.value = null

    try {
      const entityResult = useFacilityEntities({
        facilityId,
        entityType: type,
      })

      // Wait for initial load
      await new Promise((resolve) => setTimeout(resolve, 100))

      items.value = entityResult.items.value
      entityStats.value = entityResult.stats.value
      loading.value = entityResult.loading.value
      error.value = entityResult.error.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load data'
      items.value = []
    } finally {
      loading.value = false
    }
  }

  // Load on mount and when entity type changes
  if (import.meta.client) {
    loadEntityData()
  }

  watch(entityType, () => {
    loadEntityData()
  })

  // Initialize browse state with stable items ref
  const { browseState, filteredItems, viewMode } = useBrowse({
    items,
    searchFields: ['title', 'name', 'description'] as any,
    defaultViewMode,
    sortOptions: [
      { value: 'title', label: 'Title' },
      { value: 'dueDate', label: 'Due Date' },
      { value: 'createdAt', label: 'Created' },
    ],
    filters: [
      {
        id: 'status',
        label: 'Status',
        icon: 'lucide:filter',
        options: [
          { value: 'all', label: 'All Statuses' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'due-soon', label: 'Due Soon' },
          { value: 'on-track', label: 'On Track' },
          { value: 'completed', label: 'Completed' },
        ],
        fn: (item: any, val: string) => item.status === val,
      },
      {
        id: 'priority',
        label: 'Priority',
        icon: 'lucide:signal',
        options: [
          { value: 'all', label: 'All Priorities' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ],
        fn: (item: any, val: string) => item.priority === val,
      },
    ],
  })

  // Build view mode options from schema
  const viewModeOptions = computed<ViewModeOption[]>(() => {
    const schema = pageConfig.value?.schema
    if (!schema) {
      return [
        { value: 'table', label: 'Table', icon: 'lucide:table', enabled: true },
        { value: 'list', label: 'List', icon: 'lucide:list', enabled: true },
      ]
    }

    const allowedModes = pageConfig.value?.projectionTypes || ['table', 'list', 'grid', 'kanban', 'calendar']
    return buildViewModeOptions(schema, allowedModes, { includeDisabled: false })
  })

  // Build stats for page header
  const stats = computed<PageStat[]>(() => {
    const s = entityStats.value
    const baseStats: PageStat[] = [{ label: 'Total', value: s.total, icon: 'lucide:database' }]

    // Add type-specific stats
    if (s.overdue !== undefined) {
      baseStats.push({
        label: 'Overdue',
        value: s.overdue,
        icon: 'lucide:alert-circle',
        color: 'text-rose-500',
      })
    }

    if (s.dueSoon !== undefined) {
      baseStats.push({
        label: 'Due Soon',
        value: s.dueSoon,
        icon: 'lucide:clock',
        color: 'text-amber-500',
      })
    }

    if (s.completed !== undefined) {
      baseStats.push({
        label: 'Completed',
        value: s.completed,
        icon: 'lucide:check-circle',
        color: 'text-emerald-500',
      })
    }

    return baseStats
  })

  // Detail sheet integration
  const { open: openDetailSheet } = useGlobalDetailSheet()

  const openDetail = (item: any, opts?: { mode?: 'view' | 'edit' | 'create' }) => {
    openDetailSheet(item, {
      entityType: entityType.value || 'item',
      mode: opts?.mode || 'view',
    })
  }

  const createItem = () => {
    openDetailSheet(
      {},
      {
        entityType: entityType.value || 'item',
        mode: 'create',
      },
    )
  }

  const refresh = async () => {
    await loadEntityData()
  }

  return {
    pageConfig,
    isConfigured,
    items: items as unknown as Ref<any[]>,
    filteredItems,
    loading: loading as unknown as Ref<boolean>,
    error: error as unknown as Ref<string | null>,
    browseState,
    viewMode,
    viewModeOptions,
    stats,
    openDetail,
    createItem,
    refresh,
  }
}
