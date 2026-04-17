<script setup lang="ts">
  import { VueFlow, useVueFlow } from '@vue-flow/core'
  import { Background } from '@vue-flow/background'
  import { MiniMap } from '@vue-flow/minimap'
  import type { Node, Edge } from '@vue-flow/core'
  import type { DatabaseField, DatabaseSchema } from '~/types/database'
  import type { Entity } from '~/types/entity'
  import { createDefaultTrellisContext } from '~/lib/trellis'
  import { extractNodeValue, fieldKeyAliases } from '~/lib/ontology'
  import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCenter,
    forceCollide,
    type SimulationNodeDatum,
    type SimulationLinkDatum,
  } from 'd3-force'
  import { select } from 'd3-selection'
  import { drag as d3Drag } from 'd3-drag'
  import { zoom as d3Zoom, zoomIdentity, type ZoomTransform } from 'd3-zoom'
  import { loadIcon } from '@iconify/vue'

  import '@vue-flow/core/dist/style.css'

  // ── Tailwind color-name → hex (shade 500) for rendering in D3 ──────────
  // Ontology entity configs store their brand color as a tailwind name
  // (e.g. `purple`, `emerald`). D3 needs a concrete color value.
  const TAILWIND_500: Record<string, string> = {
    slate: '#64748b',
    gray: '#6b7280',
    zinc: '#71717a',
    neutral: '#737373',
    stone: '#78716c',
    red: '#ef4444',
    orange: '#f97316',
    amber: '#f59e0b',
    yellow: '#eab308',
    lime: '#84cc16',
    green: '#22c55e',
    emerald: '#10b981',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    sky: '#0ea5e9',
    blue: '#3b82f6',
    indigo: '#6366f1',
    violet: '#8b5cf6',
    purple: '#a855f7',
    fuchsia: '#d946ef',
    pink: '#ec4899',
    rose: '#f43f5e',
  }
  const resolveColor = (name?: string | null): string => {
    if (!name) return TAILWIND_500.violet!
    return TAILWIND_500[name] || TAILWIND_500.violet!
  }

  // ── Icon body cache (Iconify) ──────────────────────────────────────────
  // loadIcon() fetches the raw SVG body string so we can inject icons as
  // real SVG inside d3-rendered nodes (no foreignObject / Vue component).
  interface IconData {
    body: string
    width: number
    height: number
  }
  const iconCache = new Map<string, IconData | null>()
  async function getIconData(name: string): Promise<IconData | null> {
    if (iconCache.has(name)) return iconCache.get(name)!
    try {
      const icon = await loadIcon(name)
      const data: IconData = { body: icon.body, width: icon.width || 24, height: icon.height || 24 }
      iconCache.set(name, data)
      return data
    } catch {
      iconCache.set(name, null)
      return null
    }
  }

  const props = defineProps<{
    /** Collection mode: the collection this graph belongs to. */
    collectionId?: string
    /** Collection mode: JSON-LD document as a string (v-model). */
    modelValue?: string
    /** Collection mode: the collection's schema with relation fields. */
    schema?: DatabaseSchema | null
    /** Browse mode: an array of entities to visualise. When provided, takes
     *  precedence over modelValue/schema and switches to browse behaviour. */
    entities?: Entity[]
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    /** Fired when a node is clicked. Browse mode uses this to open the
     *  entity dialog. In collection mode it's a no-op unless the parent
     *  wires up a handler. */
    'open-entity': [entity: any]
  }>()

  // Browse mode is active whenever entities are explicitly passed in.
  const isBrowseMode = computed(() => Array.isArray(props.entities))

  const { getEntityConfig } = useOntologyRegistry()

  const rootEl = ref<HTMLElement | null>(null)

  // ── View mode toggle ─────────────────────────────────────────────────

  type GraphMode = 'flow' | 'force'
  const graphMode = ref<GraphMode>('force')

  // ── Semantic clustering (uses per-entity embeddings) ─────────────────
  // When enabled, a custom d3 force pulls each node toward the centroid
  // of its top-K most-similar neighbors based on cosine similarity of
  // their persisted embedding vectors (see POST /api/graph/backfill-embeddings).
  const clusterBySimilarity = ref(false)
  const embeddingsCache = shallowRef<Map<string, number[]>>(new Map())
  const embeddingsLoading = ref(false)
  const embeddingsError = ref<string | null>(null)
  const embeddingsModel = ref<string>('')

  /** L2-normalize a vector in place. */
  function normalizeVec(v: number[]): number[] {
    let sum = 0
    for (let i = 0; i < v.length; i++) sum += v[i]! * v[i]!
    const norm = Math.sqrt(sum)
    if (norm === 0) return v
    const out = new Array(v.length)
    for (let i = 0; i < v.length; i++) out[i] = v[i]! / norm
    return out
  }

  async function ensureEmbeddingsLoaded(): Promise<void> {
    if (embeddingsCache.value.size > 0 || embeddingsLoading.value) return
    embeddingsLoading.value = true
    embeddingsError.value = null
    try {
      const res = await $fetch<{
        model: string
        dimensions: number
        count: number
        vectors: Record<string, number[]>
      }>('/api/graph/embeddings')
      embeddingsModel.value = res.model
      const map = new Map<string, number[]>()
      // Pre-normalize so cosine == dot product.
      for (const [id, vec] of Object.entries(res.vectors)) {
        if (Array.isArray(vec) && vec.length > 0) {
          map.set(id, normalizeVec(vec))
        }
      }
      embeddingsCache.value = map
    } catch (err: any) {
      embeddingsError.value = err?.message || 'Failed to load embeddings'
    } finally {
      embeddingsLoading.value = false
    }
  }

  // Kick off embedding fetch lazily when the user first enables clustering.
  watch(clusterBySimilarity, (on) => {
    if (on) ensureEmbeddingsLoaded()
  })

  const scrollToTop = () => {
    if (graphMode.value === 'flow') {
      fitView({ padding: 0.15 })
    }
  }

  defineExpose({ scrollToTop })

  const { fitView, zoomIn, zoomOut } = useVueFlow()

  // ── Parsing ──────────────────────────────────────────────────────────

  const stripJsoncComments = (input: string) => {
    const raw = String(input || '')
    const withoutLine = raw.replace(/^\s*\/\/.*$/gm, '')
    return withoutLine.replace(/\/\*[\s\S]*?\*\//g, '')
  }

  const extractGraphCandidates = (parsed: any): any[] => {
    if (!parsed || typeof parsed !== 'object') return []
    const candidates = ['@graph', 'items', 'records', 'data', 'nodes']
    for (const k of candidates) {
      if (Array.isArray((parsed as any)[k])) return (parsed as any)[k]
    }
    const paths: string[][] = [
      ['workspace', 'items'],
      ['workspace', 'records'],
      ['workspace', 'nodes'],
      ['collection', 'items'],
      ['collection', 'records'],
      ['collection', 'nodes'],
    ]
    for (const path of paths) {
      let cur: any = parsed
      for (const segment of path) {
        if (!cur || typeof cur !== 'object') {
          cur = null
          break
        }
        cur = cur[segment]
      }
      if (Array.isArray(cur)) return cur
    }
    return []
  }

  const doc = ref<any>({ '@context': createDefaultTrellisContext(), '@graph': [] })
  const lastEmittedValue = ref<string | null>(null)

  const tryParse = (value: string) => {
    try {
      const trimmed = (value || '').trim()
      const parsed = trimmed === '' ? {} : JSON.parse(stripJsoncComments(trimmed))

      if (Array.isArray(parsed)) {
        doc.value = { '@context': createDefaultTrellisContext(), '@graph': parsed }
        return
      }

      if (parsed && typeof parsed === 'object') {
        const nextDoc: any = parsed
        if (!nextDoc['@context'] || typeof nextDoc['@context'] !== 'object') {
          nextDoc['@context'] = createDefaultTrellisContext()
        }

        const hasGraphObj = nextDoc.graph && typeof nextDoc.graph === 'object' && !Array.isArray(nextDoc.graph)
        if (hasGraphObj) {
          if (!Array.isArray((nextDoc.graph as any).nodes)) {
            ;(nextDoc.graph as any).nodes = []
          }
        } else {
          const hasLegacyGraph = Array.isArray(nextDoc['@graph'])
          if (!hasLegacyGraph) {
            const extracted = extractGraphCandidates(nextDoc)
            nextDoc['@graph'] = Array.isArray(extracted) && extracted.length ? extracted : []
          }
        }

        doc.value = nextDoc
        return
      }

      doc.value = { '@context': createDefaultTrellisContext(), '@graph': [] }
    } catch {
      // parse error — keep current doc
    }
  }

  watch(
    () => props.modelValue,
    (v) => {
      if (v === lastEmittedValue.value) return
      tryParse(v || '')
    },
    { immediate: true },
  )

  // ── Records ──────────────────────────────────────────────────────────

  const graphData = computed<any[]>(() => {
    const root = doc.value
    const g = root?.graph
    if (g && typeof g === 'object' && !Array.isArray(g)) {
      const nodes = (g as any).nodes
      if (Array.isArray(nodes)) return nodes
    }
    const legacy = root?.['@graph']
    if (Array.isArray(legacy)) return legacy
    return []
  })

  const recordNodes = computed<any[]>(() => {
    // Browse mode: entities prop is the source of truth.
    if (isBrowseMode.value) return props.entities || []

    // Collection mode: filter out collection/spec metadata nodes.
    return graphData.value.filter((n) => {
      if (!n || typeof n !== 'object' || Array.isArray(n)) return false
      const t = (n as any)['@type'] ?? (n as any).type
      if (t === 'trellis:Collection') return false
      if (t === 'trellis:PropertyValueSpecification') return false
      return true
    })
  })

  // ── Type filtering (legend panel) ────────────────────────────────────

  const typeVisibility = ref<Map<string, boolean>>(new Map())

  /** List of unique types present in the graph with their ontology metadata. */
  const typesInGraph = computed(() => {
    const counts = new Map<string, number>()
    for (const node of recordNodes.value) {
      const t = getNodeType(node)
      if (!t) continue
      counts.set(t, (counts.get(t) || 0) + 1)
    }
    const entries: Array<{
      type: string
      count: number
      icon: string
      color: string
      label: string
    }> = []
    for (const [type, count] of counts) {
      const cfg = getEntityConfig(type) as any
      entries.push({
        type,
        count,
        icon: cfg?.icon || 'lucide:circle',
        color: cfg?.color || 'violet',
        label: cfg?.label || type,
      })
    }
    return entries.sort((a, b) => b.count - a.count)
  })

  /** Ensure visibility map has an entry for every type currently in the graph. */
  watch(
    typesInGraph,
    (types) => {
      let changed = false
      const next = new Map(typeVisibility.value)
      for (const { type } of types) {
        if (!next.has(type)) {
          next.set(type, true)
          changed = true
        }
      }
      if (changed) typeVisibility.value = next
    },
    { immediate: true },
  )

  const isTypeVisible = (type: string) => typeVisibility.value.get(type) ?? true

  const toggleType = (type: string) => {
    const next = new Map(typeVisibility.value)
    next.set(type, !isTypeVisible(type))
    typeVisibility.value = next
  }

  const allTypesVisible = computed(() => typesInGraph.value.every((t) => isTypeVisible(t.type)))

  const toggleAllTypes = () => {
    const target = !allTypesVisible.value
    const next = new Map<string, boolean>()
    for (const { type } of typesInGraph.value) next.set(type, target)
    typeVisibility.value = next
  }

  /** Nodes actually rendered — respects type visibility. */
  const visibleNodes = computed(() => recordNodes.value.filter((n) => isTypeVisible(getNodeType(n))))

  const visibleNodeIds = computed(() => new Set(visibleNodes.value.map(getNodeId).filter(Boolean)))

  // ── Schema fields ────────────────────────────────────────────────────

  const schemaFields = computed<DatabaseField[]>(() => {
    const fields = props.schema?.fields
    if (!Array.isArray(fields)) return []
    return fields.slice().sort((a, b) => a.order - b.order)
  })

  const relationFields = computed(() => schemaFields.value.filter((f) => f.type === 'relation'))

  const unwrapLdValue = (value: any): any => {
    if (Array.isArray(value)) return value.map(unwrapLdValue)
    if (value && typeof value === 'object') {
      if ('@value' in value) return unwrapLdValue((value as any)['@value'])
      if ('value' in value && Object.keys(value).length === 1) return unwrapLdValue((value as any).value)
    }
    return value
  }

  const getFieldValue = (node: any, field: DatabaseField) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return undefined
    const preferredKey = `user:${field.id}`
    if (preferredKey in node) return unwrapLdValue(node[preferredKey])
    if (field.id in node) return unwrapLdValue(node[field.id])
    if (field.name in node) return unwrapLdValue(node[field.name])
    return undefined
  }

  // ── Display helpers (function declarations so they can be referenced
  //    from earlier computed blocks that filter/count by type). ────────

  function getNodeTitle(node: any): string {
    return extractNodeValue(node, [...fieldKeyAliases.title]) || 'Untitled'
  }

  function getNodeId(node: any): string {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return ''
    const id = (node as any)['@id'] ?? (node as any).id
    return typeof id === 'string' ? id : ''
  }

  function getNodeType(node: any): string {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return ''
    const t = (node as any)['@type'] ?? (node as any).type
    return typeof t === 'string' ? t : ''
  }

  // ── Color palette for nodes ──────────────────────────────────────────

  const d3Colors = [
    { fill: 'hsl(var(--primary))', text: '#fff' },
    { fill: 'hsl(200 80% 50%)', text: '#fff' },
    { fill: 'hsl(280 60% 55%)', text: '#fff' },
    { fill: 'hsl(150 60% 40%)', text: '#fff' },
    { fill: 'hsl(30 80% 50%)', text: '#fff' },
    { fill: 'hsl(350 70% 50%)', text: '#fff' },
  ]

  const typeColorMap = computed(() => {
    const map = new Map<string, number>()
    const types = new Set(recordNodes.value.map(getNodeType).filter(Boolean))
    let i = 0
    for (const t of types) {
      map.set(t, i % d3Colors.length)
      i++
    }
    return map
  })

  // ── Shared edge computation ──────────────────────────────────────────

  interface GraphEdge {
    id: string
    source: string
    target: string
    label: string
    dashed: boolean
  }

  const computedEdges = computed<GraphEdge[]>(() => {
    const edges: GraphEdge[] = []
    const idSet = new Set(recordNodes.value.map(getNodeId).filter(Boolean))

    for (const node of recordNodes.value) {
      const sourceId = getNodeId(node)
      if (!sourceId || !idSet.has(sourceId)) continue

      for (const field of relationFields.value) {
        const val = getFieldValue(node, field)
        if (!val) continue
        const targets = Array.isArray(val) ? val : [val]
        for (const target of targets) {
          const targetId = typeof target === 'string' ? target : ((target as any)?.['@id'] ?? (target as any)?.id)
          if (typeof targetId === 'string' && idSet.has(targetId)) {
            edges.push({
              id: `${sourceId}-${field.id}-${targetId}`,
              source: sourceId,
              target: targetId,
              label: field.name,
              dashed: false,
            })
          }
        }
      }

      for (const [key, val] of Object.entries(node)) {
        if (key.startsWith('@') || key === 'id' || key === 'type') continue
        if (typeof val === 'string' && idSet.has(val) && val !== sourceId) {
          const edgeId = `${sourceId}-${key}-${val}`
          if (!edges.some((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: sourceId,
              target: val,
              label: key.replace('user:', ''),
              dashed: true,
            })
          }
        }
      }
    }

    return edges
  })

  // ── Vue Flow nodes & edges ───────────────────────────────────────────

  const COLS = 4
  const NODE_W = 220
  const NODE_H = 80
  const GAP_X = 60
  const GAP_Y = 40

  const flowNodes = computed<Node[]>(() => {
    return visibleNodes.value.map((node, index) => {
      const id = getNodeId(node) || `node-${index}`
      const title = getNodeTitle(node)
      const type = getNodeType(node)
      const colorIdx = typeColorMap.value.get(type) ?? 0
      const color = d3Colors[colorIdx]

      const col = index % COLS
      const row = Math.floor(index / COLS)
      const x = col * (NODE_W + GAP_X)
      const y = row * (NODE_H + GAP_Y)

      return {
        id,
        type: 'default',
        position: { x, y },
        data: { title, nodeType: type, colorIdx, raw: node },
        style: {
          background: 'var(--card)',
          border: `2px solid ${color?.fill ?? 'var(--border)'}`,
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '13px',
          width: `${NODE_W}px`,
          color: 'var(--card-foreground)',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          cursor: 'pointer',
        },
        label: title,
      }
    })
  })

  const flowEdges = computed<Edge[]>(() => {
    return computedEdges.value
      .filter((e) => visibleNodeIds.value.has(e.source) && visibleNodeIds.value.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: !e.dashed,
        style: {
          stroke: 'var(--muted-foreground)',
          strokeWidth: e.dashed ? 1 : 1.5,
          strokeDasharray: e.dashed ? '4 2' : undefined,
        },
        labelStyle: { fontSize: '10px', fill: 'var(--muted-foreground)' },
      }))
  })

  // Handler passed to VueFlow @node-click
  function handleFlowNodeClick(event: { node: Node }) {
    const raw = (event.node.data as any)?.raw
    if (raw) emit('open-entity', raw)
  }

  watch([flowNodes, flowEdges], () => {
    if (graphMode.value === 'flow') {
      nextTick(() => fitView({ padding: 0.15 }))
    }
  })

  // ── D3 Force-directed graph ──────────────────────────────────────────

  const d3Container = ref<HTMLElement | null>(null)
  // Using `any` here because d3-force's generic typing conflicts with itself
  // when the simulation's node type (D3Node) is declared later in the file.
  let simulation: any = null

  // Keyed reactive state driving hover UI and minimap. Mutated from inside
  // D3 callbacks and read from the Vue template.
  const hoveredNodeId = ref<string | null>(null)
  const hoverPopupPos = ref<{ x: number; y: number } | null>(null)
  const hoveredEntity = computed<any | null>(() => {
    if (!hoveredNodeId.value) return null
    const raw = recordNodes.value.find((n) => getNodeId(n) === hoveredNodeId.value)
    return raw || null
  })

  // Minimap state — kept in sync by the d3 tick handler.
  interface MiniNode {
    id: string
    x: number
    y: number
    color: string
  }
  const minimapNodes = ref<MiniNode[]>([])
  const minimapBounds = ref({ minX: 0, minY: 0, maxX: 1, maxY: 1 })
  const viewportTransform = ref({ k: 1, x: 0, y: 0 })
  const svgSize = ref({ w: 800, h: 600 })

  interface D3Node extends SimulationNodeDatum {
    id: string
    title: string
    nodeType: string
    color: string // resolved hex from ontology color
    icon: string // iconify icon name, e.g. 'lucide:calendar'
    raw: any
  }

  interface D3Link extends SimulationLinkDatum<D3Node> {
    id: string
    label: string
    dashed: boolean
  }

  const initD3 = () => {
    if (!d3Container.value || visibleNodes.value.length === 0) return

    // Clear previous
    if (simulation) {
      simulation.stop()
      simulation = null
    }
    const container = d3Container.value
    container.innerHTML = ''

    const width = container.clientWidth || 800
    const height = container.clientHeight || 600
    svgSize.value = { w: width, h: height }

    // Build d3 data from visible nodes (type filter applied).
    // Each node pulls its brand icon + color straight from the ontology
    // registry so the graph visually matches the rest of the UI.
    const nodes: D3Node[] = visibleNodes.value.map((node, index) => {
      const nodeType = getNodeType(node)
      const cfg = getEntityConfig(nodeType) as any
      return {
        id: getNodeId(node) || `node-${index}`,
        title: getNodeTitle(node),
        nodeType,
        color: resolveColor(cfg?.color),
        icon: cfg?.icon || 'lucide:circle',
        raw: node,
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 200,
      }
    })

    const nodeIdSet = new Set(nodes.map((n) => n.id))
    const links: D3Link[] = computedEdges.value
      .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        dashed: e.dashed,
      }))

    // Adjacency map for hover highlighting
    const neighbors = new Map<string, Set<string>>()
    const edgeNodes = new Map<string, Set<string>>() // edgeId -> {sourceId, targetId}
    for (const e of links) {
      const s = e.source as string
      const t = e.target as string
      if (!neighbors.has(s)) neighbors.set(s, new Set())
      if (!neighbors.has(t)) neighbors.set(t, new Set())
      neighbors.get(s)!.add(t)
      neighbors.get(t)!.add(s)
      edgeNodes.set(e.id, new Set([s, t]))
    }

    const svg = select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)

    const g = svg.append('g')

    // ── Figma-style gestures ──
    // - Wheel without modifier: pan (x/y)
    // - Wheel with ctrl/meta or pinch (ctrlKey=true on trackpad pinch): zoom
    // - Drag on empty canvas: pan
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .filter((event: any) => {
        // Always allow drag-to-pan on the canvas background
        if (event.type === 'mousedown' || event.type === 'pointerdown' || event.type === 'touchstart') {
          return !event.button
        }
        // For wheel, default d3 behavior is zoom; we override below.
        if (event.type === 'wheel') return event.ctrlKey || event.metaKey
        return !event.ctrlKey
      })
      .on('zoom', (event: any) => {
        g.attr('transform', event.transform)
        viewportTransform.value = { k: event.transform.k, x: event.transform.x, y: event.transform.y }
      })

    svg.call(zoomBehavior as any).on('dblclick.zoom', null)

    // Custom wheel handler for pan (when no modifier). Uses the zoom
    // behavior's translateBy so transforms stay consistent.
    svg.on('wheel', (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return // let d3 zoom handle it
      event.preventDefault()
      const dx = -event.deltaX
      const dy = -event.deltaY
      ;(zoomBehavior as any).translateBy(svg, dx, dy)
    })

    // Center initial view
    const initialTransform = zoomIdentity
      .translate(width / 2, height / 2)
      .scale(0.8)
      .translate(-width / 2, -height / 2)
    svg.call((zoomBehavior as any).transform, initialTransform)

    // Edges
    const link = g
      .append('g')
      .attr('class', 'gv-edges')
      .selectAll<SVGLineElement, D3Link>('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--muted-foreground)')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', (d: D3Link) => (d.dashed ? 1 : 1.5))
      .attr('stroke-dasharray', (d: D3Link) => (d.dashed ? '4 2' : null))

    // Edge labels
    const linkLabel = g
      .append('g')
      .attr('class', 'gv-edge-labels')
      .selectAll<SVGTextElement, D3Link>('text')
      .data(links)
      .join('text')
      .text((d: D3Link) => d.label)
      .attr('font-size', '9px')
      .attr('fill', 'var(--muted-foreground)')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .attr('opacity', 0.6)

    // Node groups
    const NODE_RADIUS = 26
    const nodeGroup = g
      .append('g')
      .attr('class', 'gv-nodes')
      .selectAll<SVGGElement, D3Node>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab')

    // Tinted circle with a subtle fill in the brand color
    nodeGroup
      .append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', (d: D3Node) => d.color)
      .attr('fill-opacity', 0.12)
      .attr('stroke', (d: D3Node) => d.color)
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 1px 3px rgb(0 0 0 / 0.1))')

    // Icon placeholder — an inner <svg> group we fill asynchronously once
    // the iconify data has loaded. Size is 20x20 centered on the node.
    const ICON_SIZE = 22
    const iconHolder = nodeGroup
      .append<SVGSVGElement>('svg')
      .attr('width', ICON_SIZE)
      .attr('height', ICON_SIZE)
      .attr('x', -ICON_SIZE / 2)
      .attr('y', -ICON_SIZE / 2)
      .attr('viewBox', '0 0 24 24')
      .attr('fill', 'none')
      .attr('stroke', (d: D3Node) => d.color)
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('pointer-events', 'none')
      .style('overflow', 'visible')

    // Load each unique icon once, then stamp its body into every matching holder.
    const uniqueIcons = Array.from(new Set(nodes.map((n) => n.icon)))
    for (const iconName of uniqueIcons) {
      getIconData(iconName).then((data) => {
        if (!data) return
        iconHolder
          .filter((d: D3Node) => d.icon === iconName)
          .attr('viewBox', `0 0 ${data.width} ${data.height}`)
          .html(data.body)
      })
    }

    // Title label below the circle
    nodeGroup
      .append('text')
      .text((d: D3Node) => {
        const max = 16
        return d.title.length > max ? d.title.slice(0, max) + '…' : d.title
      })
      .attr('text-anchor', 'middle')
      .attr('dy', NODE_RADIUS + 14)
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('fill', 'var(--card-foreground)')
      .attr('pointer-events', 'none')

    // Plain-text tooltip fallback (also hoverable via our preview popup)
    nodeGroup.append('title').text((d: D3Node) => d.title)

    // ── Hover: dim others, highlight edges + connected nodes, show preview ──
    const applyHoverState = (activeId: string | null) => {
      if (!activeId) {
        nodeGroup.attr('opacity', 1)
        link.attr('stroke-opacity', 0.4).attr('stroke-width', (d: D3Link) => (d.dashed ? 1 : 1.5))
        return
      }
      const active = neighbors.get(activeId) || new Set<string>()
      nodeGroup.attr('opacity', (d: D3Node) => (d.id === activeId || active.has(d.id) ? 1 : 0.2))
      link
        .attr('stroke-opacity', (d: D3Link) => {
          const connected = (d.source as any).id === activeId || (d.target as any).id === activeId
          return connected ? 0.9 : 0.08
        })
        .attr('stroke-width', (d: D3Link) => {
          const connected = (d.source as any).id === activeId || (d.target as any).id === activeId
          return connected ? 2.5 : d.dashed ? 1 : 1.5
        })
    }

    nodeGroup
      .on('mouseenter', (_event: MouseEvent, d: D3Node) => {
        hoveredNodeId.value = d.id
        applyHoverState(d.id)
      })
      .on('mousemove', (event: MouseEvent) => {
        // Anchor the preview popup to the cursor in container-relative coords
        const rect = container.getBoundingClientRect()
        hoverPopupPos.value = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        }
      })
      .on('mouseleave', () => {
        hoveredNodeId.value = null
        hoverPopupPos.value = null
        applyHoverState(null)
      })

    // ── Click vs. drag disambiguation ──
    // d3-drag fires 'start' on mousedown and 'end' on mouseup even when
    // the pointer never moved. We only want to treat it as a drag if the
    // pointer actually moved past a small threshold. The `dragMoved` flag
    // gets set inside the drag handler's 'drag' callback (real movement).
    let dragMoved = false

    nodeGroup.on('click', (event: MouseEvent, d: D3Node) => {
      if (dragMoved) return
      event.stopPropagation()
      emit('open-entity', d.raw)
    })

    // Drag behavior (standard d3 physics restart on drag)
    const dragHandler = d3Drag<SVGGElement, D3Node>()
      .on('start', (event, d) => {
        dragMoved = false
        if (!event.active) simulation?.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
        select(event.sourceEvent.target.closest('g')).attr('cursor', 'grabbing')
      })
      .on('drag', (event, d) => {
        dragMoved = true
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation?.alphaTarget(0)
        d.fx = null
        d.fy = null
        select(event.sourceEvent.target.closest('g')).attr('cursor', 'grab')
      })

    nodeGroup.call(dragHandler)

    // ── Semantic similarity links ──
    // Build an invisible link set from each node's top-K most similar
    // neighbors (cosine ≥ threshold). We feed these into a dedicated
    // forceLink so d3's spring relaxation does the heavy lifting — much
    // stronger and more stable than the custom attraction we had before.
    //
    // When clustering is enabled we also weaken the global charge + center
    // forces so cohesive clusters can actually form at different regions
    // rather than fighting the center gravity.
    const clustering = clusterBySimilarity.value && embeddingsCache.value.size > 0
    const SIM_TOP_K = 6
    const SIM_THRESHOLD = 0.45 // nomic vectors: ~0.4 unrelated, ~0.7+ related
    interface SimLink {
      source: string
      target: string
      sim: number
    }
    const simLinks: SimLink[] = []
    if (clustering) {
      const vecs: (number[] | null)[] = nodes.map((n) => embeddingsCache.value.get(n.id) || null)
      // Seen-pair dedupe so each pair contributes one spring, not two.
      const seen = new Set<string>()
      for (let i = 0; i < nodes.length; i++) {
        const vi = vecs[i]
        if (!vi) continue
        const candidates: Array<{ j: number; sim: number }> = []
        for (let j = 0; j < nodes.length; j++) {
          if (j === i) continue
          const vj = vecs[j]
          if (!vj || vj.length !== vi.length) continue
          let dot = 0
          for (let k = 0; k < vi.length; k++) dot += vi[k]! * vj[k]!
          if (dot >= SIM_THRESHOLD) candidates.push({ j, sim: dot })
        }
        candidates.sort((a, b) => b.sim - a.sim)
        for (const c of candidates.slice(0, SIM_TOP_K)) {
          const a = nodes[i]!.id
          const b = nodes[c.j]!.id
          const key = a < b ? `${a}|${b}` : `${b}|${a}`
          if (seen.has(key)) continue
          seen.add(key)
          simLinks.push({ source: a, target: b, sim: c.sim })
        }
      }
    }

    // Simulation. Force parameters shift when clustering is on so the
    // explicit-link graph doesn't cancel out the semantic pulls.
    const chargeStrength = clustering ? -80 : -300
    const centerStrength = clustering ? 0.02 : 1
    const explicitLinkStrength = clustering ? 0.2 : 1

    simulation = forceSimulation<D3Node>(nodes)
      .force(
        'link',
        forceLink<D3Node, D3Link>(links)
          .id((d) => d.id)
          .distance(120)
          .strength(explicitLinkStrength),
      )
      .force('charge', forceManyBody().strength(chargeStrength))
      .force('center', forceCenter(width / 2, height / 2).strength(centerStrength))
      .force('collide', forceCollide(NODE_RADIUS + 10))
      .force(
        'similarity',
        clustering
          ? forceLink<D3Node, SimLink>(simLinks as any)
              .id((d: any) => d.id)
              // Higher similarity ⇒ shorter rest length ⇒ nodes sit closer.
              // sim ranges ~0.45–1.0; map to [180px, 50px].
              .distance((d: any) => 180 - (d.sim - SIM_THRESHOLD) * 240)
              // Strong pull, but scale by sim so weak matches don't tug.
              // sim² emphasizes the strongest pairs; * 0.9 tops at ~0.9.
              .strength((d: any) => Math.min(0.9, d.sim * d.sim * 0.9))
          : (forceLink<D3Node, any>([]).strength(0) as any),
      )
      .on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y)

        linkLabel
          .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
          .attr('y', (d: any) => (d.source.y + d.target.y) / 2)

        nodeGroup.attr('transform', (d: D3Node) => `translate(${d.x},${d.y})`)

        // Sync minimap state (throttled implicitly by simulation tick rate)
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
          miniData.push({ id: n.id, x, y, color: n.color })
        }
        if (!isFinite(minX)) {
          minX = 0
          minY = 0
          maxX = width
          maxY = height
        }
        minimapBounds.value = { minX, minY, maxX, maxY }
        minimapNodes.value = miniData
      })
  }

  // Init / destroy d3 on mode switch + data + type filter + clustering changes
  watch(
    [graphMode, visibleNodes, computedEdges, typeVisibility, clusterBySimilarity, embeddingsCache],
    () => {
      if (graphMode.value === 'force') {
        nextTick(() => initD3())
      } else {
        if (simulation) {
          simulation.stop()
          simulation = null
        }
      }
    },
    { immediate: true, deep: true },
  )

  onBeforeUnmount(() => {
    if (simulation) {
      simulation.stop()
      simulation = null
    }
  })

  // ── Stats ────────────────────────────────────────────────────────────

  const nodeCount = computed(() => visibleNodes.value.length)
  const totalNodeCount = computed(() => recordNodes.value.length)
  const edgeCount = computed(
    () =>
      computedEdges.value.filter((e) => visibleNodeIds.value.has(e.source) && visibleNodeIds.value.has(e.target))
        .length,
  )

  const minimapMaskColor = 'color-mix(in srgb, var(--background) 85%, transparent)'

  // ── D3 minimap geometry (computed from live minimap state) ────────────

  const MINIMAP_W = 180
  const MINIMAP_H = 120

  const minimapViewBox = computed(() => {
    const { minX, minY, maxX, maxY } = minimapBounds.value
    const pad = 50
    const x = minX - pad
    const y = minY - pad
    const w = Math.max(1, maxX - minX + pad * 2)
    const h = Math.max(1, maxY - minY + pad * 2)
    return { x, y, w, h, aspect: w / h }
  })

  const minimapViewport = computed(() => {
    // The visible portion of the main svg in world coordinates.
    const { k, x, y } = viewportTransform.value
    const { w: sw, h: sh } = svgSize.value
    if (k === 0) return { x: 0, y: 0, w: sw, h: sh }
    return {
      x: -x / k,
      y: -y / k,
      w: sw / k,
      h: sh / k,
    }
  })

  const miniNodeColor = (color: string) => color || 'var(--muted-foreground)'

  // ── Hover preview position (SSR-safe) ────────────────────────────────
  // Guard window access behind import.meta.client so SSR/hydration doesn't
  // throw. Returns null until the popup has everything it needs.
  const hoverPopupStyle = computed<{ left: string; top: string } | null>(() => {
    if (!import.meta.client) return null
    if (!hoverPopupPos.value || !d3Container.value) return null
    const rect = d3Container.value.getBoundingClientRect()
    const w = window.innerWidth
    const h = window.innerHeight
    const left = Math.max(12, Math.min(w - 300, rect.left + hoverPopupPos.value.x + 20))
    const top = Math.max(12, Math.min(h - 200, rect.top + hoverPopupPos.value.y + 20))
    return { left: `${left}px`, top: `${top}px` }
  })
</script>

<template>
  <div ref="rootEl" class="h-full w-full relative">
    <!-- Empty state -->
    <div
      v-if="recordNodes.length === 0"
      class="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
      <Icon name="lucide:network" class="h-10 w-10 text-muted-foreground mb-3" />
      <h3 class="text-lg font-medium text-foreground">No records to visualize</h3>
      <p class="text-sm text-muted-foreground mt-1 max-w-sm">Add records to your collection to see them as a graph.</p>
    </div>

    <template v-else>
      <!-- Mode toggle -->
      <div class="absolute top-3 left-3 z-20 flex items-center bg-card border border-border rounded-lg p-0.5 gap-0.5">
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
          :class="graphMode === 'force' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'"
          @click="graphMode = 'force'">
          <Icon name="lucide:atom" class="h-3.5 w-3.5" />
          Force
        </button>
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
          :class="graphMode === 'flow' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'"
          @click="graphMode = 'flow'">
          <Icon name="lucide:workflow" class="h-3.5 w-3.5" />
          Flow
        </button>
        <!-- Semantic clustering toggle (force mode only) -->
        <div v-if="graphMode === 'force'" class="mx-0.5 h-5 w-px bg-border/60" />
        <button
          v-if="graphMode === 'force'"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
          :class="clusterBySimilarity ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'"
          :title="
            embeddingsError
              ? `Embedding load failed: ${embeddingsError}`
              : embeddingsLoading
                ? 'Loading embeddings…'
                : clusterBySimilarity
                  ? `Clustering on (${embeddingsCache.size} embeddings, ${embeddingsModel})`
                  : 'Cluster nodes by semantic similarity'
          "
          @click="clusterBySimilarity = !clusterBySimilarity">
          <Icon :name="embeddingsLoading ? 'svg-spinners:ring-resize' : 'lucide:sparkles'" class="h-3.5 w-3.5" />
          Cluster
        </button>
      </div>

      <!-- Type legend (top-right) — doubles as a filter panel -->
      <div
        v-if="typesInGraph.length > 0"
        class="absolute top-3 right-3 z-20 w-56 max-h-[60vh] overflow-hidden bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-sm flex flex-col">
        <div class="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Types</p>
          <button
            class="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            :title="allTypesVisible ? 'Hide all' : 'Show all'"
            @click="toggleAllTypes">
            {{ allTypesVisible ? 'Hide all' : 'Show all' }}
          </button>
        </div>
        <div class="flex-1 overflow-y-auto py-1">
          <label
            v-for="t in typesInGraph"
            :key="t.type"
            class="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors group"
            :class="{ 'opacity-40': !isTypeVisible(t.type) }">
            <input
              type="checkbox"
              :checked="isTypeVisible(t.type)"
              class="h-3.5 w-3.5 rounded border-border shrink-0 accent-primary"
              @change="toggleType(t.type)" />
            <div :class="['flex h-5 w-5 items-center justify-center rounded shrink-0', `bg-${t.color}-500/15`]">
              <Icon :name="t.icon" :class="['h-3 w-3', `text-${t.color}-500`]" />
            </div>
            <span class="text-xs flex-1 truncate">{{ t.label }}</span>
            <span class="text-[10px] text-muted-foreground/70 tabular-nums">{{ t.count }}</span>
          </label>
        </div>
      </div>

      <!-- D3 Force-directed view -->
      <div v-show="graphMode === 'force'" ref="d3Container" class="h-full w-full" />

      <!-- Vue Flow structured view -->
      <ClientOnly>
        <VueFlow
          v-show="graphMode === 'flow'"
          v-model:nodes="flowNodes"
          v-model:edges="flowEdges"
          :default-viewport="{ x: 40, y: 40, zoom: 0.9 }"
          :min-zoom="0.15"
          :max-zoom="3"
          fit-view-on-init
          pan-on-scroll
          :zoom-on-scroll="false"
          :zoom-on-pinch="true"
          :zoom-on-double-click="false"
          :nodes-draggable="true"
          :nodes-connectable="false"
          class="h-full w-full"
          @node-click="handleFlowNodeClick">
          <Background variant="dots" :gap="20" :size="1" pattern-color="var(--muted)" />
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            :mask-color="minimapMaskColor"
            class="bg-card! border-border! rounded-lg!" />

          <!-- VueFlow-only zoom controls -->
          <div class="absolute bottom-3 right-16 z-10 flex flex-col gap-1">
            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border hover:bg-accent transition-colors"
              title="Zoom in"
              @click="zoomIn()">
              <Icon name="lucide:plus" class="h-4 w-4" />
            </button>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border hover:bg-accent transition-colors"
              title="Zoom out"
              @click="zoomOut()">
              <Icon name="lucide:minus" class="h-4 w-4" />
            </button>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border hover:bg-accent transition-colors"
              title="Fit view"
              @click="fitView({ padding: 0.15 })">
              <Icon name="lucide:maximize-2" class="h-4 w-4" />
            </button>
          </div>
        </VueFlow>
      </ClientOnly>

      <!-- D3 mode minimap (bottom-left) -->
      <div
        v-show="graphMode === 'force' && minimapNodes.length > 0"
        class="absolute bottom-3 left-3 z-10 rounded-lg border border-border bg-card/95 backdrop-blur-sm overflow-hidden shadow-sm"
        :style="{ width: `${MINIMAP_W}px`, height: `${MINIMAP_H}px` }">
        <svg
          :viewBox="`${minimapViewBox.x} ${minimapViewBox.y} ${minimapViewBox.w} ${minimapViewBox.h}`"
          preserveAspectRatio="xMidYMid meet"
          class="h-full w-full">
          <!-- Viewport rectangle showing the main canvas' visible area -->
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
            :fill="miniNodeColor(n.color)"
            :opacity="hoveredNodeId && hoveredNodeId !== n.id ? 0.3 : 0.9" />
        </svg>
      </div>

      <!-- Hover preview popup (positioned near the hovered node) -->
      <Teleport to="body">
        <div
          v-if="hoveredEntity && hoverPopupStyle && graphMode === 'force'"
          class="fixed z-50 pointer-events-none transition-opacity"
          :style="hoverPopupStyle">
          <div class="w-72 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
            <EntityPreviewCard
              :entity-id="hoveredEntity['@id'] || hoveredEntity.id"
              :entity-type="hoveredEntity['@type'] || hoveredEntity.type" />
          </div>
        </div>
      </Teleport>

      <!-- Stats badge -->
      <div
        class="absolute bottom-3 right-3 z-10 flex items-center gap-2 text-xs text-muted-foreground bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5">
        <span>
          {{ nodeCount }}
          <span v-if="nodeCount !== totalNodeCount">/ {{ totalNodeCount }}</span>
          {{ nodeCount === 1 ? 'node' : 'nodes' }}
        </span>
        <span v-if="edgeCount > 0" class="text-muted-foreground/50">·</span>
        <span v-if="edgeCount > 0">{{ edgeCount }} {{ edgeCount === 1 ? 'edge' : 'edges' }}</span>
      </div>
    </template>
  </div>
</template>

<style>
  .vue-flow__node-default {
    font-family: inherit;
  }
</style>
