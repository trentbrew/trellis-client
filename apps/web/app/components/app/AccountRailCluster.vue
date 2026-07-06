<script lang="ts" setup>
  import type { IconRailPosition } from '~/composables/useLayoutPreferences'

  const props = withDefaults(
    defineProps<{
      placement?: 'header' | 'rail'
      railPosition?: IconRailPosition
    }>(),
    { placement: 'rail', railPosition: 'bottom' },
  )

  const isHeader = computed(() => props.placement === 'header')
  const isBottom = computed(() => props.railPosition === 'bottom')
</script>

<template>
  <div
    class="flex shrink-0 gap-1.5 app-region-no-drag"
    :class="isHeader ? 'flex-row items-center' : isBottom ? 'flex-row items-center' : 'flex-col items-center'">
    <AdapterModeBadge v-if="!isHeader" :rail-position="props.railPosition" />
    <NotificationBell :placement="placement" :rail-position="props.railPosition" />
    <UserAccountMenu :placement="placement" :rail-position="props.railPosition" />
    <ClientOnly>
      <QuickCreateButton :placement="placement" :rail-position="props.railPosition" variant="primary" />
    </ClientOnly>
    <QuickCapturePopover :variant="isHeader ? 'menubar' : 'rail'" :position="props.railPosition" />
  </div>
</template>
