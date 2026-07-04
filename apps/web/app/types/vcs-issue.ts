export type VcsIssueStatus = 'backlog' | 'queue' | 'in_progress' | 'paused' | 'closed'

export type VcsIssuePriority = 'critical' | 'high' | 'medium' | 'low'

export interface VcsIssueSummary {
  id: string
  title: string
  status: VcsIssueStatus
  labels: string[]
  assignee?: string
  parent?: string
  priority?: VcsIssuePriority
  acPassed?: number
  acTotal?: number
  branch?: string
}

export interface VcsIssueCriterion {
  index: number
  text: string
  state: 'passed' | 'failed' | 'pending'
  command?: string
}

export interface VcsIssueDetail extends VcsIssueSummary {
  description?: string
  criteria: VcsIssueCriterion[]
  createdAt?: string
  startedAt?: string
  closedAt?: string
}

export interface VcsIssuesListResponse {
  workspaceRoot: string
  workspaceName: string
  fetchedAt: string
  issues: VcsIssueSummary[]
}

export interface VcsIssuesErrorResponse {
  code: 'NO_VCS_REPO' | 'CLI_ERROR' | 'PARSE_ERROR'
  message: string
}

export const VCS_ISSUE_STATUSES: VcsIssueStatus[] = [
  'backlog',
  'queue',
  'in_progress',
  'paused',
  'closed',
]

export const VCS_STATUS_LABELS: Record<VcsIssueStatus, string> = {
  backlog: 'Backlog',
  queue: 'Queue',
  in_progress: 'In progress',
  paused: 'Paused',
  closed: 'Done',
}
