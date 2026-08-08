<script lang="ts">
  import { useForwardProps } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const sideBarFooterStyles = tv({
    base: 'flex flex-col gap-2 p-2',
  })
</script>
<script setup lang="ts">
  const props = defineProps<
    PrimitiveProps & {
      /**
       * Additional classes to apply to the parent element.
       */
      class?: ClassNameValue
    }
  >()
  const forwarded = useForwardProps(reactiveOmit(props, ['class']))
</script>
<template>
  <Primitive
    data-slot="sidebar-footer"
    data-sidebar="footer"
    :class="sideBarFooterStyles({ class: props.class })"
    v-bind="forwarded"
  >
    <slot />
  </Primitive>
</template>
