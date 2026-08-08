<script lang="ts">
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const itemContentStyles = tv({
    base: 'flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none',
  })

  export type ItemContentProps = PrimitiveProps & {
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }
</script>

<script lang="ts" setup>
  const props = withDefaults(defineProps<ItemContentProps>(), {})

  const forwarded = reactiveOmit(props, ['class'])
</script>

<template>
  <Primitive data-slot="item-content" v-bind="forwarded" :class="itemContentStyles({ class: props.class })">
    <slot />
  </Primitive>
</template>
