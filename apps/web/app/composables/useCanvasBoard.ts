import type { Node } from '@vue-flow/core'
import type { CanvasLayout, CanvasLayoutNode } from '~/types/canvas'
import {
  appendLayoutNode,
  createEntityRefNode,
  createStickyNode,
  MAX_CANVAS_NODES,
  parseCanvasLayout,
  removeLayoutNode,
  serializeCanvasLayout,
  updateLayoutNodePosition,
  updateLayoutStickyBody,
  updateLayoutNodeDimensions,
} from '~/types/canvas'
import { useTrellisGraph } from '~/composables/useTrellisGraph'

function layoutNodeToFlowNode(node: CanvasLayoutNode): Node {
  return {
    id: node.id,
    type: node.kind === 'sticky' ? 'canvasSticky' : 'canvasEntity',
    position: { x: node.x, y: node.y },
    data: {
      layoutNode: node,
    },
    style: {
      width: `${node.w}px`,
      height: `${node.h}px`,
    },
  }
}

function flowPositionToLayout(layout: CanvasLayout, nodeId: string, x: number, y: number): CanvasLayout {
  return updateLayoutNodePosition(layout, nodeId, x, y)
}

export function useCanvasBoard(canvasIdInput: MaybeRef<string>) {
  const canvasId = computed(() => unref(canvasIdInput))
  const { fetchNode, mutate } = useTrellisGraph()

  const layout = ref<CanvasLayout>(parseCanvasLayout(null))
  const title = ref('Canvas')
  const loading = ref(true)
  const error = ref<string | null>(null)
  const saving = ref(false)
  const lastSavedAt = ref<number | null>(null)

  let saveTimer: ReturnType<typeof setTimeout> | null = null

  const flowNodes = computed<Node[]>(() => layout.value.nodes.map(layoutNodeToFlowNode))
  const atNodeCap = computed(() => layout.value.nodes.length >= MAX_CANVAS_NODES)

  async function loadCanvas() {
    if (!canvasId.value) return
    loading.value = true
    error.value = null
    try {
      const id = canvasId.value.includes(':') ? canvasId.value : `entity:${canvasId.value}`
      const { node } = await fetchNode(id)
      const data = (node?.data ?? node ?? {}) as Record<string, unknown>
      title.value = String(data.title ?? 'Canvas')
      layout.value = parseCanvasLayout(data.layout)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load canvas'
    } finally {
      loading.value = false
    }
  }

  function scheduleSave(nextLayout = layout.value) {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void persistLayout(nextLayout)
    }, 500)
  }

  async function persistLayout(nextLayout = layout.value) {
    if (!canvasId.value) return
    saving.value = true
    try {
      const id = canvasId.value.includes(':') ? canvasId.value : `entity:${canvasId.value}`
      await mutate({
        action: 'updateNode',
        entityId: id,
        type: 'entity',
        data: { layout: serializeCanvasLayout(nextLayout) },
      })
      lastSavedAt.value = Date.now()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save canvas'
    } finally {
      saving.value = false
    }
  }

  function setViewport(viewport: CanvasLayout['viewport']) {
    layout.value = { ...layout.value, viewport }
    scheduleSave()
  }

  function onNodeDragStop(nodeId: string, x: number, y: number) {
    layout.value = flowPositionToLayout(layout.value, nodeId, x, y)
    scheduleSave()
  }

  function onNodeResize(nodeId: string, w: number, h: number) {
    layout.value = updateLayoutNodeDimensions(layout.value, nodeId, w, h)
    scheduleSave()
  }

  function addSticky(x: number, y: number) {
    const node = createStickyNode(x, y)
    layout.value = appendLayoutNode(layout.value, node)
    scheduleSave()
    return node.id
  }

  function addEntityRef(entityId: string, x: number, y: number) {
    const node = createEntityRefNode(entityId, x, y)
    layout.value = appendLayoutNode(layout.value, node)
    scheduleSave()
    return node.id
  }

  function removeNode(nodeId: string) {
    layout.value = removeLayoutNode(layout.value, nodeId)
    scheduleSave()
  }

  function updateStickyBody(nodeId: string, body: string) {
    layout.value = updateLayoutStickyBody(layout.value, nodeId, body)
    scheduleSave()
  }

  function getLayoutNode(nodeId: string): CanvasLayoutNode | undefined {
    return layout.value.nodes.find((n) => n.id === nodeId)
  }

  watch(canvasId, () => loadCanvas(), { immediate: true })

  onBeforeUnmount(() => {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
      void persistLayout()
    }
  })

  return {
    layout,
    title,
    loading,
    error,
    saving,
    lastSavedAt,
    flowNodes,
    atNodeCap,
    loadCanvas,
    setViewport,
    onNodeDragStop,
    onNodeResize,
    addSticky,
    addEntityRef,
    removeNode,
    updateStickyBody,
    getLayoutNode,
    persistLayout,
  }
}
