import type { ProjectionRegistryNode } from './types'

/** Serializable projection registry nodes — shared by client UI and server graph seed. */
export const PROJECTION_REGISTRY_NODES: ProjectionRegistryNode[] = [
  { projectionType: 'table', label: 'Data Table', icon: 'lucide:table', order: 1 },
  { projectionType: 'spreadsheet', label: 'Spreadsheet', icon: 'lucide:file-spreadsheet', order: 1.5 },
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
