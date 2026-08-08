<script lang="ts">
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const emptyTitleStyles = tv({
    base: 'text-lg font-medium tracking-tight',
  })

  export type EmptyTitleProps = PrimitiveProps & {
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }
</script>

<script lang="ts" setup>
  const props = defineProps<EmptyTitleProps>()
  const forwarded = reactiveOmit(props, ['class'])
</script>

<template>
  <Primitive data-slot="empty-title" :class="emptyTitleStyles({ class: props.class })" v-bind="forwarded">
    <slot />
  </Primitive>
</template>
