<script lang="ts" setup>
  import { PopoverClose, useForwardProps } from 'reka-ui'
  import type { PopoverCloseProps } from 'reka-ui'

  const props = defineProps<PopoverCloseProps>()
  const forwarded = useForwardProps(props)
</script>

<template>
  <PopoverClose data-slot="popover-close" v-bind="forwarded">
    <slot />
  </PopoverClose>
</template>
