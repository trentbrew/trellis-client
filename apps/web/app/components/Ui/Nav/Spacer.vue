<script lang="ts" setup>
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    PrimitiveProps & {
      /** Custom class(es) to add to the element */
      class?: ClassNameValue
    }
  >()
  const forwarded = reactiveOmit(props, 'class')

  const styles = tv({ base: '-ml-4 flex-1' })
</script>

<template>
  <Primitive v-bind="forwarded" :class="styles({ class: props.class })">
    <slot />
  </Primitive>
</template>
