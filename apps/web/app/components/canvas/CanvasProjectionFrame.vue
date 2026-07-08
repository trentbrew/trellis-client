<script setup lang="ts">
  import CanvasFlowBoard from '~/components/canvas/CanvasFlowBoard.vue'
  import CanvasToolbar from '~/components/canvas/CanvasToolbar.vue'
  import CanvasPaneContextMenu from '~/components/canvas/CanvasPaneContextMenu.vue'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import type { Entity } from '~/types/entity'
  import { TRELLIS_ENTITY_DND_MIME, MAX_CANVAS_NODES } from '~/types/canvas'

  import '@vue-flow/core/dist/style.css'
  import '@vue-flow/minimap/dist/style.css'

  const props = defineProps<{
    canvasId: string
  }>()

  const canvasIdRef = toRef(props, 'canvasId')
  const flowBoardRef = ref<InstanceType<typeof CanvasFlowBoard> | null>(null)

  const {
    layout,
    title,
    loading,
    error,
    saving,
    lastSavedAt,
    flowNodes,
    onNodeDragStop,
    onNodeResize,
    addSticky,
    addEntityRef,
    removeNode,
    updateStickyBody,
    setViewport,
    atNodeCap,
  } = useCanvasBoard(canvasIdRef)

  const { selectedNodeId, selectNode, clearSelection, onKeyDown } = useCanvasSelection()
  const { items } = useEntities()

  const entityDialogOpen = ref(false)
  const entityDialogItem = ref<Entity | null>(null)

  const paneMenuOpen = ref(false)
  const paneMenuX = ref(0)
  const paneMenuY = ref(0)
  const paneMenuFlowPos = ref({ x: 0, y: 0 })

  function openEntityDialog(entityId: string) {
    const item = (items.value || []).find((e) => e.id === entityId)
    if (!item) return
    entityDialogItem.value = item
    entityDialogOpen.value = true
  }

  provide('canvasSelectedNodeId', selectedNodeId)
  provide('openCanvasEntity', openEntityDialog)
  provide('updateCanvasSticky', updateStickyBody)
  provide('removeCanvasNode', (nodeId: string) => {
    removeNode(nodeId)
    if (selectedNodeId.value === nodeId) clearSelection()
  })
  provide('resizeCanvasNode', onNodeResize)

  function addStickyAt(x: number, y: number) {
    if (atNodeCap.value) return
    const id = addSticky(x, y)
    selectNode(id)
  }

  function handleAddSticky() {
    const centerX = 120 + layout.value.nodes.length * 24
    const centerY = 120 + layout.value.nodes.length * 16
    addStickyAt(centerX, centerY)
  }

  function handlePaneContextMenu(position: { clientX: number; clientY: number }) {
    paneMenuX.value = position.clientX
    paneMenuY.value = position.clientY
    const flowPos = flowBoardRef.value?.screenToFlowCoordinate?.({
      x: position.clientX,
      y: position.clientY,
    })
    paneMenuFlowPos.value = flowPos ?? { x: position.clientX, y: position.clientY }
    paneMenuOpen.value = true
  }

  function handleContextAddSticky() {
    addStickyAt(paneMenuFlowPos.value.x, paneMenuFlowPos.value.y)
  }

  function handleKeyDown(event: KeyboardEvent) {
    const nodeId = onKeyDown(event)
    if (nodeId && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault()
      removeNode(nodeId)
      clearSelection()
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    if (atNodeCap.value) return
    const entityId = event.dataTransfer?.getData(TRELLIS_ENTITY_DND_MIME)
    if (!entityId) return
    const flowPos = flowBoardRef.value?.screenToFlowCoordinate?.({ x: event.clientX, y: event.clientY })
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const x = flowPos?.x ?? event.clientX - bounds.left
    const y = flowPos?.y ?? event.clientY - bounds.top
    const id = addEntityRef(entityId, x, y)
    selectNode(id)
  }

  function handleDragOver(event: DragEvent) {
    if (event.dataTransfer?.types.includes(TRELLIS_ENTITY_DND_MIME)) {
      event.preventDefault()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  const statusLabel = computed(() => {
    if (atNodeCap.value) return `Node limit reached (${MAX_CANVAS_NODES})`
    if (saving.value) return 'Saving…'
    if (lastSavedAt.value) return `Saved ${new Date(lastSavedAt.value).toLocaleTimeString()}`
    return `${layout.value.nodes.length} nodes`
  })
</script>

<template>
  <div class="flex h-full min-h-0 flex-col" data-testid="canvas-projection-frame">
    <div v-if="loading" class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      <Icon name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
      Loading canvas…
    </div>

    <div v-else-if="error" class="flex flex-1 items-center justify-center text-sm text-destructive">
      {{ error }}
    </div>

    <template v-else>
      <header class="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2">
        <p class="truncate text-sm font-semibold text-foreground">{{ title }}</p>
        <span class="ml-auto font-mono text-[10px] text-muted-foreground" aria-live="polite">{{ statusLabel }}</span>
      </header>

      <div
        class="relative min-h-0 flex-1"
        role="region"
        aria-label="Canvas board"
        data-testid="canvas-board"
        @drop="handleDrop"
        @dragover="handleDragOver">
        <CanvasToolbar :at-node-cap="atNodeCap" @add-sticky="handleAddSticky" @fit="flowBoardRef?.fitView()" />

        <ClientOnly>
          <div class="absolute inset-0">
            <CanvasFlowBoard
              ref="flowBoardRef"
              :nodes="flowNodes"
              :default-viewport="layout.viewport"
              @node-click="selectNode"
              @pane-click="clearSelection"
              @pane-context-menu="handlePaneContextMenu"
              @node-drag-stop="onNodeDragStop"
              @viewport-change="setViewport" />
          </div>
        </ClientOnly>

        <div
          class="pointer-events-none absolute bottom-3 left-3 z-10 font-mono text-[10px] text-muted-foreground"
          aria-hidden="true">
          {{ layout.nodes.length }} nodes
        </div>
      </div>
    </template>

    <CanvasPaneContextMenu
      :open="paneMenuOpen"
      :x="paneMenuX"
      :y="paneMenuY"
      :at-node-cap="atNodeCap"
      @close="paneMenuOpen = false"
      @add-sticky="handleContextAddSticky"
      @fit="flowBoardRef?.fitView()" />

    <EntityDialog
      v-if="entityDialogItem"
      :open="entityDialogOpen"
      :item="entityDialogItem"
      mode="edit"
      @update:open="entityDialogOpen = $event" />
  </div>
</template>
