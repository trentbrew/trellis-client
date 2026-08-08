<script lang="ts">
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const itemFooterStyles = tv({
    base: 'flex basis-full items-center justify-between gap-2',
  })

  export type ItemFooterProps = PrimitiveProps & {
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }
</script>

<script lang="ts" setup>
  const props = withDefaults(defineProps<ItemFooterProps>(), {})

  const forwarded = reactiveOmit(props, ['class'])
</script>

<template>
  <Primitive data-slot="item-footer" v-bind="forwarded" :class="itemFooterStyles({ class: props.class })">
    <slot />
  </Primitive>
</template>
