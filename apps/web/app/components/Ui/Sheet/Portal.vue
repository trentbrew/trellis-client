<script lang="ts" setup>
  import { DialogPortal } from 'reka-ui'
  import type { DialogPortalProps } from 'reka-ui'

  const props = defineProps<DialogPortalProps>()

  const portalProps = computed(() => {
    const next: any = { ...props }
    if (!next.to) next.to = 'body'
    return next
  })
</script>

<template>
  <DialogPortal data-slot="sheet-portal" v-bind="portalProps">
    <slot />
  </DialogPortal>
</template>
