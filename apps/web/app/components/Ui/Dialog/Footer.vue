<script lang="ts" setup>
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<
      PrimitiveProps & {
        /** Custom class(es) to add to the parent */
        class?: ClassNameValue
      }
    >(),
    {
      as: 'div',
    },
  )
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
  })
</script>

<template>
  <Primitive data-slot="dialog-footer" :class="styles({ class: props.class })" v-bind="forwarded">
    <slot />
  </Primitive>
</template>
