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
  import { select } from 'd3-selection'
  import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom'
  import { drag as d3Drag } from 'd3-drag'
  import { entityQuery } from '~/lib/tql-namespace'

  const graph = useTrellisGraph()

  // ── Data ──────────────────────────────────────────────────────────────

  interface GNode {
    id: string
    type: string
    title: string
  }

  interface GEdge {
    source: string
    target: string
    relation: string
  }

  const svgContainer = ref<HTMLElement | null>(null)
  const graphNodes = ref<GNode[]>([])
  const graphEdges = ref<GEdge[]>([])
  const loading = ref(true)
  const nodeCount = computed(() => graphNodes.value.length)
  const edgeCount = computed(() => graphEdges.value.length)

  const MAX_NODES = 200

  const TYPE_COLORS = [
    'hsl(var(--primary))',
    'hsl(200 80% 50%)',
    'hsl(280 60% 55%)',
    'hsl(150 60% 40%)',
    'hsl(30 80% 50%)',
    'hsl(350 70% 50%)',
    'hsl(60 70% 45%)',
    'hsl(180 60% 45%)',
    'hsl(320 60% 55%)',
    'hsl(100 50% 45%)',
  ]

  const typeColorMap = computed(() => {
    const map = new Map<string, string>()
    const types = [...new Set(graphNodes.value.map((n) => n.type))]
    types.forEach((t, i) => map.set(t, TYPE_COLORS[i % TYPE_COLORS.length]!))
    return map
  })

  const typeLegend = computed(() =>
    [...typeColorMap.value.entries()].map(([type, color]) => ({ type, color })),
  )

  // ── Fetch ─────────────────────────────────────────────────────────────

  const fetchGraphData = async () => {
    loading.value = true
    try {
      const result = await graph.queryOnce(entityQuery('?e'))
      const ids = result.data.map((row) => String((row as any)['?e'])).slice(0, MAX_NODES)

      if (ids.length === 0) {
        graphNodes.value = []
        graphEdges.value = []
        return
      }

      const batchResult = await $fetch<{ nodes: Array<Record<string, any>> }>('/api/graph/nodes', {
        method: 'POST',
        body: { ids },
      })

      const nodeList: GNode[] = []
      const edgeList: GEdge[] = []
      const idSet = new Set(ids)

      for (const raw of batchResult.nodes || []) {
        const id = String(raw['@id'] || raw.id || '')
        if (!id) continue
        nodeList.push({
          id,
          type: String(raw['@type'] || raw.type || 'entity'),
          title: String(raw.title || id),
        })

        const links = raw._links as
          | { outgoing?: Array<{ relation: string; target: string }> }
          | undefined
        if (links?.outgoing) {
          for (const link of links.outgoing) {
            if (idSet.has(link.target) && link.target !== id) {
              edgeList.push({ source: id, target: link.target, relation: link.relation })
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

  // ── D3 ────────────────────────────────────────────────────────────────

  interface SimNode extends SimulationNodeDatum {
    id: string
    type: string
    title: string
  }

  interface SimLink extends SimulationLinkDatum<SimNode> {
    relation: string
  }

  let simulation: any = null

  const initSimulation = () => {
    if (!svgContainer.value || graphNodes.value.length === 0) return

    if (simulation) {
      simulation.stop()
      simulation = null
    }

    const container = svgContainer.value
    container.innerHTML = ''

    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    const simNodes: SimNode[] = graphNodes.value.map((n) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 300,
      y: height / 2 + (Math.random() - 0.5) * 300,
    }))

    const nodeIdSet = new Set(simNodes.map((n) => n.id))
    const simLinks: SimLink[] = graphEdges.value
      .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, relation: e.relation }))

    const colorMap = typeColorMap.value

    const svg = select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')

    const g = svg.append('g')

    // Zoom
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    svg.call(zoomBehavior as any)

    // Center initial
    const initialTransform = zoomIdentity
      .translate(width / 2, height / 2)
      .scale(0.85)
      .translate(-width / 2, -height / 2)
    svg.call((zoomBehavior as any).transform, initialTransform)

    // Edges
    const link = g
      .append('g')
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', 'var(--muted-foreground)')
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', 1)

    // Edge labels (only when zoomed in — via CSS opacity tricks, keep simple here)
    const linkLabel = g
      .append('g')
      .selectAll('text')
      .data(simLinks)
      .join('text')
      .text((d: SimLink) => d.relation)
      .attr('font-size', '9px')
      .attr('fill', 'var(--muted-foreground)')
      .attr('text-anchor', 'middle')
      .attr('dy', -3)
      .attr('opacity', 0.5)
      .attr('pointer-events', 'none')

    // Node groups
    const NODE_R = 8

    const nodeGroup = g
      .append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'grab')

    nodeGroup
      .append('circle')
      .attr('r', NODE_R)
      .attr('fill', (d: SimNode) => colorMap.get(d.type) || 'hsl(var(--primary))')
      .attr('fill-opacity', 0.85)
      .attr('stroke', 'var(--background)')
      .attr('stroke-width', 2)
      .style('filter', 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.15))')

    nodeGroup
      .append('text')
      .text((d: SimNode) => (d.title.length > 14 ? d.title.slice(0, 14) + '…' : d.title))
      .attr('text-anchor', 'middle')
      .attr('dy', NODE_R + 11)
      .attr('font-size', '9px')
      .attr('fill', 'var(--muted-foreground)')
      .attr('pointer-events', 'none')

    nodeGroup.append('title').text((d: SimNode) => `${d.title}\n${d.type}\n${d.id}`)

    // Drag
    const dragHandler = d3Drag<SVGGElement, SimNode>()
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
    simulation = forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(80),
      )
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide(NODE_R + 6))
      .alphaDecay(0.03)
      .on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y)

        linkLabel
          .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
          .attr('y', (d: any) => (d.source.y + d.target.y) / 2)

        nodeGroup.attr('transform', (d: SimNode) => `translate(${d.x ?? 0},${d.y ?? 0})`)
      })
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  onMounted(async () => {
    await fetchGraphData()
    await nextTick()
    initSimulation()
  })

  watch(
    () => graph.graphVersion.value,
    async () => {
      await fetchGraphData()
      await nextTick()
      initSimulation()
    },
  )

  watch([graphNodes, graphEdges], () => {
    nextTick(() => initSimulation())
  })

  onBeforeUnmount(() => {
    if (simulation) {
      simulation.stop()
      simulation = null
    }
  })
</script>

<template>
  <Page
    variant="default"
    title="Graph Visualization"
    subtitle="Developer"
    description="Force-directed view of all graph entities and their relationships."
    icon="lucide:network">
    <template #toolbarActions>
      <UiButton variant="outline" size="sm" class="gap-2" @click="fetchGraphData">
        <Icon name="lucide:refresh-cw" class="h-4 w-4" />
        <span>Refresh</span>
      </UiButton>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="flex h-full items-center justify-center text-muted-foreground">
      <Icon name="lucide:loader-circle" class="h-8 w-8 animate-spin" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="nodeCount === 0"
      class="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Icon name="lucide:network" class="h-12 w-12 opacity-30" />
      <p class="text-sm">No entities in the graph yet.</p>
    </div>

    <!-- Visualization -->
    <template v-else>
      <div class="relative w-full h-full min-h-[500px] rounded-lg overflow-hidden border border-border bg-card/30">
        <!-- Canvas -->
        <div ref="svgContainer" class="w-full h-full" />

        <!-- Stats badge -->
        <div class="absolute bottom-3 right-3 z-10 flex items-center gap-2 text-xs text-muted-foreground bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 font-mono">
          <span>{{ nodeCount }} nodes</span>
          <span v-if="edgeCount > 0" class="opacity-40">·</span>
          <span v-if="edgeCount > 0">{{ edgeCount }} edges</span>
        </div>

        <!-- Type legend -->
        <div
          v-if="typeLegend.length > 0"
          class="absolute top-3 right-3 z-10 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 flex flex-col gap-1.5 max-h-60 overflow-y-auto">
          <div v-for="entry in typeLegend" :key="entry.type" class="flex items-center gap-2">
            <span class="inline-block w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: entry.color }" />
            <span class="text-[11px] text-muted-foreground">{{ entry.type }}</span>
          </div>
        </div>

        <!-- Zoom hint -->
        <div class="absolute bottom-3 left-3 z-10 text-[10px] text-muted-foreground/50 select-none">
          Scroll to zoom · Drag nodes
        </div>
      </div>
    </template>
  </Page>
</template>
