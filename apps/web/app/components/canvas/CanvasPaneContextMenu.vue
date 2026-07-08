<script setup lang="ts">
  const props = defineProps<{
    open: boolean
    x: number
    y: number
    atNodeCap?: boolean
  }>()

  const emit = defineEmits<{
    close: []
    'add-sticky': []
    fit: []
  }>()

  function onAddSticky() {
    emit('add-sticky')
    emit('close')
  }

  function onFit() {
    emit('fit')
    emit('close')
  }

  function onBackdropClick() {
    emit('close')
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && props.open) emit('close')
  }

  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[2000]"
      @mousedown="onBackdropClick"
      @contextmenu.prevent="onBackdropClick">
      <div
        class="absolute z-[2001] min-w-[180px] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        :style="{ left: `${x}px`, top: `${y}px` }"
        data-testid="canvas-pane-context-menu"
        @mousedown.stop
        @contextmenu.prevent.stop>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          :disabled="atNodeCap"
          data-testid="canvas-context-add-sticky"
          @click="onAddSticky">
          <Icon name="lucide:sticky-note" class="h-4 w-4" />
          Add sticky note
        </button>
        <div class="my-1 h-px bg-border" />
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          data-testid="canvas-context-fit-view"
          @click="onFit">
          <Icon name="lucide:maximize" class="h-4 w-4" />
          Fit view
        </button>
      </div>
    </div>
  </Teleport>
</template>
