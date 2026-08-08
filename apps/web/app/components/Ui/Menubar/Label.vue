<script lang="ts" setup>
  import { MenubarLabel } from 'reka-ui'
  import type { MenubarLabelProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    MenubarLabelProps & {
      class?: ClassNameValue
      inset?: boolean
    }
  >()
  const forwarded = reactiveOmit(props, 'class', 'inset')
  const styles = tv({
    base: 'px-2 py-1.5 text-sm font-medium data-[inset=true]:pl-8',
    variants: {
      inset: {
        true: 'pl-8',
      },
    },
  })
</script>

<template>
  <MenubarLabel data-slot="menubar-label" :class="styles({ inset, class: props.class })" v-bind="forwarded">
    <slot />
  </MenubarLabel>
</template>
