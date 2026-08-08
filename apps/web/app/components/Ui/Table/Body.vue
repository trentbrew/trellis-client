<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<{
    class?: ClassNameValue
  }>()

  const styles = tv({
    base: '[&_tr:last-child]:border-0',
  })
</script>

<template>
  <tbody data-slot="table-body" :class="styles({ class: props.class })">
    <slot />
  </tbody>
</template>
