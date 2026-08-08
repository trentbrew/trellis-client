<script lang="ts">
  import { reactiveOmit } from '@vueuse/core'
  import { Primitive, useForwardProps } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const drawerFooterStyles = tv({
    base: 'mt-auto flex flex-col gap-2 p-4',
  })

  export type DrawerHeaderProps = PrimitiveProps & {
    /**
     * Classes to add to the parent.
     */
    class?: ClassNameValue
  }
</script>

<script lang="ts" setup>
  const props = withDefaults(defineProps<DrawerHeaderProps>(), {
    as: 'div',
  })
  const forwarded = useForwardProps(reactiveOmit(props, ['class']))
</script>

<template>
  <Primitive data-slot="drawer-footer" v-bind="forwarded" :class="drawerFooterStyles({ class: props.class })">
    <slot />
  </Primitive>
</template>
