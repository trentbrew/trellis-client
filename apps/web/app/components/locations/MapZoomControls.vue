<script setup lang="ts">
  const emit = defineEmits<{
    zoomIn: []
    zoomOut: []
    fitAll: []
    locate: []
  }>()
</script>

<template>
  <div
    class="absolute top-4 right-4 z-10 flex flex-col gap-1 rounded-[10px] border border-border bg-card/90 p-1 shadow-sm backdrop-blur-sm pointer-events-auto">
    <button
      type="button"
      class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="Zoom in"
      aria-label="Zoom in"
      @click="emit('zoomIn')">
      <Icon name="lucide:plus" class="h-4 w-4" />
    </button>
    <button
      type="button"
      class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="Zoom out"
      aria-label="Zoom out"
      @click="emit('zoomOut')">
      <Icon name="lucide:minus" class="h-4 w-4" />
    </button>
    <button
      type="button"
      class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="Fit all places"
      aria-label="Fit all places"
      @click="emit('fitAll')">
      <Icon name="lucide:maximize-2" class="h-4 w-4" />
    </button>
    <button
      type="button"
      class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="Locate me"
      aria-label="Locate me"
      @click="emit('locate')">
      <Icon name="lucide:crosshair" class="h-4 w-4" />
    </button>
  </div>
</template>
