<script setup lang="ts">
  defineProps<{
    atNodeCap?: boolean
  }>()

  defineEmits<{
    'add-sticky': []
    fit: []
  }>()
</script>

<template>
  <div
    class="pointer-events-auto absolute left-1/2 top-3 z-20 flex -translate-x-1/2 gap-1 rounded-full border border-border/70 bg-card/95 p-1 shadow-lg backdrop-blur"
    role="toolbar"
    aria-label="Canvas toolbar"
    data-testid="canvas-toolbar">
    <UiButton
      size="sm"
      variant="ghost"
      class="h-8 rounded-full px-3 text-xs"
      :disabled="atNodeCap"
      :title="atNodeCap ? 'Node limit reached' : undefined"
      data-testid="canvas-add-sticky"
      @click="$emit('add-sticky')">
      <Icon name="lucide:sticky-note" class="mr-1.5 h-3.5 w-3.5" />
      Sticky
    </UiButton>
    <UiButton size="sm" variant="ghost" class="h-8 rounded-full px-3 text-xs" data-testid="canvas-fit" @click="$emit('fit')">
      <Icon name="lucide:maximize-2" class="mr-1.5 h-3.5 w-3.5" />
      Fit
    </UiButton>
  </div>
</template>
