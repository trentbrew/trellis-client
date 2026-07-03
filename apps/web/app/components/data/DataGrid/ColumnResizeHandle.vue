<script setup lang="ts">
  const props = defineProps<{ width: number }>()

  const emit = defineEmits<{
    resize: [width: number]
    reset: []
  }>()

  const onMouseDown = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const origin = event.clientX
    const start = props.width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const move = (moveEvent: MouseEvent) => emit('resize', start + moveEvent.clientX - origin)
    const up = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }
</script>

<template>
  <div
    class="absolute top-0 right-0 z-30 h-full w-1.5 cursor-col-resize touch-none hover:bg-border active:bg-border"
    title="Drag to resize. Double-click to reset."
    @dblclick.prevent.stop="emit('reset')"
    @mousedown="onMouseDown" />
</template>
