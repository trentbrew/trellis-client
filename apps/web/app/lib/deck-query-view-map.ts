import type { QueryViewDemoPayload } from '~/lib/deck-query-view-demo'

function rowCount(rows: Record<string, unknown>[]): number {
  return rows.length
}

/** Map EQL-S rows to queryView tiles/chart; merge with demo shape when provided. */
export function mapQueryRowsToQueryView(
  rows: Record<string, unknown>[],
  fallback: QueryViewDemoPayload | null,
): QueryViewDemoPayload {
  const count = rowCount(rows)
  const base = fallback ?? {
    tiles: [
      { value: String(count), label: 'rows' },
      { value: '—', label: 'live' },
      { value: String(count * 1000), label: 'entities synced' },
    ],
    chartTitle: 'Live query results',
    bars: [{ label: 'now', value: String(count), height: 100, highlight: true }],
  }

  return {
    ...base,
    tiles: base.tiles.map((tile, i) => {
      if (i === 2) return { ...tile, value: count >= 1000 ? `${Math.round(count / 1000)}k` : String(count) }
      if (i === 0 && count > 0) return { ...tile, value: String(Math.min(count, 99)) }
      return tile
    }),
  }
}
