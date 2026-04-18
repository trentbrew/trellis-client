<script setup lang="ts">
  import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCenter,
    forceCollide,
    type SimulationNodeDatum,
    type SimulationLinkDatum,
  } from 'd3-force'
  import { select, type Selection } from 'd3-selection'
  import { zoom as d3Zoom, zoomIdentity, type ZoomTransform, type D3ZoomEvent } from 'd3-zoom'
  import { drag as d3Drag } from 'd3-drag'
  import { entityQuery } from '~/lib/tql-namespace'
  import { getRecurringSeriesKey } from '~/utils/recurrence'
  import { useGraphTypesSidebar, colorTokenToHex } from '~/composables/useGraphTypesSidebar'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'

  const graph = useTrellisGraph()
  const graphTypesSidebar = useGraphTypesSidebar()
  const { items: allEntities } = useTrellisEntities()

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

  interface MiniNode {
    id: string
    x: number
    y: number
    color: string
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

  // ── Cardinality Drawing ───────────────────────────────────────────────

  function drawCardinality(
    parent: Selection<SVGGElement, unknown, null, undefined>,
    card: string,
    x: number,
    y: number,
    angle: number,
  ) {
    const sz = 6
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const px = -sin
    const py = cos

    if (card === '1') {
      parent
        .append('line')
        .attr('x1', x + px * sz)
        .attr('y1', y + py * sz)
        .attr('x2', x - px * sz)
        .attr('y2', y - py * sz)
        .attr('stroke', 'var(--muted-foreground)')
        .attr('stroke-width', 1.2)
    } else if (card === '*') {
      for (const offset of [-1, 0, 1]) {
        parent
          .append('line')
          .attr('x1', x)
          .attr('y1', y)
          .attr('x2', x + cos * sz * 1.2 + px * sz * offset * 0.7)
          .attr('y2', y + sin * sz * 1.2 + py * sz * offset * 0.7)
          .attr('stroke', 'var(--muted-foreground)')
          .attr('stroke-width', 1.2)
      }
    } else if (card === '0..1') {
      parent
        .append('circle')
        .attr('cx', x + cos * sz)
        .attr('cy', y + sin * sz)
        .attr('r', 3)
        .attr('fill', 'none')
        .attr('stroke', 'var(--muted-foreground)')
        .attr('stroke-width', 1.2)
      parent
        .append('line')
        .attr('x1', x + px * sz)
        .attr('y1', y + py * sz)
        .attr('x2', x - px * sz)
        .attr('y2', y - py * sz)
        .attr('stroke', 'var(--muted-foreground)')
        .attr('stroke-width', 1.2)
    } else if (card === '1..*') {
      parent
        .append('line')
        .attr('x1', x + px * sz)
        .attr('y1', y + py * sz)
        .attr('x2', x - px * sz)
        .attr('y2', y - py * sz)
        .attr('stroke', 'var(--muted-foreground)')
        .attr('stroke-width', 1.2)
      const forkBase = { x: x + cos * sz, y: y + sin * sz }
      for (const offset of [-1, 0, 1]) {
        parent
          .append('line')
          .attr('x1', forkBase.x)
          .attr('y1', forkBase.y)
          .attr('x2', forkBase.x + cos * sz * 0.8 + px * sz * offset * 0.7)
          .attr('y2', forkBase.y + sin * sz * 0.8 + py * sz * offset * 0.7)
          .attr('stroke', 'var(--muted-foreground)')
          .attr('stroke-width', 1.2)
      }
    }
  }

  // ── State (declared early — type visibility computed refs these) ──────

  const svgRef = ref<SVGSVGElement | null>(null)
  const graphNodes = ref<SimNode[]>([])
  const graphEdges = ref<GEdge[]>([])
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

  const visibleGraphNodes = computed(() =>
    graphNodes.value.filter((n) => graphTypesSidebar.isVisible(n.type)),
  )

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

  const connectedEdgeSet = computed(() => {
    const set = new Set<string>()
    if (!hoveredNodeId.value) return set
    for (const e of graphEdges.value) {
      if (e.source === hoveredNodeId.value || e.target === hoveredNodeId.value) {
        set.add(`${e.source}→${e.target}→${e.type}`)
      }
    }
    return set
  })

  const neighborSet = computed(() => {
    const set = new Set<string>()
    if (!hoveredNodeId.value) return set
    set.add(hoveredNodeId.value)
    for (const e of graphEdges.value) {
      if (e.source === hoveredNodeId.value) set.add(e.target)
      if (e.target === hoveredNodeId.value) set.add(e.source)
    }
    return set
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

  // Expose a hook the renderer calls when zoom should focus a node
  let _zoomToNode: ((id: string) => void) | null = null

  function openNodeDialog(id: string) {
    selectedEntityId.value = id
    dialogOpen.value = true
    setOriginHash(id)
    _zoomToNode?.(id)
  }

  // ── Minimap State ─────────────────────────────────────────────────────

  const minimapNodes = ref<MiniNode[]>([])
  const minimapBounds = ref({ minX: 0, minY: 0, maxX: 1, maxY: 1 })
  const viewportTransform = ref({ k: 1, x: 0, y: 0 })
  const svgSize = ref({ w: 800, h: 600 })

  const MINIMAP_W = 180
  const MINIMAP_H = 120

  const minimapViewBox = computed(() => {
    const { minX, minY, maxX, maxY } = minimapBounds.value
    const pad = 50
    return {
      x: minX - pad,
      y: minY - pad,
      w: Math.max(1, maxX - minX + pad * 2),
      h: Math.max(1, maxY - minY + pad * 2),
    }
  })

  const minimapViewport = computed(() => {
    const { k, x, y } = viewportTransform.value
    const { w: sw, h: sh } = svgSize.value
    if (k === 0) return { x: 0, y: 0, w: sw, h: sh }
    return { x: -x / k, y: -y / k, w: sw / k, h: sh / k }
  })

  // ── Derived stats ─────────────────────────────────────────────────────

  const visibleNodeCount = computed(() => visibleGraphNodes.value.length)
  const totalNodeCount = computed(() => graphNodes.value.length)
  const visibleEdgeCount = computed(() => {
    const ids = new Set(visibleGraphNodes.value.map((n) => n.id))
    return graphEdges.value.filter((e) => ids.has(e.source) && ids.has(e.target)).length
  })

  // ── Fetch ─────────────────────────────────────────────────────────────

  const fetchGraphData = async () => {
    loading.value = true
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
    }
  }

  // ── Renderer ──────────────────────────────────────────────────────────

  let cleanup: (() => void) | null = null

  function renderForceGraph(svgEl: SVGSVGElement, nodes: SimNode[], links: GEdge[]): () => void {
    const width = svgEl.clientWidth || 800
    const height = svgEl.clientHeight || 600
    svgSize.value = { w: width, h: height }
    const opt = cfg(nodes.length)

    const svg = select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('width', '100%').attr('height', '100%')

    const g = svg.append('g')
    let currentZoom = zoomIdentity
    let raf = 0

    // ── Figma-style gestures ──────────────────────────────────────────
    // Wheel without modifier → pan (x/y)
    // Ctrl/Meta + wheel or trackpad pinch → zoom
    // Drag on canvas → pan
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .filter((event: any) => {
        if (event.type === 'mousedown' || event.type === 'pointerdown') return !event.button
        if (event.type === 'wheel') return event.ctrlKey || event.metaKey
        return !event.ctrlKey
      })
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        currentZoom = event.transform
        viewportTransform.value = { k: event.transform.k, x: event.transform.x, y: event.transform.y }
        g.attr('transform', String(event.transform))
        draw()
      })

    svg.call(zoomBehavior).on('dblclick.zoom', null)

    _zoomToNode = (id: string) => {
      const node = nodes.find((n) => n.id === id)
      if (!node) return
      const nx = node.x ?? width / 2
      const ny = node.y ?? height / 2
      const targetK = Math.max(currentZoom.k, 1.4)
      const t = zoomIdentity.translate(width / 2 - nx * targetK, height / 2 - ny * targetK).scale(targetK)
      svg.transition().duration(450).call(zoomBehavior.transform as any, t)
    }

    // Plain wheel = pan
    svg.on('wheel.pan', (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      event.preventDefault()
      ;(zoomBehavior as any).translateBy(svg, -event.deltaX, -event.deltaY)
    })

    const simLinks = links.map((l) => ({ ...l })) as SimulationLinkDatum<SimNode>[]

    // Simulation
    const simulation = forceSimulation<SimNode>(nodes)
      .force(
        'link',
        forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
          .id((d) => d.id)
          .distance(opt.dist),
      )
      .force('charge', forceManyBody<SimNode>().strength(opt.charge))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<SimNode>(opt.collide))
      .alphaDecay(opt.decay)

    // Links layer
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll<SVGLineElement, SimulationLinkDatum<SimNode>>('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', 'var(--border, var(--muted-foreground))')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', opt.link)

    // Edge labels — always bound; default opacity gated by density
    const edgeLabel = g
      .append('g')
      .attr('class', 'edge-labels')
      .selectAll<SVGTextElement, (typeof simLinks)[number]>('text')
      .data(simLinks)
      .join('text')
      .text((d) => (d as any).type as string)
      .attr('font-size', '8px')
      .attr('fill', 'var(--muted-foreground)')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .attr('dy', '-4')
      .attr('opacity', opt.edge ? 1 : 0)

    // Cardinality markers layer
    const cardinalityG = g.append('g').attr('class', 'cardinality')

    // Nodes
    const nodeG = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')

    nodeG
      .append('circle')
      .attr('r', (d) => nodeRadius(d))
      .attr('fill', (d) => nodeColor(d))
      .attr('stroke', 'var(--background)')
      .attr('stroke-width', 1.5)

    // Icons
    if (opt.icon) {
      nodeG.each(function (d) {
        const r = nodeRadius(d)
        const path = ENTITY_ICONS[d.type]
        if (!path) return
        const iconSize = r * 1.1
        select(this)
          .append('svg')
          .attr('viewBox', '0 0 20 20')
          .attr('width', iconSize)
          .attr('height', iconSize)
          .attr('x', -iconSize / 2)
          .attr('y', -iconSize / 2)
          .attr('fill', 'none')
          .attr('pointer-events', 'none')
          .html(path)
          .selectAll('path, g, rect, circle')
          .attr('stroke', 'var(--background)')
          .attr('fill', function () {
            const el = this as SVGElement
            return el.getAttribute('fill') === 'currentColor' ? 'var(--background)' : el.getAttribute('fill')
          })
      })
    }

    // Hover + click
    nodeG
      .on('mouseenter', (event: MouseEvent, d) => {
        hoveredNodeId.value = d.id
        const rect = svgEl.getBoundingClientRect()
        hoverPos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top }
        applyHighlight()
      })
      .on('mousemove', (event: MouseEvent) => {
        const rect = svgEl.getBoundingClientRect()
        hoverPos.value = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      })
      .on('mouseleave', () => {
        hoveredNodeId.value = null
        applyHighlight()
      })
      .on('click', (event: MouseEvent, d) => {
        event.stopPropagation()
        openNodeDialog(d.id)
      })

    function drawCardinalities() {
      cardinalityG.selectAll('*').remove()
      const hid = hoveredNodeId.value
      const drawAll = opt.card
      if (!drawAll && !hid) return
      for (const sl of simLinks) {
        const s = sl.source as SimNode
        const t = sl.target as SimNode
        if (!drawAll && hid && s.id !== hid && t.id !== hid) continue
        const sx = s.x ?? 0,
          sy = s.y ?? 0
        const tx = t.x ?? 0,
          ty = t.y ?? 0
        const dx = tx - sx,
          dy = ty - sy
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 1) continue
        const angle = Math.atan2(dy, dx)
        const rel = (sl as any).type as string
        const [srcCard, tgtCard] = EDGE_CARDINALITY[rel] ?? ['1', '*']
        const inset = 14
        drawCardinality(cardinalityG, srcCard!, sx + (dx / len) * inset, sy + (dy / len) * inset, angle)
        drawCardinality(cardinalityG, tgtCard!, tx - (dx / len) * inset, ty - (dy / len) * inset, angle + Math.PI)
      }
    }

    function applyHighlight() {
      drawCardinalities()
      const hid = hoveredNodeId.value
      if (!hid) {
        nodeG.attr('opacity', 1)
        link.attr('stroke-opacity', opt.link).attr('stroke', 'var(--border, var(--muted-foreground))').attr('stroke-width', 1)
        edgeLabel.attr('opacity', opt.edge ? 1 : 0)
        return
      }
      const neighbors = new Set<string>([hid])
      for (const l of simLinks) {
        const s = (l.source as SimNode).id ?? (l.source as any)
        const t = (l.target as SimNode).id ?? (l.target as any)
        if (s === hid) neighbors.add(String(t))
        if (t === hid) neighbors.add(String(s))
      }
      nodeG.attr('opacity', (d) => (neighbors.has(d.id) ? 1 : 0.12))
      link
        .attr('stroke', (d: any) => {
          const s = (d.source as SimNode).id ?? d.source
          const tt = (d.target as SimNode).id ?? d.target
          return s === hid || tt === hid ? 'var(--primary)' : 'var(--border, var(--muted-foreground))'
        })
        .attr('stroke-width', (d: any) => {
          const s = (d.source as SimNode).id ?? d.source
          const tt = (d.target as SimNode).id ?? d.target
          return s === hid || tt === hid ? 2 : 0.5
        })
        .attr('stroke-opacity', (d: any) => {
          const s = (d.source as SimNode).id ?? d.source
          const tt = (d.target as SimNode).id ?? d.target
          return s === hid || tt === hid ? 0.9 : 0.08
        })
      edgeLabel.attr('opacity', (d: any) => {
        const s = (d.source as SimNode).id ?? d.source
        const tt = (d.target as SimNode).id ?? d.target
        return s === hid || tt === hid ? 1 : 0.05
      })
    }

    // Expose for external watcher
    ;(svgEl as any).__applyHighlight = applyHighlight

    // Labels
    const label = g
      .append('g')
      .attr('class', 'labels')
      .selectAll<SVGTextElement, SimNode>('text')
      .data(opt.label ? nodes : [])
      .join('text')
      .text((d) => (d.label.length > 18 ? d.label.slice(0, 18) + '…' : d.label))
      .attr('font-size', '10px')
      .attr('fill', 'var(--muted-foreground)')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .attr('dy', '2.2em')

    // Drag
    const dragBehavior = d3Drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })
    nodeG.call(dragBehavior)

    // Viewport culling
    function refresh() {
      const box = viewBounds(currentZoom, width, height)
      nodeG.style('display', (d) => (visible(d, box) ? null : 'none'))
      label.style('display', (d) => (visible(d, box) ? null : 'none'))
      link.style('display', (d) => (visibleLink(d, box) ? null : 'none'))
      edgeLabel.style('display', (d) => (visibleLink(d, box) ? null : 'none'))
      const opacity = Math.min(1, Math.max(0.2, (currentZoom.k - 0.15) / 1.5))
      label.style('opacity', opacity)
    }

    function draw() {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        refresh()
      })
    }

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0)

      edgeLabel
        .attr('x', (d) => ((d.source as SimNode).x! + (d.target as SimNode).x!) / 2)
        .attr('y', (d) => ((d.source as SimNode).y! + (d.target as SimNode).y!) / 2)

      drawCardinalities()

      nodeG.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
      label.attr('x', (d) => d.x ?? 0).attr('y', (d) => d.y ?? 0)

      // Sync minimap
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity
      const miniData: MiniNode[] = []
      for (const n of nodes) {
        const x = n.x ?? 0
        const y = n.y ?? 0
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
        miniData.push({ id: n.id, x, y, color: nodeColor(n) })
      }
      if (isFinite(minX)) {
        minimapBounds.value = { minX, minY, maxX, maxY }
        minimapNodes.value = miniData
      }

      draw()
    })

    draw()

    return () => {
      if (raf) cancelAnimationFrame(raf)
      simulation.stop()
      svg.on('wheel.pan', null)
      _zoomToNode = null
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────

  function initGraph() {
    if (!svgRef.value || visibleGraphNodes.value.length === 0) return
    if (cleanup) {
      cleanup()
      cleanup = null
    }
    const visibleIds = new Set(visibleGraphNodes.value.map((n) => n.id))
    const filteredEdges = graphEdges.value.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
    cleanup = renderForceGraph(svgRef.value, [...visibleGraphNodes.value], filteredEdges)
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  onMounted(async () => {
    graphTypesSidebar.activate()
    await fetchGraphData()
    await nextTick()
    initGraph()
  })

  watch(
    () => graph.graphVersion.value,
    async () => {
      await fetchGraphData()
      await nextTick()
      initGraph()
    },
  )

  watch([graphNodes, graphEdges], () => {
    nextTick(() => initGraph())
  })

  watch(
    () => graphTypesSidebar.state.value.visibility,
    () => {
      nextTick(() => initGraph())
    },
    { deep: true },
  )

  onBeforeUnmount(() => {
    graphTypesSidebar.deactivate()
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
      <div class="relative flex-1 overflow-hidden">
        <!-- SVG canvas -->
        <svg ref="svgRef" class="absolute inset-0 w-full h-full" style="touch-action: none" />

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
            <span class="text-[10px] uppercase tracking-wide text-muted-foreground">{{ hoveredNodeMeta.typeLabel }}</span>
            <span
              v-if="hoveredNodeMeta.status"
              class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground ml-auto">
              {{ hoveredNodeMeta.status }}
            </span>
          </div>
          <div class="text-sm font-medium text-foreground truncate">{{ hoveredNodeMeta.label }}</div>
        </div>

        <!-- Minimap (bottom-left) -->
        <div
          v-if="minimapNodes.length > 0"
          class="absolute bottom-3 left-3 z-10 rounded-lg border border-border bg-card/95 backdrop-blur-sm overflow-hidden shadow-sm"
          :style="{ width: `${MINIMAP_W}px`, height: `${MINIMAP_H}px` }">
          <svg
            :viewBox="`${minimapViewBox.x} ${minimapViewBox.y} ${minimapViewBox.w} ${minimapViewBox.h}`"
            preserveAspectRatio="xMidYMid meet"
            class="h-full w-full">
            <!-- Viewport rectangle -->
            <rect
              :x="minimapViewport.x"
              :y="minimapViewport.y"
              :width="minimapViewport.w"
              :height="minimapViewport.h"
              fill="var(--primary)"
              fill-opacity="0.08"
              stroke="var(--primary)"
              stroke-opacity="0.6"
              :stroke-width="Math.max(2, minimapViewBox.w / 150)" />
            <!-- Node dots -->
            <circle
              v-for="n in minimapNodes"
              :key="n.id"
              :cx="n.x"
              :cy="n.y"
              :r="Math.max(3, minimapViewBox.w / 120)"
              :fill="n.color"
              opacity="0.85" />
          </svg>
        </div>

        <!-- Stats badge (bottom-right) -->
        <div
          class="absolute bottom-3 right-3 z-10 flex items-center gap-2 text-xs text-muted-foreground bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 font-mono">
          <span>
            {{ visibleNodeCount }}
            <span v-if="visibleNodeCount !== totalNodeCount" class="opacity-60">/ {{ totalNodeCount }}</span>
            {{ visibleNodeCount === 1 ? 'node' : 'nodes' }}
          </span>
          <span v-if="visibleEdgeCount > 0" class="opacity-40">·</span>
          <span v-if="visibleEdgeCount > 0">{{ visibleEdgeCount }} {{ visibleEdgeCount === 1 ? 'edge' : 'edges' }}</span>
        </div>
      </div>
    </div>

    <!-- Entity dialog (right-side) -->
    <EntityDialog
      v-if="dialogItem"
      v-model:open="dialogOpen"
      mode="edit"
      :item="dialogItem"
      @close="dialogOpen = false" />
  </div>
</template>
