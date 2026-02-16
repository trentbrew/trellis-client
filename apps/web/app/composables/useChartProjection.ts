/**
 * useChartProjection
 *
 * Transforms a list of entities + a ChartConfig into ApexCharts-ready
 * { labels, series, colors } reactive data.
 */

import type { Entity } from '~/types/entity'
import type { ChartConfig } from '~/types/grid'
import type { ChartType } from '~/types/database'

// ── Default color palette ─────────────────────────────────────────────────
const DEFAULT_PALETTE = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
]

// ── Well-known field colors ───────────────────────────────────────────────
const KNOWN_COLORS: Record<string, Record<string, string>> = {
  priority: {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
  },
  taskStatus: {
    'pending': '#94a3b8',
    'in-progress': '#3b82f6',
    'on-track': '#10b981',
    'due-soon': '#f59e0b',
    'overdue': '#ef4444',
    'completed': '#10b981',
  },
  type: {
    task: '#3b82f6',
    event: '#8b5cf6',
    note: '#eab308',
    payment: '#10b981',
    trip: '#06b6d4',
    person: '#ec4899',
    project: '#6366f1',
    file: '#94a3b8',
    folder: '#f97316',
    bookmark: '#14b8a6',
  },
}

// ── Groupable dimension fields (auto-detected from entity data) ──────────
export const DIMENSION_OPTIONS: { value: string; label: string }[] = [
  { value: 'type', label: 'Entity Type' },
  { value: 'priority', label: 'Priority' },
  { value: 'taskStatus', label: 'Task Status' },
  { value: 'category', label: 'Category' },
  { value: 'urgency', label: 'Urgency' },
  { value: 'owner', label: 'Owner' },
]

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  chartType: 'bar',
  dimension: 'type',
  measure: 'count',
  aggregation: 'count',
}

// ── Radial chart types ──────────────────────────────────────────────────
const RADIAL_TYPES: Set<ChartType> = new Set(['pie', 'donut', 'radialBar'])

export function useChartProjection(
  items: Ref<Entity[]> | ComputedRef<Entity[]>,
  config: Ref<ChartConfig | undefined> | ComputedRef<ChartConfig | undefined>,
) {
  const resolvedConfig = computed<ChartConfig>(() => config.value ?? DEFAULT_CHART_CONFIG)

  const isRadial = computed(() => RADIAL_TYPES.has(resolvedConfig.value.chartType))

  // ── Group items by dimension ────────────────────────────────────────
  const grouped = computed(() => {
    const dim = resolvedConfig.value.dimension
    const measure = resolvedConfig.value.measure
    const agg = resolvedConfig.value.aggregation
    const groups: Record<string, number> = {}

    for (const item of items.value) {
      const key = String((item as any)[dim] ?? 'Unknown')

      if (measure === 'count' || agg === 'count') {
        groups[key] = (groups[key] ?? 0) + 1
      } else {
        const numVal = Number((item as any)[measure])
        if (Number.isNaN(numVal)) continue

        switch (agg) {
          case 'sum':
            groups[key] = (groups[key] ?? 0) + numVal
            break
          case 'avg': {
            // store sum and count, compute avg after
            const existing = groups[key]
            if (existing === undefined) {
              groups[key] = numVal
              groups[`__count__${key}`] = 1
            } else {
              groups[key] = existing + numVal
              groups[`__count__${key}`] = (groups[`__count__${key}`] ?? 0) + 1
            }
            break
          }
          case 'min':
            groups[key] = groups[key] === undefined ? numVal : Math.min(groups[key]!, numVal)
            break
          case 'max':
            groups[key] = groups[key] === undefined ? numVal : Math.max(groups[key]!, numVal)
            break
        }
      }
    }

    // Finalize averages and strip helper keys
    if (agg === 'avg') {
      const result: Record<string, number> = {}
      for (const key of Object.keys(groups)) {
        if (key.startsWith('__count__')) continue
        const count = groups[`__count__${key}`]
        result[key] = count && count > 0
          ? Math.round((groups[key]! / count) * 100) / 100
          : groups[key]!
      }
      return result
    }

    return groups
  })

  // ── Derived labels, values, colors ──────────────────────────────────
  const labels = computed(() => Object.keys(grouped.value))

  const values = computed(() => Object.values(grouped.value))

  const colors = computed(() => {
    if (resolvedConfig.value.colors?.length) return resolvedConfig.value.colors

    const dim = resolvedConfig.value.dimension
    const knownMap = KNOWN_COLORS[dim]

    return labels.value.map((label, i) => {
      if (knownMap?.[label]) return knownMap[label]!
      return DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!
    })
  })

  // ── ApexCharts-ready series ─────────────────────────────────────────
  const series = computed(() => {
    if (isRadial.value) {
      return values.value
    }
    return [{ name: resolvedConfig.value.measure === 'count' ? 'Count' : resolvedConfig.value.measure, data: values.value }]
  })

  // ── Available dimensions (detected from actual data) ────────────────
  const availableDimensions = computed(() => {
    if (!items.value.length) return DIMENSION_OPTIONS

    const sample = items.value[0]!
    return DIMENSION_OPTIONS.filter((opt) => (sample as any)[opt.value] !== undefined)
  })

  const hasData = computed(() => items.value.length > 0 && labels.value.length > 0)

  return {
    labels,
    values,
    series,
    colors,
    isRadial,
    hasData,
    resolvedConfig,
    availableDimensions,
  }
}
