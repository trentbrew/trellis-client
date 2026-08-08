<script lang="ts">
  import { AccordionHeader } from 'reka-ui'
  import type { AccordionHeaderProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const accordionHeaderStyle = tv({ base: 'flex' })
</script>

<script lang="ts" setup>
  const props = defineProps<
    AccordionHeaderProps & {
      /**
       * Custom class to apply to the component
       */
      class?: ClassNameValue
    }
  >()

  const forwarded = reactiveOmit(props, 'class')
</script>

<template>
  <AccordionHeader
    data-slot="accordion-header"
    v-bind="forwarded"
    :class="accordionHeaderStyle({ class: props.class })"
  >
    <slot />
  </AccordionHeader>
</template>
