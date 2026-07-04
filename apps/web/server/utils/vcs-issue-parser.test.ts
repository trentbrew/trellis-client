// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { parseIssueList, parseIssueListLine, parseIssueShow } from './vcs-issue-parser'

const LIST_FIXTURE = `Issues (2)

  medium TRL-15 in_progress Proposal: VCS issue kanban (Lab board) [proposal,needs-design] → agent:trentbrew
  medium TRL-16 queue Design: VCS issue kanban (Lab board) [design] → agent:trentbrew ← TRL-15 (5/5 AC)
`

const SHOW_FIXTURE = `TRL-16: Design: VCS issue kanban (Lab board)

  Interaction + visual design for read-first TrellisVCS issue board at /lab/issues

  Status:    queue
  Priority:  medium
  Labels:    design
  Assignee:  agent:trentbrew
  Parent:    TRL-15
  Branch:    issue/TRL-16-design-vcs-issue-kanban-lab-board
  Created:   2m ago
  Started:   1m ago

  Acceptance Criteria:
    ✓ passed docs/artifacts/vcs_kanban_design.md exists (DESIGN.md format)
    ✓ passed docs/artifacts/vcs_kanban_mockup.html exists (self-contained HTML mock)
    ○ pending Interaction matrix: states, inputs, outputs
`

describe('vcs-issue-parser', () => {
  it('parseIssueListLine extracts id, status, labels, assignee, parent, AC', () => {
    const issue = parseIssueListLine(
      '  medium TRL-16 queue Design: VCS issue kanban (Lab board) [design] → agent:trentbrew ← TRL-15 (5/5 AC)',
    )
    expect(issue).toMatchObject({
      id: 'TRL-16',
      status: 'queue',
      priority: 'medium',
      title: 'Design: VCS issue kanban (Lab board)',
      labels: ['design'],
      assignee: 'agent:trentbrew',
      parent: 'TRL-15',
      acPassed: 5,
      acTotal: 5,
    })
  })

  it('parseIssueList parses multi-line stdout', () => {
    const issues = parseIssueList(LIST_FIXTURE)
    expect(issues).toHaveLength(2)
    expect(issues[0]?.id).toBe('TRL-15')
    expect(issues[0]?.status).toBe('in_progress')
    expect(issues[1]?.parent).toBe('TRL-15')
  })

  it('parseIssueShow extracts meta, description, and criteria', () => {
    const detail = parseIssueShow(SHOW_FIXTURE)
    expect(detail).toMatchObject({
      id: 'TRL-16',
      title: 'Design: VCS issue kanban (Lab board)',
      status: 'queue',
      priority: 'medium',
      labels: ['design'],
      assignee: 'agent:trentbrew',
      parent: 'TRL-15',
      branch: 'issue/TRL-16-design-vcs-issue-kanban-lab-board',
    })
    expect(detail?.description).toContain('read-first TrellisVCS')
    expect(detail?.criteria).toHaveLength(3)
    expect(detail?.criteria[0]?.state).toBe('passed')
    expect(detail?.criteria[2]?.state).toBe('pending')
    expect(detail?.acPassed).toBe(2)
    expect(detail?.acTotal).toBe(3)
  })
})
