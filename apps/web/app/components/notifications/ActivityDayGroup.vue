<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <section class="activity-day-group">
    <div
      class="sticky top-0 z-10 border-b border-border/40 bg-background/90 px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur-sm">
      {{ label }}
    </div>
    <slot />
  </section>
</template>
