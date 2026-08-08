<script lang="ts">
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const emptyHeaderStyles = tv({
    base: 'flex max-w-sm flex-col items-center gap-2 text-center',
  })

  export type EmptyHeaderProps = PrimitiveProps & {
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }
</script>

<script lang="ts" setup>
  const props = defineProps<EmptyHeaderProps>()
  const forwarded = reactiveOmit(props, ['class'])
</script>

<template>
  <Primitive data-slot="empty-header" :class="emptyHeaderStyles({ class: props.class })" v-bind="forwarded">
    <slot />
  </Primitive>
</template>
