<script lang="ts" setup>
  import { ComboboxArrow } from 'reka-ui'
  import type { ComboboxArrowProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    ComboboxArrowProps & {
      class?: ClassNameValue
    }
  >()

  const styles = tv({ base: 'fill-muted stroke-border' })
</script>

<template>
  <ComboboxArrow data-slot="autocomplete-arrow" v-bind="props" :class="styles({ class: props.class })" />
</template>
