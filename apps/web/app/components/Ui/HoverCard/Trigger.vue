<script lang="ts" setup>
  import { HoverCardTrigger } from 'reka-ui'
  import type { HoverCardTriggerProps } from 'reka-ui'

  defineOptions({ inheritAttrs: false })
  const props = defineProps<HoverCardTriggerProps>()
</script>

<template>
  <HoverCardTrigger data-slot="hover-card-trigger" v-bind="props">
    <slot />
  </HoverCardTrigger>
</template>
