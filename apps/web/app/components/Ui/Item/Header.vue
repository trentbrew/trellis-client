<script lang="ts">
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const itemHeaderStyles = tv({
    base: 'flex basis-full items-center justify-between gap-2',
  })

  export type ItemHeaderProps = PrimitiveProps & {
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }
</script>

<script lang="ts" setup>
  const props = withDefaults(defineProps<ItemHeaderProps>(), {})

  const forwarded = reactiveOmit(props, ['class'])
</script>

<template>
  <Primitive data-slot="item-header" v-bind="forwarded" :class="itemHeaderStyles({ class: props.class })">
    <slot />
  </Primitive>
</template>
