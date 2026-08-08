<script lang="ts" setup>
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<
      PrimitiveProps & {
        /** Custom class(es) to add to the element */
        class?: ClassNameValue
      }
    >(),
    {
      as: 'div',
      class: undefined,
    },
  )
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: 'flex flex-col gap-2 text-center sm:text-left',
  })
</script>

<template>
  <Primitive data-slot="alert-dialog-header" :class="styles({ class: props.class })" v-bind="forwarded">
    <slot />
  </Primitive>
</template>
