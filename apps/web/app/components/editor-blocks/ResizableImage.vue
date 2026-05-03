<script lang="ts" setup>
  import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

  const props = defineProps(nodeViewProps)

  const isResizing = ref(false)
  const startX = ref(0)
  const startWidth = ref(0)
  const imgRef = ref<HTMLImageElement | null>(null)

  const src = computed(() => props.node.attrs.src as string)
  const alt = computed(() => (props.node.attrs.alt as string) || '')
  const title = computed(() => (props.node.attrs.title as string) || '')
  const width = computed(() => (props.node.attrs.width as string | null) || null)
  const align = computed(() => (props.node.attrs.align as string) || 'left')

  const wrapperStyle = computed(() => ({
    width: width.value || 'auto',
    maxWidth: '100%',
  }))

  const wrapperClass = computed(() => [
    'resizable-image-wrapper',
    isResizing.value && 'is-resizing',
    `align-${align.value}`,
  ])

  function onResizeStart(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    isResizing.value = true
    startX.value = event.clientX
    startWidth.value = imgRef.value ? imgRef.value.offsetWidth : 300

    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd)
  }

  function onResizeMove(event: MouseEvent) {
    if (!isResizing.value) return
    const dx = event.clientX - startX.value
    const newWidth = Math.max(80, startWidth.value + dx)
    props.updateAttributes({ width: `${newWidth}px` })
  }

  function onResizeEnd() {
    isResizing.value = false
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
  }

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
  })
</script>

<template>
  <NodeViewWrapper
    :class="wrapperClass"
    :style="wrapperStyle"
    as="figure"
    data-drag-handle>
    <img
      ref="imgRef"
      :src="src"
      :alt="alt"
      :title="title || undefined"
      class="resizable-image-el"
      draggable="false" />
    <div
      class="resize-handle"
      contenteditable="false"
      @mousedown="onResizeStart" />
  </NodeViewWrapper>
</template>

<style>
  figure.resizable-image-wrapper {
    display: inline-block;
    margin: 0.5rem 0;
    position: relative;
    max-width: 100%;
    cursor: default;
    line-height: 0;
    border-radius: 0.375rem;
  }

  figure.resizable-image-wrapper.align-center {
    display: block;
    margin-left: auto;
    margin-right: auto;
  }

  .resizable-image-el {
    border-radius: 0.375rem;
    display: block;
    height: auto;
    width: 100%;
  }

  .resize-handle {
    background: var(--primary);
    border: 2px solid var(--background);
    border-radius: 3px;
    bottom: 6px;
    cursor: nwse-resize;
    height: 10px;
    opacity: 0;
    position: absolute;
    right: 6px;
    transition: opacity 120ms;
    width: 10px;
  }

  .resizable-image-wrapper:hover .resize-handle,
  .resizable-image-wrapper.is-resizing .resize-handle {
    opacity: 1;
  }

  .resizable-image-wrapper.is-resizing {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* Selected state */
  .ProseMirror-selectednode figure.resizable-image-wrapper {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .ProseMirror-selectednode .resize-handle {
    opacity: 1;
  }
</style>
