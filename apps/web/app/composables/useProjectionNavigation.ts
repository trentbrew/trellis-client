import { getCleanPath } from '~/config/routes'
import { campusZoneMeta } from '~/lib/campus-zones'

// ============================================================================
// Projection Navigation — semantic back/forward for Campus shell chrome
// ============================================================================
//
// Back priority (first match wins):
//   1. Pop stacked entity dialog
//   2. Close originating entity dialog
//   3. Browse type filter → all-types browse
//   4. Parent route segment (above zone home)
//   5. Projection history (session stack)
//
// Forward uses the projection history stack only (after history back).
// ============================================================================

export interface ProjectionFrame {
  path: string
  query: Record<string, string | string[] | undefined>
  hash: string
}

export type SemanticBackKind = 'dialog-stack-pop' | 'close-origin-dialog' | 'navigate'

export interface SemanticBackAction {
  kind: SemanticBackKind
  label: string
  to?: string
  query?: Record<string, string | string[] | undefined>
  hash?: string
}

const MAX_FRAMES = 50

const frames = ref<ProjectionFrame[]>([])
const frameIndex = ref(-1)
let suppressHistory = false
let routeWatchInitialized = false

function snapshotRoute(route: ReturnType<typeof useRoute>): ProjectionFrame {
  return {
    path: getCleanPath(route.path),
    query: Object.fromEntries(
      Object.entries(route.query).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.map((v) => v ?? '') : (value ?? undefined),
      ]),
    ) as ProjectionFrame['query'],
    hash: route.hash || '',
  }
}

function sameFrame(a: ProjectionFrame, b: ProjectionFrame): boolean {
  if (a.path !== b.path || a.hash !== b.hash) return false
  const aKeys = Object.keys(a.query).sort()
  const bKeys = Object.keys(b.query).sort()
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((k) => String(a.query[k] ?? '') === String(b.query[k] ?? ''))
}

function frameToLocation(frame: ProjectionFrame, wp: (path: string) => string) {
  return {
    path: wp(frame.path),
    query: frame.query,
    hash: frame.hash || undefined,
  }
}

/** Signal originating dialogs to close (EntityDialogShell listens). */
export function requestCloseOriginDialog() {
  const signal = useState<number>('navigation:closeOriginDialog', () => 0)
  signal.value += 1
}

export function useProjectionNavigation() {
  const route = useRoute()
  const router = useRouter()
  const { wp } = useWorkspacePath()
  const dialogStack = useDialogStack()
  const { zoneId } = useZoneContext()

  const zoneHome = computed(() => campusZoneMeta(zoneId.value).homePath)

  const semanticBackAction = computed((): SemanticBackAction | null => {
    if (dialogStack.size.value > 0) {
      const top = dialogStack.stack.value[dialogStack.stack.value.length - 1]
      const label = top?.item?.title?.trim() || 'Previous dialog'
      return { kind: 'dialog-stack-pop', label }
    }

    if (dialogStack.originatingDialogOpen.value) {
      return { kind: 'close-origin-dialog', label: 'Close dialog' }
    }

    const cleanPath = getCleanPath(route.path)

    if (cleanPath.startsWith('/workspace/browse')) {
      const type = route.query.type
      if (typeof type === 'string' && type.trim() && type !== 'all') {
        return { kind: 'navigate', label: 'Browse', to: '/workspace/browse' }
      }
    }

    const segments = cleanPath.split('/').filter(Boolean)
    if (segments.length > 1 && cleanPath !== zoneHome.value) {
      const parentPath = `/${segments.slice(0, -1).join('/')}`
      if (parentPath !== cleanPath) {
        const parentSegment = segments[segments.length - 2] ?? 'Back'
        const label = parentSegment.charAt(0).toUpperCase() + parentSegment.slice(1)
        return { kind: 'navigate', label, to: parentPath }
      }
    }

    return null
  })

  const canGoBackHistory = computed(() => frameIndex.value > 0)

  const canGoBack = computed(() => semanticBackAction.value !== null || canGoBackHistory.value)

  const canGoForward = computed(() => frameIndex.value >= 0 && frameIndex.value < frames.value.length - 1)

  const backHint = computed(() => {
    const semantic = semanticBackAction.value
    if (semantic) return semantic.label
    if (canGoBackHistory.value) {
      const prev = frames.value[frameIndex.value - 1]
      if (prev) return prev.path.split('/').filter(Boolean).pop() ?? 'Previous'
    }
    return undefined
  })

  const forwardHint = computed(() => {
    if (!canGoForward.value) return undefined
    const next = frames.value[frameIndex.value + 1]
    if (!next) return undefined
    return next.path.split('/').filter(Boolean).pop() ?? 'Next'
  })

  function recordRouteChange(currentRoute: ReturnType<typeof useRoute>) {
    if (!import.meta.client || suppressHistory) return

    const frame = snapshotRoute(currentRoute)
    const current = frameIndex.value >= 0 ? frames.value[frameIndex.value] : null
    if (current && sameFrame(current, frame)) return

    const truncated = frames.value.slice(0, frameIndex.value + 1)
    truncated.push(frame)
    if (truncated.length > MAX_FRAMES) truncated.shift()

    frames.value = truncated
    frameIndex.value = truncated.length - 1
  }

  if (import.meta.client && !routeWatchInitialized) {
    routeWatchInitialized = true
    const route = useRoute()
    watch(
      () => [route.path, route.query, route.hash] as const,
      () => recordRouteChange(route),
      { deep: true, immediate: true },
    )
  }

  async function navigateToFrame(frame: ProjectionFrame) {
    suppressHistory = true
    try {
      await router.push(frameToLocation(frame, wp))
    } finally {
      await nextTick()
      suppressHistory = false
    }
  }

  async function goBack() {
    const semantic = semanticBackAction.value
    if (semantic) {
      if (semantic.kind === 'dialog-stack-pop') {
        dialogStack.pop()
        return
      }
      if (semantic.kind === 'close-origin-dialog') {
        requestCloseOriginDialog()
        return
      }
      if (semantic.kind === 'navigate' && semantic.to) {
        suppressHistory = true
        try {
          await router.push({
            path: wp(semantic.to),
            query: semantic.query,
            hash: semantic.hash || undefined,
          })
        } finally {
          await nextTick()
          suppressHistory = false
        }
        return
      }
    }

    if (!canGoBackHistory.value) return
    const nextIndex = frameIndex.value - 1
    const target = frames.value[nextIndex]
    if (!target) return
    frameIndex.value = nextIndex
    await navigateToFrame(target)
  }

  async function goForward() {
    if (!canGoForward.value) return
    const nextIndex = frameIndex.value + 1
    const target = frames.value[nextIndex]
    if (!target) return
    frameIndex.value = nextIndex
    await navigateToFrame(target)
  }

  return {
    canGoBack,
    canGoForward,
    backHint,
    forwardHint,
    goBack,
    goForward,
    semanticBackAction,
  }
}
