/**
 * Grid Page Layout Types
 *
 * Defines the data model for user-created grid pages where multiple
 * entity projections (views) are spatially arranged in a 12-column grid.
 */

import type { ProjectionType, ChartType, AggregationFn } from '~/types/database'

// ============================================================================
// Chart Configuration (for chart projection cells)
// ============================================================================

export interface ChartConfig {
  /** Chart visualization type */
  chartType: ChartType
  /** Field to group by (e.g. 'priority', 'taskStatus', 'category', 'type') */
  dimension: string
  /** 'count' or a numeric field name */
  measure: string
  /** Aggregation function when measure is a numeric field */
  aggregation: AggregationFn
  /** Custom color palette */
  colors?: string[]
  /** Show chart legend */
  showLegend?: boolean
  /** Stack bars/areas */
  stacked?: boolean
}

// ============================================================================
// Grid View (a single cell in the grid)
// ============================================================================

export interface GridView {
  /** Unique identifier */
  id: string
  /** Optional display title for this view */
  title?: string
  /** 1-based column start (1–12) */
  col: number
  /** 1-based row start (1+) */
  row: number
  /** Column span (1–12) */
  colSpan: number
  /** Row span (1+) */
  rowSpan: number
  /** Entity type slug (e.g. 'task', 'note') or 'all' for unfiltered */
  dataSource: string
  /** Projection type to render (e.g. 'table', 'kanban', 'calendar') */
  projection: ProjectionType
  /** Optional per-view filters */
  filters?: Record<string, any>
  /** Sort field */
  sortField?: string
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
  /** Entity ID for entity-detail projection */
  entityId?: string
  /** Chart projection configuration */
  chartConfig?: ChartConfig
}

// ============================================================================
// Grid Config (persisted per page)
// ============================================================================

export type GridGap = 'sm' | 'md' | 'lg'

export const GRID_COLS = 12

export const GRID_GAP_PX: Record<GridGap, number> = {
  sm: 8,
  md: 16,
  lg: 24,
}

export interface GridConfig {
  /** Always 12 columns */
  cols: typeof GRID_COLS
  /** Gap between cells */
  gap: GridGap
  /** The views placed in the grid */
  views: GridView[]
}

// ============================================================================
// Grid Presets
// ============================================================================

export interface GridPreset {
  id: string
  name: string
  icon: string
  description: string
  /** View position stubs (no data source or projection — user configures each) */
  views: Omit<GridView, 'id' | 'dataSource' | 'projection'>[]
}

export const GRID_PRESETS: GridPreset[] = [
  {
    id: 'single',
    name: 'Single View',
    icon: 'lucide:square',
    description: 'One full-width view',
    views: [{ col: 1, row: 1, colSpan: 12, rowSpan: 2 }],
  },
  {
    id: 'side-by-side',
    name: 'Side by Side',
    icon: 'lucide:columns-2',
    description: 'Two equal columns',
    views: [
      { col: 1, row: 1, colSpan: 6, rowSpan: 2 },
      { col: 7, row: 1, colSpan: 6, rowSpan: 2 },
    ],
  },
  {
    id: 'dashboard-2x2',
    name: 'Dashboard 2×2',
    icon: 'lucide:layout-grid',
    description: 'Four equal quadrants',
    views: [
      { col: 1, row: 1, colSpan: 6, rowSpan: 1 },
      { col: 7, row: 1, colSpan: 6, rowSpan: 1 },
      { col: 1, row: 2, colSpan: 6, rowSpan: 1 },
      { col: 7, row: 2, colSpan: 6, rowSpan: 1 },
    ],
  },
  {
    id: 'hero-grid',
    name: 'Hero + Grid',
    icon: 'lucide:layout-template',
    description: 'Full-width top, three columns below',
    views: [
      { col: 1, row: 1, colSpan: 12, rowSpan: 1 },
      { col: 1, row: 2, colSpan: 4, rowSpan: 1 },
      { col: 5, row: 2, colSpan: 4, rowSpan: 1 },
      { col: 9, row: 2, colSpan: 4, rowSpan: 1 },
    ],
  },
  {
    id: 'kpi-main',
    name: 'KPI + Main',
    icon: 'lucide:bar-chart-3',
    description: 'Three stats top, full content below',
    views: [
      { col: 1, row: 1, colSpan: 4, rowSpan: 1 },
      { col: 5, row: 1, colSpan: 4, rowSpan: 1 },
      { col: 9, row: 1, colSpan: 4, rowSpan: 1 },
      { col: 1, row: 2, colSpan: 12, rowSpan: 2 },
    ],
  },
  {
    id: 'triple-column',
    name: 'Triple Column',
    icon: 'lucide:columns-3',
    description: 'Three equal columns',
    views: [
      { col: 1, row: 1, colSpan: 4, rowSpan: 2 },
      { col: 5, row: 1, colSpan: 4, rowSpan: 2 },
      { col: 9, row: 1, colSpan: 4, rowSpan: 2 },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: 'lucide:bar-chart-3',
    description: 'Charts and stats overview',
    views: [
      { col: 1, row: 1, colSpan: 6, rowSpan: 1 },
      { col: 7, row: 1, colSpan: 6, rowSpan: 1 },
      { col: 1, row: 2, colSpan: 4, rowSpan: 1 },
      { col: 5, row: 2, colSpan: 4, rowSpan: 1 },
      { col: 9, row: 2, colSpan: 4, rowSpan: 1 },
    ],
  },
]

// ============================================================================
// Helpers
// ============================================================================

/** Create a new GridView with a unique ID */
export function createGridView(
  partial: Omit<GridView, 'id'> & { id?: string },
): GridView {
  return {
    id: partial.id || crypto.randomUUID(),
    title: partial.title,
    col: partial.col,
    row: partial.row,
    colSpan: partial.colSpan,
    rowSpan: partial.rowSpan,
    dataSource: partial.dataSource,
    projection: partial.projection,
    filters: partial.filters,
    sortField: partial.sortField,
    sortDirection: partial.sortDirection,
    entityId: partial.entityId,
    chartConfig: partial.chartConfig,
  }
}

/** Create a default empty GridConfig */
export function createDefaultGridConfig(): GridConfig {
  return {
    cols: GRID_COLS,
    gap: 'md',
    views: [],
  }
}
