<script lang="ts" setup>
  import { SelectPortal } from 'reka-ui'
  import type { SelectPortalProps } from 'reka-ui'

  const props = defineProps<SelectPortalProps>()

  const portalProps = computed(() => {
    const next: any = { ...props }
    if (!next.to) next.to = 'body'
    return next
  })
</script>

<template>
  <SelectPortal data-slot="select-portal" v-bind="portalProps">
    <slot />
  </SelectPortal>
</template>
