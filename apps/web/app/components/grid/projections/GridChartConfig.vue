<script setup lang="ts">
  import type { ChartType, AggregationFn } from '~/types/database'
  import type { ChartConfig } from '~/types/grid'
  import type { Entity } from '~/types/entity'
  import { DIMENSION_OPTIONS, DEFAULT_CHART_CONFIG } from '~/composables/useChartProjection'

  const props = defineProps<{
    config?: ChartConfig
    items: Entity[]
  }>()

  const emit = defineEmits<{
    'update:config': [config: ChartConfig]
  }>()

  // ── Local state seeded from prop ────────────────────────────────────
  const local = reactive<ChartConfig>({
    chartType: props.config?.chartType ?? DEFAULT_CHART_CONFIG.chartType,
    dimension: props.config?.dimension ?? DEFAULT_CHART_CONFIG.dimension,
    measure: props.config?.measure ?? DEFAULT_CHART_CONFIG.measure,
    aggregation: props.config?.aggregation ?? DEFAULT_CHART_CONFIG.aggregation,
    showLegend: props.config?.showLegend ?? false,
    stacked: props.config?.stacked ?? false,
  })

  // Emit on every change
  watch(() => ({ ...local }), (cfg) => {
    emit('update:config', { ...cfg })
  }, { deep: true })

  // ── Chart type options ──────────────────────────────────────────────
  const chartTypeOptions: { value: ChartType; label: string; icon: string }[] = [
    { value: 'bar', label: 'Bar', icon: 'lucide:bar-chart-3' },
    { value: 'line', label: 'Line', icon: 'lucide:trending-up' },
    { value: 'area', label: 'Area', icon: 'lucide:area-chart' },
    { value: 'pie', label: 'Pie', icon: 'lucide:pie-chart' },
    { value: 'donut', label: 'Donut', icon: 'lucide:circle-dot' },
    { value: 'radialBar', label: 'Radial', icon: 'lucide:gauge' },
  ]

  // ── Dimension options (filtered by what data actually has) ──────────
  const availableDimensions = computed(() => {
    if (!props.items.length) return DIMENSION_OPTIONS
    const sample = props.items[0]!
    return DIMENSION_OPTIONS.filter((opt) => (sample as any)[opt.value] !== undefined)
  })

  // ── Aggregation options ─────────────────────────────────────────────
  const aggregationOptions: { value: AggregationFn; label: string }[] = [
    { value: 'count', label: 'Count' },
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' },
  ]

  const showAggregation = computed(() => local.measure !== 'count')

  const isStackable = computed(() => ['bar', 'area'].includes(local.chartType))
</script>

<template>
  <div class="space-y-3 p-3">
    <!-- Chart type grid -->
    <div class="space-y-1.5">
      <label class="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">Chart Type</label>
      <div class="grid grid-cols-3 gap-1">
        <button
          v-for="opt in chartTypeOptions"
          :key="opt.value"
          class="flex flex-col items-center gap-1 px-2 py-2 rounded-md text-[10px] transition-colors border"
          :class="local.chartType === opt.value
            ? 'bg-primary/10 text-primary border-primary/30'
            : 'border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground'"
          @click="local.chartType = opt.value">
          <Icon :name="opt.icon" class="h-3.5 w-3.5" />
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Dimension -->
    <div class="space-y-1.5">
      <label class="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">Group By</label>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="opt in availableDimensions"
          :key="opt.value"
          class="inline-flex items-center px-2 py-1 rounded-md text-[10px] transition-colors border"
          :class="local.dimension === opt.value
            ? 'bg-primary/10 text-primary border-primary/30'
            : 'border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground'"
          @click="local.dimension = opt.value">
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Measure -->
    <div class="space-y-1.5">
      <label class="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">Measure</label>
      <div class="flex flex-wrap gap-1">
        <button
          class="inline-flex items-center px-2 py-1 rounded-md text-[10px] transition-colors border"
          :class="local.measure === 'count'
            ? 'bg-primary/10 text-primary border-primary/30'
            : 'border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground'"
          @click="local.measure = 'count'; local.aggregation = 'count'">
          Count
        </button>
      </div>
    </div>

    <!-- Aggregation (only for non-count measures) -->
    <div v-if="showAggregation" class="space-y-1.5">
      <label class="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">Aggregation</label>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="opt in aggregationOptions"
          :key="opt.value"
          class="inline-flex items-center px-2 py-1 rounded-md text-[10px] transition-colors border"
          :class="local.aggregation === opt.value
            ? 'bg-primary/10 text-primary border-primary/30'
            : 'border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground'"
          @click="local.aggregation = opt.value">
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Toggles -->
    <div class="flex items-center gap-3 pt-1">
      <label class="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
        <input
          v-model="local.showLegend"
          type="checkbox"
          class="rounded border-border text-primary focus:ring-primary/30 h-3 w-3" />
        Legend
      </label>
      <label
        v-if="isStackable"
        class="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
        <input
          v-model="local.stacked"
          type="checkbox"
          class="rounded border-border text-primary focus:ring-primary/30 h-3 w-3" />
        Stacked
      </label>
    </div>
  </div>
</template>
