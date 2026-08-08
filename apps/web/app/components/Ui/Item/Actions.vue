<script lang="ts">
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const itemActionsStyles = tv({
    base: 'flex items-center gap-2',
  })

  export type ItemActionsProps = PrimitiveProps & {
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }
</script>

<script lang="ts" setup>
  const props = withDefaults(defineProps<ItemActionsProps>(), {})

  const forwarded = reactiveOmit(props, ['class'])
</script>

<template>
  <Primitive data-slot="item-actions" v-bind="forwarded" :class="itemActionsStyles({ class: props.class })">
    <slot />
  </Primitive>
</template>
