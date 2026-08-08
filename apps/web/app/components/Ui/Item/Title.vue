<script lang="ts">
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const itemTitleStyles = tv({
    base: 'flex w-fit items-center gap-2 text-sm leading-snug font-medium',
  })

  export type ItemTitleProps = PrimitiveProps & {
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }
</script>

<script lang="ts" setup>
  const props = withDefaults(defineProps<ItemTitleProps>(), {})

  const forwarded = reactiveOmit(props, ['class'])
</script>

<template>
  <Primitive data-slot="item-title" v-bind="forwarded" :class="itemTitleStyles({ class: props.class })">
    <slot />
  </Primitive>
</template>
