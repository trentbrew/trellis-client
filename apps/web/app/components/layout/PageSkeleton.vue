<script setup lang="ts">
  defineProps<{
    showHeader?: boolean
    showTabs?: boolean
  }>()
</script>

<template>
  <div class="flex h-full flex-col animate-in fade-in duration-150">
    <!-- Header Skeleton -->
    <div v-if="showHeader !== false" class="shrink-0 space-y-2 border-b border-border p-6 pl-8">
      <!-- Subtitle -->
      <div class="h-3 w-24 rounded bg-muted animate-pulse" />
      <!-- Title -->
      <div class="h-8 w-64 rounded bg-muted animate-pulse" />
      <!-- Description -->
      <div class="h-4 w-96 rounded bg-muted animate-pulse" />
    </div>

    <!-- Tabs Skeleton -->
    <div v-if="showTabs" class="shrink-0 border-b border-border px-6 py-3">
      <div class="flex gap-4">
        <div class="h-8 w-20 rounded bg-muted animate-pulse" />
        <div class="h-8 w-24 rounded bg-muted animate-pulse" />
        <div class="h-8 w-16 rounded bg-muted animate-pulse" />
      </div>
    </div>

    <!-- Content Skeleton -->
    <div class="flex-1 p-6 space-y-4">
      <div class="h-10 w-full rounded bg-muted animate-pulse" />
      <div class="h-10 w-full rounded bg-muted animate-pulse" />
      <div class="h-10 w-3/4 rounded bg-muted animate-pulse" />
      <div class="h-10 w-full rounded bg-muted animate-pulse" />
      <div class="h-10 w-5/6 rounded bg-muted animate-pulse" />
    </div>
  </div>
</template>
