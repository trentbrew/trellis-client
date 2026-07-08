// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { ProjectionType } from '~/types/database'
import { useProjectionOptions } from './useProjectionOptions'

describe('useProjectionOptions', () => {
  it('returns browse-compatible options in registry order', () => {
    const { projectionOptions } = useProjectionOptions()

    expect(projectionOptions.value.map((option) => option.projectionType)).toEqual([
      'table',
      'spreadsheet',
      'kanban',
      'calendar',
      'list',
      'card-grid',
      'timeline',
      'graph',
      'form',
      'moodboard',
    ])
  })

  it('narrows options to active entity config projections while preserving registry order', () => {
    const activeTypeConfig = ref({
      projections: ['card-grid', 'table'] as ProjectionType[],
      defaultProjection: 'card-grid' as ProjectionType,
    })

    const { projectionOptions } = useProjectionOptions({ activeTypeConfig })

    expect(projectionOptions.value.map((option) => option.projectionType)).toEqual([
      'table',
      'card-grid',
    ])
  })

  it('marks schema-gated projections disabled when matching fields are missing', () => {
    const activeTypeConfig = ref({
      projections: ['table', 'kanban', 'calendar'] as ProjectionType[],
      defaultProjection: 'kanban' as ProjectionType,
    })
    const schemaFields = ref([{ name: 'title', valueType: 'title' }])

    const { projectionOptions } = useProjectionOptions({ activeTypeConfig, schemaFields })

    expect(projectionOptions.value.find((option) => option.projectionType === 'table')?.disabled).toBeFalsy()
    expect(projectionOptions.value.find((option) => option.projectionType === 'kanban')).toMatchObject({
      disabled: true,
      reason: 'Needs select field',
    })
    expect(projectionOptions.value.find((option) => option.projectionType === 'calendar')).toMatchObject({
      disabled: true,
      reason: 'Needs date field',
    })
  })

  it('treats static propertyFields as capability signals', () => {
    const activeTypeConfig = ref({
      projections: ['kanban', 'calendar', 'timeline', 'table'] as ProjectionType[],
      defaultProjection: 'kanban' as ProjectionType,
    })
    const schemaFields = ref([
      { id: 'status', group: 'triage' },
      { id: 'startDate', group: 'scheduling' },
    ])

    const { defaultProjection, projectionOptions } = useProjectionOptions({ activeTypeConfig, schemaFields })

    expect(defaultProjection.value).toBe('kanban')
    expect(projectionOptions.value.find((option) => option.projectionType === 'kanban')?.disabled).toBeFalsy()
    expect(projectionOptions.value.find((option) => option.projectionType === 'calendar')?.disabled).toBeFalsy()
    expect(projectionOptions.value.find((option) => option.projectionType === 'timeline')?.disabled).toBeFalsy()
  })

  it('treats ontology status fields as select-like for kanban gating', () => {
    const activeTypeConfig = ref({
      projections: ['table', 'kanban'] as ProjectionType[],
      defaultProjection: 'kanban' as ProjectionType,
    })
    const schemaFields = ref([{ name: 'taskStatus', valueType: 'status' }])

    const { defaultProjection, projectionOptions } = useProjectionOptions({ activeTypeConfig, schemaFields })

    expect(defaultProjection.value).toBe('kanban')
    expect(projectionOptions.value.find((option) => option.projectionType === 'kanban')?.disabled).toBeFalsy()
  })

  it('uses the configured default when available', () => {
    const activeTypeConfig = ref({
      projections: ['table', 'card-grid'] as ProjectionType[],
      defaultProjection: 'table' as ProjectionType,
    })

    const { defaultProjection, defaultViewMode } = useProjectionOptions({ activeTypeConfig })

    expect(defaultProjection.value).toBe('table')
    expect(defaultViewMode.value).toBe('table')
  })

  it('falls back to card-grid when the configured default is unavailable', () => {
    const activeTypeConfig = ref({
      projections: ['calendar', 'card-grid', 'table'] as ProjectionType[],
      defaultProjection: 'calendar' as ProjectionType,
    })
    const schemaFields = ref([{ name: 'title', valueType: 'title' }])

    const { defaultProjection, defaultViewMode } = useProjectionOptions({ activeTypeConfig, schemaFields })

    expect(defaultProjection.value).toBe('card-grid')
    expect(defaultViewMode.value).toBe('grid')
  })
})
