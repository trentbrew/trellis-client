<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<{
    class?: ClassNameValue
  }>()

  const styles = tv({
    base: '[&_tr]:border-b',
  })
</script>

<template>
  <thead data-slot="table-header" :class="styles({ class: props.class })">
    <slot />
  </thead>
</template>
