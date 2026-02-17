import type { Node, Edge, ViewportTransform } from '@vue-flow/core'
import type {
  Workflow,
  WorkflowGraph,
  WorkflowNodeDef,
  WorkflowEdgeDef,
  WorkflowNodeKind,
} from '~/types/database'

/**
 * Map from WorkflowNodeKind → Vue Flow node type string.
 * Each kind maps to a custom node component registered in FlowEditor.
 */
const KIND_TO_VF_TYPE: Record<WorkflowNodeKind, string> = {
  'start': 'flowStart',
  'agent': 'flowAgent',
  'tool': 'flowTool',
  'router': 'flowRouter',
  'guard': 'flowGuard',
  'memory-read': 'flowMemoryRead',
  'memory-write': 'flowMemoryWrite',
  'end': 'flowEnd',
  'note': 'flowNote',
}

const VF_TYPE_TO_KIND: Record<string, WorkflowNodeKind> = Object.fromEntries(
  Object.entries(KIND_TO_VF_TYPE).map(([k, v]) => [v, k as WorkflowNodeKind]),
) as Record<string, WorkflowNodeKind>

/**
 * Convert a persisted WorkflowGraph into Vue Flow nodes/edges.
 */
function graphToVueFlow(graph: WorkflowGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graph.nodes.map((n) => ({
    id: n.id,
    type: KIND_TO_VF_TYPE[n.kind] || 'flowStart',
    position: { x: n.position.x, y: n.position.y },
    data: {
      label: n.label,
      kind: n.kind,
      ...(n.data || {}),
    },
  }))

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    label: e.label,
    animated: true,
    data: e.condition ? { condition: e.condition } : undefined,
  }))

  return { nodes, edges }
}

/**
 * Convert current Vue Flow state back into a WorkflowGraph for persistence.
 */
function vueFlowToGraph(
  nodes: Node[],
  edges: Edge[],
  viewport?: ViewportTransform,
): WorkflowGraph {
  const graphNodes: WorkflowNodeDef[] = nodes.map((n) => ({
    id: n.id,
    kind: VF_TYPE_TO_KIND[n.type || ''] || (n.data?.kind as WorkflowNodeKind) || 'start',
    position: { x: n.position.x, y: n.position.y },
    label: (n.data?.label as string) || '',
    data: extractNodeData(n.data),
  }))

  const graphEdges: WorkflowEdgeDef[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle || undefined,
    targetHandle: e.targetHandle || undefined,
    label: (e.label as string) || undefined,
    condition: (e.data?.condition as string) || undefined,
  }))

  return {
    nodes: graphNodes,
    edges: graphEdges,
    viewport: viewport ? { x: viewport.x, y: viewport.y, zoom: viewport.zoom } : undefined,
  }
}

/**
 * Strip internal Vue Flow fields from node data before persisting.
 */
function extractNodeData(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!data) return undefined
  const { label: _label, kind: _kind, ...rest } = data
  return Object.keys(rest).length > 0 ? rest : undefined
}

/**
 * Composable: bridge between Vue Flow canvas state and persisted WorkflowGraph.
 *
 * Usage:
 *   const { nodes, edges, loadWorkflow, save, isDirty, ... } = useWorkflowEditor(workflowId)
 */
export function useWorkflowEditor(workflowId: Ref<string>) {
  const { workflows, updateWorkflow } = useInstantData()

  const nodes = ref<Node[]>([])
  const edges = ref<Edge[]>([])
  const viewport = ref<ViewportTransform>({ x: 0, y: 0, zoom: 1 })
  const isDirty = ref(false)
  const isSaving = ref(false)
  const isLoaded = ref(false)
  const nodeIdCounter = ref(100)

  const workflow = computed<Workflow | undefined>(() =>
    (workflows.value || []).find((w) => w.id === workflowId.value),
  )

  /**
   * Load graph from the current workflow into Vue Flow state.
   */
  function loadGraph() {
    const wf = workflow.value
    if (!wf) return

    const graph = wf.graph || {
      nodes: [{ id: 'start-1', kind: 'start' as const, position: { x: 250, y: 250 }, label: 'Start' }],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    }

    const vf = graphToVueFlow(graph)
    nodes.value = vf.nodes
    edges.value = vf.edges
    if (graph.viewport) {
      viewport.value = { x: graph.viewport.x, y: graph.viewport.y, zoom: graph.viewport.zoom }
    }

    // Set counter above highest existing numeric ID to avoid collisions
    let maxId = 100
    for (const n of graph.nodes) {
      const num = parseInt(n.id.replace(/\D/g, ''), 10)
      if (!isNaN(num) && num >= maxId) maxId = num + 1
    }
    nodeIdCounter.value = maxId

    isDirty.value = false
    isLoaded.value = true
  }

  /**
   * Serialize current Vue Flow state and persist to the workflow.
   */
  async function save() {
    if (!workflow.value || isSaving.value) return
    isSaving.value = true
    try {
      const graph = vueFlowToGraph(nodes.value, edges.value, viewport.value)
      await updateWorkflow(workflow.value.id, { graph })
      isDirty.value = false
    } finally {
      isSaving.value = false
    }
  }

  // Debounced auto-save
  let saveTimeout: ReturnType<typeof setTimeout> | null = null
  function debouncedSave() {
    isDirty.value = true
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      save()
    }, 800)
  }

  function markDirty() {
    isDirty.value = true
    debouncedSave()
  }

  /**
   * Generate a unique node ID.
   */
  function nextNodeId(kind: WorkflowNodeKind): string {
    const num = nodeIdCounter.value++
    return `${kind}-${num}`
  }

  /**
   * Add a new node to the canvas.
   */
  function addNode(kind: WorkflowNodeKind, position?: { x: number; y: number }) {
    // Prevent multiple start nodes
    if (kind === 'start' && nodes.value.some((n) => n.data?.kind === 'start')) {
      return
    }

    const id = nextNodeId(kind)
    const pos = position || { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 }

    const labelMap: Record<WorkflowNodeKind, string> = {
      'start': 'Start',
      'agent': 'Agent',
      'tool': 'Tool',
      'router': 'Router',
      'guard': 'Guard',
      'memory-read': 'Read Memory',
      'memory-write': 'Write Memory',
      'end': 'End',
      'note': 'Note',
    }

    const newNode: Node = {
      id,
      type: KIND_TO_VF_TYPE[kind],
      position: pos,
      data: {
        label: labelMap[kind],
        kind,
      },
    }

    nodes.value = [...nodes.value, newNode]
    markDirty()
    return id
  }

  /**
   * Update a node's data (e.g., from the config sidebar).
   */
  function updateNodeData(nodeId: string, patch: Record<string, unknown>) {
    nodes.value = nodes.value.map((n) => {
      if (n.id !== nodeId) return n
      return { ...n, data: { ...n.data, ...patch } }
    })
    markDirty()
  }

  /**
   * Remove nodes and their connected edges.
   */
  function removeNodes(nodeIds: string[]) {
    const idSet = new Set(nodeIds)
    nodes.value = nodes.value.filter((n) => !idSet.has(n.id))
    edges.value = edges.value.filter((e) => !idSet.has(e.source) && !idSet.has(e.target))
    markDirty()
  }

  /**
   * Remove edges by ID.
   */
  function removeEdges(edgeIds: string[]) {
    const idSet = new Set(edgeIds)
    edges.value = edges.value.filter((e) => !idSet.has(e.id))
    markDirty()
  }

  // Load on init and when workflowId changes
  watch(
    [workflowId, workflows],
    () => {
      if (workflowId.value && workflow.value && !isLoaded.value) {
        loadGraph()
      }
    },
    { immediate: true },
  )

  // Cleanup on unmount
  onUnmounted(() => {
    if (saveTimeout) clearTimeout(saveTimeout)
  })

  return {
    // State
    nodes,
    edges,
    viewport,
    workflow,
    isDirty,
    isSaving,
    isLoaded,

    // Actions
    loadGraph,
    save,
    markDirty,
    addNode,
    updateNodeData,
    removeNodes,
    removeEdges,
    nextNodeId,

    // Helpers
    KIND_TO_VF_TYPE,
    VF_TYPE_TO_KIND,
  }
}
