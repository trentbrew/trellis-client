<script lang="ts" setup>
  import type { IconRailPosition } from '~/composables/useLayoutPreferences'

  const props = withDefaults(
    defineProps<{
      placement?: 'header' | 'rail'
      railPosition?: IconRailPosition
    }>(),
    { placement: 'header', railPosition: 'bottom' },
  )

  const isHeader = computed(() => props.placement === 'header')
  const isBottom = computed(() => props.railPosition === 'bottom')
</script>

<template>
  <!-- Header-only slim cluster: bell + capture (avatar/+ live on IconRail corners) -->
  <div
    class="flex shrink-0 gap-1.5 app-region-no-drag"
    :class="isHeader ? 'flex-row items-center' : isBottom ? 'flex-row items-center' : 'flex-col items-center'">
    <NotificationBell :placement="placement" :rail-position="props.railPosition" />
    <QuickCapturePopover :variant="isHeader ? 'menubar' : 'rail'" :position="props.railPosition" />
  </div>
</template>
