import type { Projection, ProjectionType, Collection, DatabaseSchema, DatabaseField } from '~/types/database'
import type { BrowseViewMode } from '~/composables/useBrowse'
import { PROJECTION_REGISTRY_NODES } from '~/lib/trellis-projection-registry'

/**
 * Projection node shape (replaces AppConfigProjectionNode from appConfig.ts).
 * Self-contained — no longer depends on app-config.jsonld.
 */
export interface ProjectionNodeConfig {
  projectionType: string
  label?: string
  icon?: string
  order?: number
  status?: string
  requirements?: {
    schema?: {
      fieldTypes?: Array<DatabaseField['type']>
    }
  }
}

/**
 * Static projection node definitions with schema requirements.
 * These were previously read from app-config.jsonld via getProjectionNodes().
 */
const PROJECTION_NODES: ProjectionNodeConfig[] = PROJECTION_REGISTRY_NODES.map((node) => ({
  projectionType: node.projectionType,
  label: node.label,
  icon: node.icon,
  order: node.order,
  requirements: node.requirements,
}))

const getProjectionNodes = (): ProjectionNodeConfig[] => PROJECTION_NODES

const projectionIcons: Record<ProjectionType, string> = {
  'trellis-blocks': 'lucide:layout-list',
  table: 'lucide:table',
  kanban: 'lucide:kanban',
  calendar: 'lucide:calendar',
  graph: 'lucide:network',
  list: 'lucide:list',
  spreadsheet: 'lucide:file-spreadsheet',
  blocks: 'lucide:blocks',
  code: 'lucide:code-2',
  'card-grid': 'lucide:layout-grid',
  sankey: 'lucide:git-branch',
  timeline: 'lucide:calendar',
  dashboard: 'lucide:layout-dashboard',
  chart: 'lucide:bar-chart-3',
  'slide-deck': 'lucide:presentation',
  moodboard: 'lucide:layout-dashboard',
}

const projectionLabels: Record<ProjectionType, string> = {
  'trellis-blocks': 'Trellis',
  table: 'Data Table',
  kanban: 'Kanban',
  calendar: 'Calendar',
  graph: 'Graph',
  list: 'List',
  spreadsheet: 'Spreadsheet',
  blocks: 'Blocks',
  code: 'JSON-LD',
  'card-grid': 'Card Grid',
  sankey: 'Sankey',
  timeline: 'Timeline',
  dashboard: 'Dashboard',
  chart: 'Chart',
  'slide-deck': 'Slide Deck',
  moodboard: 'Moodboard',
}

const requiredPrimaryProjectionTypes: Array<
  Extract<ProjectionType, 'table' | 'kanban' | 'calendar' | 'graph' | 'list'>
> = ['table', 'kanban', 'calendar', 'graph', 'list']

const getProjectionIcon = (type: ProjectionType): string => {
  const node = PROJECTION_NODES.find((n) => n.projectionType === type)
  return node?.icon ?? projectionIcons[type]
}

export function createDefaultProjections(
  collectionId: string,
  collectionType: Collection['type'],
  schema?: DatabaseSchema | null,
): Projection[] {
  const projections: Projection[] = []
  const defaultType = suggestDefaultProjection(schema)

  // All collections get the 5 primary "lens" projections.
  requiredPrimaryProjectionTypes.forEach((type, index) => {
    projections.push({
      id: crypto.randomUUID(),
      type,
      name: projectionLabels[type],
      icon: getProjectionIcon(type),
      config: {},
      isDefault: type === defaultType,
      order: index,
    })
  })

  // Keep existing editor-style projections for now as "advanced" views.
  if (collectionType === 'database') {
    projections.push({
      id: crypto.randomUUID(),
      type: 'trellis-blocks',
      name: projectionLabels['trellis-blocks'],
      icon: getProjectionIcon('trellis-blocks'),
      config: {},
      order: 100,
    })
  }

  projections.push({
    id: crypto.randomUUID(),
    type: 'blocks',
    name: projectionLabels.blocks,
    icon: getProjectionIcon('blocks'),
    config: {},
    order: 101,
  })
  projections.push({
    id: crypto.randomUUID(),
    type: 'code',
    name: projectionLabels.code,
    icon: getProjectionIcon('code'),
    config: {},
    order: 102,
  })

  return projections
}

export function normalizeProjection(raw: any, index: number): Projection {
  const obj = raw && typeof raw === 'object' ? raw : {}

  const fallbackType: ProjectionType = 'blocks'
  const type = Object.keys(projectionIcons).includes(obj.type) ? (obj.type as ProjectionType) : fallbackType
  const icon = typeof obj.icon === 'string' ? obj.icon : getProjectionIcon(type)
  const name = typeof obj.name === 'string' ? obj.name : projectionLabels[type]
  const config = obj.config && typeof obj.config === 'object' && !Array.isArray(obj.config) ? obj.config : {}
  const query = obj.query && typeof obj.query === 'object' && !Array.isArray(obj.query) ? obj.query : undefined
  const isDefault = typeof obj.isDefault === 'boolean' ? obj.isDefault : index === 0
  const order = typeof obj.order === 'number' ? obj.order : index

  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id : crypto.randomUUID(),
    type,
    name,
    icon,
    config,
    query,
    isDefault,
    order,
  }
}

export function normalizeProjections(raw: any, collectionId: string, collectionType: Collection['type']): Projection[] {
  let projectionsRaw: any[] = []

  if (Array.isArray(raw)) {
    projectionsRaw = raw
  } else if (raw && typeof raw === 'object' && Array.isArray((raw as any).projections)) {
    projectionsRaw = (raw as any).projections
  }

  // Drop legacy plain-text projection entirely.
  projectionsRaw = projectionsRaw.filter((p) => (p as any)?.type !== 'plain-text')

  const normalized = projectionsRaw.map((p: any, i: number) => normalizeProjection(p, i))

  // If no projections exist, create defaults
  if (normalized.length === 0) {
    return createDefaultProjections(collectionId, collectionType)
  }

  // Ensure primary projections always exist.
  const haveType = new Set(normalized.map((p) => p.type))
  requiredPrimaryProjectionTypes.forEach((type, index) => {
    if (haveType.has(type)) return
    normalized.push(
      normalizeProjection(
        {
          type,
          name: projectionLabels[type],
          icon: getProjectionIcon(type),
          config: {},
          isDefault: false,
          order: index,
        },
        normalized.length,
      ),
    )
  })

  // Ensure default projection is valid and stable.
  const hasDefault = normalized.some((p) => p.isDefault)
  const defaultIsPrimary = normalized.some((p) => p.isDefault && requiredPrimaryProjectionTypes.includes(p.type as any))

  if (!hasDefault || !defaultIsPrimary) {
    normalized.forEach((p) => {
      p.isDefault = p.type === 'table'
    })
  }

  if (collectionType === 'database') {
    const hasTrellis = normalized.some((p) => p.type === 'trellis-blocks')
    if (!hasTrellis) {
      normalized.push(
        normalizeProjection(
          {
            type: 'trellis-blocks',
            name: projectionLabels['trellis-blocks'],
            icon: getProjectionIcon('trellis-blocks'),
            config: {},
            isDefault: false,
            order: 100,
          },
          normalized.length,
        ),
      )
    }
  }

  // Sort by order
  return normalized.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

// ─────────────────────────────────────────────────────────────────────────────
// Projection Requirements Resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * View mode option for the Page component's view switcher.
 * Structurally compatible with Page.vue's internal ViewModeOption interface.
 */
export interface ViewModeOption {
  mode: BrowseViewMode
  label: string
  icon: string
  disabled?: boolean
  visible?: boolean
  tooltip?: string
  /** Schema analysis indicates this is a good fit for the data */
  suggested?: boolean
  /** Confidence score 0–1 for how well this projection fits the schema */
  score?: number
  /** Human-readable reason why this projection is suggested */
  reason?: string
  /** Whether this is the default projection for this dataset/type */
  isDefault?: boolean
  /** Context menu actions available when right-clicking within this view */
  contextMenu?: import('~/types/contextMenu').ContextMenuConfig
}

/**
 * Result of evaluating a projection's requirements against a schema.
 */
export interface ProjectionRequirementResult {
  projectionType: string
  supported: boolean
  missingFieldTypes?: Array<DatabaseField['type']>
}

/**
 * Map from projection types to BrowseViewMode.
 * Some projection types map directly, others need translation.
 */
const _projectionTypeToBrowseMode: Partial<Record<ProjectionType, BrowseViewMode>> = {
  table: 'table',
  spreadsheet: 'spreadsheet',
  kanban: 'kanban',
  calendar: 'calendar',
  list: 'list',
  'card-grid': 'grid',
  timeline: 'timeline',
}

/**
 * Map from BrowseViewMode to projection types for reverse lookup.
 */
const browseModeToProjectionType: Partial<Record<BrowseViewMode, ProjectionType>> = {
  table: 'table',
  spreadsheet: 'spreadsheet',
  kanban: 'kanban',
  calendar: 'calendar',
  list: 'list',
  grid: 'card-grid',
  timeline: 'timeline',
}

/**
 * Default labels for browse view modes (fallback when not from app config).
 */
const defaultBrowseModeLabels: Record<BrowseViewMode, string> = {
  grid: 'Grid',
  list: 'List',
  table: 'Table',
  spreadsheet: 'Spreadsheet',
  calendar: 'Calendar',
  kanban: 'Kanban',
  timeline: 'Timeline',
  gantt: 'Gantt',
  month: 'Month',
  week: 'Week',
  agenda: 'Agenda',
  moodboard: 'Moodboard',
}

/**
 * Default icons for browse view modes (fallback when not from app config).
 */
const defaultBrowseModeIcons: Record<BrowseViewMode, string> = {
  grid: 'lucide:grid-3x3',
  list: 'lucide:list',
  table: 'lucide:table',
  spreadsheet: 'lucide:file-spreadsheet',
  calendar: 'lucide:calendar',
  kanban: 'lucide:square-kanban',
  timeline: 'lucide:calendar',
  gantt: 'lucide:gantt-chart',
  month: 'lucide:calendar',
  week: 'lucide:calendar-days',
  agenda: 'lucide:list-todo',
  moodboard: 'lucide:layout-dashboard',
}

/**
 * Extract field types present in a schema.
 */
export function getSchemaFieldTypes(schema?: DatabaseSchema | null): Set<DatabaseField['type']> {
  if (!schema?.fields) return new Set()
  return new Set(schema.fields.map((f) => f.type))
}

/**
 * Evaluate if a projection's requirements are satisfied by a schema.
 * Requirements use "any-of" semantics: at least one field matching any required type.
 *
 * @param projection - The projection node from app config
 * @param schema - The database schema to check against (optional)
 * @returns Result indicating if supported and any missing field types
 */
export function evaluateProjectionRequirements(
  projection: ProjectionNodeConfig,
  schema?: DatabaseSchema | null,
): ProjectionRequirementResult {
  const projectionType = projection.projectionType ?? ''
  const requirements = projection.requirements

  // No requirements means always supported
  if (!requirements?.schema?.fieldTypes?.length) {
    return { projectionType, supported: true }
  }

  // No schema means requirements can't be evaluated - treat as unsupported
  if (!schema?.fields?.length) {
    return {
      projectionType,
      supported: false,
      missingFieldTypes: requirements.schema.fieldTypes,
    }
  }

  const schemaFieldTypes = getSchemaFieldTypes(schema)
  const requiredTypes = requirements.schema.fieldTypes

  // "any-of" semantics: at least one field must match any required type
  const hasMatch = requiredTypes.some((reqType) => schemaFieldTypes.has(reqType))

  if (hasMatch) {
    return { projectionType, supported: true }
  }

  return {
    projectionType,
    supported: false,
    missingFieldTypes: requiredTypes.filter((t) => !schemaFieldTypes.has(t)),
  }
}

/**
 * Get all projection nodes from app config with their requirement evaluation results.
 *
 * @param schema - The database schema to evaluate against
 * @returns Array of projection nodes with their support status
 */
export function evaluateAllProjectionRequirements(
  schema?: DatabaseSchema | null,
): Array<ProjectionNodeConfig & { requirementResult: ProjectionRequirementResult }> {
  const projectionNodes = getProjectionNodes()
  return projectionNodes.map((node) => ({
    ...node,
    requirementResult: evaluateProjectionRequirements(node, schema),
  }))
}

/**
 * Build view mode options for the Page component's view switcher based on schema.
 *
 * @param schema - The database schema to evaluate requirements against
 * @param allowedModes - Optional array of allowed browse modes (filters output)
 * @param options - Additional options for building view modes
 * @returns Array of ViewModeOption objects for the view switcher
 */
export function buildViewModeOptions(
  schema?: DatabaseSchema | null,
  allowedModes?: BrowseViewMode[],
  options?: {
    includeDisabled?: boolean
    hideUnsupported?: boolean
  },
): ViewModeOption[] {
  const { includeDisabled = false, hideUnsupported = true } = options ?? {}

  // Default browse modes if none specified
  const defaultModes: BrowseViewMode[] = ['grid', 'list', 'table', 'calendar', 'kanban']
  const modes = allowedModes ?? defaultModes

  const projectionNodes = getProjectionNodes()
  const projectionByType = new Map<string, ProjectionNodeConfig>()
  projectionNodes.forEach((node) => {
    if (node.projectionType) {
      projectionByType.set(node.projectionType, node)
    }
  })

  const viewOptions: ViewModeOption[] = []

  for (const mode of modes) {
    // Map browse mode to projection type for requirement lookup
    const projType = browseModeToProjectionType[mode]
    const projectionNode = projType ? projectionByType.get(projType) : undefined

    // Evaluate requirements if projection exists
    let supported = true
    let missingTypes: Array<DatabaseField['type']> | undefined

    if (projectionNode) {
      const result = evaluateProjectionRequirements(projectionNode, schema)
      supported = result.supported
      missingTypes = result.missingFieldTypes
    }

    // Skip unsupported if hideUnsupported is true
    if (!supported && hideUnsupported && !includeDisabled) {
      continue
    }

    // Get label and icon from projection node or defaults
    const label = projectionNode?.label ?? defaultBrowseModeLabels[mode]
    const icon = projectionNode?.icon ?? defaultBrowseModeIcons[mode]

    const option: ViewModeOption = {
      mode,
      label,
      icon,
      visible: supported || includeDisabled,
      disabled: !supported,
    }

    // Add tooltip explaining why disabled
    if (!supported && missingTypes?.length) {
      option.tooltip = `Requires a ${missingTypes.join(' or ')} field`
    }

    // Annotate with suggestion metadata when schema is available
    if (schema?.fields?.length) {
      const scoringRule = scoringRules.find((r) => r.browseMode === mode)
      if (scoringRule) {
        const fieldTypes = getSchemaFieldTypes(schema)
        const fieldCount = schema.fields.length
        const score = scoringRule.score(fieldTypes, fieldCount)
        option.score = score
        option.suggested = score >= 0.3
        option.reason = scoringRule.reason(fieldTypes)
      }
    }

    viewOptions.push(option)
  }

  return viewOptions
}

/**
 * Build projection type options for "New View" dropdown in collections.
 * Filters projection types based on schema requirements.
 *
 * @param schema - The database schema to evaluate requirements against
 * @param allowedTypes - Optional array of allowed projection types
 * @param options - Additional options
 * @returns Array of projection type options with availability info
 */
export function buildProjectionTypeOptions(
  schema?: DatabaseSchema | null,
  allowedTypes?: ProjectionType[],
  options?: {
    includeDisabled?: boolean
    hideUnsupported?: boolean
  },
): Array<{
  type: ProjectionType
  name: string
  icon: string
  supported: boolean
  disabled?: boolean
  tooltip?: string
}> {
  const { includeDisabled = true, hideUnsupported = false } = options ?? {}

  // Default projection types for new views
  const defaultTypes: ProjectionType[] = ['table', 'kanban', 'calendar', 'list', 'graph']
  const types = allowedTypes ?? defaultTypes

  const projectionNodes = getProjectionNodes()
  const projectionByType = new Map<string, ProjectionNodeConfig>()
  projectionNodes.forEach((node) => {
    if (node.projectionType) {
      projectionByType.set(node.projectionType, node)
    }
  })

  const result: Array<{
    type: ProjectionType
    name: string
    icon: string
    supported: boolean
    disabled?: boolean
    tooltip?: string
  }> = []

  for (const type of types) {
    const projectionNode = projectionByType.get(type)

    // Evaluate requirements
    let supported = true
    let missingTypes: Array<DatabaseField['type']> | undefined

    if (projectionNode) {
      const evalResult = evaluateProjectionRequirements(projectionNode, schema)
      supported = evalResult.supported
      missingTypes = evalResult.missingFieldTypes
    }

    // Skip unsupported if hideUnsupported is true
    if (!supported && hideUnsupported && !includeDisabled) {
      continue
    }

    const name = projectionNode?.label ?? projectionLabels[type]
    const icon = projectionNode?.icon ?? getProjectionIcon(type)

    const option: {
      type: ProjectionType
      name: string
      icon: string
      supported: boolean
      disabled?: boolean
      tooltip?: string
    } = {
      type,
      name,
      icon,
      supported,
      disabled: !supported,
    }

    if (!supported && missingTypes?.length) {
      option.tooltip = `Requires a ${missingTypes.join(' or ')} field`
    }

    result.push(option)
  }

  return result
}

/**
 * Check if a specific projection type is supported by the given schema.
 *
 * @param projectionType - The projection type to check
 * @param schema - The database schema
 * @returns True if supported, false otherwise
 */
export function isProjectionTypeSupported(
  projectionType: ProjectionType | string,
  schema?: DatabaseSchema | null,
): boolean {
  const projectionNodes = getProjectionNodes()
  const node = projectionNodes.find((n) => n.projectionType === projectionType)

  if (!node) return true // Unknown projection types are allowed

  const result = evaluateProjectionRequirements(node, schema)
  return result.supported
}

/**
 * Filter an array of projections to only those supported by the schema.
 *
 * @param projections - Array of projections to filter
 * @param schema - The database schema
 * @returns Filtered array of supported projections
 */
export function filterSupportedProjections(projections: Projection[], schema?: DatabaseSchema | null): Projection[] {
  return projections.filter((p) => isProjectionTypeSupported(p.type, schema))
}

// Export primary projection types for reuse
export const PRIMARY_PROJECTION_TYPES = requiredPrimaryProjectionTypes

/**
 * Build view mode options from a type ID defined in app-config.jsonld.
 * This enables dynamic view mode inference based on the type's field definitions.
 *
 * @param typeId - The type ID (e.g., "type:Task")
 * @param modes - Optional array of browse view modes to include
 * @param options - Configuration options
 * @returns Array of ViewModeOption for the Page component
 *
 * @example
 * ```ts
 * // In a page component:
 * const viewModeOptions = buildViewModeOptionsFromType('type:Task')
 * // Returns options with calendar enabled (Task has date fields)
 * // and kanban enabled (Task has select fields)
 * ```
 */
/**
 * @deprecated Use useAppConfig().buildSchemaFromType() instead.
 * Kept for backward compatibility with existing consumers.
 */
export function buildViewModeOptionsFromType(
  _typeId: string,
  modes: BrowseViewMode[] = ['grid', 'list', 'table', 'calendar', 'kanban'],
  _options: { includeDisabled?: boolean; hideUnsupported?: boolean } = {},
): ViewModeOption[] {
  // Without the static appConfig.ts dependency, this function can't resolve
  // type schemas. Consumers should use useAppConfig().buildSchemaFromType()
  // and then call buildViewModeOptions() directly.
  return buildViewModeOptions(null, modes, _options)
}

// ─────────────────────────────────────────────────────────────────────────────
// Projection Suggestions — schema-aware scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Projection scoring rule: maps a projection type to a scoring function
 * that returns a score (0–1) and a human-readable reason.
 */
interface ProjectionScoringRule {
  type: ProjectionType
  browseMode: BrowseViewMode
  score: (_fieldTypes: Set<DatabaseField['type']>, _fieldCount: number) => number
  reason: (_fieldTypes: Set<DatabaseField['type']>) => string
}

const scoringRules: ProjectionScoringRule[] = [
  {
    type: 'table',
    browseMode: 'table',
    score: () => 1.0,
    reason: () => 'Works with any data',
  },
  {
    type: 'list',
    browseMode: 'list',
    score: () => 0.9,
    reason: () => 'Works with any data',
  },
  {
    type: 'kanban',
    browseMode: 'kanban',
    score: (ft) => (ft.has('select') ? 0.9 : 0),
    reason: (ft) => (ft.has('select') ? 'Has select fields for grouping' : 'Needs a select field'),
  },
  {
    type: 'calendar',
    browseMode: 'calendar',
    score: (ft) => (ft.has('date') ? 0.9 : 0),
    reason: (ft) => (ft.has('date') ? 'Has date fields for scheduling' : 'Needs a date field'),
  },
  {
    type: 'card-grid',
    browseMode: 'grid',
    score: (ft) => {
      if (ft.has('file') || ft.has('url')) return 0.85
      if (ft.has('text')) return 0.7
      return 0.5
    },
    reason: (ft) => {
      if (ft.has('file') || ft.has('url')) return 'Has media/link fields for rich cards'
      if (ft.has('text')) return 'Has text fields for card content'
      return 'Basic card layout'
    },
  },
  {
    type: 'chart',
    browseMode: 'table', // chart doesn't have a browse mode; fallback
    score: (ft) => (ft.has('number') ? 0.7 : 0),
    reason: (ft) => (ft.has('number') ? 'Has numeric fields for charting' : 'Needs a number field'),
  },
  {
    type: 'timeline',
    browseMode: 'timeline',
    score: (ft) => (ft.has('date') ? 0.7 : 0),
    reason: (ft) => (ft.has('date') ? 'Has date fields for timeline' : 'Needs a date field'),
  },
  {
    type: 'graph',
    browseMode: 'table', // graph doesn't have a browse mode; fallback
    score: (ft) => (ft.has('relation') ? 0.6 : 0.2),
    reason: (ft) => (ft.has('relation') ? 'Has relation fields for graph edges' : 'Can visualize record relationships'),
  },
  {
    type: 'slide-deck',
    browseMode: 'table', // slide-deck doesn't have a browse mode; fallback
    score: (ft) => (ft.has('text') ? 0.5 : 0.2),
    reason: (ft) => (ft.has('text') ? 'Has text fields for slide content' : 'Basic slide layout'),
  },
  {
    type: 'sankey',
    browseMode: 'table', // sankey doesn't have a browse mode; fallback
    score: (ft, _fieldCount) => {
      const hasGrouping = ft.has('select') || ft.has('relation')
      const hasValue = ft.has('number')
      if (hasGrouping && hasValue) return 0.5
      if (hasGrouping) return 0.2
      return 0
    },
    reason: (ft) => {
      const hasGrouping = ft.has('select') || ft.has('relation')
      const hasValue = ft.has('number')
      if (hasGrouping && hasValue) return 'Has grouping + numeric fields for flow diagram'
      if (hasGrouping) return 'Has grouping fields (add a number field for values)'
      return 'Needs select/relation + number fields'
    },
  },
]

/**
 * Score all projection types against a schema and return sorted suggestions.
 *
 * @param schema - The database schema to evaluate
 * @param options - threshold: minimum score to mark as suggested (default 0.3)
 * @returns Sorted array of projection suggestions with scores and reasons
 */
export function suggestProjections(
  schema: DatabaseSchema,
  options?: { threshold?: number },
): Array<{
  type: ProjectionType
  browseMode: BrowseViewMode
  name: string
  icon: string
  score: number
  suggested: boolean
  reason: string
}> {
  const threshold = options?.threshold ?? 0.3
  const fieldTypes = getSchemaFieldTypes(schema)
  const fieldCount = schema.fields?.length ?? 0

  return scoringRules
    .map((rule) => {
      const score = rule.score(fieldTypes, fieldCount)
      return {
        type: rule.type,
        browseMode: rule.browseMode,
        name: projectionLabels[rule.type] ?? rule.type,
        icon: getProjectionIcon(rule.type),
        score,
        suggested: score >= threshold,
        reason: rule.reason(fieldTypes),
      }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Suggest the best default projection type for a schema.
 * Prefers interactive views (kanban, calendar) over passive ones (table, list).
 *
 * @param schema - The database schema
 * @returns The best projection type, or 'table' as fallback
 */
export function suggestDefaultProjection(schema?: DatabaseSchema | null): ProjectionType {
  if (!schema?.fields?.length) return 'table'

  const fieldTypes = getSchemaFieldTypes(schema)

  // Prefer interactive views over universal ones
  if (fieldTypes.has('select')) return 'kanban'
  if (fieldTypes.has('date')) return 'calendar'
  if (fieldTypes.has('file') || fieldTypes.has('url')) return 'card-grid'

  return 'table'
}
