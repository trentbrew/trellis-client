<script setup lang="ts">
  defineProps<{
    visible: boolean
    bottom: number
    right: number
    dragging?: boolean
  }>()

  const emit = defineEmits<{
    fillstart: [event: PointerEvent]
  }>()
</script>

<template>
  <div
    v-if="visible"
    class="sheet-fill-handle absolute z-20 size-2 cursor-crosshair rounded-sm border border-background bg-[var(--fill-handle,#818cf8)]"
    :class="{ 'ring-2 ring-[var(--fill-handle,#818cf8)]/60': dragging }"
    :style="{ bottom: `${bottom}px`, right: `${right}px` }"
    role="button"
    aria-label="Fill selection down"
    data-testid="sheet-fill-handle"
    @pointerdown="emit('fillstart', $event)"
  />
</template>
