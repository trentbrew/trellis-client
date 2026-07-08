<script lang="ts" setup>
  const { weather, prefs } = useAmbientBar()

  const weatherIcon = computed(() => weather.data.value?.icon ?? 'lucide:cloud')
</script>

<template>
  <UiPopover v-if="prefs.showWeather.value && weather.visible.value">
    <UiPopoverTrigger as-child>
      <button
        type="button"
        class="menubar-chip inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        :aria-label="`Weather: ${weather.data.value?.tempF} degrees, ${weather.data.value?.condition}`">
        <Icon :name="weatherIcon" class="size-3.5 shrink-0 opacity-80" />
        <span class="tabular-nums">{{ weather.data.value?.tempF }}°</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="end" :side-offset="8" class="w-48 text-xs">
      <div class="flex items-center gap-2">
        <Icon :name="weatherIcon" class="size-4 shrink-0 opacity-80" />
        <div>
          <div class="font-medium">{{ weather.data.value?.condition }}</div>
          <div class="text-muted-foreground mt-0.5 tabular-nums">{{ weather.data.value?.tempF }}°F</div>
        </div>
      </div>
    </UiPopoverContent>
  </UiPopover>
</template>
