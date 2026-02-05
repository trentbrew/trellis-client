import type { Projection, ProjectionType, Collection, DatabaseSchema, DatabaseField } from '~/types/database'
import type { BrowseViewMode } from '~/composables/useBrowse'
import {
  resolveProjectionIcon,
  getProjectionNodes,
  buildSchemaFromType,
  type AppConfigProjectionNode,
} from '~/lib/appConfig'

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
}

const requiredPrimaryProjectionTypes: Array<
  Extract<ProjectionType, 'table' | 'kanban' | 'calendar' | 'graph' | 'list'>
> = ['table', 'kanban', 'calendar', 'graph', 'list']

const getProjectionIcon = (type: ProjectionType): string => {
  return resolveProjectionIcon(type) ?? projectionIcons[type]
}

export function createDefaultProjections(collectionId: string, collectionType: Collection['type']): Projection[] {
  const projections: Projection[] = []

  // All collections get the 5 primary "lens" projections.
  requiredPrimaryProjectionTypes.forEach((type, index) => {
    projections.push({
      id: crypto.randomUUID(),
      type,
      name: projectionLabels[type],
      icon: getProjectionIcon(type),
      config: {},
      isDefault: type === 'table',
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
const projectionTypeToBrowseMode: Partial<Record<ProjectionType, BrowseViewMode>> = {
  table: 'table',
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
  calendar: 'Calendar',
  kanban: 'Kanban',
  timeline: 'Timeline',
  month: 'Month',
  week: 'Week',
  agenda: 'Agenda',
}

/**
 * Default icons for browse view modes (fallback when not from app config).
 */
const defaultBrowseModeIcons: Record<BrowseViewMode, string> = {
  grid: 'lucide:grid-3x3',
  list: 'lucide:list',
  table: 'lucide:table',
  calendar: 'lucide:calendar',
  kanban: 'lucide:square-kanban',
  timeline: 'lucide:calendar',
  month: 'lucide:calendar',
  week: 'lucide:calendar-days',
  agenda: 'lucide:list-todo',
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
  projection: AppConfigProjectionNode,
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
): Array<AppConfigProjectionNode & { requirementResult: ProjectionRequirementResult }> {
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
  const projectionByType = new Map<string, AppConfigProjectionNode>()
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
  const projectionByType = new Map<string, AppConfigProjectionNode>()
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
export function buildViewModeOptionsFromType(
  typeId: string,
  modes: BrowseViewMode[] = ['grid', 'list', 'table', 'calendar', 'kanban'],
  options: { includeDisabled?: boolean; hideUnsupported?: boolean } = {},
): ViewModeOption[] {
  const schema = buildSchemaFromType(typeId)
  return buildViewModeOptions(schema, modes, options)
}
