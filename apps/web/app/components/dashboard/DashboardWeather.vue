<script setup lang="ts">
  const { data, loading, visible } = useWeather()
</script>

<template>
  <!-- Loading skeleton -->
  <div
    v-if="loading"
    class="flex items-center gap-2 text-sm text-muted-foreground/30 animate-pulse">
    <div class="size-4 rounded bg-muted-foreground/10" />
    <div class="h-3 w-16 rounded bg-muted-foreground/10" />
  </div>

  <!-- Weather data -->
  <div
    v-else-if="visible && data"
    class="flex items-center gap-2 text-sm text-muted-foreground/50">
    <Icon :name="data.icon" class="size-4 shrink-0" />
    <span class="tabular-nums">{{ Math.round(data.tempF) }}&deg;F</span>
    <span class="text-muted-foreground/20">&middot;</span>
    <span>{{ data.condition }}</span>
  </div>

  <!-- Denied / error — silent, don't show anything -->
</template>
