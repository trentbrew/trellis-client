<script setup lang="ts">
  import { VueFlow, useVueFlow, Panel, PanOnScrollMode } from '@vue-flow/core'
  import { Background } from '@vue-flow/background'
  import { Controls } from '@vue-flow/controls'
  import { MiniMap } from '@vue-flow/minimap'

  import type { Node, Edge, Connection } from '@vue-flow/core'
  import type { WorkflowNodeKind } from '~/types/database'

  import FlowStartNode from '~/components/Flow/FlowStartNode.vue'
  import FlowAgentNode from '~/components/Flow/FlowAgentNode.vue'
  import FlowToolNode from '~/components/Flow/FlowToolNode.vue'
  import FlowRouterNode from '~/components/Flow/FlowRouterNode.vue'
  import FlowGuardNode from '~/components/Flow/FlowGuardNode.vue'
  import FlowMemoryNode from '~/components/Flow/FlowMemoryNode.vue'
  import FlowEndNode from '~/components/Flow/FlowEndNode.vue'
  import FlowNoteNode from '~/components/Flow/FlowNoteNode.vue'
  import FlowNodeConfig from '~/components/Flow/FlowNodeConfig.vue'
  import type { NodeExecutionState } from '~/composables/useWorkflowExecution'

  const props = defineProps<{
    workflowId: string
    executionNodeStates?: Record<string, NodeExecutionState>
  }>()

  const workflowIdRef = toRef(props, 'workflowId')

  const {
    nodes,
    edges,
    isDirty,
    isSaving,
    isLoaded,
    markDirty,
    addNode: editorAddNode,
    updateNodeData,
    removeNodes,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    applyAutoLayout,
  } = useWorkflowEditor(workflowIdRef)

  const nodeTypes = {
    flowStart: markRaw(FlowStartNode) as any,
    flowAgent: markRaw(FlowAgentNode) as any,
    flowTool: markRaw(FlowToolNode) as any,
    flowRouter: markRaw(FlowRouterNode) as any,
    flowGuard: markRaw(FlowGuardNode) as any,
    flowMemoryRead: markRaw(FlowMemoryNode) as any,
    flowMemoryWrite: markRaw(FlowMemoryNode) as any,
    flowEnd: markRaw(FlowEndNode) as any,
    flowNote: markRaw(FlowNoteNode) as any,
  }

  const patternColor = 'color-mix(in srgb, var(--muted-foreground) 15%, transparent)'
  const minimapMaskColor = 'color-mix(in srgb, var(--background) 85%, transparent)'

  function minimapNodeColor(node: Node): string {
    const colors: Record<string, string> = {
      flowStart: '#22c55e',
      flowAgent: 'var(--chart-2)',
      flowTool: 'var(--chart-1)',
      flowRouter: 'var(--chart-3)',
      flowGuard: 'var(--chart-5)',
      flowMemoryRead: '#14b8a6',
      flowMemoryWrite: '#14b8a6',
      flowEnd: 'var(--muted-foreground)',
      flowNote: '#eab308',
    }
    return colors[node.type || ''] || 'var(--muted-foreground)'
  }

  const { fitView: vueFlowFitView, addEdges, getSelectedNodes } = useVueFlow()

  const selectedNodes = computed(() => getSelectedNodes.value)
  const showSidebar = computed(() => selectedNodes.value.length > 0)

  const nodeKindIcon: Record<WorkflowNodeKind, string> = {
    start: 'lucide:play',
    agent: 'lucide:sparkles',
    tool: 'lucide:wrench',
    router: 'lucide:git-branch',
    guard: 'lucide:shield',
    'memory-read': 'lucide:database',
    'memory-write': 'lucide:database-zap',
    end: 'lucide:flag',
    note: 'lucide:sticky-note',
  }

  const paletteItems: { kind: WorkflowNodeKind; label: string; color: string; group: 'flow' | 'utility' }[] = [
    { kind: 'start', label: 'Start', color: '#22c55e', group: 'flow' },
    { kind: 'agent', label: 'Agent', color: 'var(--chart-2)', group: 'flow' },
    { kind: 'tool', label: 'Tool', color: 'var(--chart-1)', group: 'flow' },
    { kind: 'router', label: 'Router', color: 'var(--chart-3)', group: 'flow' },
    { kind: 'guard', label: 'Guard', color: 'var(--chart-5)', group: 'flow' },
    { kind: 'end', label: 'End', color: 'var(--muted-foreground)', group: 'flow' },
    { kind: 'memory-read', label: 'Read', color: '#14b8a6', group: 'utility' },
    { kind: 'memory-write', label: 'Write', color: '#14b8a6', group: 'utility' },
    { kind: 'note', label: 'Note', color: '#eab308', group: 'utility' },
  ]

  function handleAddNode(kind: WorkflowNodeKind) {
    editorAddNode(kind)
  }

  function onConnect(connection: Connection) {
    pushHistory()
    addEdges([
      {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        animated: true,
      },
    ])
    markDirty()
  }

  function onEdgeClick(_evt: MouseEvent | VoidFunction, edge: Edge) {
    pushHistory()
    const current: Edge[] = edges.value as Edge[]
    edges.value = current.filter((e) => e.id !== edge.id) as Edge[]
    markDirty()
  }

  function fitView() {
    vueFlowFitView({ padding: 0.2 })
  }

  function autoLayoutAndFit() {
    applyAutoLayout()
    nextTick(() => fitView())
  }

  function clearSelection() {
    const ns: Node[] = nodes.value as Node[]
    nodes.value = ns.map((n) => ({ ...n, selected: false })) as unknown as Node[]
    const es: Edge[] = edges.value as Edge[]
    const next = es.slice()
    for (let i = 0; i < next.length; i++) {
      next[i] = { ...next[i]!, selected: false } as unknown as Edge
    }
    edges.value = next
  }

  function duplicateSelectedNodes() {
    for (const node of selectedNodes.value) {
      const kind = (node.data?.kind as WorkflowNodeKind) || 'agent'
      editorAddNode(kind, {
        x: node.position.x + 60,
        y: node.position.y + 60,
      })
    }
  }

  function deleteSelectedNodes() {
    removeNodes(selectedNodes.value.map((n) => n.id))
  }

  function onNodeDragStop() {
    markDirty()
  }

  // Apply execution CSS classes to node wrappers without triggering saves
  watch(
    () => props.executionNodeStates,
    (states) => {
      nodes.value = nodes.value.map((n) => ({
        ...n,
        class: states?.[n.id]
          ? ({ idle: undefined, running: 'flow-exec--running', completed: 'flow-exec--completed', error: 'flow-exec--errored' }[
              states[n.id]!.status
            ] ?? undefined)
          : undefined,
      }))
    },
    { deep: true },
  )

  // Keyboard shortcuts
  function onKeyDown(e: KeyboardEvent) {
    const meta = e.metaKey || e.ctrlKey
    const el = e.target as HTMLElement
    const inInput = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable

    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (inInput) return
      if (selectedNodes.value.length > 0) {
        e.preventDefault()
        deleteSelectedNodes()
      }
    }

    if (meta && !e.shiftKey && e.key === 'z') {
      if (inInput) return
      e.preventDefault()
      undo()
    }

    if (meta && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      if (inInput) return
      e.preventDefault()
      redo()
    }

    if (meta && e.key === 'a') {
      if (inInput) return
      e.preventDefault()
      const selectAll: Node[] = nodes.value as Node[]
      nodes.value = selectAll.map((n) => ({ ...n, selected: true })) as unknown as Node[]
    }

    if (meta && e.key === 'l') {
      if (inInput) return
      e.preventDefault()
      autoLayoutAndFit()
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', onKeyDown)
  })
  onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown)
  })
</script>

<template>
  <div class="flow-container relative">
    <ClientOnly>
      <template v-if="!isLoaded">
        <div class="flex h-full items-center justify-center">
          <UiLoader />
        </div>
      </template>
      <template v-else>
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
          @node-drag-stop="onNodeDragStop"
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

          <!-- Node Palette -->
          <Panel position="top-left" class="flow-toolbar m-3 bg-card! border! border-border!">
            <div class="flex items-center gap-1">
              <template v-for="item in paletteItems" :key="item.kind">
                <div v-if="item.kind === 'memory-read'" class="bg-border mx-0.5 h-6 w-px" />
                <UiTooltip>
                  <UiTooltipTrigger as-child>
                    <UiButton variant="ghost" size="sm" class="flow-toolbar-btn" @click="handleAddNode(item.kind)">
                      <Icon :name="nodeKindIcon[item.kind]" class="h-4 w-4" :style="{ color: item.color }" />
                    </UiButton>
                  </UiTooltipTrigger>
                  <UiTooltipContent side="bottom">{{ item.label }}</UiTooltipContent>
                </UiTooltip>
              </template>
              <div class="bg-border mx-0.5 h-6 w-px" />
              <UiTooltip>
                <UiTooltipTrigger as-child>
                  <UiButton variant="ghost" size="sm" class="flow-toolbar-btn" :disabled="!canUndo" @click="undo">
                    <Icon name="lucide:undo-2" class="h-4 w-4" />
                  </UiButton>
                </UiTooltipTrigger>
                <UiTooltipContent side="bottom">Undo (⌘Z)</UiTooltipContent>
              </UiTooltip>
              <UiTooltip>
                <UiTooltipTrigger as-child>
                  <UiButton variant="ghost" size="sm" class="flow-toolbar-btn" :disabled="!canRedo" @click="redo">
                    <Icon name="lucide:redo-2" class="h-4 w-4" />
                  </UiButton>
                </UiTooltipTrigger>
                <UiTooltipContent side="bottom">Redo (⌘Y)</UiTooltipContent>
              </UiTooltip>
              <div class="bg-border mx-0.5 h-6 w-px" />
              <UiTooltip>
                <UiTooltipTrigger as-child>
                  <UiButton variant="ghost" size="sm" class="flow-toolbar-btn" @click="autoLayoutAndFit">
                    <Icon name="lucide:layout-dashboard" class="h-4 w-4" />
                  </UiButton>
                </UiTooltipTrigger>
                <UiTooltipContent side="bottom">Auto Layout (⌘L)</UiTooltipContent>
              </UiTooltip>
              <UiTooltip>
                <UiTooltipTrigger as-child>
                  <UiButton variant="ghost" size="sm" class="flow-toolbar-btn" @click="fitView">
                    <Icon name="lucide:maximize" class="h-4 w-4" />
                  </UiButton>
                </UiTooltipTrigger>
                <UiTooltipContent side="bottom">Fit View</UiTooltipContent>
              </UiTooltip>
            </div>
          </Panel>

          <!-- Stats + Save State -->
          <Panel position="top-right" class="flow-stats m-3 bg-card! border! border-border!">
            <div class="flex items-center gap-3 text-xs">
              <div class="flex items-center gap-1.5">
                <Icon name="lucide:square" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="text-muted-foreground">{{ nodes.length }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <Icon name="lucide:git-commit-horizontal" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="text-muted-foreground">{{ edges.length }}</span>
              </div>
              <div v-if="isSaving" class="flex items-center gap-1 text-muted-foreground">
                <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
                <span>Saving</span>
              </div>
              <div v-else-if="isDirty" class="flex items-center gap-1 text-amber-500">
                <Icon name="lucide:circle" class="h-2 w-2 fill-current" />
                <span>Unsaved</span>
              </div>
              <div v-else class="flex items-center gap-1 text-green-500">
                <Icon name="lucide:check" class="h-3 w-3" />
                <span>Saved</span>
              </div>
            </div>
          </Panel>

          <!-- Edge labels -->
          <template #edge-label="{ label }">
            <div v-if="label" class="rounded border bg-card px-2 py-0.5 text-[11px]">
              {{ label }}
            </div>
          </template>
        </VueFlow>

        <!-- Config Sidebar -->
        <Transition name="slide-left">
          <div v-if="showSidebar" class="absolute right-0 top-0 z-50 h-full w-80 border-l border-border bg-background">
            <div class="flex h-full flex-col">
              <div class="flex items-center justify-between border-b border-border p-4">
                <h3 class="text-sm font-semibold">
                  {{ selectedNodes.length === 1 ? 'Node Config' : `${selectedNodes.length} Nodes` }}
                </h3>
                <button type="button" class="text-muted-foreground hover:text-foreground" @click="clearSelection">
                  <Icon name="lucide:x" class="h-4 w-4" />
                </button>
              </div>

              <div class="flex-1 overflow-y-auto p-4">
                <!-- Single node config -->
                <FlowNodeConfig
                  v-if="selectedNodes.length === 1"
                  :node="selectedNodes[0]!"
                  :update-node-data="updateNodeData" />

                <!-- Multi-select list -->
                <div v-else class="space-y-2">
                  <div
                    v-for="node in selectedNodes"
                    :key="node.id"
                    class="flex items-center gap-2 rounded-lg border border-border p-3 hover:bg-accent">
                    <Icon
                      :name="nodeKindIcon[(node.data?.kind as WorkflowNodeKind) || 'start']"
                      class="h-4 w-4 text-muted-foreground" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-foreground">{{ node.data?.label }}</p>
                      <p class="text-xs text-muted-foreground">{{ node.data?.kind }}</p>
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
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
  .flow-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background-color: transparent;
  }

  :deep(.vue-flow__node) {
    cursor: grab;
  }

  :deep(.vue-flow__node:active) {
    cursor: grabbing;
  }

  :deep(.vue-flow__node.selected .flow-node) {
    box-shadow: 0 0 0 2px var(--ring);
  }

  .flow-toolbar {
    background-color: var(--card);
    border-radius: 8px;
    border: 1px solid var(--border);
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

  .flow-stats {
    background-color: var(--card);
    border-radius: 8px;
    border: 1px solid var(--border);
    padding: 8px 12px;
    box-shadow:
      0 1px 3px 0 rgb(0 0 0 / 0.1),
      0 1px 2px -1px rgb(0 0 0 / 0.1);
  }

  .slide-left-enter-active,
  .slide-left-leave-active {
    transition: transform 0.3s ease;
  }

  .slide-left-enter-from,
  .slide-left-leave-to {
    transform: translateX(100%);
  }

  /* Execution animation states — applied to the Vue Flow node wrapper */
  :deep(.flow-exec--running .flow-node) {
    animation: flow-pulse 1.4s ease-in-out infinite;
  }

  :deep(.flow-exec--completed .flow-node) {
    box-shadow: 0 0 0 2px #22c55e80;
    opacity: 0.9;
  }

  :deep(.flow-exec--errored .flow-node) {
    box-shadow: 0 0 0 2px var(--destructive);
  }

  @keyframes flow-pulse {
    0%,
    100% {
      box-shadow: 0 0 0 2px color-mix(in oklch, var(--primary) 60%, transparent);
    }
    50% {
      box-shadow:
        0 0 0 4px color-mix(in oklch, var(--primary) 30%, transparent),
        0 0 18px color-mix(in oklch, var(--primary) 20%, transparent);
    }
  }
</style>
