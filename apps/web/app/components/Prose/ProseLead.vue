<script lang="ts" setup>
  defineProps<{
    prose?: boolean
  }>()
</script>

<template>
  <div :class="prose ? 'prose prose-slate dark:prose-invert max-w-none' : ''">
    <slot />
  </div>
</template>
