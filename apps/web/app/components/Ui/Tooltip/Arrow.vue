<script lang="ts" setup>
  import { TooltipArrow, useForwardProps } from 'reka-ui'
  import type { TooltipArrowProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<
      TooltipArrowProps & {
        /** Additional classes for the tooltip arrow */
        class?: ClassNameValue
      }
    >(),
    {
      width: 12,
      height: 6,
    },
  )

  const styles = tv({ base: 'fill-popover stroke-border' })
  const forwarded = useForwardProps(reactiveOmit(props, 'class'))
</script>

<template>
  <TooltipArrow data-slot="tooltip-arrow" v-bind="forwarded" :class="styles({ class: props.class })" />
</template>
