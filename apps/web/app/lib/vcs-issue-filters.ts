import type {
  VcsIssueFilters,
  VcsIssueStatus,
  VcsIssueSummary,
  VcsIssueSwimlane,
} from '~/types/vcs-issue'
import { VCS_ASSIGNEE_UNASSIGNED, VCS_ISSUE_STATUSES } from '~/types/vcs-issue'

export function filterIssues(issues: VcsIssueSummary[], filters: VcsIssueFilters): VcsIssueSummary[] {
  return issues.filter((issue) => {
    if (filters.labels.length > 0 && !issue.labels.some((label) => filters.labels.includes(label))) {
      return false
    }

    if (filters.assignees.length > 0) {
      const assigneeKey = issue.assignee ?? VCS_ASSIGNEE_UNASSIGNED
      if (!filters.assignees.includes(assigneeKey)) return false
    }

    return true
  })
}

export function distinctLabels(issues: VcsIssueSummary[]): string[] {
  const labels = new Set<string>()
  for (const issue of issues) {
    for (const label of issue.labels) labels.add(label)
  }
  return [...labels].sort((a, b) => a.localeCompare(b))
}

export function distinctAssignees(issues: VcsIssueSummary[]): string[] {
  const assignees = new Set<string>()
  for (const issue of issues) {
    if (issue.assignee) assignees.add(issue.assignee)
  }
  return [...assignees].sort((a, b) => a.localeCompare(b))
}

export function buildTitleById(issues: VcsIssueSummary[]): Map<string, string> {
  return new Map(issues.map((issue) => [issue.id, issue.title]))
}

export function groupIssuesByStatus(issues: VcsIssueSummary[]) {
  const grouped = Object.fromEntries(VCS_ISSUE_STATUSES.map((status) => [status, [] as VcsIssueSummary[]])) as Record<
    VcsIssueStatus,
    VcsIssueSummary[]
  >

  for (const issue of issues) {
    grouped[issue.status]?.push(issue)
  }

  return VCS_ISSUE_STATUSES.map((status) => ({
    status,
    issues: grouped[status] ?? [],
  }))
}

export function buildSwimlanes(issues: VcsIssueSummary[], titleById: Map<string, string>): VcsIssueSwimlane[] {
  const parentIdsWithChildren = new Set(
    issues.filter((issue) => issue.parent).map((issue) => issue.parent as string),
  )

  const lanes: VcsIssueSwimlane[] = []

  for (const epicId of [...parentIdsWithChildren].sort((a, b) => a.localeCompare(b))) {
    const children = issues.filter((issue) => issue.parent === epicId)
    if (!children.length) continue
    lanes.push({
      epicId,
      epicTitle: titleById.get(epicId) ?? epicId,
      issues: children,
    })
  }

  const ungrouped = issues.filter((issue) => !issue.parent && !parentIdsWithChildren.has(issue.id))
  if (ungrouped.length) {
    lanes.push({
      epicId: 'ungrouped',
      epicTitle: 'Ungrouped',
      issues: ungrouped,
    })
  }

  return lanes
}

export function inferDefaultViewMode(issues: VcsIssueSummary[]): 'grouped' | 'flat' {
  return issues.some((issue) => Boolean(issue.parent)) ? 'grouped' : 'flat'
}
