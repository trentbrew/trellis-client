/**
 * Shared GitHub types + normalizers.
 *
 * Co-located with the github API routes (prefixed `_` so Nitro treats this
 * as a non-route module). Holds:
 *   1. Raw GitHub API shapes (partial — only fields we consume)
 *   2. Normalized types returned from routes and used by the client composable
 *   3. Pure normalization helpers
 *
 * TQL persistence lives client-side in `useGithub.ts` — the routes only
 * shape data, they don't write to the graph. If a background notifier is
 * added later, it can import these helpers directly from here.
 */

// ───────────────────────────────────────────────────────────────────────────
// Raw GitHub API shapes (partial)
// ───────────────────────────────────────────────────────────────────────────

export interface GithubUserRef {
  id: number
  login: string
  avatar_url?: string
  type?: 'User' | 'Organization' | 'Bot'
}

export interface GithubLabelRef {
  id?: number
  name: string
  color?: string
  description?: string
}

export interface GithubMilestoneRef {
  id?: number
  number?: number
  title?: string
  state?: string
  due_on?: string
}

export interface GithubRepoRef {
  id: number
  node_id?: string
  name: string
  full_name: string
  owner?: GithubUserRef
  private?: boolean
  html_url?: string
}

export interface GithubRepoRaw extends GithubRepoRef {
  description?: string | null
  fork?: boolean
  url?: string
  clone_url?: string
  ssh_url?: string
  homepage?: string | null
  language?: string | null
  topics?: string[]
  visibility?: 'public' | 'private' | 'internal'
  default_branch?: string
  stargazers_count?: number
  forks_count?: number
  watchers_count?: number
  open_issues_count?: number
  archived?: boolean
  is_template?: boolean
  license?: { name?: string; spdx_id?: string } | null
  pushed_at?: string
  created_at?: string
  updated_at?: string
}

export interface GithubIssueRaw {
  id: number
  node_id?: string
  number: number
  title: string
  body?: string | null
  state: 'open' | 'closed'
  state_reason?: 'completed' | 'not_planned' | 'reopened' | null
  html_url?: string
  labels?: Array<GithubLabelRef | string>
  user?: GithubUserRef | null
  assignees?: GithubUserRef[]
  milestone?: GithubMilestoneRef | null
  comments?: number
  created_at?: string
  updated_at?: string
  closed_at?: string | null
  repository?: GithubRepoRef
  repository_url?: string
  pull_request?: unknown // presence → this is a PR, not an issue
}

export interface GithubPrRaw extends Omit<GithubIssueRaw, 'pull_request' | 'state'> {
  state: 'open' | 'closed'
  draft?: boolean
  merged?: boolean
  merged_at?: string | null
  merged_by?: GithubUserRef | null
  mergeable?: boolean | null
  mergeable_state?: string
  requested_reviewers?: GithubUserRef[]
  base?: { ref?: string; sha?: string; repo?: GithubRepoRef }
  head?: { ref?: string; sha?: string; repo?: GithubRepoRef }
  commits?: number
  additions?: number
  deletions?: number
  changed_files?: number
  review_comments?: number
}

// ───────────────────────────────────────────────────────────────────────────
// Normalized shapes (returned from routes, persisted by useGithub composable)
// ───────────────────────────────────────────────────────────────────────────

export interface NormalizedRepository {
  id: string // TQL entity id
  githubRepoId: string
  name: string
  fullName: string
  description: string
  url: string
  cloneUrl: string
  homepage: string
  ownerLogin: string
  ownerAvatarUrl: string
  ownerType: 'User' | 'Organization'
  defaultBranch: string
  visibility: 'public' | 'private' | 'internal'
  language: string
  topics: string[]
  license: string
  stars: number
  forks: number
  watchers: number
  openIssuesCount: number
  isArchived: boolean
  isFork: boolean
  isPrivate: boolean
  isTemplate: boolean
  pushedAt: string
  createdAt: string
  updatedAt: string
}

export interface NormalizedIssue {
  id: string // TQL entity id
  githubIssueId: string
  number: number
  title: string
  body: string
  url: string
  state: 'open' | 'closed'
  stateReason: 'completed' | 'not_planned' | 'reopened' | ''
  labels: string[]
  authorLogin: string
  authorAvatarUrl: string
  assignees: string[]
  milestone: string
  commentsCount: number
  createdAt: string
  updatedAt: string
  closedAt: string
  repositoryFullName: string
  repositoryId: string
}

export interface NormalizedPullRequest extends Omit<NormalizedIssue, 'state' | 'stateReason' | 'githubIssueId'> {
  githubPrId: string
  state: 'open' | 'closed' | 'merged' | 'draft'
  draft: boolean
  merged: boolean
  mergedAt: string
  mergedByLogin: string
  mergeable: 'mergeable' | 'conflicting' | 'unknown'
  reviewers: string[]
  requestedReviewers: string[]
  baseBranch: string
  headBranch: string
  baseSha: string
  headSha: string
  commits: number
  additions: number
  deletions: number
  changedFiles: number
  reviewCommentsCount: number
}

// ───────────────────────────────────────────────────────────────────────────
// Entity ID helpers — stable across syncs
// ───────────────────────────────────────────────────────────────────────────

function slugifyIdPart(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function repoEntityId(owner: string, name: string): string {
  return `entity:github-repo-${slugifyIdPart(owner)}-${slugifyIdPart(name)}`
}

export function issueEntityId(owner: string, name: string, issueNumber: number): string {
  return `entity:github-issue-${slugifyIdPart(owner)}-${slugifyIdPart(name)}-${issueNumber}`
}

export function prEntityId(owner: string, name: string, prNumber: number): string {
  return `entity:github-pr-${slugifyIdPart(owner)}-${slugifyIdPart(name)}-${prNumber}`
}

// ───────────────────────────────────────────────────────────────────────────
// Normalizers (pure — no side effects, no external deps)
// ───────────────────────────────────────────────────────────────────────────

function labelNames(labels?: Array<GithubLabelRef | string>): string[] {
  if (!labels) return []
  return labels.map((l) => (typeof l === 'string' ? l : l.name)).filter((n): n is string => !!n)
}

function assigneeLogins(users?: GithubUserRef[]): string[] {
  if (!users) return []
  return users.map((u) => u.login).filter(Boolean)
}

function repoFullNameFromUrl(repositoryUrl?: string): string {
  // GitHub returns repository_url like: https://api.github.com/repos/owner/name
  if (!repositoryUrl) return ''
  const m = repositoryUrl.match(/repos\/([^/]+\/[^/]+)$/)
  return m ? m[1]! : ''
}

export function normalizeRepo(raw: GithubRepoRaw): NormalizedRepository {
  const ownerLogin = raw.owner?.login || raw.full_name.split('/')[0] || ''
  const name = raw.name || raw.full_name.split('/').slice(-1)[0] || ''
  const ownerType: 'User' | 'Organization' =
    raw.owner?.type === 'Organization' ? 'Organization' : 'User'

  return {
    id: repoEntityId(ownerLogin, name),
    githubRepoId: String(raw.id),
    name,
    fullName: raw.full_name,
    description: raw.description || '',
    url: raw.html_url || `https://github.com/${raw.full_name}`,
    cloneUrl: raw.clone_url || '',
    homepage: raw.homepage || '',
    ownerLogin,
    ownerAvatarUrl: raw.owner?.avatar_url || '',
    ownerType,
    defaultBranch: raw.default_branch || 'main',
    visibility: (raw.visibility as NormalizedRepository['visibility']) || (raw.private ? 'private' : 'public'),
    language: raw.language || '',
    topics: raw.topics || [],
    license: raw.license?.spdx_id || raw.license?.name || '',
    stars: raw.stargazers_count || 0,
    forks: raw.forks_count || 0,
    watchers: raw.watchers_count || 0,
    openIssuesCount: raw.open_issues_count || 0,
    isArchived: !!raw.archived,
    isFork: !!raw.fork,
    isPrivate: !!raw.private,
    isTemplate: !!raw.is_template,
    pushedAt: raw.pushed_at || '',
    createdAt: raw.created_at || '',
    updatedAt: raw.updated_at || '',
  }
}

export function normalizeIssue(raw: GithubIssueRaw): NormalizedIssue {
  const repoFullName = raw.repository?.full_name || repoFullNameFromUrl(raw.repository_url)
  const [owner, name] = repoFullName.split('/') as [string?, string?]
  const entityId = owner && name ? issueEntityId(owner, name, raw.number) : `entity:github-issue-${raw.id}`

  return {
    id: entityId,
    githubIssueId: String(raw.id),
    number: raw.number,
    title: raw.title,
    body: raw.body || '',
    url: raw.html_url || '',
    state: raw.state,
    stateReason: (raw.state_reason as NormalizedIssue['stateReason']) || '',
    labels: labelNames(raw.labels),
    authorLogin: raw.user?.login || '',
    authorAvatarUrl: raw.user?.avatar_url || '',
    assignees: assigneeLogins(raw.assignees),
    milestone: raw.milestone?.title || '',
    commentsCount: raw.comments || 0,
    createdAt: raw.created_at || '',
    updatedAt: raw.updated_at || '',
    closedAt: raw.closed_at || '',
    repositoryFullName: repoFullName,
    repositoryId: raw.repository?.id ? String(raw.repository.id) : '',
  }
}

export function normalizePr(raw: GithubPrRaw): NormalizedPullRequest {
  const repoFullName =
    raw.base?.repo?.full_name || raw.repository?.full_name || repoFullNameFromUrl(raw.repository_url)
  const [owner, name] = repoFullName.split('/') as [string?, string?]
  const entityId = owner && name ? prEntityId(owner, name, raw.number) : `entity:github-pr-${raw.id}`

  const mergeableValue: NormalizedPullRequest['mergeable'] =
    typeof raw.mergeable === 'boolean' ? (raw.mergeable ? 'mergeable' : 'conflicting') : 'unknown'

  const state: NormalizedPullRequest['state'] = raw.draft
    ? 'draft'
    : raw.merged
    ? 'merged'
    : raw.state

  return {
    id: entityId,
    githubPrId: String(raw.id),
    number: raw.number,
    title: raw.title,
    body: raw.body || '',
    url: raw.html_url || '',
    state,
    draft: !!raw.draft,
    merged: !!raw.merged,
    mergedAt: raw.merged_at || '',
    mergedByLogin: raw.merged_by?.login || '',
    mergeable: mergeableValue,
    labels: labelNames(raw.labels),
    authorLogin: raw.user?.login || '',
    authorAvatarUrl: raw.user?.avatar_url || '',
    assignees: assigneeLogins(raw.assignees),
    reviewers: [],
    requestedReviewers: assigneeLogins(raw.requested_reviewers),
    milestone: raw.milestone?.title || '',
    baseBranch: raw.base?.ref || '',
    headBranch: raw.head?.ref || '',
    baseSha: raw.base?.sha || '',
    headSha: raw.head?.sha || '',
    commits: raw.commits || 0,
    additions: raw.additions || 0,
    deletions: raw.deletions || 0,
    changedFiles: raw.changed_files || 0,
    commentsCount: raw.comments || 0,
    reviewCommentsCount: raw.review_comments || 0,
    createdAt: raw.created_at || '',
    updatedAt: raw.updated_at || '',
    closedAt: raw.closed_at || '',
    repositoryFullName: repoFullName,
    repositoryId: raw.base?.repo?.id ? String(raw.base.repo.id) : '',
  }
}
