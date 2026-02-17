<script setup lang="ts">
  import { VueFlow, useVueFlow } from '@vue-flow/core'
  import { Background } from '@vue-flow/background'
  import { MiniMap } from '@vue-flow/minimap'
  import type { Node, Edge } from '@vue-flow/core'
  import type { DatabaseField, DatabaseSchema } from '~/types/database'
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
  import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom'

  import '@vue-flow/core/dist/style.css'

  const props = defineProps<{
    collectionId: string
    modelValue?: string
    schema?: DatabaseSchema | null
  }>()

  const _emit = defineEmits<{
    'update:modelValue': [value: string]
  }>()

  const rootEl = ref<HTMLElement | null>(null)

  // ── View mode toggle ─────────────────────────────────────────────────

  type GraphMode = 'flow' | 'force'
  const graphMode = ref<GraphMode>('force')

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
    return graphData.value.filter((n) => {
      if (!n || typeof n !== 'object' || Array.isArray(n)) return false
      const t = (n as any)['@type'] ?? (n as any).type
      if (t === 'trellis:Collection') return false
      if (t === 'trellis:PropertyValueSpecification') return false
      return true
    })
  })

  // ── Schema fields ────────────────────────────────────────────────────

  const schemaFields = computed<DatabaseField[]>(() => {
    const fields = props.schema?.fields
    if (!Array.isArray(fields)) return []
    return fields.slice().sort((a, b) => a.order - b.order)
  })

  const relationFields = computed(() =>
    schemaFields.value.filter((f) => f.type === 'relation'),
  )

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

  // ── Display helpers ──────────────────────────────────────────────────

  const getNodeTitle = (node: any): string => {
    return extractNodeValue(node, [...fieldKeyAliases.title]) || 'Untitled'
  }

  const getNodeId = (node: any): string => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return ''
    const id = (node as any)['@id'] ?? (node as any).id
    return typeof id === 'string' ? id : ''
  }

  const getNodeType = (node: any): string => {
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
          const targetId = typeof target === 'string' ? target : (target as any)?.['@id'] ?? (target as any)?.id
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
    return recordNodes.value.map((node, index) => {
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
        data: { title, nodeType: type, colorIdx },
        style: {
          background: 'var(--card)',
          border: `2px solid ${color?.fill ?? 'var(--border)'}`,
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '13px',
          width: `${NODE_W}px`,
          color: 'var(--card-foreground)',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        },
        label: title,
      }
    })
  })

  const flowEdges = computed<Edge[]>(() => {
    return computedEdges.value.map((e) => ({
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

  watch([flowNodes, flowEdges], () => {
    if (graphMode.value === 'flow') {
      nextTick(() => fitView({ padding: 0.15 }))
    }
  })

  // ── D3 Force-directed graph ──────────────────────────────────────────

  const d3Container = ref<HTMLElement | null>(null)
  let simulation: ReturnType<typeof forceSimulation> | null = null

  interface D3Node extends SimulationNodeDatum {
    id: string
    title: string
    nodeType: string
    colorIdx: number
  }

  interface D3Link extends SimulationLinkDatum<D3Node> {
    id: string
    label: string
    dashed: boolean
  }

  const initD3 = () => {
    if (!d3Container.value || recordNodes.value.length === 0) return

    // Clear previous
    if (simulation) {
      simulation.stop()
      simulation = null
    }
    const container = d3Container.value
    container.innerHTML = ''

    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    // Build d3 data
    const nodes: D3Node[] = recordNodes.value.map((node, index) => ({
      id: getNodeId(node) || `node-${index}`,
      title: getNodeTitle(node),
      nodeType: getNodeType(node),
      colorIdx: typeColorMap.value.get(getNodeType(node)) ?? 0,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
    }))

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

    const svg = select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)

    const g = svg.append('g')

    // Zoom
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoomBehavior as any)

    // Center initial view
    const initialTransform = zoomIdentity.translate(width / 2, height / 2).scale(0.8).translate(-width / 2, -height / 2)
    svg.call((zoomBehavior as any).transform, initialTransform)

    // Edges
    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--muted-foreground)')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', (d: D3Link) => (d.dashed ? 1 : 1.5))
      .attr('stroke-dasharray', (d: D3Link) => (d.dashed ? '4 2' : null))

    // Edge labels
    const linkLabel = g
      .append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .text((d: D3Link) => d.label)
      .attr('font-size', '9px')
      .attr('fill', 'var(--muted-foreground)')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .attr('opacity', 0.6)

    // Node groups
    const NODE_RADIUS = 28

    const nodeGroup = g
      .append('g')
      .selectAll<SVGGElement, D3Node>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'grab')

    // Node circle — bg-card with colored border
    nodeGroup
      .append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', 'var(--card)')
      .attr('stroke', (d: D3Node) => d3Colors[d.colorIdx]?.fill ?? 'var(--border)')
      .attr('stroke-width', 2.5)
      .style('filter', 'drop-shadow(0 1px 3px rgb(0 0 0 / 0.1))')

    // Node label
    nodeGroup
      .append('text')
      .text((d: D3Node) => {
        const max = 12
        return d.title.length > max ? d.title.slice(0, max) + '…' : d.title
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('fill', 'var(--card-foreground)')
      .attr('pointer-events', 'none')

    // Tooltip on hover
    nodeGroup.append('title').text((d: D3Node) => d.title)

    // Drag behavior
    const dragHandler = d3Drag<SVGGElement, D3Node>()
      .on('start', (event, d) => {
        if (!event.active) simulation?.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
        select(event.sourceEvent.target.closest('g')).attr('cursor', 'grabbing')
      })
      .on('drag', (event, d) => {
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

    // Simulation
    simulation = forceSimulation<D3Node>(nodes)
      .force(
        'link',
        forceLink<D3Node, D3Link>(links)
          .id((d) => d.id)
          .distance(120),
      )
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide(NODE_RADIUS + 10))
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
      })
  }

  // Init / destroy d3 on mode switch + data changes
  watch(
    [graphMode, recordNodes, computedEdges],
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
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (simulation) {
      simulation.stop()
      simulation = null
    }
  })

  // ── Stats ────────────────────────────────────────────────────────────

  const nodeCount = computed(() => recordNodes.value.length)
  const edgeCount = computed(() => computedEdges.value.length)

  const minimapMaskColor = 'color-mix(in srgb, var(--background) 85%, transparent)'
</script>

<template>
  <div ref="rootEl" class="h-full w-full relative">
    <!-- Empty state -->
    <div
      v-if="recordNodes.length === 0"
      class="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
      <Icon name="lucide:network" class="h-10 w-10 text-muted-foreground mb-3" />
      <h3 class="text-lg font-medium text-foreground">No records to visualize</h3>
      <p class="text-sm text-muted-foreground mt-1 max-w-sm">
        Add records to your collection to see them as a graph.
      </p>
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
          class="h-full w-full">
          <Background variant="dots" :gap="20" :size="1" pattern-color="var(--muted)" />
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            :mask-color="minimapMaskColor"
            class="bg-card! border-border! rounded-lg!" />

          <!-- Controls panel -->
          <div class="absolute top-3 right-3 z-10 flex flex-col gap-1">
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

      <!-- Stats badge -->
      <div class="absolute bottom-3 right-3 z-10 flex items-center gap-2 text-xs text-muted-foreground bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5">
        <span>{{ nodeCount }} {{ nodeCount === 1 ? 'node' : 'nodes' }}</span>
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
