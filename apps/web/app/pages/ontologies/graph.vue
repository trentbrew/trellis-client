<script setup lang="ts">
  /**
   * /ontologies/graph — VueFlow visualizer for schema relationships.
   * Ported from the legacy /database/ontology route.
   */
  import { VueFlow, Panel, useVueFlow } from '@vue-flow/core'
  import { Background } from '@vue-flow/background'
  import { MiniMap } from '@vue-flow/minimap'
  import type { Node, Edge } from '@vue-flow/core'

  import GraphOntologyTableNode from '~/components/graph/OntologyTableNode.vue'
  import { buildNodesFromSchemas, buildEdgesFromSchemas } from '~/components/graph/schema-data'

  import '@vue-flow/core/dist/style.css'
  import '@vue-flow/controls/dist/style.css'

  definePageMeta({
    title: 'Ontology Graph',
    icon: 'lucide:git-branch',
    middleware: ['auth'],
  })

  // Node type registration
  const nodeTypes = {
    ontologyTable: markRaw(GraphOntologyTableNode) as any,
  }

  // Fetch ontologies from server
  const { ontologies } = useTrellisConfig()

  // Split ontologies by tier
  const coreSchemas = computed(() => Object.values(ontologies.value || {}).filter((s: any) => s.tier === 'core'))
  const systemSchemas = computed(() => Object.values(ontologies.value || {}).filter((s: any) => s.tier === 'system'))
  const userSchemas = computed(() => Object.values(ontologies.value || {}).filter((s: any) => s.tier === 'user'))

  // Derive nodes/edges per tier
  const coreNodes = computed(() => buildNodesFromSchemas(coreSchemas.value as any))
  const coreEdges = computed(() => buildEdgesFromSchemas(coreSchemas.value as any))
  const systemNodes = computed(() => buildNodesFromSchemas(systemSchemas.value as any))
  const systemEdges = computed(() => buildEdgesFromSchemas(systemSchemas.value as any))
  const userNodes = computed(() => buildNodesFromSchemas(userSchemas.value as any))
  const userEdges = computed(() => buildEdgesFromSchemas(userSchemas.value as any))

  // Active tab
  type SchemaTab = 'user' | 'system' | 'core'
  const activeTab = ref<SchemaTab>('user')

  const tabs: { id: SchemaTab; label: string; icon: string; description: string }[] = [
    { id: 'user', label: 'Custom', icon: 'lucide:blocks', description: 'User-created schemas (editable)' },
    { id: 'system', label: 'System', icon: 'lucide:layers', description: 'Built-in entity types (versioned)' },
    { id: 'core', label: 'Core', icon: 'lucide:shield', description: 'Structural types (kernel-owned)' },
  ]

  // Reactive nodes/edges for VueFlow
  const nodes = ref<Node[]>([])
  const edges = ref<Edge[]>([])

  // Initialize per-tab
  watchEffect(() => {
    if (activeTab.value === 'core') {
      nodes.value = [...coreNodes.value]
      edges.value = [...coreEdges.value]
    } else if (activeTab.value === 'system') {
      nodes.value = [...systemNodes.value]
      edges.value = [...systemEdges.value]
    } else {
      nodes.value = [...userNodes.value]
      edges.value = [...userEdges.value]
    }
  })

  const { fitView, zoomIn, zoomOut } = useVueFlow()

  function switchTab(tab: SchemaTab) {
    activeTab.value = tab
    nextTick(() => fitView({ padding: 0.15 }))
  }

  const nodeCount = computed(() => nodes.value.length)
  const edgeCount = computed(() => edges.value.length)

  const minimapMaskColor = 'color-mix(in srgb, var(--background) 85%, transparent)'
</script>

<template>
  <div class="ontology-visualizer h-[calc(100dvh-64px)] w-full relative">
    <ClientOnly>
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="nodeTypes"
        :default-viewport="{ x: 0, y: 0, zoom: 0.85 }"
        :min-zoom="0.2"
        :max-zoom="2"
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
          node-color="var(--muted)"
          node-stroke-color="var(--primary)"
          :node-border-radius="8"
          :mask-color="minimapMaskColor"
          :mask-border-radius="8"
          :height="100"
          :width="140"
          class="m-3!" />

        <!-- Tab Switcher -->
        <Panel position="top-left" class="m-3">
          <div class="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              :class="activeTab === tab.id
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'"
              @click="switchTab(tab.id)">
              <Icon :name="tab.icon" class="size-3.5" />
              {{ tab.label }}
            </button>
          </div>
        </Panel>

        <!-- Stats + Zoom Controls -->
        <Panel position="top-right" class="m-3">
          <div class="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
            <div class="flex items-center gap-3 text-xs text-muted-foreground">
              <div class="flex items-center gap-1.5">
                <Icon name="lucide:square" class="size-3.5" />
                <span>{{ nodeCount }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <Icon name="lucide:git-commit-horizontal" class="size-3.5" />
                <span>{{ edgeCount }}</span>
              </div>
            </div>
            <div class="h-4 w-px bg-border" />
            <div class="flex items-center gap-0.5">
              <button
                type="button"
                class="flex size-7 items-center justify-center rounded-md text-muted-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                title="Zoom In"
                @click="zoomIn({})">
                <Icon name="lucide:plus" class="size-4" />
              </button>
              <button
                type="button"
                class="flex size-7 items-center justify-center rounded-md text-muted-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                title="Zoom Out"
                @click="zoomOut({})">
                <Icon name="lucide:minus" class="size-4" />
              </button>
              <button
                type="button"
                class="flex size-7 items-center justify-center rounded-md text-muted-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                title="Fit View"
                @click="fitView({ padding: 0.15 })">
                <Icon name="lucide:scan" class="size-4" />
              </button>
            </div>
          </div>
        </Panel>

        <!-- Tab Description -->
        <Panel position="bottom-right" class="m-3">
          <div class="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
            <p class="text-xs text-muted-foreground">
              <Icon :name="tabs.find(t => t.id === activeTab)?.icon ?? 'lucide:blocks'" class="size-3.5 inline-block mr-1 -mt-0.5" />
              {{ tabs.find(t => t.id === activeTab)?.description }}
            </p>
          </div>
        </Panel>

        <!-- Edge labels -->
        <template #edge-label="{ edge }">
          <div v-if="edge.label" class="rounded border border-border bg-card px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
            {{ edge.label }}
          </div>
        </template>
      </VueFlow>
    </ClientOnly>
  </div>
</template>

<style>
  .ontology-visualizer .vue-flow__node {
    cursor: grab;
  }
  .ontology-visualizer .vue-flow__node:active {
    cursor: grabbing;
  }
  .ontology-visualizer .vue-flow__edge-path {
    stroke: var(--muted-foreground);
    stroke-opacity: 0.35;
    stroke-width: 1.5;
  }
  .ontology-visualizer .vue-flow__edge.animated .vue-flow__edge-path {
    stroke-dasharray: 6 3;
    animation: edge-flow 0.6s linear infinite;
  }
  @keyframes edge-flow {
    to {
      stroke-dashoffset: -9;
    }
  }
</style>
