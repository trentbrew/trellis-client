<script lang="ts" setup>
  import { ContextMenuSeparator } from 'reka-ui'
  import type { ContextMenuSeparatorProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    ContextMenuSeparatorProps & {
      /**Custom class(es) to add to the element */
      class?: ClassNameValue
    }
  >()

  const styles = tv({
    base: '-mx-1 my-1 h-px bg-border',
  })
</script>

<template>
  <ContextMenuSeparator data-slot="context-menu-separator" :class="styles({ class: props.class })" v-bind="props" />
</template>
