<script setup lang="ts">
  import { NodeToolbar } from '@vue-flow/node-toolbar'
  import { Position, useVueFlow } from '@vue-flow/core'

  const props = withDefaults(
    defineProps<{
      nodeId: string
      selected?: boolean
      label: string
      minWidth?: number
      minHeight?: number
      bgClass?: string
      borderClass?: string
      selectedRingClass?: string
      showDetails?: boolean
      showMaximize?: boolean
      resizable?: boolean
    }>(),
    {
      selected: false,
      minWidth: 160,
      minHeight: 96,
      bgClass: 'bg-card',
      borderClass: '',
      selectedRingClass: 'ring-1 ring-muted-foreground/40',
      showDetails: false,
      showMaximize: false,
      resizable: true,
    },
  )

  const emit = defineEmits<{
    close: []
    details: []
    maximize: []
  }>()

  const removeCanvasNode = inject<(nodeId: string) => void>('removeCanvasNode', () => {})
  const resizeCanvasNode = inject<(nodeId: string, w: number, h: number) => void>('resizeCanvasNode', () => {})

  const { viewport } = useVueFlow()

  const isHovered = ref(false)
  let hoverTimer: ReturnType<typeof setTimeout> | null = null

  const showToolbar = computed(() => (isHovered.value || props.selected) && !props.showMaximize)

  function onMouseEnter() {
    if (hoverTimer) clearTimeout(hoverTimer)
    isHovered.value = true
  }

  function onMouseLeave() {
    hoverTimer = setTimeout(() => {
      isHovered.value = false
    }, 300)
  }

  onBeforeUnmount(() => {
    if (hoverTimer) clearTimeout(hoverTimer)
  })

  const resizeCornerStyle = computed(() => ({
    width: '16px',
    height: '16px',
    opacity: props.selected ? 1 : 0,
    transition: 'opacity 150ms ease',
    background:
      "url(\"data:image/svg+xml;utf8,<svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M1.5 14C8 14 14 14.5 14 1.5' stroke='%23888888' stroke-width='3' stroke-linecap='round'/></svg>\") no-repeat center center",
    backgroundSize: 'contain',
    border: 'none',
    transform: 'translate(-50%, -50%)',
  }))

  function startResize(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()

    const root = (event.currentTarget as HTMLElement).closest('.canvas-node-wrapper') as HTMLElement | null
    const flowNode = root?.closest('.vue-flow__node') as HTMLElement | null
    if (!root) return

    const startX = event.clientX
    const startY = event.clientY
    const startW = flowNode?.offsetWidth ?? root.offsetWidth
    const startH = flowNode?.offsetHeight ?? root.offsetHeight
    const zoom = viewport.value.zoom || 1

    const applySize = (nextW: number, nextH: number) => {
      const w = `${nextW}px`
      const h = `${nextH}px`
      if (flowNode) {
        flowNode.style.width = w
        flowNode.style.height = h
      }
      root.style.width = w
      root.style.height = h
    }

    const onMove = (ev: MouseEvent) => {
      const nextW = Math.max(props.minWidth, startW + (ev.clientX - startX) / zoom)
      const nextH = Math.max(props.minHeight, startH + (ev.clientY - startY) / zoom)
      applySize(nextW, nextH)
    }

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const nextW = Math.max(props.minWidth, startW + (ev.clientX - startX) / zoom)
      const nextH = Math.max(props.minHeight, startH + (ev.clientY - startY) / zoom)
      resizeCanvasNode(props.nodeId, Math.round(nextW), Math.round(nextH))
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function handleClose(event: MouseEvent) {
    event.stopPropagation()
    removeCanvasNode(props.nodeId)
    emit('close')
  }

  function handleDetails(event: MouseEvent) {
    event.stopPropagation()
    emit('details')
  }

  function handleMaximize(event: MouseEvent) {
    event.stopPropagation()
    emit('maximize')
  }
</script>

<template>
  <div
    class="canvas-node-wrapper group relative flex h-full w-full flex-col overflow-hidden rounded-lg border shadow-md transition-all duration-150"
    :class="[
      bgClass,
      borderClass || (selected ? 'border-muted-foreground/50' : 'border-border'),
      selected && selectedRingClass,
    ]"
    :style="{ minWidth: `${minWidth}px`, minHeight: `${minHeight}px` }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave">
    <NodeToolbar
      v-if="showToolbar"
      :is-visible="true"
      :position="Position.Top"
      align="start"
      :offset="8"
      class="flex items-center gap-1.5 rounded-md bg-transparent px-2 py-1 -translate-x-2"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave">
      <div class="flex max-w-[150px] items-center gap-1.5 truncate">
        <slot name="icon" />
        <span class="truncate text-xs font-medium text-foreground">{{ label }}</span>
        <slot name="toolbar-left" />
      </div>
    </NodeToolbar>

    <NodeToolbar
      v-if="showToolbar"
      :is-visible="true"
      :position="Position.Top"
      align="end"
      :offset="8"
      class="flex items-center gap-2 rounded-md bg-transparent px-1 py-1"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave">
      <slot name="toolbar-right" />
      <button
        v-if="showDetails"
        type="button"
        class="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Details"
        @click="handleDetails">
        <Icon name="lucide:info" class="h-3 w-3" />
      </button>
      <button
        v-if="showMaximize"
        type="button"
        class="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Maximize"
        @click="handleMaximize">
        <Icon name="lucide:maximize-2" class="h-3 w-3" />
      </button>
      <button
        type="button"
        class="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="Remove"
        @click="handleClose">
        <Icon name="lucide:x" class="h-4 w-4" />
      </button>
    </NodeToolbar>

    <div class="min-h-0 flex-1 overflow-hidden">
      <slot />
    </div>

    <div
      class="pointer-events-none absolute bottom-0 left-1/2 z-20 flex h-4 w-8 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-border/50 bg-muted/80 backdrop-blur-sm transition-opacity duration-150"
      :class="isHovered || selected ? 'opacity-100' : 'opacity-0'">
      <Icon name="lucide:grip-horizontal" class="h-3 w-3 text-muted-foreground/60" />
    </div>

    <button
      v-if="resizable && selected"
      type="button"
      class="nodrag absolute bottom-0 right-0 z-30 cursor-se-resize"
      :style="resizeCornerStyle"
      aria-label="Resize node"
      @mousedown="startResize" />
  </div>
</template>
