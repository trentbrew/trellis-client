export type TurtleEntityKind = 'org' | 'app' | 'collection' | 'record'

export type TurtleEntityRef =
  | { kind: 'org'; orgSlug: string }
  | { kind: 'app'; orgSlug: string; appSlug: string }
  | { kind: 'collection'; collectionSlug: string }
  | { kind: 'record'; collectionSlug: string; recordId: string }

export function isTurtleIri(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('turtle://')
}

export function parseTurtleIri(value: unknown): TurtleEntityRef | null {
  if (!isTurtleIri(value)) return null

  const withoutScheme = value.slice('turtle://'.length)
  const [rawKind, ...rest] = withoutScheme.split('/').filter(Boolean)

  const kind = (rawKind || '').toLowerCase()

  if (kind === 'org') {
    const orgSlug = rest[0]
    if (!orgSlug) return null
    return { kind: 'org', orgSlug }
  }

  if (kind === 'app') {
    const orgSlug = rest[0]
    const appSlug = rest[1]
    if (!orgSlug || !appSlug) return null
    return { kind: 'app', orgSlug, appSlug }
  }

  if (kind === 'collection') {
    const collectionSlug = rest[0]
    if (!collectionSlug) return null
    return { kind: 'collection', collectionSlug }
  }

  if (kind === 'record') {
    const collectionSlug = rest[0]
    const recordId = rest[1]
    if (!collectionSlug || !recordId) return null
    return { kind: 'record', collectionSlug, recordId }
  }

  return null
}

export function routeForTurtleRef(ref: TurtleEntityRef): string {
  if (ref.kind === 'collection') return `/collections/${ref.collectionSlug}`
  if (ref.kind === 'record') return `/collections/${ref.collectionSlug}?focusRecord=${encodeURIComponent(ref.recordId)}`

  if (ref.kind === 'org') return '/types'
  if (ref.kind === 'app') return '/types'

  return '/types'
}

export function routeForTurtleIri(value: unknown): string | null {
  const ref = parseTurtleIri(value)
  if (!ref) return null
  return routeForTurtleRef(ref)
}

// ============================================================================
// Entity Display Configuration from Ontology
// ============================================================================

export interface EntityDisplayConfig {
  icon: string
  label: string
  description?: string
  component?: string
  projectionTypes: string[]
  fields: FieldConfig[]
}

export interface FieldConfig {
  id: string
  label: string
  valueType: string
  icon?: string
  options?: FieldOption[]
}

export interface FieldOption {
  value: string
  label: string
  color?: string
  icon?: string
}

export interface StatusDisplayConfig {
  color: string
  bgClass: string
  textClass: string
}

export interface PriorityDisplayConfig {
  icon: string
  color: string
  bgClass: string
  textClass: string
}

// Color mappings for status values
const statusColors: Record<string, StatusDisplayConfig> = {
  overdue: {
    color: 'rose',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
  },
  'due-soon': {
    color: 'amber',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  'on-track': {
    color: 'emerald',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    textClass: 'text-emerald-700 dark:text-emerald-400',
  },
  completed: {
    color: 'gray',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    textClass: 'text-gray-600 dark:text-gray-400',
  },
  todo: {
    color: 'gray',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    textClass: 'text-gray-600 dark:text-gray-400',
  },
  in_progress: {
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  done: {
    color: 'green',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
  },
  blocked: {
    color: 'red',
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
  },
}

// Priority display configs
const priorityConfigs: Record<string, PriorityDisplayConfig> = {
  low: {
    icon: 'lucide:arrow-down-circle',
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-500',
  },
  medium: {
    icon: 'lucide:minus-circle',
    color: 'amber',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-500',
  },
  high: {
    icon: 'lucide:alert-circle',
    color: 'rose',
    bgClass: 'bg-rose-100 dark:bg-rose-900/30',
    textClass: 'text-rose-500',
  },
}

/**
 * Get status display configuration
 */
export function getStatusDisplay(status: string | undefined): StatusDisplayConfig {
  if (!status) {
    return statusColors['on-track'] || statusColors['todo']!
  }
  const normalized = status.toLowerCase().replace(/\s+/g, '-')
  return statusColors[normalized] || statusColors['on-track']!
}

/**
 * Get priority display configuration
 */
export function getPriorityDisplay(priority: string | undefined): PriorityDisplayConfig {
  if (!priority) {
    return priorityConfigs['low']!
  }
  const normalized = priority.toLowerCase()
  return priorityConfigs[normalized] || priorityConfigs['low']!
}

/**
 * Get combined badge classes for status
 */
export function getStatusBadgeClass(status: string | undefined): string {
  const config = getStatusDisplay(status)
  return `${config.bgClass} ${config.textClass}`
}

/**
 * Extract a string value from a JSON-LD node, checking multiple possible keys
 */
export function extractNodeValue(node: unknown, keys: string[]): string | undefined {
  if (!node || typeof node !== 'object') return undefined

  const obj = node as Record<string, unknown>

  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
    // Handle JSON-LD value objects
    if (value && typeof value === 'object' && '@value' in (value as object)) {
      const ldValue = (value as { '@value': unknown })['@value']
      if (typeof ldValue === 'string' && ldValue.trim()) {
        return ldValue.trim()
      }
    }
  }

  return undefined
}

/**
 * Standard field key aliases for common properties
 */
export const fieldKeyAliases = {
  status: ['user:status', 'status', 'user:state', 'state'],
  assignee: ['user:assignee', 'assignee', 'user:owner', 'owner', 'user:assignedTo', 'assignedTo'],
  priority: ['user:priority', 'priority', 'user:level', 'level'],
  dueDate: ['user:dueDate', 'dueDate', 'user:due', 'due', 'user:deadline', 'deadline'],
  startDate: ['user:startDate', 'startDate', 'user:start', 'start', 'user:begins', 'begins'],
  endDate: ['user:endDate', 'endDate', 'user:end', 'end', 'user:ends', 'ends'],
  title: ['trellis:title', 'user:title', 'title', 'name', 'user:name', 'rdfs:label', 'label'],
  description: ['user:description', 'description', 'user:desc', 'desc', 'schema:description'],
} as const

/**
 * Extract common display properties from a JSON-LD node
 */
export function extractDisplayProps(node: unknown): {
  title: string | undefined
  status: string | undefined
  assignee: string | undefined
  priority: string | undefined
  dueDate: string | undefined
} {
  return {
    title: extractNodeValue(node, [...fieldKeyAliases.title]),
    status: extractNodeValue(node, [...fieldKeyAliases.status]),
    assignee: extractNodeValue(node, [...fieldKeyAliases.assignee]),
    priority: extractNodeValue(node, [...fieldKeyAliases.priority]),
    dueDate: extractNodeValue(node, [...fieldKeyAliases.dueDate]),
  }
}
