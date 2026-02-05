<script setup lang="ts">
  import { VueFlow, useVueFlow, Panel, PanOnScrollMode } from '@vue-flow/core'
  import { Background } from '@vue-flow/background'
  import { Controls } from '@vue-flow/controls'
  import { MiniMap } from '@vue-flow/minimap'

  import type { Node, Edge, Connection } from '@vue-flow/core'

  // Custom node components
  import FlowCustomInputNode from '~/components/Flow/CustomInputNode.vue'
  import FlowCustomOutputNode from '~/components/Flow/CustomOutputNode.vue'
  import FlowCustomProcessNode from '~/components/Flow/CustomProcessNode.vue'
  import FlowCustomDecisionNode from '~/components/Flow/CustomDecisionNode.vue'
  import FlowCustomCardNode from '~/components/Flow/CustomCardNode.vue'

  // Node types mapping - use markRaw to prevent reactive overhead
  const nodeTypes = {
    customInput: markRaw(FlowCustomInputNode) as any,
    customOutput: markRaw(FlowCustomOutputNode) as any,
    customProcess: markRaw(FlowCustomProcessNode) as any,
    customDecision: markRaw(FlowCustomDecisionNode) as any,
    customCard: markRaw(FlowCustomCardNode) as any,
  }

  // Theme-aware colors - use variables directly without hsl() wrapper
  const patternColor = 'color-mix(in srgb, var(--muted-foreground) 15%, transparent)'
  const minimapMaskColor = 'color-mix(in srgb, var(--background) 85%, transparent)'

  // Minimap node color function - uses semantic colors
  function minimapNodeColor(node: Node): string {
    // Check for success/error output nodes
    if (node.type === 'customOutput') {
      const label = ((node.data?.label as string) || '').toLowerCase()
      if (label.includes('success')) return '#22c55e'
      if (label.includes('error')) return '#ef4444'
      return 'var(--chart-4)'
    }

    const colors: Record<string, string> = {
      customInput: '#22c55e',
      customProcess: 'var(--chart-1)',
      customDecision: 'var(--chart-3)',
      customCard: 'var(--primary)',
    }
    return colors[node.type || ''] || 'var(--muted-foreground)'
  }

  // Initial nodes
  const initialNodes: Node[] = [
    {
      id: '1',
      type: 'customInput',
      position: { x: 50, y: 200 },
      data: { label: 'Start' },
    },
    {
      id: '2',
      type: 'customProcess',
      position: { x: 300, y: 100 },
      data: { label: 'Validate Data' },
    },
    {
      id: '3',
      type: 'customDecision',
      position: { x: 550, y: 200 },
      data: { label: 'Is Valid?' },
    },
    {
      id: '4',
      type: 'customProcess',
      position: { x: 850, y: 100 },
      data: { label: 'Process Request' },
    },
    {
      id: '5',
      type: 'customOutput',
      position: { x: 1100, y: 100 },
      data: { label: 'Success' },
    },
    {
      id: '6',
      type: 'customOutput',
      position: { x: 850, y: 350 },
      data: { label: 'Error' },
    },
    {
      id: '7',
      type: 'customCard',
      position: { x: 50, y: 400 },
      data: {
        label: 'API Gateway',
        type: 'Service',
        icon: 'lucide:cloud',
        iconBg: 'bg-blue-500/10',
        status: 'Running',
        description: 'Handles incoming API requests and routes them to appropriate services.',
        metrics: {
          Requests: '12.5k/s',
          Latency: '45ms',
        },
      },
    },
  ]

  // Initial edges
  const initialEdges: Edge[] = [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      animated: true,
    },
    {
      id: 'e2-3',
      source: '2',
      target: '3',
      animated: true,
    },
    {
      id: 'e3-4',
      source: '3',
      sourceHandle: 'yes',
      target: '4',
      animated: true,
      label: 'Valid',
      style: { stroke: '#22c55e' },
    },
    {
      id: 'e3-6',
      source: '3',
      sourceHandle: 'no',
      target: '6',
      animated: true,
      label: 'Invalid',
      style: { stroke: '#ef4444' },
    },
    {
      id: 'e4-5',
      source: '4',
      target: '5',
      animated: true,
    },
  ]

  const nodes = ref<Node[]>(initialNodes)
  const edges = ref<Edge[]>(initialEdges)

  const { fitView: vueFlowFitView, addNodes, addEdges, getSelectedNodes, getSelectedEdges } = useVueFlow()

  // Selection state - use VueFlow's getSelectedNodes/getSelectedEdges
  const selectedNodes = computed(() => getSelectedNodes.value)
  const _selectedEdges = computed(() => getSelectedEdges.value)
  const showSidebar = computed(() => selectedNodes.value.length > 0)

  // Node counter for unique IDs
  const nodeId = ref(10)

  // Add new node
  function addNode(type: 'input' | 'process' | 'decision' | 'output' | 'card') {
    const typeMap: Record<string, string> = {
      input: 'customInput',
      process: 'customProcess',
      decision: 'customDecision',
      output: 'customOutput',
      card: 'customCard',
    }

    const labelMap: Record<string, string> = {
      input: 'New Input',
      process: 'New Process',
      decision: 'New Decision',
      output: 'New Output',
      card: 'New Card',
    }

    const newNode: Node = {
      id: `${nodeId.value++}`,
      type: typeMap[type],
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      data:
        type === 'card'
          ? {
              label: labelMap[type],
              type: 'Service',
              icon: 'lucide:box',
              status: 'Pending',
              description: 'A new card node.',
            }
          : { label: labelMap[type] },
    }

    addNodes([newNode])
  }

  // Handle edge connection
  function onConnect(connection: Connection) {
    addEdges([
      {
        ...connection,
        id: `e${connection.source}-${connection.target}`,
        animated: true,
      },
    ])
  }

  // Handle edge click (delete)
  function onEdgeClick(_: MouseEvent | VoidFunction, edge: Edge) {
    edges.value = edges.value.filter((e) => e.id !== edge.id)
  }

  // Fit view
  function fitView() {
    vueFlowFitView({ padding: 0.2 })
  }

  // Reset flow
  function resetFlow() {
    nodes.value = [...initialNodes]
    edges.value = [...initialEdges]
    nextTick(() => {
      fitView()
    })
  }

  // Clear selection
  function clearSelection() {
    nodes.value = nodes.value.map((n) => ({ ...n, selected: false }))
    edges.value = edges.value.map((e) => ({ ...e, selected: false }))
  }

  // Group selected nodes (batch operation)
  function groupSelectedNodes() {
    // TODO: Implement grouping logic
    console.log('Grouping nodes:', selectedNodes.value)
  }

  // Duplicate selected nodes (batch operation)
  function duplicateSelectedNodes() {
    const duplicates = selectedNodes.value.map((node) => ({
      ...node,
      id: `${nodeId.value++}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      selected: false,
    }))
    addNodes(duplicates)
  }

  // Delete selected nodes (batch operation)
  function deleteSelectedNodes() {
    const selectedIds = new Set(selectedNodes.value.map((n) => n.id))
    // Remove nodes
    nodes.value = nodes.value.filter((n) => !selectedIds.has(n.id))
    // Also remove edges connected to deleted nodes
    edges.value = edges.value.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target))
  }
</script>

<template>
  <div class="flow-container relative">
    <ClientOnly>
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="nodeTypes"
        :default-viewport="{ x: 0, y: 0, zoom: 1 }"
        :min-zoom="0.2"
        :max-zoom="4"
        :snap-to-grid="true"
        :snap-grid="[15, 15]"
        fit-view-on-init
        pan-on-scroll
        :pan-on-scroll-mode="PanOnScrollMode.Free"
        :zoom-on-scroll="false"
        :zoom-on-pinch="true"
        :zoom-on-double-click="false"
        :selection-key-code="null"
        :multi-selection-key-code="'Shift'"
        class="h-full w-full"
        @connect="onConnect"
        @edge-click="onEdgeClick as any">
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          :node-color="minimapNodeColor"
          :mask-color="minimapMaskColor"
          class="m-3!" />
        <Controls position="bottom-left" class="m-3!" />
        <Background :pattern-color="patternColor" :gap="20" />

        <!-- Toolbar Panel -->
        <Panel position="top-left" class="flow-toolbar m-3 !bg-card !border !border-border">
          <div class="flex items-center gap-1">
            <UiButton variant="ghost" size="sm" class="flow-toolbar-btn" @click="addNode('input')">
              <Icon name="lucide:play" class="h-4 w-4" style="color: #22c55e" />
            </UiButton>
            <UiButton variant="ghost" size="sm" class="flow-toolbar-btn" @click="addNode('process')">
              <Icon name="lucide:cpu" class="h-4 w-4" style="color: var(--chart-1)" />
            </UiButton>
            <UiButton variant="ghost" size="sm" class="flow-toolbar-btn" @click="addNode('decision')">
              <Icon name="lucide:git-branch" class="h-4 w-4" style="color: var(--chart-3)" />
            </UiButton>
            <UiButton variant="ghost" size="sm" class="flow-toolbar-btn" @click="addNode('output')">
              <Icon name="lucide:flag" class="h-4 w-4" style="color: var(--chart-4)" />
            </UiButton>
            <UiButton variant="ghost" size="sm" class="flow-toolbar-btn" @click="addNode('card')">
              <Icon name="lucide:layout" class="h-4 w-4 text-primary" />
            </UiButton>
            <div class="bg-border mx-1 h-6 w-px" />
            <UiButton variant="ghost" size="sm" class="flow-toolbar-btn" @click="fitView">
              <Icon name="lucide:maximize" class="h-4 w-4" />
            </UiButton>
            <UiButton variant="ghost" size="sm" class="flow-toolbar-btn" @click="resetFlow">
              <Icon name="lucide:refresh-cw" class="h-4 w-4" />
            </UiButton>
          </div>
        </Panel>

        <!-- Stats Panel -->
        <Panel position="top-right" class="flow-stats m-3 !bg-card !border !border-border">
          <div class="flex items-center gap-3 text-xs">
            <div class="flex items-center gap-1.5">
              <Icon name="lucide:square" class="text-muted-foreground h-3.5 w-3.5" />
              <span class="text-muted-foreground">{{ nodes.length }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <Icon name="lucide:git-commit-horizontal" class="text-muted-foreground h-3.5 w-3.5" />
              <span class="text-muted-foreground">{{ edges.length }}</span>
            </div>
          </div>
        </Panel>

        <!-- Custom edge labels -->
        <template #edge-label="{ edge }">
          <div v-if="edge.label" class="!bg-card !border rounded border px-2 py-1 text-xs">
            {{ edge.label }}
          </div>
        </template>
      </VueFlow>

      <!-- Details Sidebar -->
      <Transition name="slide-left" class="z-50 bg-background">
        <div v-if="showSidebar" class="absolute right-0 top-0 h-full w-80 border-l border-border bg-background z-50">
          <div class="flex h-full flex-col">
            <!-- Header -->
            <div class="border-b border-border p-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold">
                  {{ selectedNodes.length === 1 ? 'Node Details' : `${selectedNodes.length} Nodes Selected` }}
                </h3>
                <button type="button" class="text-muted-foreground hover:text-foreground" @click="clearSelection">
                  <Icon name="lucide:x" class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-4">
              <!-- Single node selected -->
              <div v-if="selectedNodes.length === 1" class="space-y-4">
                <div>
                  <label class="text-muted-foreground text-xs font-medium uppercase">Type</label>
                  <p class="text-foreground mt-1 text-sm">{{ selectedNodes[0].type?.replace('custom', '') }}</p>
                </div>
                <div>
                  <label class="text-muted-foreground text-xs font-medium uppercase">Label</label>
                  <p class="text-foreground mt-1 text-sm">{{ selectedNodes[0].data?.label }}</p>
                </div>
                <div>
                  <label class="text-muted-foreground text-xs font-medium uppercase">Position</label>
                  <p class="text-foreground mt-1 text-sm">
                    X: {{ Math.round(selectedNodes[0].position.x) }}, Y: {{ Math.round(selectedNodes[0].position.y) }}
                  </p>
                </div>
                <div>
                  <label class="text-muted-foreground text-xs font-medium uppercase">ID</label>
                  <p class="text-muted-foreground mt-1 font-mono text-xs">{{ selectedNodes[0].id }}</p>
                </div>
              </div>

              <!-- Multiple nodes selected -->
              <div v-else class="space-y-2">
                <div
                  v-for="node in selectedNodes"
                  :key="node.id"
                  class="border-border hover:bg-accent rounded-lg border p-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-foreground text-sm font-medium">{{ node.data?.label }}</p>
                      <p class="text-muted-foreground text-xs">{{ node.type?.replace('custom', '') }}</p>
                    </div>
                    <Icon
                      :name="
                        node.type === 'customInput'
                          ? 'lucide:play'
                          : node.type === 'customProcess'
                            ? 'lucide:cpu'
                            : node.type === 'customDecision'
                              ? 'lucide:git-branch'
                              : node.type === 'customOutput'
                                ? 'lucide:flag'
                                : 'lucide:layout'
                      "
                      class="text-muted-foreground h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions Footer -->
            <div class="border-t border-border p-4">
              <div class="space-y-2">
                <UiButton
                  variant="outline"
                  size="sm"
                  class="w-full"
                  :disabled="selectedNodes.length < 2"
                  @click="groupSelectedNodes">
                  <Icon name="lucide:group" class="mr-2 h-4 w-4" />
                  Group Nodes
                </UiButton>
                <UiButton
                  variant="outline"
                  size="sm"
                  class="w-full"
                  :disabled="selectedNodes.length === 0"
                  @click="duplicateSelectedNodes">
                  <Icon name="lucide:copy" class="mr-2 h-4 w-4" />
                  Duplicate
                </UiButton>
                <UiButton
                  variant="destructive"
                  size="sm"
                  class="w-full"
                  :disabled="selectedNodes.length === 0"
                  @click="deleteSelectedNodes">
                  <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                  Delete {{ selectedNodes.length > 1 ? `${selectedNodes.length} Nodes` : 'Node' }}
                </UiButton>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </ClientOnly>
  </div>
</template>

<style>
  /* Fill the content area - works with flex parent */
  .flow-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100dvh - 64px); /* Viewport minus header height */
    background-color: hsl(var(--background));
  }

  /* Node interaction */
  .vue-flow__node {
    cursor: grab;
  }

  .vue-flow__node:active {
    cursor: grabbing;
  }

  /* Toolbar styling */
  .flow-toolbar {
    background-color: hsl(var(--card));
    border-radius: 8px;
    border: 1px solid hsl(var(--border));
    padding: 4px;
    box-shadow:
      0 1px 3px 0 rgb(0 0 0 / 0.1),
      0 1px 2px -1px rgb(0 0 0 / 0.1);
  }

  .flow-toolbar-btn {
    width: 32px;
    height: 32px;
    padding: 0;
  }

  /* Stats panel styling */
  .flow-stats {
    background-color: hsl(var(--card));
    border-radius: 8px;
    border: 1px solid hsl(var(--border));
    padding: 8px 12px;
    box-shadow:
      0 1px 3px 0 rgb(0 0 0 / 0.1),
      0 1px 2px -1px rgb(0 0 0 / 0.1);
  }

  /* Sidebar slide transition */
  .slide-left-enter-active,
  .slide-left-leave-active {
    transition: transform 0.3s ease;
  }

  .slide-left-enter-from,
  .slide-left-leave-to {
    transform: translateX(100%);
  }
</style>
