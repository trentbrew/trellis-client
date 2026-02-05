<script lang="ts" setup>
  import { EditableCancelTrigger } from 'reka-ui'
  import type { EditableCancelTriggerProps } from 'reka-ui'

  const props = defineProps<EditableCancelTriggerProps>()
</script>

<template>
  <EditableCancelTrigger v-bind="props">
    <slot />
  </EditableCancelTrigger>
</template>
