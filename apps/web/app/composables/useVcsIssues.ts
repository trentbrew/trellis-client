import type {
  VcsIssueDetail,
  VcsIssueStatus,
  VcsIssueSummary,
  VcsIssuesErrorResponse,
  VcsIssuesListResponse,
} from '~/types/vcs-issue'
import { VCS_ISSUE_STATUSES } from '~/types/vcs-issue'

const POLL_MS = 15_000

export function useVcsIssues() {
  const issues = ref<VcsIssueSummary[]>([])
  const workspaceRoot = ref('')
  const workspaceName = ref('')
  const loading = ref(true)
  const refreshing = ref(false)
  const error = ref<VcsIssuesErrorResponse | null>(null)
  const lastFetchedAt = ref<Date | null>(null)

  const selectedId = ref<string | null>(null)
  const detail = ref<VcsIssueDetail | null>(null)
  const detailLoading = ref(false)
  const lastFocusedCard = ref<HTMLElement | null>(null)

  const columns = computed(() => {
    const grouped = Object.fromEntries(VCS_ISSUE_STATUSES.map((status) => [status, [] as VcsIssueSummary[]])) as Record<
      VcsIssueStatus,
      VcsIssueSummary[]
    >

    for (const issue of issues.value) {
      grouped[issue.status]?.push(issue)
    }

    return VCS_ISSUE_STATUSES.map((status) => ({
      status,
      issues: grouped[status] ?? [],
    }))
  })

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
    if (target?.closest('input, textarea, [contenteditable="true"]')) return
    if (event.key === 'r' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault()
      void refresh()
    }
    if (event.key === 'Escape' && selectedId.value) {
      closeDetail()
    }
  }

  onMounted(() => {
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
    columns,
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
  }
}
