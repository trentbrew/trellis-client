import type { QueryViewRegionConfig } from '~/types/deck'

export type QueryViewTile = {
  value: string
  label: string
}

export type QueryViewChartBar = {
  label: string
  value: string
  height: number
  highlight?: boolean
}

export type QueryViewDemoPayload = {
  tiles: QueryViewTile[]
  chartTitle: string
  bars: QueryViewChartBar[]
}

/** Static demo payload for traction slide queryView (P1.1 — no live TQL) */
export const TRACTION_QUERY_VIEW_DEMO: QueryViewDemoPayload = {
  tiles: [
    { value: '4', label: 'station partners' },
    { value: '$2.4k', label: 'MRR · Jul' },
    { value: '128k', label: 'entities synced' },
  ],
  chartTitle: 'Raster.tv MRR — Feb–Jul 2026 ($k)',
  bars: [
    { label: 'Feb', value: '$0.8k', height: 33 },
    { label: 'Mar', value: '$1.2k', height: 50 },
    { label: 'Apr', value: '$1.6k', height: 66 },
    { label: 'May', value: '$1.6k', height: 66 },
    { label: 'Jun', value: '$2.0k', height: 83 },
    { label: 'Jul', value: '$2.4k', height: 100, highlight: true },
  ],
}

const DEMO_BY_SLIDE: Record<string, QueryViewDemoPayload> = {
  'entity:slide-yc-traction': TRACTION_QUERY_VIEW_DEMO,
}

export function getQueryViewDemoData(slideEntityId: string): QueryViewDemoPayload | null {
  return DEMO_BY_SLIDE[slideEntityId] ?? null
}

export function showQueryViewChart(config: QueryViewRegionConfig | undefined): boolean {
  if (!config) return false
  const viz = config.viz ?? 'both'
  return viz === 'chart' || viz === 'both'
}

export function showQueryViewTiles(config: QueryViewRegionConfig | undefined): boolean {
  if (!config) return false
  const viz = config.viz ?? 'both'
  return viz === 'tiles' || viz === 'both'
}
