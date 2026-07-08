// @vitest-environment node

import { describe, expect, it } from 'vitest'
import type { Entity } from '~/types/entity'
import { buildEntityKanbanColumns, getEntityKanbanGroupKey, getKanbanColumnSources } from './browse-kanban'

function task(id: string, title: string, taskStatus: string): Entity {
  return {
    id,
    type: 'task',
    title,
    taskStatus,
  } as Entity
}

describe('getEntityKanbanGroupKey', () => {
  it('uses taskStatus for tasks', () => {
    expect(getEntityKanbanGroupKey(task('a', 'A', 'pending'), 'task')).toBe('pending')
  })

  it('returns none when no status is set', () => {
    expect(getEntityKanbanGroupKey({ id: 'a', type: 'note', title: 'A' } as Entity)).toBe('none')
  })
})

describe('buildEntityKanbanColumns', () => {
  it('groups tasks by status and renders empty status columns', () => {
    const items = [
      task('1', 'One', 'pending'),
      task('2', 'Two', 'in-progress'),
      task('3', 'Three', 'pending'),
    ]

    const columns = buildEntityKanbanColumns(items, 'task')
    expect(columns.map((c) => c.id)).toEqual(['pending', 'in-progress', 'on-track', 'due-soon', 'overdue', 'completed'])
    expect(columns[0]?.items).toHaveLength(2)
    expect(columns[1]?.items).toHaveLength(1)
    expect(columns[2]?.items).toHaveLength(0)
  })

  it('builds task columns from a different selector source', () => {
    const items = [
      { ...task('1', 'One', 'pending'), priority: 'high' },
      { ...task('2', 'Two', 'in-progress'), priority: 'low' },
    ] as Entity[]

    const columns = buildEntityKanbanColumns(items, 'task', 'priority')
    expect(columns.map((c) => c.id)).toEqual(['critical', 'high', 'medium', 'low'])
    expect(columns.find((c) => c.id === 'high')?.items).toHaveLength(1)
    expect(columns.find((c) => c.id === 'medium')?.items).toHaveLength(0)
  })

  it('falls back to type grouping without status values', () => {
    const items = [
      { id: '1', type: 'note', title: 'Note' },
      { id: '2', type: 'file', title: 'File' },
    ] as Entity[]

    const columns = buildEntityKanbanColumns(items)
    expect(columns.map((c) => c.id).sort()).toEqual(['file', 'note'])
  })
})

describe('getKanbanColumnSources', () => {
  it('exposes select-like task fields as column sources plus custom order', () => {
    expect(getKanbanColumnSources('task').map((source) => source.fieldId)).toEqual([
      'status',
      'priority',
      'urgency',
      'category',
      '__custom_order__',
    ])
  })
})

describe('custom order column source', () => {
  it('builds a single lane for manual ordering', () => {
    const items = [
      task('1', 'One', 'pending'),
      task('2', 'Two', 'in-progress'),
    ]
    const columns = buildEntityKanbanColumns(items, 'task', '__custom_order__')
    expect(columns).toHaveLength(1)
    expect(columns[0]?.id).toBe('__custom_order__')
    expect(columns[0]?.items).toHaveLength(2)
  })
})
