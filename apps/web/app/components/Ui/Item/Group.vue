<script lang="ts">
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const itemGroupStyles = tv({
    base: 'group/item-group flex flex-col',
  })

  export type ItemGroupProps = PrimitiveProps & {
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }
</script>

<script lang="ts" setup>
  const props = withDefaults(defineProps<ItemGroupProps>(), {})

  const forwarded = reactiveOmit(props, ['class'])
</script>

<template>
  <Primitive role="list" data-slot="item-group" v-bind="forwarded" :class="itemGroupStyles({ class: props.class })">
    <slot />
  </Primitive>
</template>
