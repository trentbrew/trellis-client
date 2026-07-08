<script lang="ts" setup>
  const { host, prefs } = useAmbientBar()

  const label = computed(() => {
    const s = host.stats.value
    if (!s) return ''
    const mem = `${s.memoryUsedGb.toFixed(1)}G`
    return `${Math.round(s.cpuPercent)}% · ${mem}`
  })
</script>

<template>
  <UiTooltip v-if="prefs.showHostStats.value && host.visible.value">
    <UiTooltipTrigger as-child>
      <button
        type="button"
        class="menubar-chip inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground tabular-nums whitespace-nowrap hover:bg-muted/50 hover:text-foreground transition-colors"
        :aria-label="`Host stats: ${label}`">
        <Icon name="lucide:cpu" class="size-3.5 shrink-0 opacity-70" />
        <span>{{ label }}</span>
      </button>
    </UiTooltipTrigger>
    <UiTooltipContent side="bottom" :side-offset="8">
      <div class="text-xs space-y-0.5">
        <div>CPU {{ Math.round(host.stats.value?.cpuPercent ?? 0) }}%</div>
        <div>
          Memory {{ host.stats.value?.memoryUsedGb.toFixed(1) }} /
          {{ host.stats.value?.memoryTotalGb.toFixed(1) }} GB
        </div>
        <div v-if="host.stats.value?.batteryPercent != null">
          Battery {{ host.stats.value.batteryPercent }}%
        </div>
      </div>
    </UiTooltipContent>
  </UiTooltip>
</template>
