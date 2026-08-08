<script lang="ts">
  import { reactiveOmit } from '@vueuse/core'
  import { Primitive, useForwardProps } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const drawerHeaderStyles = tv({
    base: 'grid gap-1.5 p-4 text-center sm:text-left',
  })

  export type DrawerHeaderProps = PrimitiveProps & {
    /**
     * Classes to add to the header.
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
  <Primitive data-slot="drawer-header" v-bind="forwarded" :class="drawerHeaderStyles({ class: props.class })">
    <slot />
  </Primitive>
</template>
