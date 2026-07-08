// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { BROWSE_VIEW_MODES } from '~/composables/useBrowse'
import { PROJECTION_REGISTRY_NODES } from './nodes'
import {
  BROWSE_VIEW_MODE_TO_PROJECTION,
  normalizeBrowseViewMode,
} from './browse-view-mode'

/** Projection types that have a registered (renderable) node in the registry. */
const REGISTERED_PROJECTION_TYPES = new Set(
  PROJECTION_REGISTRY_NODES.map((node) => node.projectionType),
)

describe('BrowseViewMode → ProjectionType reconciliation (M0 / TRL-26)', () => {
  it('maps every BrowseViewMode to a registered projection type', () => {
    for (const mode of BROWSE_VIEW_MODES) {
      const normalized = BROWSE_VIEW_MODE_TO_PROJECTION[mode]
      expect(normalized, `missing mapping for browse view mode "${mode}"`).toBeDefined()
      expect(
        REGISTERED_PROJECTION_TYPES.has(normalized.type),
        `"${mode}" → "${normalized.type}" is not a registered projection node`,
      ).toBe(true)
    }
  })

  it('is a total map — one entry per BrowseViewMode, no extras', () => {
    expect(Object.keys(BROWSE_VIEW_MODE_TO_PROJECTION).sort()).toEqual(
      [...BROWSE_VIEW_MODES].sort(),
    )
  })

  it('collapses calendar sub-modes onto the calendar projection', () => {
    expect(normalizeBrowseViewMode('month')).toEqual({ type: 'calendar', sub: 'month' })
    expect(normalizeBrowseViewMode('week')).toEqual({ type: 'calendar', sub: 'week' })
    expect(normalizeBrowseViewMode('agenda')).toEqual({ type: 'calendar', sub: 'agenda' })
  })

  it('collapses gantt onto the timeline projection', () => {
    expect(normalizeBrowseViewMode('gantt')).toEqual({ type: 'timeline', sub: 'gantt' })
  })

  it('renames grid to the canonical card-grid', () => {
    expect(normalizeBrowseViewMode('grid')).toEqual({ type: 'card-grid' })
  })

  it('keeps table and spreadsheet as distinct projections', () => {
    expect(normalizeBrowseViewMode('table')).toEqual({ type: 'table' })
    expect(normalizeBrowseViewMode('spreadsheet')).toEqual({ type: 'spreadsheet' })
  })

  it('passes plain modes through unchanged (no sub-mode)', () => {
    for (const mode of ['list', 'calendar', 'kanban', 'timeline', 'moodboard', 'graph', 'form'] as const) {
      expect(normalizeBrowseViewMode(mode).sub).toBeUndefined()
    }
  })
})
