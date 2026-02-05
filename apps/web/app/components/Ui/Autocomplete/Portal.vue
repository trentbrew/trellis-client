<script lang="ts" setup>
  import { ComboboxPortal } from 'reka-ui'
  import type { ComboboxPortalProps } from 'reka-ui'

  const props = defineProps<ComboboxPortalProps>()
</script>

<template>
  <ComboboxPortal data-slot="autocomplete-portal" position="popper" v-bind="props">
    <slot />
  </ComboboxPortal>
</template>
