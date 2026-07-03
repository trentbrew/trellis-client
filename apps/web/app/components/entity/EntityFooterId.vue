<script setup lang="ts">
  const props = withDefaults(
    defineProps<{
      id: string
      showPrefix?: boolean
    }>(),
    { showPrefix: true },
  )
</script>

<template>
  <span class="truncate min-w-0 max-w-[min(220px,35vw)] font-mono" :title="id">
    <template v-if="props.showPrefix">ID: </template>{{ id }}
  </span>
</template>
