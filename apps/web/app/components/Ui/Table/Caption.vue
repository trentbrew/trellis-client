<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<{
    class?: ClassNameValue
  }>()

  const styles = tv({
    base: 'mt-4 text-sm text-muted-foreground',
  })
</script>

<template>
  <caption data-slot="table-caption" :class="styles({ class: props.class })">
    <slot />
  </caption>
</template>
