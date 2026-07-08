<script setup lang="ts">
  import { VueFlow, useVueFlow } from '@vue-flow/core'
  import { Background } from '@vue-flow/background'
  import { MiniMap } from '@vue-flow/minimap'
  import type { Node, NodeDragEvent } from '@vue-flow/core'
  import CanvasEntityNode from '~/components/canvas/CanvasEntityNode.vue'
  import CanvasStickyNode from '~/components/canvas/CanvasStickyNode.vue'

  const props = defineProps<{
    nodes: Node[]
    defaultViewport: { x: number; y: number; zoom: number }
  }>()

  const emit = defineEmits<{
    'node-click': [nodeId: string]
    'pane-click': []
    'pane-context-menu': [position: { clientX: number; clientY: number }]
    'node-drag-stop': [nodeId: string, x: number, y: number]
    'viewport-change': [viewport: { x: number; y: number; zoom: number }]
  }>()

  const nodeTypes = {
    canvasEntity: markRaw(CanvasEntityNode) as any,
    canvasSticky: markRaw(CanvasStickyNode) as any,
  }

  const localNodes = ref<Node[]>([])

  watch(
    () => props.nodes,
    (nodes) => {
      localNodes.value = nodes.map((n) => ({ ...n, data: { ...n.data } }))
    },
    { immediate: true, deep: true },
  )

  const { fitView, onMoveEnd, screenToFlowCoordinate } = useVueFlow()

  onMoveEnd(() => {
    const { viewport } = useVueFlow()
    if (viewport.value) {
      emit('viewport-change', { x: viewport.value.x, y: viewport.value.y, zoom: viewport.value.zoom })
    }
  })

  function handleNodeClick(event: { node: { id: string } }) {
    emit('node-click', event.node.id)
  }

  function handlePaneClick() {
    emit('pane-click')
  }

  function handlePaneContextMenu(event: MouseEvent) {
    event.preventDefault()
    emit('pane-context-menu', { clientX: event.clientX, clientY: event.clientY })
  }

  function handleNodeDragStop(event: NodeDragEvent) {
    emit('node-drag-stop', event.node.id, event.node.position.x, event.node.position.y)
  }

  defineExpose({
    fitView: () => fitView({ padding: 0.2, duration: 200 }),
    screenToFlowCoordinate: (position: { x: number; y: number }) => screenToFlowCoordinate(position),
  })
</script>

<template>
  <div class="h-full w-full">
    <VueFlow
      v-model:nodes="localNodes"
      :node-types="nodeTypes"
      :default-viewport="defaultViewport"
      :min-zoom="0.15"
      :max-zoom="2.5"
      :pan-on-scroll="true"
      :zoom-on-scroll="false"
      :nodes-draggable="true"
      :elements-selectable="true"
      class="h-full w-full bg-[#09090b]"
      data-testid="canvas-vue-flow"
      @node-click="handleNodeClick"
      @pane-click="handlePaneClick"
      @pane-context-menu="handlePaneContextMenu"
      @node-drag-stop="handleNodeDragStop">
      <Background pattern-color="#1e1e26" :gap="24" />
      <MiniMap
        class="!bottom-14 !right-4 !rounded-lg !border !border-border !bg-card/90"
        :mask-color="'color-mix(in srgb, var(--background) 85%, transparent)'" />
    </VueFlow>
  </div>
</template>

<style scoped>
  :deep(.vue-flow__pane) {
    cursor: grab;
  }
  :deep(.vue-flow__pane:active) {
    cursor: grabbing;
  }
</style>
