<script lang="ts" setup>
  import { AlertDialogPortal } from 'reka-ui'
  import type { AlertDialogPortalProps } from 'reka-ui'

  const props = defineProps<AlertDialogPortalProps>()

  const portalProps = computed(() => {
    const next: any = { ...props }
    if (!next.to) next.to = 'body'
    return next
  })
</script>

<template>
  <AlertDialogPortal data-slot="alert-dialog-portal" v-bind="portalProps">
    <slot />
  </AlertDialogPortal>
</template>
