import type {
  VcsIssueCriterion,
  VcsIssueDetail,
  VcsIssuePriority,
  VcsIssueStatus,
  VcsIssueSummary,
} from '../../app/types/vcs-issue'

const PRIORITIES = new Set(['critical', 'high', 'medium', 'low'])
const STATUSES = new Set<VcsIssueStatus>(['backlog', 'queue', 'in_progress', 'paused', 'closed'])

const LIST_LINE =
  /^(critical|high|medium|low)\s+(TRL-\d+)\s+(backlog|queue|in_progress|paused|closed)\s+(.+)$/

function parseListTail(rest: string): {
  title: string
  labels: string[]
  assignee?: string
  parent?: string
  acPassed?: number
  acTotal?: number
} {
  let tail = rest.trim()
  let acPassed: number | undefined
  let acTotal: number | undefined
  let parent: string | undefined
  let assignee: string | undefined
  let labels: string[] = []

  const acMatch = tail.match(/\((\d+)\/(\d+)\s+AC\)\s*$/)
  if (acMatch) {
    acPassed = Number(acMatch[1])
    acTotal = Number(acMatch[2])
    tail = tail.slice(0, acMatch.index).trim()
  }

  const parentMatch = tail.match(/←\s*(TRL-\d+)\s*$/)
  if (parentMatch) {
    parent = parentMatch[1]
    tail = tail.slice(0, parentMatch.index).trim()
  }

  const assigneeMatch = tail.match(/→\s*(.+?)\s*$/)
  if (assigneeMatch) {
    assignee = assigneeMatch[1]?.trim()
    tail = tail.slice(0, assigneeMatch.index).trim()
  }

  const labelsMatch = tail.match(/\[(.+?)\]\s*$/)
  if (labelsMatch) {
    labels = labelsMatch[1]!.split(',').map((label) => label.trim()).filter(Boolean)
    tail = tail.slice(0, labelsMatch.index).trim()
  }

  return { title: tail.trim(), labels, assignee, parent, acPassed, acTotal }
}

export function parseIssueListLine(line: string): VcsIssueSummary | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('Issues')) return null

  const match = trimmed.match(LIST_LINE)
  if (!match) return null

  const priority = match[1] as VcsIssuePriority
  const id = match[2]!
  const status = match[3] as VcsIssueStatus
  if (!PRIORITIES.has(priority) || !STATUSES.has(status)) return null

  const tail = parseListTail(match[4]!)

  return {
    id,
    status,
    priority,
    title: tail.title,
    labels: tail.labels,
    assignee: tail.assignee,
    parent: tail.parent,
    acPassed: tail.acPassed,
    acTotal: tail.acTotal,
  }
}

export function parseIssueList(stdout: string): VcsIssueSummary[] {
  const issues: VcsIssueSummary[] = []
  for (const line of stdout.split('\n')) {
    const issue = parseIssueListLine(line)
    if (issue) issues.push(issue)
  }
  return issues
}

function parseCriterionLine(line: string, index: number): VcsIssueCriterion | null {
  const trimmed = line.trim()
  const match = trimmed.match(/^([✓✗○])\s+(passed|failed|pending)\s+(.+?)(?:\s+\((.+)\))?\s*$/)
  if (!match) return null

  const symbol = match[1]
  let state: VcsIssueCriterion['state'] = 'pending'
  if (symbol === '✓' || match[2] === 'passed') state = 'passed'
  else if (symbol === '✗' || match[2] === 'failed') state = 'failed'

  return {
    index,
    state,
    text: match[3]!.trim(),
    command: match[4]?.trim(),
  }
}

export function parseIssueShow(stdout: string, fallbackId?: string): VcsIssueDetail | null {
  const lines = stdout.split('\n')
  const header = lines[0]?.trim()
  const headerMatch = header?.match(/^(TRL-\d+):\s*(.+)$/)
  if (!headerMatch && !fallbackId) return null

  const id = headerMatch?.[1] ?? fallbackId!
  const title = headerMatch?.[2]?.trim() ?? 'Untitled issue'

  let description = ''
  let status: VcsIssueStatus = 'backlog'
  let priority: VcsIssuePriority | undefined
  let labels: string[] = []
  let assignee: string | undefined
  let parent: string | undefined
  let branch: string | undefined
  let createdAt: string | undefined
  let startedAt: string | undefined
  let closedAt: string | undefined
  const criteria: VcsIssueCriterion[] = []

  let section: 'meta' | 'description' | 'criteria' = 'description'
  const descriptionLines: string[] = []
  let criterionIndex = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()

    if (trimmed === 'Acceptance Criteria:') {
      section = 'criteria'
      continue
    }

    if (section === 'criteria') {
      if (!trimmed) continue
      const criterion = parseCriterionLine(line, ++criterionIndex)
      if (criterion) criteria.push(criterion)
      continue
    }

    const metaMatch = trimmed.match(/^(Status|Priority|Labels|Assignee|Parent|Branch|Created|Started|Closed):\s*(.+)$/)
    if (metaMatch) {
      section = 'meta'
      const key = metaMatch[1]!
      const value = metaMatch[2]!.trim()
      switch (key) {
        case 'Status':
          if (STATUSES.has(value as VcsIssueStatus)) status = value as VcsIssueStatus
          break
        case 'Priority':
          if (PRIORITIES.has(value)) priority = value as VcsIssuePriority
          break
        case 'Labels':
          labels = value.split(',').map((label) => label.trim()).filter(Boolean)
          break
        case 'Assignee':
          assignee = value
          break
        case 'Parent':
          parent = value
          break
        case 'Branch':
          branch = value
          break
        case 'Created':
          createdAt = value
          break
        case 'Started':
          startedAt = value
          break
        case 'Closed':
          closedAt = value
          break
      }
      continue
    }

    if (section === 'description' && trimmed && !trimmed.startsWith('Acceptance')) {
      descriptionLines.push(trimmed)
    }
  }

  description = descriptionLines.join('\n').trim()

  const acPassed = criteria.filter((c) => c.state === 'passed').length
  const acTotal = criteria.length || undefined

  return {
    id,
    title,
    status,
    labels,
    assignee,
    parent,
    priority,
    branch,
    description: description || undefined,
    criteria,
    createdAt,
    startedAt,
    closedAt,
    acPassed: acTotal ? acPassed : undefined,
    acTotal: acTotal || undefined,
  }
}
