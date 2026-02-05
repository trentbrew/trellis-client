<script lang="ts" setup>
  import { ComboboxEmpty } from 'reka-ui'
  import type { ComboboxEmptyProps } from 'reka-ui'

  const props = defineProps<ComboboxEmptyProps>()
</script>

<template>
  <ComboboxEmpty data-slot="autocomplete-empty" v-bind="props">
    <slot />
  </ComboboxEmpty>
</template>
