import type { ProjectionType } from '~/types/database'
import type { BrowseViewMode } from '~/composables/useBrowse'

/**
 * Reconciliation of the legacy browse-page `BrowseViewMode` vocabulary onto the
 * canonical {@link ProjectionType} used by the projection registry, grid, and
 * `entityRegistry.projections`.
 *
 * A few browse modes are really a **sub-mode** of a canonical projection
 * (calendar month/week/agenda, timeline gantt), so a normalized entry carries an
 * optional `sub` discriminator that the layout renderer interprets internally —
 * rather than each sub-mode being a sibling top-level layout.
 *
 * This is M0 of the view-projections work (TRL-26): retire the drifted vocabulary
 * without yet rewiring the browse page. See
 * `docs/artifacts/view_projections_design.md`.
 */
export interface NormalizedProjection {
  /** Canonical projection this browse mode renders through. */
  type: ProjectionType
  /** Optional sub-mode within the projection (e.g. calendar `month`, timeline `gantt`). */
  sub?: string
}

/**
 * Total map from every {@link BrowseViewMode} to a canonical {@link ProjectionType}.
 * Typed as `Record<BrowseViewMode, …>` so TypeScript enforces exhaustiveness at
 * compile time and that every `type` is a valid `ProjectionType`.
 */
export const BROWSE_VIEW_MODE_TO_PROJECTION: Record<BrowseViewMode, NormalizedProjection> = {
  grid: { type: 'card-grid' }, // `grid` → canonical `card-grid`
  list: { type: 'list' },
  table: { type: 'table' },
  spreadsheet: { type: 'spreadsheet' }, // registry keeps table/spreadsheet distinct
  calendar: { type: 'calendar' },
  month: { type: 'calendar', sub: 'month' },
  week: { type: 'calendar', sub: 'week' },
  agenda: { type: 'calendar', sub: 'agenda' },
  kanban: { type: 'kanban' },
  timeline: { type: 'timeline' },
  gantt: { type: 'timeline', sub: 'gantt' },
  moodboard: { type: 'moodboard' },
  graph: { type: 'graph' },
  form: { type: 'form' },
}

/**
 * Normalize a legacy browse view mode to its canonical projection (+ optional sub-mode).
 * Falls back to `table` for unknown input (defensive — the map is total by type).
 */
export function normalizeBrowseViewMode(mode: BrowseViewMode): NormalizedProjection {
  return BROWSE_VIEW_MODE_TO_PROJECTION[mode] ?? { type: 'table' }
}
