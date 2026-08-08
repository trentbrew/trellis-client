<script lang="ts" setup>
  import { DrawerOverlay } from 'vaul-vue'
  import type { DialogOverlayProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<DialogOverlayProps & { class?: ClassNameValue }>()

  const styles = tv({
    base: 'fixed inset-0 z-50 bg-background/40 backdrop-blur',
  })
</script>

<template>
  <DrawerOverlay data-slot="drawer-overlay" v-bind="props" :class="styles({ class: props.class })" />
</template>
