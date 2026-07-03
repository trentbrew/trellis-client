<script setup lang="ts">
  import type { MapPin } from '~/lib/locations/types'

  defineProps<{
    pin: MapPin | null
    style: Record<string, string>
    visible: boolean
  }>()

  const emit = defineEmits<{
    enter: []
    leave: []
    open: []
  }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="map-preview">
      <div
        v-if="visible && pin"
        class="pointer-events-auto fixed z-[9998] w-72 overflow-hidden rounded-[14px] border border-border bg-popover shadow-lg"
        :style="style"
        role="tooltip"
        @mouseenter="emit('enter')"
        @mouseleave="emit('leave')"
        @click="emit('open')">
        <EntityPreviewCard :entity-id="pin.entityId" :entity-type="pin.entityType" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .map-preview-enter-active,
  .map-preview-leave-active {
    transition:
      opacity 0.12s ease,
      transform 0.12s ease;
  }

  .map-preview-enter-from,
  .map-preview-leave-to {
    opacity: 0;
    transform: translateY(-100%) translateY(4px);
  }
</style>
