<script lang="ts" setup>
  const props = withDefaults(
    defineProps<{
      /** Horizontal rule when the rail is vertical (left). */
      horizontal?: boolean
    }>(),
    { horizontal: false },
  )
</script>

<template>
  <span
    class="rail-zone-sep shrink-0 opacity-30 bg-border menubar-sep-accent"
    :class="props.horizontal ? 'my-1 h-px w-full self-stretch' : 'h-5 w-px'"
    aria-hidden="true" />
</template>
