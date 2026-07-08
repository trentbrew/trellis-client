<script lang="ts" setup>
  /**
   * ResizableRightPanel — shared right sidebar shell with collapse + drag resize.
   * When collapsed the panel is fully hidden; use RightSidebarToggle in the header.
   * Tab content (EntityRightSidebar, etc.) goes in the default slot.
   */
  const props = withDefaults(
    defineProps<{
      collapsed?: boolean
      width?: number
      minWidth?: number
      maxWidth?: number
    }>(),
    {
      collapsed: false,
      width: 360,
      minWidth: 200,
      maxWidth: 480,
    },
  )

  const emit = defineEmits<{
    'update:collapsed': [value: boolean]
    'update:width': [value: number]
  }>()

  const isResizing = ref(false)

  function startResize(e: PointerEvent) {
    if (props.collapsed) return
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    isResizing.value = true
    const startX = e.clientX
    const startW = props.width
    document.body.style.cursor = 'ew-resize'
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const next = Math.max(props.minWidth, Math.min(props.maxWidth, startW - dx))
      emit('update:width', next)
    }
    const onUp = () => {
      isResizing.value = false
      document.body.style.cursor = ''
      el.releasePointerCapture(e.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }
</script>

<template>
  <div
    class="relative shrink-0 self-stretch transition-[width] duration-150"
    :class="collapsed ? 'w-0' : ''"
    :style="collapsed ? undefined : { width: `${width}px` }">
    <aside
      v-if="!collapsed"
      data-slot="right-sidebar"
      class="absolute inset-y-0 right-0 flex flex-col overflow-hidden border-l border-border"
      :class="isResizing ? 'select-none' : ''"
      :style="{ width: `${width}px` }">
      <div
        class="absolute inset-y-0 left-0 z-10 w-1 cursor-ew-resize transition-colors hover:bg-primary/20"
        @pointerdown="startResize" />
      <slot />
    </aside>
  </div>
</template>
