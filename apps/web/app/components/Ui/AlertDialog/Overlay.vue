<script lang="ts" setup>
  import { AlertDialogOverlay } from 'reka-ui'
  import type { AlertDialogOverlayProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    AlertDialogOverlayProps & {
      /** Custom class(es) to add to the overlay */
      class?: ClassNameValue
    }
  >()
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: 'fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
  })
</script>

<template>
  <AlertDialogOverlay data-slot="alert-dialog-overlay" v-bind="forwarded" :class="styles({ class: props.class })" />
</template>
