<script lang="ts" setup>
  /**
   * DialogStackEntry — Thin wrapper that provides stack index via inject.
   *
   * Used by DialogStackHost to wrap each stacked dialog so that
   * dialog shells can inject their position and compute transforms.
   */
  import { DIALOG_STACK_INDEX_KEY } from '~/composables/useDialogStack'

  const props = defineProps<{
    stackIndex: number
  }>()

  const indexRef = computed(() => props.stackIndex)
  provide(DIALOG_STACK_INDEX_KEY, indexRef)
</script>

<template>
  <slot />
</template>
