/**
 * useGithub — GitHub integration composable.
 *
 * Responsibilities:
 * - Read stored connection from useIntegrations()
 * - Fetch repositories, issues, and pull requests via server proxies
 * - Persist repos/issues/PRs as TQL entities (for graph linking + offline views)
 * - Link GitHub entities to any workspace entity via `references` / `mentions`
 *
 * Design notes (mirrors useGmail.ts):
 * - Live fetches go through /api/integrations/github/* (which handle OAuth
 *   token refresh automatically).
 * - Entity persistence is explicit — callers decide when to snapshot a repo
 *   or issue/PR into the graph. Bulk "sync all" helpers are provided for
 *   convenience but never run automatically.
 */

import type { IntegrationConnection } from '~/types/database'
import { entityId as toEntityId } from '~/lib/tql-namespace'

// ── Public types (mirror server-side normalized shapes) ─────────────────

export interface GithubRepositoryRef {
  id: string
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

export interface GithubIssueSummary {
  id: string
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

export interface GithubPullRequestSummary
  extends Omit<GithubIssueSummary, 'state' | 'stateReason' | 'githubIssueId'> {
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

export type GithubSyncStatus = 'idle' | 'syncing' | 'error'

// ── Composable ──────────────────────────────────────────────────────────

export function useGithub() {
  const { mutate } = useTrellisGraph()
  const { getConnection, getConnections } = useIntegrations()
  const { user } = useInstantAuth()

  // ── Reactive state ────────────────────────────────────────────────

  const syncStatus = ref<GithubSyncStatus>('idle')
  const syncError = ref<string | null>(null)
  const lastSyncAt = ref<string | null>(null)

  // ── Connection accessors ─────────────────────────────────────────

  const connections = computed<IntegrationConnection[]>(() => getConnections('github'))

  const activeConnections = computed(() =>
    connections.value.filter((c) => c.connectionStatus === 'connected'),
  )

  const connection = computed<IntegrationConnection | undefined>(() => getConnection('github'))

  const isConnected = computed(() => activeConnections.value.length > 0)

  function resolveConnectionId(connectionId?: string): string | null {
    const conn = connectionId ? connections.value.find((c) => c.id === connectionId) : connection.value
    if (!conn || conn.connectionStatus !== 'connected') return null
    return conn.id.startsWith('entity:') ? conn.id : `entity:${conn.id}`
  }

  // ── Live fetches ─────────────────────────────────────────────────

  async function fetchRepos(
    opts: {
      affiliation?: string
      visibility?: 'all' | 'public' | 'private'
      sort?: 'created' | 'updated' | 'pushed' | 'full_name'
      direction?: 'asc' | 'desc'
      perPage?: number
      page?: number
      q?: string
      connectionId?: string
    } = {},
  ): Promise<GithubRepositoryRef[]> {
    const connId = resolveConnectionId(opts.connectionId)
    if (!connId) throw new Error('Not connected to GitHub')

    const params = new URLSearchParams({ connectionId: connId })
    if (opts.affiliation) params.set('affiliation', opts.affiliation)
    if (opts.visibility) params.set('visibility', opts.visibility)
    if (opts.sort) params.set('sort', opts.sort)
    if (opts.direction) params.set('direction', opts.direction)
    if (opts.perPage) params.set('per_page', String(opts.perPage))
    if (opts.page) params.set('page', String(opts.page))
    if (opts.q) params.set('q', opts.q)

    const res = await $fetch<{ repos: GithubRepositoryRef[] }>(
      `/api/integrations/github/repos?${params.toString()}`,
    )
    return res.repos || []
  }

  async function fetchIssues(
    opts: {
      repo?: string
      state?: 'open' | 'closed' | 'all'
      labels?: string
      assignee?: string
      creator?: string
      milestone?: string | number
      sort?: 'created' | 'updated' | 'comments'
      direction?: 'asc' | 'desc'
      perPage?: number
      page?: number
      since?: string
      connectionId?: string
    } = {},
  ): Promise<GithubIssueSummary[]> {
    const connId = resolveConnectionId(opts.connectionId)
    if (!connId) throw new Error('Not connected to GitHub')

    const params = new URLSearchParams({ connectionId: connId })
    if (opts.repo) params.set('repo', opts.repo)
    if (opts.state) params.set('state', opts.state)
    if (opts.labels) params.set('labels', opts.labels)
    if (opts.assignee) params.set('assignee', opts.assignee)
    if (opts.creator) params.set('creator', opts.creator)
    if (opts.milestone !== undefined) params.set('milestone', String(opts.milestone))
    if (opts.sort) params.set('sort', opts.sort)
    if (opts.direction) params.set('direction', opts.direction)
    if (opts.perPage) params.set('per_page', String(opts.perPage))
    if (opts.page) params.set('page', String(opts.page))
    if (opts.since) params.set('since', opts.since)

    const res = await $fetch<{ issues: GithubIssueSummary[] }>(
      `/api/integrations/github/issues?${params.toString()}`,
    )
    return res.issues || []
  }

  async function fetchPullRequests(
    opts: {
      repo: string
      state?: 'open' | 'closed' | 'all'
      head?: string
      base?: string
      sort?: 'created' | 'updated' | 'popularity' | 'long-running'
      direction?: 'asc' | 'desc'
      perPage?: number
      page?: number
      connectionId?: string
    },
  ): Promise<GithubPullRequestSummary[]> {
    const connId = resolveConnectionId(opts.connectionId)
    if (!connId) throw new Error('Not connected to GitHub')
    if (!opts.repo) throw new Error('repo is required (expected "owner/name")')

    const params = new URLSearchParams({ connectionId: connId, repo: opts.repo })
    if (opts.state) params.set('state', opts.state)
    if (opts.head) params.set('head', opts.head)
    if (opts.base) params.set('base', opts.base)
    if (opts.sort) params.set('sort', opts.sort)
    if (opts.direction) params.set('direction', opts.direction)
    if (opts.perPage) params.set('per_page', String(opts.perPage))
    if (opts.page) params.set('page', String(opts.page))

    const res = await $fetch<{ pulls: GithubPullRequestSummary[] }>(
      `/api/integrations/github/prs?${params.toString()}`,
    )
    return res.pulls || []
  }

  // ── TQL persistence ───────────────────────────────────────────────

  function repoDataPayload(
    repo: GithubRepositoryRef,
    connEntityId?: string,
  ): Record<string, any> {
    return {
      type: 'repository',
      title: repo.fullName,
      description: repo.description,
      fullName: repo.fullName,
      ownerLogin: repo.ownerLogin,
      ownerAvatarUrl: repo.ownerAvatarUrl,
      ownerType: repo.ownerType,
      url: repo.url,
      cloneUrl: repo.cloneUrl,
      homepage: repo.homepage,
      defaultBranch: repo.defaultBranch,
      visibility: repo.visibility,
      language: repo.language,
      topics: repo.topics,
      license: repo.license,
      stars: repo.stars,
      forks: repo.forks,
      watchers: repo.watchers,
      openIssuesCount: repo.openIssuesCount,
      isArchived: repo.isArchived,
      isFork: repo.isFork,
      isPrivate: repo.isPrivate,
      isTemplate: repo.isTemplate,
      pushedAt: repo.pushedAt,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
      githubRepoId: repo.githubRepoId,
      source: 'github',
      ...(connEntityId ? { connectionId: connEntityId } : {}),
    }
  }

  function issueDataPayload(
    issue: GithubIssueSummary,
    connEntityId?: string,
  ): Record<string, any> {
    return {
      type: 'github_issue',
      title: issue.title,
      body: issue.body,
      description: issue.body,
      number: issue.number,
      url: issue.url,
      issueState: issue.state,
      stateReason: issue.stateReason,
      labels: issue.labels,
      authorLogin: issue.authorLogin,
      authorAvatarUrl: issue.authorAvatarUrl,
      assignees: issue.assignees,
      milestone: issue.milestone,
      commentsCount: issue.commentsCount,
      startDate: issue.createdAt,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      closedAt: issue.closedAt,
      repositoryFullName: issue.repositoryFullName,
      repositoryId: issue.repositoryId,
      githubIssueId: issue.githubIssueId,
      source: 'github',
      ...(connEntityId ? { connectionId: connEntityId } : {}),
    }
  }

  function prDataPayload(
    pr: GithubPullRequestSummary,
    connEntityId?: string,
  ): Record<string, any> {
    return {
      type: 'pull_request',
      title: pr.title,
      body: pr.body,
      description: pr.body,
      number: pr.number,
      url: pr.url,
      prState: pr.state,
      draft: pr.draft,
      merged: pr.merged,
      mergedAt: pr.mergedAt,
      mergedByLogin: pr.mergedByLogin,
      mergeable: pr.mergeable,
      labels: pr.labels,
      authorLogin: pr.authorLogin,
      authorAvatarUrl: pr.authorAvatarUrl,
      assignees: pr.assignees,
      reviewers: pr.reviewers,
      requestedReviewers: pr.requestedReviewers,
      milestone: pr.milestone,
      baseBranch: pr.baseBranch,
      headBranch: pr.headBranch,
      baseSha: pr.baseSha,
      headSha: pr.headSha,
      commits: pr.commits,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changedFiles,
      commentsCount: pr.commentsCount,
      reviewCommentsCount: pr.reviewCommentsCount,
      startDate: pr.createdAt,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      closedAt: pr.closedAt,
      repositoryFullName: pr.repositoryFullName,
      repositoryId: pr.repositoryId,
      githubPrId: pr.githubPrId,
      source: 'github',
      ...(connEntityId ? { connectionId: connEntityId } : {}),
    }
  }

  function resolveConnectionEntityId(connectionId?: string): string | undefined {
    const conn = connectionId ? connections.value.find((c) => c.id === connectionId) : connection.value
    if (!conn) return undefined
    return conn.id.startsWith('entity:') ? conn.id : toEntityId(conn.id)
  }

  /**
   * Persist a repository to TQL (upsert). Idempotent — re-calling updates
   * in place rather than creating duplicates. Returns the entity ID.
   */
  async function persistRepository(
    repo: GithubRepositoryRef,
    connectionId?: string,
  ): Promise<string> {
    const connEntityId = resolveConnectionEntityId(connectionId)
    await mutate({
      action: 'updateNode',
      entityId: repo.id,
      type: 'entity',
      data: repoDataPayload(repo, connEntityId),
    })
    return repo.id
  }

  /**
   * Persist an issue to TQL (upsert). If `repositoryEntityId` is provided,
   * also creates a `belongsTo` link from issue → repo.
   */
  async function persistIssue(
    issue: GithubIssueSummary,
    opts: { connectionId?: string; repositoryEntityId?: string } = {},
  ): Promise<string> {
    const connEntityId = resolveConnectionEntityId(opts.connectionId)
    await mutate({
      action: 'updateNode',
      entityId: issue.id,
      type: 'entity',
      data: issueDataPayload(issue, connEntityId),
    })
    if (opts.repositoryEntityId) {
      await mutate({
        action: 'link',
        e1: issue.id,
        relation: 'belongsTo',
        e2: opts.repositoryEntityId,
      })
    }
    return issue.id
  }

  /**
   * Persist a pull request to TQL (upsert). If `repositoryEntityId` is
   * provided, also creates a `belongsTo` link from pr → repo.
   */
  async function persistPullRequest(
    pr: GithubPullRequestSummary,
    opts: { connectionId?: string; repositoryEntityId?: string } = {},
  ): Promise<string> {
    const connEntityId = resolveConnectionEntityId(opts.connectionId)
    await mutate({
      action: 'updateNode',
      entityId: pr.id,
      type: 'entity',
      data: prDataPayload(pr, connEntityId),
    })
    if (opts.repositoryEntityId) {
      await mutate({
        action: 'link',
        e1: pr.id,
        relation: 'belongsTo',
        e2: opts.repositoryEntityId,
      })
    }
    return pr.id
  }

  /**
   * Bulk snapshot of a repository + its open issues + its open PRs into
   * TQL. Returns counts. Fire-and-forget from a "Sync" button.
   */
  async function syncRepo(
    repo: GithubRepositoryRef,
    opts: { includeIssues?: boolean; includePRs?: boolean; connectionId?: string; state?: 'open' | 'closed' | 'all' } = {},
  ): Promise<{ repo: string; issues: number; prs: number }> {
    const { includeIssues = true, includePRs = true, connectionId, state = 'open' } = opts

    syncStatus.value = 'syncing'
    syncError.value = null
    try {
      const repoEntityId = await persistRepository(repo, connectionId)

      let issueCount = 0
      let prCount = 0

      if (includeIssues) {
        const issues = await fetchIssues({ repo: repo.fullName, state, connectionId, perPage: 100 })
        await Promise.all(
          issues.map((issue) => persistIssue(issue, { connectionId, repositoryEntityId: repoEntityId })),
        )
        issueCount = issues.length
      }

      if (includePRs) {
        const prs = await fetchPullRequests({ repo: repo.fullName, state, connectionId, perPage: 100 })
        await Promise.all(
          prs.map((pr) => persistPullRequest(pr, { connectionId, repositoryEntityId: repoEntityId })),
        )
        prCount = prs.length
      }

      lastSyncAt.value = new Date().toISOString()
      syncStatus.value = 'idle'
      return { repo: repoEntityId, issues: issueCount, prs: prCount }
    } catch (err: any) {
      syncStatus.value = 'error'
      syncError.value = err?.message || 'Sync failed'
      throw err
    }
  }

  /**
   * Link a GitHub entity (repo/issue/pr) to any workspace entity via TQL.
   */
  async function linkToEntity(
    githubEntityId: string,
    targetEntityId: string,
    relation: 'references' | 'mentions' | 'belongsTo' = 'references',
  ): Promise<void> {
    const e1 = githubEntityId.startsWith('entity:') ? githubEntityId : toEntityId(githubEntityId)
    const e2 = targetEntityId.startsWith('entity:') ? targetEntityId : toEntityId(targetEntityId)
    await mutate({ action: 'link', e1, relation, e2 })
  }

  // ── Connect / disconnect ─────────────────────────────────────────

  function connect(opts?: { login?: string; returnTo?: string; scopes?: string[] }): void {
    const params = new URLSearchParams()
    const userId = user.value?.id
    if (userId) params.set('userId', userId)
    if (opts?.login) params.set('login', opts.login)
    if (opts?.returnTo) params.set('returnTo', opts.returnTo)
    if (opts?.scopes?.length) params.set('scopes', opts.scopes.join(','))
    const qs = params.toString()
    window.location.href = `/api/integrations/github/auth${qs ? `?${qs}` : ''}`
  }

  async function disconnect(connectionId?: string): Promise<void> {
    const conn = connectionId ? connections.value.find((c) => c.id === connectionId) : connection.value
    if (!conn) return

    try {
      await $fetch('/api/integrations/github/revoke', {
        method: 'POST',
        body: { connectionId: conn.id.startsWith('entity:') ? conn.id : `entity:${conn.id}` },
      })
    } catch (err) {
      console.error('[useGithub] Disconnect failed:', err)
      throw err
    }
  }

  return {
    // State
    connection,
    connections,
    activeConnections,
    isConnected,
    syncStatus: computed(() => syncStatus.value),
    syncError: computed(() => syncError.value),
    lastSyncAt: computed(() => lastSyncAt.value),

    // Live reads
    fetchRepos,
    fetchIssues,
    fetchPullRequests,

    // Graph persistence
    persistRepository,
    persistIssue,
    persistPullRequest,
    syncRepo,
    linkToEntity,

    // Connect lifecycle
    connect,
    disconnect,
  }
}
