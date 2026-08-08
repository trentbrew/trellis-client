<script lang="ts" setup>
  import { DropdownMenuSeparator } from 'reka-ui'
  import type { DropdownMenuSeparatorProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    DropdownMenuSeparatorProps & {
      /** Custom class(es) to add to the parent */
      class?: ClassNameValue
    }
  >()
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: '-mx-1 my-1 h-px bg-border',
  })
</script>

<template>
  <DropdownMenuSeparator
    data-slot="dropdown-menu-separator"
    :class="styles({ class: props.class })"
    v-bind="forwarded"
  />
</template>
