import type {
  VcsIssueDetail,
  VcsIssueFilters,
  VcsIssueSummary,
  VcsIssuesErrorResponse,
  VcsIssuesListResponse,
  VcsKanbanViewMode,
} from '~/types/vcs-issue'
import {
  VCS_KANBAN_VIEW_STORAGE_KEY,
  vcsKanbanCollapsedStorageKey,
} from '~/types/vcs-issue'
import {
  buildSwimlanes,
  buildTitleById,
  distinctAssignees,
  distinctLabels,
  filterIssues,
  groupIssuesByStatus,
  inferDefaultViewMode,
} from '~/lib/vcs-issue-filters'

const POLL_MS = 15_000

function readStoredViewMode(): VcsKanbanViewMode | null {
  if (import.meta.server || typeof localStorage === 'undefined') return null
  const value = localStorage.getItem(VCS_KANBAN_VIEW_STORAGE_KEY)
  return value === 'grouped' || value === 'flat' ? value : null
}

function readStoredCollapsedEpics(): Set<string> {
  if (import.meta.server || typeof localStorage === 'undefined') return new Set()
  const collapsed = new Set<string>()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('vcs-kanban-collapsed:')) continue
    if (localStorage.getItem(key) === '1') {
      collapsed.add(key.replace('vcs-kanban-collapsed:', ''))
    }
  }
  return collapsed
}

export function useVcsIssues() {
  const issues = ref<VcsIssueSummary[]>([])
  const workspaceRoot = ref('')
  const workspaceName = ref('')
  const loading = ref(true)
  const refreshing = ref(false)
  const error = ref<VcsIssuesErrorResponse | null>(null)
  const lastFetchedAt = ref<Date | null>(null)

  const filters = ref<VcsIssueFilters>({ labels: [], assignees: [] })
  const viewMode = ref<VcsKanbanViewMode>('grouped')
  const collapsedEpics = ref<Set<string>>(new Set())

  const selectedId = ref<string | null>(null)
  const detail = ref<VcsIssueDetail | null>(null)
  const detailLoading = ref(false)
  const lastFocusedCard = ref<HTMLElement | null>(null)

  const filteredIssues = computed(() => filterIssues(issues.value, filters.value))
  const columns = computed(() => groupIssuesByStatus(filteredIssues.value))
  const swimlanes = computed(() => buildSwimlanes(filteredIssues.value, buildTitleById(issues.value)))
  const availableLabels = computed(() => distinctLabels(issues.value))
  const availableAssignees = computed(() => distinctAssignees(issues.value))

  const visibleCount = computed(() => ({
    shown: filteredIssues.value.length,
    total: issues.value.length,
  }))

  const hasActiveFilters = computed(
    () => filters.value.labels.length > 0 || filters.value.assignees.length > 0,
  )

  const filtersMatchNothing = computed(
    () => !loading.value && !error.value && issues.value.length > 0 && filteredIssues.value.length === 0,
  )

  function persistViewMode(mode: VcsKanbanViewMode) {
    viewMode.value = mode
    if (import.meta.client && typeof localStorage !== 'undefined') {
      localStorage.setItem(VCS_KANBAN_VIEW_STORAGE_KEY, mode)
    }
  }

  function setFilters(next: VcsIssueFilters) {
    filters.value = {
      labels: [...next.labels],
      assignees: [...next.assignees],
    }
  }

  function clearFilters() {
    filters.value = { labels: [], assignees: [] }
  }

  function isEpicCollapsed(epicId: string) {
    return collapsedEpics.value.has(epicId)
  }

  function toggleEpicCollapsed(epicId: string) {
    const next = new Set(collapsedEpics.value)
    if (next.has(epicId)) next.delete(epicId)
    else next.add(epicId)

    collapsedEpics.value = next

    if (import.meta.client && typeof localStorage !== 'undefined') {
      const key = vcsKanbanCollapsedStorageKey(epicId)
      if (next.has(epicId)) localStorage.setItem(key, '1')
      else localStorage.removeItem(key)
    }
  }

  async function fetchList(isRefresh = false) {
    if (isRefresh) refreshing.value = true
    else if (!lastFetchedAt.value) loading.value = true

    try {
      const data = await $fetch<VcsIssuesListResponse>('/api/vcs/issues')
      issues.value = data.issues
      workspaceRoot.value = data.workspaceRoot
      workspaceName.value = data.workspaceName
      lastFetchedAt.value = new Date(data.fetchedAt)
      error.value = null

      if (!readStoredViewMode()) {
        viewMode.value = inferDefaultViewMode(issues.value)
      }
    } catch (err: unknown) {
      const fetchError = err as { data?: VcsIssuesErrorResponse; statusMessage?: string }
      error.value = fetchError.data ?? {
        code: 'CLI_ERROR',
        message: fetchError.statusMessage ?? 'Failed to load issues',
      }
      issues.value = []
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  async function refresh() {
    await fetchList(true)
  }

  async function openDetail(id: string, cardEl?: HTMLElement | null) {
    selectedId.value = id
    lastFocusedCard.value = cardEl ?? null
    detailLoading.value = true
    detail.value = null

    try {
      detail.value = await $fetch<VcsIssueDetail>(`/api/vcs/issues/${id}`)
    } catch {
      detail.value = issues.value.find((issue) => issue.id === id) as VcsIssueDetail | undefined ?? null
    } finally {
      detailLoading.value = false
    }
  }

  function closeDetail() {
    selectedId.value = null
    detail.value = null
    nextTick(() => {
      lastFocusedCard.value?.focus()
    })
  }

  const { pause, resume } = useIntervalFn(() => {
    if (document.visibilityState === 'visible') {
      void fetchList(true)
    }
  }, POLL_MS)

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') resume()
    else pause()
  }

  function onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
    if (event.key === 'r' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault()
      void refresh()
    }
    if (event.key === 'Escape' && selectedId.value) {
      closeDetail()
    }
  }

  onMounted(() => {
    collapsedEpics.value = readStoredCollapsedEpics()
    const storedView = readStoredViewMode()
    if (storedView) viewMode.value = storedView
    void fetchList()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    pause()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('keydown', onKeydown)
  })

  const syncLabel = computed(() => {
    if (!lastFetchedAt.value) return ''
    const seconds = Math.max(0, Math.floor((Date.now() - lastFetchedAt.value.getTime()) / 1000))
    if (seconds < 5) return 'just now'
    if (seconds < 60) return `${seconds}s ago`
    return `${Math.floor(seconds / 60)}m ago`
  })

  return {
    issues,
    filters,
    viewMode,
    filteredIssues,
    columns,
    swimlanes,
    availableLabels,
    availableAssignees,
    visibleCount,
    hasActiveFilters,
    filtersMatchNothing,
    workspaceRoot,
    workspaceName,
    loading,
    refreshing,
    error,
    lastFetchedAt,
    syncLabel,
    selectedId,
    detail,
    detailLoading,
    refresh,
    openDetail,
    closeDetail,
    setFilters,
    clearFilters,
    persistViewMode,
    isEpicCollapsed,
    toggleEpicCollapsed,
  }
}
