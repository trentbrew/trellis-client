<script setup lang="ts">
  const { weather, status, weatherIcon, weatherLabel } = useWeather()
</script>

<template>
  <!-- Loading skeleton -->
  <div
    v-if="status === 'loading' || status === 'idle'"
    class="flex items-center gap-2 text-sm text-muted-foreground/30 animate-pulse">
    <div class="size-4 rounded bg-muted-foreground/10" />
    <div class="h-3 w-16 rounded bg-muted-foreground/10" />
  </div>

  <!-- Weather data -->
  <div
    v-else-if="status === 'ready' && weather"
    class="flex items-center gap-2 text-sm text-muted-foreground/50">
    <Icon :name="weatherIcon" class="size-4 shrink-0" />
    <span class="tabular-nums">{{ Math.round(weather.temperature ?? 0) }}{{ weather.unit }}</span>
    <span class="text-muted-foreground/20">&middot;</span>
    <span>{{ weatherLabel }}</span>
    <span
      v-if="weather.high !== null && weather.low !== null"
      class="text-muted-foreground/30 text-xs tabular-nums">
      H:{{ Math.round(weather.high) }}° L:{{ Math.round(weather.low) }}°
    </span>
  </div>

  <!-- Denied / error — silent, don't show anything -->
</template>
