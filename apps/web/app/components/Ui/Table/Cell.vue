<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<{
    class?: ClassNameValue
  }>()

  const styles = tv({
    base: 'p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
  })
</script>

<template>
  <td data-slot="table-cell" :class="styles({ class: props.class })">
    <slot />
  </td>
</template>
