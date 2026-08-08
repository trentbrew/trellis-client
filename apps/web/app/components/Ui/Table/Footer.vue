<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<{
    class?: ClassNameValue
  }>()

  const styles = tv({
    base: 'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
  })
</script>

<template>
  <tfoot data-slot="table-footer" :class="styles({ class: props.class })">
    <slot />
  </tfoot>
</template>
