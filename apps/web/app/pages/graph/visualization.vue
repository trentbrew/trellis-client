<script setup lang="ts">
  import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCenter,
    forceCollide,
    forceX,
    forceY,
    type SimulationNodeDatum,
    type SimulationLinkDatum,
  } from 'd3-force'
  import { select } from 'd3-selection'
  import { zoom as d3Zoom, zoomIdentity, type ZoomTransform, type D3ZoomEvent } from 'd3-zoom'
  import { entityQuery } from '~/lib/tql-namespace'
  import { getRecurringSeriesKey } from '~/utils/recurrence'
  import { useGraphTypesSidebar, colorTokenToHex } from '~/composables/useGraphTypesSidebar'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import { ENTITY_NAVIGATE_KEY } from '~/composables/useDialogStack'

  const graph = useTrellisGraph()
  const graphTypesSidebar = useGraphTypesSidebar()
  const { items: allEntities } = useTrellisEntities()

  const currentLayout = ref<'physics' | 'type'>('physics')

  watch(currentLayout, () => {
    nextTick(() => initGraph())
  })

  // ── Types ─────────────────────────────────────────────────────────────

  interface SimNode extends SimulationNodeDatum {
    id: string
    type: string
    label: string
    status?: string
  }

  interface _SimLink extends SimulationLinkDatum<SimNode> {
    type: string
  }

  interface GEdge {
    source: string
    target: string
    type: string
  }

  // ── Config ────────────────────────────────────────────────────────────

  const GRAPH = {
    label: 900,
    edge: 250,
    card: 150,
    icon: 1800,
    dense: 1500,
    pad: 140,
  } as const

  function cfg(size: number) {
    return {
      label: size <= GRAPH.label,
      edge: size <= GRAPH.edge,
      card: size <= GRAPH.card,
      icon: size <= GRAPH.icon,
      dense: size >= GRAPH.dense,
      dist: size > 2200 ? 45 : size > 1200 ? 60 : 90,
      charge: size > 2200 ? -90 : size > 1200 ? -130 : -250,
      collide: size > 2200 ? 11 : size > 1200 ? 15 : 22,
      decay: size > 2200 ? 0.09 : size > 1200 ? 0.07 : 0.05,
      link: size > 2200 ? 0.2 : size > 1200 ? 0.3 : 0.5,
    }
  }

  // ── Entity Colors & Icons ─────────────────────────────────────────────

  const ENTITY_COLORS: Record<string, string> = {
    backlog: 'var(--text-weak, var(--muted-foreground))',
    queue: 'var(--text-info, hsl(200 80% 50%))',
    in_progress: 'var(--text-warning, hsl(30 80% 50%))',
    paused: '#bc8cff',
    closed: 'var(--text-success, hsl(150 60% 40%))',
    agent: 'var(--accent-primary, hsl(260 60% 55%))',
    milestone: 'var(--text-info, hsl(200 80% 50%))',
    project: '#f472b6',
    memory: '#a78bfa',
    mcp: '#34d399',
    sprite: '#fb923c',
    workunit: '#60a5fa',
    cycle: '#22d3ee',
    epic: '#f472b6',
    roadmap: '#a3e635',
    suggestion: '#fbbf24',
    file: '#94a3b8',
    directory: '#cbd5e1',
    task: '#60a5fa',
    issue: '#f97316',
    note: '#a78bfa',
    page: '#818cf8',
    event: '#fb923c',
    contact: '#34d399',
    bookmark: '#fbbf24',
  }

  const ENTITY_ICONS: Record<string, string> = {
    project: '<path d="M2.08 2.92V16.25H17.92V5.42H10L8.33 2.92H2.08Z" stroke="currentColor" stroke-linecap="round"/>',
    issue:
      '<path d="M9.58 13.75H17.08M9.58 6.25H17.08M2.92 6.67L4.58 7.92L7.08 4.17M2.92 14.17L4.58 15.42L7.08 11.67" stroke="currentColor" stroke-linecap="square"/>',
    task: '<path d="M9.58 13.75H17.08M9.58 6.25H17.08M2.92 6.67L4.58 7.92L7.08 4.17M2.92 14.17L4.58 15.42L7.08 11.67" stroke="currentColor" stroke-linecap="square"/>',
    agent:
      '<path d="M13.33 8.75C11.49 8.75 10 7.26 10 5.42M6.67 11.25C8.51 11.25 10 12.74 10 14.58M10 2.78V17.07M16 15.05C17.13 14.59 17.92 13.48 17.92 12.2C17.92 11.34 17.56 10.56 16.99 10C17.56 9.44 17.92 8.66 17.92 7.8C17.92 6.21 16.71 4.91 15.17 4.74C14.79 3.21 13.4 2.08 11.76 2.08C11.12 2.08 10.52 2.25 10 2.55C9.48 2.25 8.88 2.08 8.24 2.08C6.59 2.08 5.21 3.21 4.83 4.74C3.28 4.91 2.08 6.21 2.08 7.8C2.08 8.66 2.44 9.44 3.01 10C2.44 10.56 2.08 11.34 2.08 12.2C2.08 13.48 2.87 14.59 3.99 15.05C4.47 16.7 5.99 17.92 7.8 17.92C8.61 17.92 9.37 17.67 10 17.25C10.63 17.67 11.38 17.92 12.2 17.92C14.01 17.92 15.53 16.7 16 15.05Z" stroke="currentColor"/>',
    file: '<path d="M4.17 2.08V17.92H15.83V6.25L11.67 2.08H4.17Z" stroke="currentColor" stroke-linecap="square"/><path d="M11.67 2.08V6.25H15.83" stroke="currentColor" stroke-linecap="square"/>',
    directory:
      '<path d="M2.08 2.92V16.25H17.92V5.42H10L8.33 2.92H2.08Z" stroke="currentColor" stroke-linecap="round"/>',
    note: '<path d="M4.17 2.08H15.83V17.92H4.17V2.08Z" stroke="currentColor"/><path d="M7.08 6.25H12.92M7.08 10H12.92M7.08 13.75H10" stroke="currentColor" stroke-linecap="round"/>',
    page: '<path d="M4.17 2.08H15.83V17.92H4.17V2.08Z" stroke="currentColor"/><path d="M7.08 6.25H12.92M7.08 10H12.92M7.08 13.75H10" stroke="currentColor" stroke-linecap="round"/>',
    milestone: '<path d="M10 2.08L17.92 10L10 17.92L2.08 10L10 2.08Z" stroke="currentColor" stroke-linecap="round"/>',
    event:
      '<path d="M2.92 4.58H17.08V17.08H2.92V4.58Z" stroke="currentColor"/><path d="M6.25 2.08V5.42M13.75 2.08V5.42M2.92 8.33H17.08" stroke="currentColor" stroke-linecap="round"/>',
    contact:
      '<circle cx="10" cy="7.5" r="3" stroke="currentColor"/><path d="M4.17 17.08C4.17 13.75 6.67 11.25 10 11.25C13.33 11.25 15.83 13.75 15.83 17.08" stroke="currentColor" stroke-linecap="round"/>',
  }

  const EDGE_CARDINALITY: Record<string, [string, string]> = {
    contains: ['1', '*'],
    assigns: ['1', '1'],
    blocks: ['1', '1'],
    remembers: ['1', '*'],
    tracks: ['1', '*'],
    parent: ['1', '*'],
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  function nodeColor(n: SimNode): string {
    try {
      const cfg = getEntityTypeConfig(n.type as any)
      if (cfg?.color) return colorTokenToHex(cfg.color)
    } catch {}
    if (ENTITY_COLORS[n.type]) return ENTITY_COLORS[n.type]!
    return ENTITY_COLORS[n.status ?? 'backlog'] ?? ENTITY_COLORS.backlog!
  }

  function nodeRadius(n: SimNode): number {
    if (n.type === 'issue') return 15
    if (n.type === 'project') return 13
    if (n.type === 'sprite') return 12
    if (n.type === 'roadmap') return 11
    if (n.type === 'epic') return 10
    if (n.type === 'cycle') return 8
    if (n.type === 'suggestion') return 6
    if (n.type === 'directory') return 8
    if (n.type === 'file') return 6
    if (n.type === 'task') return 12
    if (n.type === 'milestone') return 11
    if (n.type === 'agent') return 10
    return 7
  }

  function viewBounds(t: ZoomTransform, width: number, height: number) {
    return {
      left: (-t.x - GRAPH.pad) / t.k,
      top: (-t.y - GRAPH.pad) / t.k,
      right: (width - t.x + GRAPH.pad) / t.k,
      bottom: (height - t.y + GRAPH.pad) / t.k,
    }
  }

  type Box = ReturnType<typeof viewBounds>

  function visible(n: SimNode, box: Box): boolean {
    const x = n.x ?? 0
    const y = n.y ?? 0
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
  }

  function visibleLink(l: SimulationLinkDatum<SimNode>, box: Box): boolean {
    const s = l.source as SimNode
    const t = l.target as SimNode
    const sx = s.x ?? 0,
      sy = s.y ?? 0
    const tx = t.x ?? 0,
      ty = t.y ?? 0
    return (
      Math.max(sx, tx) >= box.left &&
      Math.min(sx, tx) <= box.right &&
      Math.max(sy, ty) >= box.top &&
      Math.min(sy, ty) <= box.bottom
    )
  }

  // ── Cardinality Drawing (canvas) ──────────────────────────────────────

  function drawCardinalityCanvas(ctx: CanvasRenderingContext2D, card: string, x: number, y: number, angle: number) {
    const sz = 6
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const px = -sin
    const py = cos

    if (card === '1') {
      ctx.beginPath()
      ctx.moveTo(x + px * sz, y + py * sz)
      ctx.lineTo(x - px * sz, y - py * sz)
      ctx.stroke()
    } else if (card === '*') {
      for (const offset of [-1, 0, 1]) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + cos * sz * 1.2 + px * sz * offset * 0.7, y + sin * sz * 1.2 + py * sz * offset * 0.7)
        ctx.stroke()
      }
    } else if (card === '0..1') {
      ctx.beginPath()
      ctx.arc(x + cos * sz, y + sin * sz, 3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + px * sz, y + py * sz)
      ctx.lineTo(x - px * sz, y - py * sz)
      ctx.stroke()
    } else if (card === '1..*') {
      ctx.beginPath()
      ctx.moveTo(x + px * sz, y + py * sz)
      ctx.lineTo(x - px * sz, y - py * sz)
      ctx.stroke()
      const fx = x + cos * sz
      const fy = y + sin * sz
      for (const offset of [-1, 0, 1]) {
        ctx.beginPath()
        ctx.moveTo(fx, fy)
        ctx.lineTo(fx + cos * sz * 0.8 + px * sz * offset * 0.7, fy + sin * sz * 0.8 + py * sz * offset * 0.7)
        ctx.stroke()
      }
    }
  }

  // ── State (declared early — type visibility computed refs these) ──────

  const canvasWrapRef = ref<HTMLDivElement | null>(null)
  const canvasRef = ref<HTMLCanvasElement | null>(null)
  const minimapCanvasRef = ref<HTMLCanvasElement | null>(null)
  const graphNodes = shallowRef<SimNode[]>([])
  const graphEdges = shallowRef<GEdge[]>([])
  const loading = ref(true)

  // ── Type Visibility (sidebar filter) ──────────────────────────────────

  const typesInGraph = computed(() => {
    const counts = new Map<string, number>()
    for (const node of graphNodes.value) {
      if (!node.type) continue
      counts.set(node.type, (counts.get(node.type) || 0) + 1)
    }
    const entries: Array<{ type: string; count: number; color: string; icon: string; label: string }> = []
    for (const [type, count] of counts) {
      const cfg = graphTypesSidebar.resolveConfig(type)
      entries.push({ type, count, color: cfg.color, icon: cfg.icon, label: cfg.label })
    }
    return entries.sort((a, b) => b.count - a.count)
  })

  watch(
    typesInGraph,
    (entries) => {
      graphTypesSidebar.setEntries(entries)
    },
    { immediate: true },
  )

  const visibleGraphNodes = computed(() => graphNodes.value.filter((n) => graphTypesSidebar.isVisible(n.type)))

  // ── Interaction State ─────────────────────────────────────────────────

  const hoveredNodeId = ref<string | null>(null)
  const hoverPos = ref({ x: 0, y: 0 })
  const selectedEntityId = ref<string | null>(null)
  const dialogOpen = ref(false)
  const { setOriginHash, clearHash } = useDialogUrl()

  const hoveredNode = computed(() => {
    if (!hoveredNodeId.value) return null
    return graphNodes.value.find((n) => n.id === hoveredNodeId.value) ?? null
  })

  const hoveredNodeMeta = computed(() => {
    const n = hoveredNode.value
    if (!n) return null
    const cfg = graphTypesSidebar.resolveConfig(n.type)
    return {
      label: n.label,
      type: n.type,
      typeLabel: cfg.label,
      icon: cfg.icon,
      color: colorTokenToHex(cfg.color),
      status: n.status,
    }
  })

  const dialogItem = computed(() => {
    if (!selectedEntityId.value) return null
    const found = allEntities.value.find((e) => e.id === selectedEntityId.value)
    if (found) return found
    const n = graphNodes.value.find((nn) => nn.id === selectedEntityId.value)
    if (!n) return null
    return { id: n.id, type: n.type, title: n.label } as any
  })

  watch(dialogOpen, (open) => {
    if (!open) {
      selectedEntityId.value = null
      clearHash()
    }
  })

  watch(selectedEntityId, () => {
    _applySelection?.()
  })

  // Expose a hook the renderer calls when zoom should focus a node
  let _zoomToNode: ((id: string) => void) | null = null
  let _applySelection: (() => void) | null = null

  function openNodeDialog(id: string) {
    selectedEntityId.value = id
    dialogOpen.value = true
    setOriginHash(id)
    _zoomToNode?.(id)
  }

  // Intercept mention/reference clicks inside the inset panel:
  // swap panel content to the referenced entity and pan/zoom to it
  // instead of stacking a new dialog.
  provide(ENTITY_NAVIGATE_KEY, (id: string): boolean => {
    const exists = graphNodes.value.some((n) => n.id === id)
    if (!exists) return false
    selectedEntityId.value = id
    setOriginHash(id)
    _zoomToNode?.(id)
    return true
  })

  // ── Minimap dimensions ────────────────────────────────────────────────
  // Minimap renders directly to its own canvas — no Vue reactive intermediates.
  const MINIMAP_W = 180
  const MINIMAP_H = 120

  // ── Derived stats ─────────────────────────────────────────────────────

  const visibleNodeCount = computed(() => visibleGraphNodes.value.length)
  const totalNodeCount = computed(() => graphNodes.value.length)
  const visibleEdgeCount = computed(() => {
    const ids = new Set(visibleGraphNodes.value.map((n) => n.id))
    return graphEdges.value.filter((e) => ids.has(e.source) && ids.has(e.target)).length
  })

  // ── Fetch ─────────────────────────────────────────────────────────────

  // Tracks whether we've completed the first fetch. After that, refreshes
  // run silently in the background — we must NOT flip `loading` back to
  // true, which would unmount the canvas (the loading spinner lives in a
  // `v-if` branch) and force a full renderer teardown on every SSE bump.
  const hasLoadedOnce = ref(false)

  const fetchGraphData = async () => {
    if (!hasLoadedOnce.value) loading.value = true
    try {
      const result = await graph.queryOnce(entityQuery('?e'))
      const ids = result.data.map((row) => String((row as any)['?e']))

      if (ids.length === 0) {
        graphNodes.value = []
        graphEdges.value = []
        return
      }

      const batchResult = await $fetch<{ nodes: Array<Record<string, any>> }>('/api/graph/nodes', {
        method: 'POST',
        body: { ids },
      })

      const nodeList: SimNode[] = []
      const edgeList: GEdge[] = []

      const seenSeriesKeys = new Set<string>()
      const deduplicatedNodes = (batchResult.nodes || []).filter((raw) => {
        const key = getRecurringSeriesKey(raw as Record<string, any>)
        if (!key) return true
        if (seenSeriesKeys.has(key)) return false
        seenSeriesKeys.add(key)
        return true
      })

      const idSet = new Set(deduplicatedNodes.map((n) => String(n['@id'] || n.id || '')))

      for (const raw of deduplicatedNodes) {
        const id = String(raw['@id'] || raw.id || '')
        if (!id) continue
        nodeList.push({
          id,
          type: String(raw['@type'] || raw.type || 'entity'),
          label: String(raw.title || id),
          status: raw.status ? String(raw.status) : undefined,
        })

        const links = raw._links as { outgoing?: Array<{ relation: string; target: string }> } | undefined
        if (links?.outgoing) {
          for (const link of links.outgoing) {
            if (idSet.has(link.target) && link.target !== id) {
              edgeList.push({ source: id, target: link.target, type: link.relation })
            }
          }
        }
      }

      graphNodes.value = nodeList
      graphEdges.value = edgeList
    } catch (err) {
      console.error('[graph/visualization] fetch error:', err)
    } finally {
      loading.value = false
      hasLoadedOnce.value = true
    }
  }

  // ── Graph State Persistence ────────────────────────────────────────────

  const STORAGE_KEY = 'trellis:graph:layout'

  interface GraphCache {
    /** Hash of sorted node IDs — invalidate when data changes */
    hash: string
    positions: Record<string, { x: number; y: number }>
    zoom?: { k: number; x: number; y: number }
  }

  function computeHash(nodes: SimNode[]): string {
    // Simple hash: sorted IDs joined, then a quick numeric hash
    // We append the layout type so switching layouts invalidates the position cache
    const str =
      nodes
        .map((n) => n.id)
        .sort()
        .join('|') +
      '::' +
      currentLayout.value
    let h = 0
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
    return String(h)
  }

  function loadCache(hash: string): GraphCache | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const cache: GraphCache = JSON.parse(raw)
      return cache.hash === hash ? cache : null
    } catch {
      return null
    }
  }

  function saveCache(cache: GraphCache) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
    } catch {}
  }

  function savePositions(nodes: SimNode[], hash: string, zoomT?: { k: number; x: number; y: number }) {
    // Merge with any existing cache so positions for nodes that are
    // currently hidden (via sidebar filter) aren't lost when we
    // overwrite. The hash is stable across visibility toggles.
    const existing = loadCache(hash)
    const positions: Record<string, { x: number; y: number }> = existing ? { ...existing.positions } : {}
    for (const n of nodes) {
      if (n.x != null && n.y != null) positions[n.id] = { x: n.x, y: n.y }
    }
    saveCache({ hash, positions, zoom: zoomT })
  }

  // ── Renderer (Canvas) ─────────────────────────────────────────────────
  // One HiDPI canvas for the main graph + a smaller one for the minimap.
  // A single RAF loop drives both physics and drawing. The loop idles
  // itself once the simulation settles and nothing is hovered/selected;
  // any interaction (pointer move, zoom, visibility change) schedules a
  // new frame via `ensureRaf()`.

  let cleanup: (() => void) | null = null

  function renderForceGraph(
    wrap: HTMLDivElement,
    canvas: HTMLCanvasElement,
    minimapCanvas: HTMLCanvasElement | null,
    nodes: SimNode[],
    links: GEdge[],
  ): () => void {
    // Render-loop state — declared up-front so callbacks that close over
    // these (ResizeObserver, zoom.on, icon onload, etc.) don't hit a
    // temporal dead zone when they fire before the bottom of this fn.
    let raf = 0
    let needsRender = true
    let idleFrames = 0
    let minimapFrameCount = 0

    let width = wrap.clientWidth || 800
    let height = wrap.clientHeight || 600
    const opt = cfg(nodes.length)
    // Hash uses ALL known nodes (not the visible subset) so toggling
    // type visibility doesn't invalidate the cached layout.
    const hash = computeHash(graphNodes.value)
    const cache = loadCache(hash)

    // ── Seed positions ────────────────────────────────────────────────
    const hasCached = !!cache && Object.keys(cache.positions).length > 0
    if (hasCached) {
      for (const n of nodes) {
        const p = cache!.positions[n.id]
        if (p) {
          n.x = p.x
          n.y = p.y
        }
      }
    } else {
      const baseRadius = Math.max(width, height) * 1.5
      const goldenAngle = Math.PI * (3 - Math.sqrt(5))
      const scx = width / 2
      const scy = height / 2
      for (let i = 0; i < nodes.length; i++) {
        const r = baseRadius * Math.sqrt((i + 1) / nodes.length)
        const theta = i * goldenAngle
        nodes[i]!.x = scx + r * Math.cos(theta)
        nodes[i]!.y = scy + r * Math.sin(theta)
      }
    }

    // ── Canvas setup (DPR-aware) ──────────────────────────────────────
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return () => {}

    function applyCanvasSize() {
      width = wrap.clientWidth || width
      height = wrap.clientHeight || height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
    }
    applyCanvasSize()

    // Re-render on container resize (debounced via RAF)
    const ro = new ResizeObserver(() => {
      applyCanvasSize()
      needsRender = true
      ensureRaf()
    })
    ro.observe(wrap)

    // Resolve theme colors once from CSS to avoid per-draw getComputedStyle
    const cs = getComputedStyle(wrap)
    const readVar = (name: string, fallback: string) => {
      const v = cs.getPropertyValue(name).trim()
      return v || fallback
    }
    const bgCol = readVar('--background', '#0a0a0a')
    const mutedCol = readVar('--muted-foreground', '#94a3b8')
    const borderCol = readVar('--border', mutedCol)
    const primaryCol = readVar('--primary', '#3b82f6')

    // Pre-compute per-node color, radius, and id→node lookup
    // (constant for a render session)
    const colorCache = new Map<string, string>()
    const radiusCache = new Map<string, number>()
    const nodeById = new Map<string, SimNode>()
    for (const n of nodes) {
      colorCache.set(n.id, nodeColor(n))
      radiusCache.set(n.id, nodeRadius(n))
      nodeById.set(n.id, n)
    }

    // ── Icon bitmap cache: rasterize each unique entity icon once ─────
    const iconBitmaps = new Map<string, HTMLImageElement>()
    function loadIconBitmap(type: string) {
      if (iconBitmaps.has(type)) return
      const path = ENTITY_ICONS[type]
      if (!path) return
      const iconPx = 48
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="${iconPx}" height="${iconPx}" fill="none" stroke="${bgCol}" stroke-width="1.5">` +
        path.replace(/currentColor/g, bgCol) +
        `</svg>`
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        iconBitmaps.set(type, img)
        needsRender = true
        ensureRaf()
      }
      img.onerror = () => URL.revokeObjectURL(url)
      img.src = url
    }
    if (opt.icon) {
      const uniqueTypes = new Set<string>()
      for (const n of nodes) uniqueTypes.add(n.type)
      for (const t of uniqueTypes) loadIconBitmap(t)
    }

    // ── Adjacency for fast hover highlighting ─────────────────────────
    const adjacency = new Map<string, Set<string>>()
    for (const e of links) {
      if (!adjacency.has(e.source)) adjacency.set(e.source, new Set())
      if (!adjacency.has(e.target)) adjacency.set(e.target, new Set())
      adjacency.get(e.source)!.add(e.target)
      adjacency.get(e.target)!.add(e.source)
    }

    // ── Simulation ────────────────────────────────────────────────────
    const simLinks = links.map((l) => ({ ...l })) as SimulationLinkDatum<SimNode>[]
    const startAlpha = hasCached ? 0.02 : 0.6
    const decayRate = hasCached ? opt.decay * 2 : opt.decay * 0.6
    const alphaMin = 0.003
    const cx = width / 2
    const cy = height / 2

    const simulation = forceSimulation<SimNode>(nodes).alphaMin(alphaMin).alpha(startAlpha).alphaDecay(decayRate)

    if (currentLayout.value === 'type') {
      const uniqueTypes = Array.from(new Set(nodes.map((n) => n.type)))
      const r = Math.min(width, height) * 0.4
      const typePositions = new Map<string, { x: number; y: number }>()
      uniqueTypes.forEach((t, i) => {
        const theta = (i / uniqueTypes.length) * Math.PI * 2
        typePositions.set(t, { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) })
      })
      simulation
        .force(
          'link',
          forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
            .id((d) => d.id)
            .distance(opt.dist)
            .strength(0.02),
        )
        .force('charge', forceManyBody<SimNode>().strength(opt.charge * 0.5))
        .force('collide', forceCollide<SimNode>(opt.collide))
        .force('x', forceX<SimNode>((d) => typePositions.get(d.type)?.x ?? cx).strength(0.3))
        .force('y', forceY<SimNode>((d) => typePositions.get(d.type)?.y ?? cy).strength(0.3))
    } else {
      simulation
        .force(
          'link',
          forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
            .id((d) => d.id)
            .distance(opt.dist),
        )
        .force('charge', forceManyBody<SimNode>().strength(opt.charge))
        .force('center', forceCenter(cx, cy))
        .force('collide', forceCollide<SimNode>(opt.collide))
    }

    // We drive ticks ourselves from the RAF loop so rendering + physics
    // stay in lockstep with the browser's frame budget.
    simulation.stop()

    // ── Zoom / pan ────────────────────────────────────────────────────
    let currentZoom: ZoomTransform = zoomIdentity
    let dragCandidate: SimNode | null = null
    const canvasSel = select(canvas as unknown as Element)

    const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.15, 4])
      .filter((event: any) => {
        // Don't let zoom swallow a pointer-down on a node; we use that
        // for node dragging below.
        if (event.type === 'mousedown' || event.type === 'pointerdown') {
          if (dragCandidate) return false
          return !event.button
        }
        if (event.type === 'wheel') return event.ctrlKey || event.metaKey
        return !event.ctrlKey
      })
      .on('zoom', (event: D3ZoomEvent<HTMLCanvasElement, unknown>) => {
        currentZoom = event.transform
        needsRender = true
        schedulePersist()
        ensureRaf()
      })

    canvasSel.call(zoomBehavior as any).on('dblclick.zoom', null)
    // NOTE: initial zoom transform is applied at the bottom of this fn,
    // after `persistTimer`, `miniCtx`, etc. are in scope. Applying it
    // here would synchronously fire the 'zoom' handler and hit a TDZ.

    // Plain wheel = pan
    const onWheelPan = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      event.preventDefault()
      ;(zoomBehavior as any).translateBy(canvasSel, -event.deltaX, -event.deltaY)
    }
    canvas.addEventListener('wheel', onWheelPan, { passive: false })

    // ── Pointer interaction: hover, click, drag ───────────────────────
    let dragActive = false
    let dragStartX = 0
    let dragStartY = 0
    let pendingPointerId: number | null = null

    function toWorld(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect()
      const sx = clientX - rect.left
      const sy = clientY - rect.top
      return {
        x: (sx - currentZoom.x) / currentZoom.k,
        y: (sy - currentZoom.y) / currentZoom.k,
        screenX: sx,
        screenY: sy,
      }
    }

    function pickNode(worldX: number, worldY: number): SimNode | null {
      // Linear scan — for N ≤ ~2k this is faster than a quadtree rebuild.
      let best: SimNode | null = null
      let bestD2 = Infinity
      for (const n of nodes) {
        const nx = n.x ?? 0
        const ny = n.y ?? 0
        const dx = nx - worldX
        const dy = ny - worldY
        const d2 = dx * dx + dy * dy
        const r = (radiusCache.get(n.id) ?? 7) + 2
        if (d2 <= r * r && d2 < bestD2) {
          bestD2 = d2
          best = n
        }
      }
      return best
    }

    function kick(alpha: number) {
      if (simulation.alpha() < alpha) simulation.alpha(alpha)
      needsRender = true
      ensureRaf()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (dragActive && dragCandidate) {
        const w = toWorld(event.clientX, event.clientY)
        dragCandidate.fx = w.x
        dragCandidate.fy = w.y
        kick(0.04)
        return
      }
      // Promote a pending press into a drag once the pointer actually moves.
      if (dragCandidate && !dragActive) {
        if (Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY) > 3) {
          dragActive = true
          simulation.alphaTarget(0.04)
          kick(0.04)
        }
      }

      const w = toWorld(event.clientX, event.clientY)
      hoverPos.value = { x: w.screenX, y: w.screenY }
      const n = pickNode(w.x, w.y)
      const nid = n?.id ?? null
      if (nid !== hoveredNodeId.value) {
        // Pin the newly-hovered node so physics can't shove it out from
        // under the cursor. Release whichever node was hovered before.
        const prevId = hoveredNodeId.value
        if (prevId) {
          const prev = nodeById.get(prevId)
          if (prev && !(dragCandidate && dragCandidate.id === prevId)) {
            prev.fx = null
            prev.fy = null
          }
        }
        if (n) {
          n.fx = n.x
          n.fy = n.y
        }
        hoveredNodeId.value = nid
        canvas.style.cursor = nid ? 'pointer' : ''
        needsRender = true
        ensureRaf()
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      const w = toWorld(event.clientX, event.clientY)
      const n = pickNode(w.x, w.y)
      if (n) {
        dragCandidate = n
        dragStartX = event.clientX
        dragStartY = event.clientY
        pendingPointerId = event.pointerId
        try {
          canvas.setPointerCapture(event.pointerId)
        } catch {}
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (pendingPointerId != null) {
        try {
          canvas.releasePointerCapture(pendingPointerId)
        } catch {}
        pendingPointerId = null
      }
      const candidate = dragCandidate
      const wasDragging = dragActive
      dragCandidate = null
      dragActive = false

      if (candidate) {
        if (wasDragging) {
          simulation.alphaTarget(0)
          // If the cursor is still over the node, keep it pinned under
          // the hover-lock; otherwise release it to the simulation.
          if (candidate.id !== hoveredNodeId.value) {
            candidate.fx = null
            candidate.fy = null
          }
        } else {
          // Small-move press → click.
          const moved = Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY)
          if (moved < 3) openNodeDialog(candidate.id)
        }
      } else {
        // Click on empty canvas → deselect
        if (selectedEntityId.value) {
          selectedEntityId.value = null
          dialogOpen.value = false
          needsRender = true
          ensureRaf()
        }
      }
    }

    const onPointerLeave = () => {
      if (dragActive) return
      if (hoveredNodeId.value) {
        const prev = nodeById.get(hoveredNodeId.value)
        if (prev && !(dragCandidate && dragCandidate.id === prev.id)) {
          prev.fx = null
          prev.fy = null
        }
        hoveredNodeId.value = null
        canvas.style.cursor = ''
        needsRender = true
        ensureRaf()
      }
    }

    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerLeave)

    // ── Zoom-to-node (used by dialog entity navigation) ───────────────
    _zoomToNode = (id: string) => {
      const node = nodes.find((n) => n.id === id)
      if (!node) return
      const neighborNodes: SimNode[] = [node]
      for (const l of simLinks) {
        const s = l.source as SimNode
        const t = l.target as SimNode
        if (s.id === id && !neighborNodes.includes(t)) neighborNodes.push(t)
        if (t.id === id && !neighborNodes.includes(s)) neighborNodes.push(s)
      }
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity
      for (const n of neighborNodes) {
        const x = n.x ?? 0
        const y = n.y ?? 0
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
      const pad = 80
      minX -= pad
      minY -= pad
      maxX += pad
      maxY += pad
      const bboxW = maxX - minX
      const bboxH = maxY - minY
      const ccx = (minX + maxX) / 2
      const ccy = (minY + maxY) / 2
      const targetK = Math.min(2.0, Math.max(0.2, Math.min(width / bboxW, height / bboxH)))
      const t = zoomIdentity.translate(width / 2 - ccx * targetK, height / 2 - ccy * targetK).scale(targetK)
      canvasSel
        .transition()
        .duration(450)
        .call(zoomBehavior.transform as any, t)
    }

    // Selection/highlight just requests a redraw; the render fn inspects
    // current Vue state each frame.
    _applySelection = () => {
      needsRender = true
      ensureRaf()
    }

    // Re-render when hover/select change from outside (e.g. ENTITY_NAVIGATE_KEY)
    const stopHoverWatch = watch([hoveredNodeId, selectedEntityId], () => {
      needsRender = true
      ensureRaf()
    })

    // ── Position persistence (throttled) ──────────────────────────────
    let persistTimer: ReturnType<typeof setTimeout> | null = null
    function schedulePersist() {
      if (persistTimer) return
      persistTimer = setTimeout(() => {
        persistTimer = null
        savePositions(nodes, hash, { k: currentZoom.k, x: currentZoom.x, y: currentZoom.y })
      }, 400)
    }

    // ── Render loop ───────────────────────────────────────────────────
    // (raf/needsRender/idleFrames/minimapFrameCount hoisted above)

    function frame() {
      raf = 0
      const alpha = simulation.alpha()
      const active = alpha > alphaMin || dragActive

      if (active) {
        simulation.tick()
        needsRender = true
        idleFrames = 0
      }

      if (needsRender) {
        needsRender = false
        draw()
        minimapFrameCount++
        if (minimapFrameCount >= 12 || !active) {
          minimapFrameCount = 0
          drawMinimap()
        }
        if (!active) {
          // Persist final state once when the graph settles.
          savePositions(nodes, hash, { k: currentZoom.k, x: currentZoom.x, y: currentZoom.y })
        }
      } else {
        idleFrames++
        if (idleFrames > 30) return // stop RAF; interactions will resume it
      }

      raf = requestAnimationFrame(frame)
    }

    function ensureRaf() {
      if (raf) return
      idleFrames = 0
      raf = requestAnimationFrame(frame)
    }

    function draw() {
      if (!ctx) return
      const pxW = canvas.width
      const pxH = canvas.height

      // Clear + apply DPR + zoom transform in a single setTransform.
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, pxW, pxH)
      ctx.setTransform(dpr * currentZoom.k, 0, 0, dpr * currentZoom.k, dpr * currentZoom.x, dpr * currentZoom.y)

      const box = viewBounds(currentZoom, width, height)
      const hid = hoveredNodeId.value
      const sid = selectedEntityId.value
      const activeIds = hid || sid ? new Set<string>([hid, sid].filter(Boolean) as string[]) : null

      // Expand neighbor set once if something is active
      let neighbors: Set<string> | null = null
      if (activeIds) {
        neighbors = new Set(activeIds)
        for (const id of activeIds) {
          const adj = adjacency.get(id)
          if (adj) for (const nb of adj) neighbors.add(nb)
        }
      }

      // ── Edges ───────────────────────────────────────────────────────
      if (activeIds) {
        // Dim pass — everything not touching an active node
        ctx.globalAlpha = 0.08
        ctx.strokeStyle = borderCol
        ctx.lineWidth = 0.5
        ctx.beginPath()
        for (const l of simLinks) {
          if (!visibleLink(l, box)) continue
          const s = l.source as SimNode
          const t = l.target as SimNode
          if (activeIds.has(s.id) || activeIds.has(t.id)) continue
          ctx.moveTo(s.x!, s.y!)
          ctx.lineTo(t.x!, t.y!)
        }
        ctx.stroke()

        // Highlight pass — primary stroke on connected edges
        ctx.globalAlpha = 0.9
        ctx.strokeStyle = primaryCol
        ctx.lineWidth = 2
        ctx.beginPath()
        for (const l of simLinks) {
          if (!visibleLink(l, box)) continue
          const s = l.source as SimNode
          const t = l.target as SimNode
          if (!(activeIds.has(s.id) || activeIds.has(t.id))) continue
          ctx.moveTo(s.x!, s.y!)
          ctx.lineTo(t.x!, t.y!)
        }
        ctx.stroke()
      } else {
        ctx.globalAlpha = opt.link
        ctx.strokeStyle = borderCol
        ctx.lineWidth = 1
        ctx.beginPath()
        for (const l of simLinks) {
          if (!visibleLink(l, box)) continue
          const s = l.source as SimNode
          const t = l.target as SimNode
          ctx.moveTo(s.x!, s.y!)
          ctx.lineTo(t.x!, t.y!)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      // ── Cardinality markers ─────────────────────────────────────────
      // Only render for the active subset (always) or the whole graph
      // when density is low enough to afford it.
      if (activeIds || opt.card) {
        ctx.strokeStyle = mutedCol
        ctx.fillStyle = mutedCol
        ctx.lineWidth = 1.2
        for (const sl of simLinks) {
          const s = sl.source as SimNode
          const t = sl.target as SimNode
          if (activeIds && !activeIds.has(s.id) && !activeIds.has(t.id)) continue
          if (!visibleLink(sl, box)) continue
          const sx = s.x ?? 0
          const sy = s.y ?? 0
          const tx = t.x ?? 0
          const ty = t.y ?? 0
          const dx = tx - sx
          const dy = ty - sy
          const len = Math.sqrt(dx * dx + dy * dy)
          if (len < 1) continue
          const angle = Math.atan2(dy, dx)
          const rel = (sl as any).type as string
          const [srcCard, tgtCard] = EDGE_CARDINALITY[rel] ?? ['1', '*']
          const inset = 14
          drawCardinalityCanvas(ctx, srcCard!, sx + (dx / len) * inset, sy + (dy / len) * inset, angle)
          drawCardinalityCanvas(ctx, tgtCard!, tx - (dx / len) * inset, ty - (dy / len) * inset, angle + Math.PI)
        }
      }

      // ── Edge labels (only when zoomed in enough) ────────────────────
      if (opt.edge && currentZoom.k > 0.6) {
        ctx.fillStyle = mutedCol
        ctx.font = '8px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        for (const l of simLinks) {
          if (!visibleLink(l, box)) continue
          const s = l.source as SimNode
          const t = l.target as SimNode
          ctx.globalAlpha = activeIds && !(activeIds.has(s.id) || activeIds.has(t.id)) ? 0.05 : 0.9
          ctx.fillText((l as any).type as string, ((s.x ?? 0) + (t.x ?? 0)) / 2, ((s.y ?? 0) + (t.y ?? 0)) / 2 - 4)
        }
        ctx.globalAlpha = 1
      }

      // ── Nodes ───────────────────────────────────────────────────────
      ctx.lineWidth = 1.5
      ctx.strokeStyle = bgCol
      for (const n of nodes) {
        if (!visible(n, box)) continue
        const r = radiusCache.get(n.id) ?? 7
        const dimmed = activeIds && !neighbors!.has(n.id)
        const x = n.x!
        const y = n.y!
        ctx.globalAlpha = dimmed ? 0.15 : 1
        ctx.fillStyle = colorCache.get(n.id) ?? '#888'
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Selection ring
        if (n.id === sid) {
          ctx.globalAlpha = 1
          ctx.beginPath()
          ctx.arc(x, y, r + 4, 0, Math.PI * 2)
          ctx.strokeStyle = primaryCol
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.strokeStyle = bgCol
          ctx.lineWidth = 1.5
        }

        // Icon (drawn only when zoomed in enough and node isn't dimmed)
        if (opt.icon && currentZoom.k > 0.55 && !dimmed) {
          const img = iconBitmaps.get(n.type)
          if (img && img.complete && img.naturalWidth > 0) {
            const iconSize = r * 1.1
            ctx.drawImage(img, x - iconSize / 2, y - iconSize / 2, iconSize, iconSize)
          }
        }
      }
      ctx.globalAlpha = 1

      // ── Labels ──────────────────────────────────────────────────────
      if (opt.label && currentZoom.k > 0.35) {
        const labelOpacity = Math.min(1, Math.max(0.2, (currentZoom.k - 0.15) / 1.5))
        ctx.globalAlpha = labelOpacity
        ctx.fillStyle = mutedCol
        ctx.font = '10px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        for (const n of nodes) {
          if (!visible(n, box)) continue
          if (activeIds && !neighbors!.has(n.id)) continue
          const r = radiusCache.get(n.id) ?? 7
          const label = n.label.length > 18 ? n.label.slice(0, 18) + '…' : n.label
          ctx.fillText(label, n.x!, n.y! + r + 12)
        }
        ctx.globalAlpha = 1
      }
    }

    // ── Minimap ───────────────────────────────────────────────────────
    const miniCtx = minimapCanvas?.getContext('2d', { alpha: true }) ?? null
    if (minimapCanvas) {
      minimapCanvas.width = Math.round(MINIMAP_W * dpr)
      minimapCanvas.height = Math.round(MINIMAP_H * dpr)
      minimapCanvas.style.width = MINIMAP_W + 'px'
      minimapCanvas.style.height = MINIMAP_H + 'px'
    }

    function drawMinimap() {
      if (!miniCtx || !minimapCanvas) return
      // Bounds
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity
      for (const n of nodes) {
        const x = n.x ?? 0
        const y = n.y ?? 0
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
      if (!isFinite(minX)) return
      const pad = 50
      const viewX = minX - pad
      const viewY = minY - pad
      const viewW = Math.max(1, maxX - minX + pad * 2)
      const viewH = Math.max(1, maxY - minY + pad * 2)
      const sx = MINIMAP_W / viewW
      const sy = MINIMAP_H / viewH
      const s = Math.min(sx, sy)
      const offsetX = (MINIMAP_W - viewW * s) / 2
      const offsetY = (MINIMAP_H - viewH * s) / 2

      miniCtx.setTransform(1, 0, 0, 1, 0, 0)
      miniCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height)
      miniCtx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (offsetX - viewX * s), dpr * (offsetY - viewY * s))

      // Viewport rect
      const vk = currentZoom.k || 1
      const vx = -currentZoom.x / vk
      const vy = -currentZoom.y / vk
      const vw = width / vk
      const vh = height / vk
      // Stroke/dot radii are expressed in world units; dividing by the
      // world→minimap scale `s` keeps them at a constant on-screen size.
      miniCtx.fillStyle = primaryCol
      miniCtx.globalAlpha = 0.08
      miniCtx.fillRect(vx, vy, vw, vh)
      miniCtx.globalAlpha = 0.6
      miniCtx.strokeStyle = primaryCol
      miniCtx.lineWidth = 1.5 / s
      miniCtx.strokeRect(vx, vy, vw, vh)

      // Node dots — target ~1.6px on screen
      miniCtx.globalAlpha = 0.85
      const dotR = 1.6 / s
      for (const n of nodes) {
        miniCtx.fillStyle = colorCache.get(n.id) ?? '#888'
        miniCtx.beginPath()
        miniCtx.arc(n.x!, n.y!, dotR, 0, Math.PI * 2)
        miniCtx.fill()
      }
      miniCtx.globalAlpha = 1
    }

    // Apply the cached zoom transform now that every local the
    // 'zoom' handler closes over is initialized.
    if (cache?.zoom) {
      canvasSel.call(
        zoomBehavior.transform as any,
        zoomIdentity.translate(cache.zoom.x, cache.zoom.y).scale(cache.zoom.k),
      )
    }

    // Start the loop
    ensureRaf()

    return () => {
      // Save final state before teardown
      savePositions(nodes, hash, { k: currentZoom.k, x: currentZoom.x, y: currentZoom.y })
      if (raf) cancelAnimationFrame(raf)
      if (persistTimer) clearTimeout(persistTimer)
      simulation.stop()
      ro.disconnect()
      stopHoverWatch()
      canvas.removeEventListener('wheel', onWheelPan)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvasSel.on('.zoom', null)
      _zoomToNode = null
      _applySelection = null
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────

  function initGraph() {
    if (!canvasWrapRef.value || !canvasRef.value || visibleGraphNodes.value.length === 0) return
    if (cleanup) {
      cleanup()
      cleanup = null
    }
    const visibleIds = new Set(visibleGraphNodes.value.map((n) => n.id))
    const filteredEdges = graphEdges.value.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
    cleanup = renderForceGraph(
      canvasWrapRef.value,
      canvasRef.value,
      minimapCanvasRef.value,
      [...visibleGraphNodes.value],
      filteredEdges,
    )
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  onMounted(async () => {
    graphTypesSidebar.activate()
    await fetchGraphData()
    lastTopologyFingerprint = topologyFingerprint()
    await nextTick()
    initGraph()
  })

  // Fingerprint of the current graph topology — node IDs + edge tuples.
  // Re-init the renderer only when this actually changes, so noisy SSE
  // `mutation` bumps (which can fire on unrelated writes) don't restart
  // the physics every click.
  let lastTopologyFingerprint = ''
  function topologyFingerprint(): string {
    const ids = graphNodes.value
      .map((n) => n.id)
      .sort()
      .join('|')
    const edges = graphEdges.value
      .map((e) => `${e.source}>${e.target}:${e.type}`)
      .sort()
      .join('|')
    return ids + '||' + edges
  }

  watch(
    () => graph.graphVersion.value,
    async () => {
      await fetchGraphData()
      const fp = topologyFingerprint()
      if (fp === lastTopologyFingerprint) return // no structural change
      lastTopologyFingerprint = fp
      await nextTick()
      initGraph()
    },
  )

  // Visibility toggles from the sidebar re-init the graph with the new
  // filtered set. `toggle()` in useGraphTypesSidebar replaces the whole
  // visibility object, so a shallow ref-equality watch is all we need.
  // Coalesce rapid toggles (e.g. "hide all") into a single re-init.
  let visibilityTimer: ReturnType<typeof setTimeout> | null = null
  watch(
    () => graphTypesSidebar.state.value.visibility,
    () => {
      if (visibilityTimer) clearTimeout(visibilityTimer)
      visibilityTimer = setTimeout(() => {
        visibilityTimer = null
        initGraph()
      }, 50)
    },
  )

  onBeforeUnmount(() => {
    graphTypesSidebar.deactivate()
    if (visibilityTimer) clearTimeout(visibilityTimer)
    if (cleanup) {
      cleanup()
      cleanup = null
    }
  })
</script>

<template>
  <div class="relative w-full h-full overflow-hidden">
    <!-- Loading -->
    <div v-if="loading" class="flex h-full items-center justify-center text-muted-foreground">
      <Icon name="lucide:loader-circle" class="h-8 w-8 animate-spin" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="totalNodeCount === 0"
      class="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Icon name="lucide:network" class="h-12 w-12 opacity-30" />
      <p class="text-sm">No entities in the graph yet.</p>
    </div>

    <!-- Visualization -->
    <div v-else class="flex h-full w-full">
      <!-- ── Graph canvas ── -->
      <div ref="canvasWrapRef" class="relative flex-1 overflow-hidden">
        <canvas ref="canvasRef" class="absolute inset-0 h-full w-full" style="touch-action: none" />

        <!-- Layout Toggle (top-left) -->
        <div
          class="absolute top-3 left-3 z-10 flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-1 pointer-events-auto shadow-sm">
          <button
            @click="currentLayout = 'physics'"
            class="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
            :class="
              currentLayout === 'physics'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ">
            Physics
          </button>
          <button
            @click="currentLayout = 'type'"
            class="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
            :class="
              currentLayout === 'type'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            ">
            By Type
          </button>
        </div>

        <!-- Hover preview popup -->
        <div
          v-if="hoveredNodeMeta"
          class="pointer-events-none absolute z-20 rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-md px-3 py-2 text-xs min-w-[180px] max-w-[260px]"
          :style="{
            left: Math.min(hoverPos.x + 14, 9999) + 'px',
            top: Math.min(hoverPos.y + 14, 9999) + 'px',
          }">
          <div class="flex items-center gap-2 mb-1">
            <span
              class="inline-flex h-5 w-5 items-center justify-center rounded shrink-0"
              :style="{ background: hoveredNodeMeta.color + '22', color: hoveredNodeMeta.color }">
              <Icon :name="hoveredNodeMeta.icon" class="h-3 w-3" />
            </span>
            <span class="text-[10px] uppercase tracking-wide text-muted-foreground">
              {{ hoveredNodeMeta.typeLabel }}
            </span>
            <span
              v-if="hoveredNodeMeta.status"
              class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground ml-auto">
              {{ hoveredNodeMeta.status }}
            </span>
          </div>
          <div class="text-sm font-medium text-foreground truncate">{{ hoveredNodeMeta.label }}</div>
        </div>

        <!-- Minimap (bottom-left) — rendered directly to canvas by the renderer -->
        <div
          v-show="totalNodeCount > 0"
          class="absolute bottom-3 left-3 z-10 overflow-hidden rounded-lg border border-border bg-card/95 shadow-sm backdrop-blur-sm"
          :style="{ width: `${MINIMAP_W}px`, height: `${MINIMAP_H}px` }">
          <canvas ref="minimapCanvasRef" class="block h-full w-full" />
        </div>

        <!-- Controls & Stats badge (bottom-right) -->
        <div class="absolute bottom-3 right-3 z-10 flex items-center gap-3">
          <div
            class="flex items-center gap-2 text-xs text-muted-foreground bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 font-mono">
            <span>
              {{ visibleNodeCount }}
              <span v-if="visibleNodeCount !== totalNodeCount" class="opacity-60">/ {{ totalNodeCount }}</span>
              {{ visibleNodeCount === 1 ? 'node' : 'nodes' }}
            </span>
            <span v-if="visibleEdgeCount > 0" class="opacity-40">·</span>
            <span v-if="visibleEdgeCount > 0">
              {{ visibleEdgeCount }} {{ visibleEdgeCount === 1 ? 'edge' : 'edges' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Entity inspector (inset right sidebar) -->
    <EntityDialog
      v-if="dialogItem"
      v-model:open="dialogOpen"
      variant="inset"
      mode="edit"
      :item="dialogItem"
      @close="dialogOpen = false" />
  </div>
</template>
