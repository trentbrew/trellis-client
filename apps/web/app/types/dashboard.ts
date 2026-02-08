/**
 * Dashboard Widget Type System
 *
 * Defines the types for dashboard widgets that project entity data
 * as stats, charts, lists, and other visualizations.
 */

import type { ChartType, AggregationFn } from '~/types/database'
import type { EntityType } from '~/types/entity'

// ============================================================================
// Widget Types
// ============================================================================

export type DashboardWidgetType =
  | 'stat'
  | 'chart'
  | 'list'
  | 'schedule'
  | 'progress'

// ============================================================================
// Widget Data Source
// ============================================================================

export interface WidgetDataSource {
  /** Which entity types to query */
  entityTypes?: EntityType[]
  /** Field to group/segment by (e.g. 'priority', 'category', 'type', 'taskStatus') */
  groupBy?: string
  /** Field to measure/aggregate */
  measure?: string
  /** Aggregation function */
  aggregation?: AggregationFn
  /** Filter predicate key (maps to a named filter in useDashboardData) */
  filter?: string
  /** Sort field */
  sortBy?: string
  /** Sort direction */
  sortOrder?: 'asc' | 'desc'
  /** Max items to return (for list widgets) */
  limit?: number
}

// ============================================================================
// Widget Config (per-type rendering options)
// ============================================================================

export interface StatWidgetConfig {
  icon?: string
  color?: string
  suffix?: string
  prefix?: string
  trend?: { value: number; label: string }
}

export interface ChartWidgetConfig {
  chartType: ChartType
  height?: number
  showLegend?: boolean
  showLabels?: boolean
  sparkline?: boolean
  colors?: string[]
  stacked?: boolean
}

export interface ListWidgetConfig {
  showCheckbox?: boolean
  showPriority?: boolean
  showDate?: boolean
  showStatus?: boolean
  emptyMessage?: string
}

export interface ScheduleWidgetConfig {
  showTime?: boolean
  showLocation?: boolean
  maxItems?: number
}

export interface ProgressWidgetConfig {
  target?: number
  color?: string
  showPercentage?: boolean
}

export type WidgetConfig =
  | StatWidgetConfig
  | ChartWidgetConfig
  | ListWidgetConfig
  | ScheduleWidgetConfig
  | ProgressWidgetConfig

// ============================================================================
// Dashboard Widget
// ============================================================================

export interface DashboardWidget<C extends WidgetConfig = WidgetConfig> {
  id: string
  type: DashboardWidgetType
  title: string
  /** Grid position: col-span out of 12 */
  span: 3 | 4 | 6 | 8 | 12
  /** Data source binding */
  dataSource: WidgetDataSource
  /** Type-specific rendering config */
  config: C
}

// ============================================================================
// Dashboard Layout
// ============================================================================

export interface DashboardLayout {
  id: string
  title: string
  widgets: DashboardWidget[]
}

// ============================================================================
// Convenience type aliases for widget construction
// ============================================================================

export type StatWidget = DashboardWidget<StatWidgetConfig>
export type ChartWidget = DashboardWidget<ChartWidgetConfig>
export type ListWidget = DashboardWidget<ListWidgetConfig>
export type ScheduleWidget = DashboardWidget<ScheduleWidgetConfig>
export type ProgressWidget = DashboardWidget<ProgressWidgetConfig>
