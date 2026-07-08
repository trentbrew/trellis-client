<script setup lang="ts">
  import type { QueryViewRegionConfig } from '~/types/deck'
  import { useDeckQueryView } from '~/composables/useDeckQueryView'
  import {
    getQueryViewDemoData,
    showQueryViewChart,
    showQueryViewTiles,
  } from '~/lib/deck-query-view-demo'

  const props = defineProps<{
    slideEntityId: string
    config: QueryViewRegionConfig
    active?: boolean
  }>()

  const activeRef = computed(() => props.active ?? true)

  const { payload, loading, usingFallback, pulseRefresh } = useDeckQueryView(
    toRef(props, 'slideEntityId'),
    toRef(props, 'config'),
    activeRef,
  )

  const demoFallback = computed(() => getQueryViewDemoData(props.slideEntityId))
  const display = computed(() => payload.value ?? demoFallback.value)

  const showTiles = computed(() => showQueryViewTiles(props.config) && display.value?.tiles.length)
  const showChart = computed(() => showQueryViewChart(props.config) && display.value?.bars.length)
</script>

<template>
  <div
    role="region"
    aria-label="Live query view"
    class="overflow-hidden rounded-md border border-border bg-muted/30"
  >
    <div class="flex items-center gap-2 border-b border-border px-2.5 py-1.5 font-mono text-[9px] text-muted-foreground">
      <span
        class="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-emerald-400"
        :class="{ 'animate-pulse': pulseRefresh }"
        aria-live="polite"
      >
        <span class="size-1 rounded-full bg-emerald-400" />
        LIVE · queryView
      </span>
      <span class="min-w-0 flex-1 truncate">{{ config.query }}</span>
      <span
        v-if="usingFallback"
        class="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[8px] text-muted-foreground"
      >
        demo fallback
      </span>
      <span v-if="loading" class="shrink-0 text-[8px] text-muted-foreground">loading…</span>
    </div>

    <div v-if="showTiles && display" class="grid grid-cols-3 gap-2 p-2.5">
      <div
        v-for="tile in display.tiles"
        :key="tile.label"
        class="rounded-sm bg-muted/50 px-2 py-2 text-center"
      >
        <div class="text-lg font-semibold tabular-nums">{{ tile.value }}</div>
        <div class="font-mono text-[9px] text-muted-foreground">{{ tile.label }}</div>
      </div>
    </div>

    <div v-if="showChart && display" class="px-2.5 pb-2.5">
      <div class="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
        {{ config.title || display.chartTitle }}
      </div>
      <div class="flex h-14 items-end gap-1.5">
        <div
          v-for="bar in display.bars"
          :key="bar.label"
          class="flex-1 rounded-t-sm transition-all duration-400"
          :class="bar.highlight ? 'bg-indigo-500' : 'bg-indigo-500/60'"
          :style="{ height: `${bar.height}%` }"
          :title="bar.value"
        />
      </div>
      <div class="mt-1 flex gap-1.5 font-mono text-[8px] text-muted-foreground">
        <span v-for="bar in display.bars" :key="`${bar.label}-x`" class="flex-1 text-center">{{ bar.label }}</span>
      </div>
    </div>
  </div>
</template>
