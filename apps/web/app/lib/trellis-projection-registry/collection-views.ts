import type { DatabaseSchema } from '~/types/database'
import type { ProjectionType } from '~/types/database'
import type { CollectionViewOption, ProjectionRegistryNode } from './types'
import { getSchemaFieldTypes } from './field-signals'

/** Canonical projection nodes — single source for route-agnostic view eligibility. */
export const PROJECTION_REGISTRY_NODES: ProjectionRegistryNode[] = [
  { projectionType: 'table', label: 'Data Table', icon: 'lucide:table', order: 1 },
  { projectionType: 'kanban', label: 'Kanban', icon: 'lucide:square-kanban', order: 2, requirements: { schema: { fieldTypes: ['select'] } } },
  { projectionType: 'calendar', label: 'Calendar', icon: 'lucide:calendar', order: 3, requirements: { schema: { fieldTypes: ['date'] } } },
  { projectionType: 'list', label: 'List', icon: 'lucide:list', order: 4 },
  { projectionType: 'card-grid', label: 'Card Grid', icon: 'lucide:layout-grid', order: 5 },
  { projectionType: 'timeline', label: 'Timeline', icon: 'lucide:calendar', order: 6, requirements: { schema: { fieldTypes: ['date'] } } },
  { projectionType: 'graph', label: 'Graph', icon: 'lucide:network', order: 7 },
  { projectionType: 'chart', label: 'Chart', icon: 'lucide:bar-chart-3', order: 8, requirements: { schema: { fieldTypes: ['number'] } } },
  { projectionType: 'moodboard', label: 'Moodboard', icon: 'lucide:layout-dashboard', order: 9 },
  { projectionType: 'slide-deck', label: 'Slide Deck', icon: 'lucide:presentation', order: 10 },
  { projectionType: 'trellis-blocks', label: 'Trellis', icon: 'lucide:layout-list', order: 100 },
  { projectionType: 'blocks', label: 'Blocks', icon: 'lucide:blocks', order: 101 },
  { projectionType: 'code', label: 'JSON-LD', icon: 'lucide:code-2', order: 102 },
]

export function getProjectionRegistryNodes(): ProjectionRegistryNode[] {
  return PROJECTION_REGISTRY_NODES
}

function nodeSupported(node: ProjectionRegistryNode, schema?: DatabaseSchema | null): boolean {
  const required = node.requirements?.schema?.fieldTypes
  if (!required?.length) return true
  if (!schema?.fields?.length) return false
  const fieldTypes = getSchemaFieldTypes(schema)
  return required.some((type) => fieldTypes.has(type))
}

export function suggestCollectionViews(schema?: DatabaseSchema | null): CollectionViewOption[] {
  return PROJECTION_REGISTRY_NODES.map((node) => {
    const supported = nodeSupported(node, schema)
    return {
      mode: node.projectionType as ProjectionType,
      label: node.label,
      supported,
      isDefault: node.projectionType === 'table',
      reason: supported ? undefined : `Needs ${node.requirements?.schema?.fieldTypes?.join(' or ')} field`,
    }
  })
}

export function suggestDefaultCollectionView(schema?: DatabaseSchema | null): ProjectionType {
  const options = suggestCollectionViews(schema).filter((o) => o.supported)
  return options[0]?.mode ?? 'table'
}
