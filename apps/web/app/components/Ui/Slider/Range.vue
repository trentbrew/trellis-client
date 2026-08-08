<script lang="ts" setup>
  import { SliderRange } from 'reka-ui'
  import type { SliderRangeProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    SliderRangeProps & {
      /** Custom class(es) to add to parent element */
      class?: ClassNameValue
    }
  >()
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: 'absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full',
  })
</script>

<template>
  <SliderRange data-slot="slider-range" :class="styles({ class: props.class })" v-bind="forwarded">
    <slot />
  </SliderRange>
</template>
