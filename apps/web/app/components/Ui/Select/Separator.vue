<script lang="ts" setup>
  import { SelectSeparator } from 'reka-ui'
  import type { SelectSeparatorProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    SelectSeparatorProps & {
      /** Custom class(es) to add to the parent */
      class?: ClassNameValue
    }
  >()
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: 'pointer-events-none -mx-1 my-1 h-px bg-border',
  })
</script>

<template>
  <SelectSeparator data-slot="select-separator" :class="styles({ class: props.class })" v-bind="forwarded" />
</template>
