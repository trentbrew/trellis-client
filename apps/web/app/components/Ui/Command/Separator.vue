<script setup lang="ts">
  import { reactiveOmit } from '@vueuse/core'
  import { Separator } from 'reka-ui'
  import type { SeparatorProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    SeparatorProps & {
      /** Custom class(es) to add to the element */
      class?: ClassNameValue
    }
  >()

  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: '-mx-1 h-px bg-border',
  })
</script>

<template>
  <Separator v-bind="forwarded" :class="styles({ class: props.class })" data-slot="command-separator" cmdk-separator>
    <slot />
  </Separator>
</template>
