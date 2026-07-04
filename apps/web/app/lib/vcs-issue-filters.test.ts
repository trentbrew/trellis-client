import { describe, expect, test } from 'vitest'

import {
  buildSwimlanes,
  distinctAssignees,
  distinctLabels,
  filterIssues,
  inferDefaultViewMode,
} from './vcs-issue-filters'
import type { VcsIssueSummary } from '~/types/vcs-issue'
import { VCS_ASSIGNEE_UNASSIGNED } from '~/types/vcs-issue'

const FIXTURE: VcsIssueSummary[] = [
  { id: 'TRL-1', title: 'Open source', status: 'backlog', labels: ['proposal'] },
  { id: 'TRL-15', title: 'Epic proposal', status: 'closed', labels: ['proposal'], assignee: 'agent:a' },
  { id: 'TRL-16', title: 'Design', status: 'closed', labels: ['design'], assignee: 'agent:a', parent: 'TRL-15' },
  { id: 'TRL-21', title: 'M1 proposal', status: 'queue', labels: ['proposal', 'needs-design'], assignee: 'agent:a', parent: 'TRL-15' },
  { id: 'TRL-99', title: 'Unassigned spec', status: 'queue', labels: ['spec'] },
]

describe('filterIssues', () => {
  test('returns all when filters empty', () => {
    expect(filterIssues(FIXTURE, { labels: [], assignees: [] })).toHaveLength(5)
  })

  test('filters by label OR', () => {
    const result = filterIssues(FIXTURE, { labels: ['spec'], assignees: [] })
    expect(result.map((i) => i.id)).toEqual(['TRL-99'])
  })

  test('filters by assignee OR including unassigned', () => {
    const assigned = filterIssues(FIXTURE, { labels: [], assignees: ['agent:a'] })
    expect(assigned.map((i) => i.id)).toEqual(['TRL-15', 'TRL-16', 'TRL-21'])

    const unassigned = filterIssues(FIXTURE, { labels: [], assignees: [VCS_ASSIGNEE_UNASSIGNED] })
    expect(unassigned.map((i) => i.id)).toEqual(['TRL-1', 'TRL-99'])
  })

  test('combines label and assignee with AND', () => {
    const result = filterIssues(FIXTURE, { labels: ['proposal'], assignees: ['agent:a'] })
    expect(result.map((i) => i.id)).toEqual(['TRL-15', 'TRL-21'])
  })
})

describe('distinctLabels', () => {
  test('returns sorted unique labels', () => {
    expect(distinctLabels(FIXTURE)).toEqual(['design', 'needs-design', 'proposal', 'spec'])
  })
})

describe('distinctAssignees', () => {
  test('returns sorted assignees excluding unassigned', () => {
    expect(distinctAssignees(FIXTURE)).toEqual(['agent:a'])
  })
})

describe('buildSwimlanes', () => {
  test('groups children under epic and ungrouped orphans', () => {
    const titleById = new Map(FIXTURE.map((i) => [i.id, i.title]))
    const lanes = buildSwimlanes(FIXTURE, titleById)

    expect(lanes.map((l) => l.epicId)).toEqual(['TRL-15', 'ungrouped'])
    expect(lanes[0]?.issues.map((i) => i.id)).toEqual(['TRL-16', 'TRL-21'])
    expect(lanes[1]?.issues.map((i) => i.id)).toEqual(['TRL-1', 'TRL-99'])
  })

  test('excludes parent epic from ungrouped when it has children', () => {
    const titleById = new Map(FIXTURE.map((i) => [i.id, i.title]))
    const lanes = buildSwimlanes(FIXTURE, titleById)
    const ungrouped = lanes.find((l) => l.epicId === 'ungrouped')
    expect(ungrouped?.issues.some((i) => i.id === 'TRL-15')).toBe(false)
  })

  test('hides empty swimlanes after filter', () => {
    const filtered = filterIssues(FIXTURE, { labels: ['spec'], assignees: [] })
    const lanes = buildSwimlanes(filtered, new Map(FIXTURE.map((i) => [i.id, i.title])))
    expect(lanes).toEqual([
      {
        epicId: 'ungrouped',
        epicTitle: 'Ungrouped',
        issues: [FIXTURE[4]!],
      },
    ])
  })
})

describe('inferDefaultViewMode', () => {
  test('grouped when parent links exist', () => {
    expect(inferDefaultViewMode(FIXTURE)).toBe('grouped')
  })

  test('flat when no parent links', () => {
    expect(inferDefaultViewMode([FIXTURE[0]!, FIXTURE[4]!])).toBe('flat')
  })
})
