<script setup lang="ts">
  import type { ApexOptions } from 'apexcharts'
  import type { Entity } from '~/types/entity'
  import type { GridView, ChartConfig } from '~/types/grid'
  import type { ChartType } from '~/types/database'
  import { useChartProjection } from '~/composables/useChartProjection'

  const props = defineProps<{
    view: GridView
    items: Entity[]
  }>()

  const emit = defineEmits<{
    'update-chart-config': [config: ChartConfig]
    'open-config': []
  }>()

  const itemsRef = computed(() => props.items)
  const chartConfigRef = computed(() => props.view.chartConfig)

  const {
    labels,
    series,
    colors,
    isRadial,
    hasData,
    resolvedConfig,
  } = useChartProjection(itemsRef, chartConfigRef)

  // ── ApexCharts type mapping ─────────────────────────────────────────
  const apexType = computed(() => {
    const map: Record<ChartType, string> = {
      bar: 'bar',
      line: 'line',
      area: 'area',
      pie: 'pie',
      donut: 'donut',
      radialBar: 'radialBar',
      scatter: 'scatter',
      radar: 'radar',
      heatmap: 'heatmap',
      treemap: 'treemap',
    }
    return (map[resolvedConfig.value.chartType] || 'bar') as any
  })

  // ── Chart options ───────────────────────────────────────────────────
  const chartOptions = computed<ApexOptions>(() => {
    const cfg = resolvedConfig.value
    const base: ApexOptions = {
      chart: {
        id: `grid-chart-${props.view.id}`,
        sparkline: { enabled: false },
        stacked: cfg.stacked ?? false,
        toolbar: { show: false },
        animations: { enabled: true, speed: 400 },
      },
      colors: colors.value,
      legend: {
        show: cfg.showLegend ?? false,
        position: 'bottom',
        fontSize: '11px',
        labels: { colors: 'var(--color-muted-foreground)' },
      },
      tooltip: { enabled: true },
      dataLabels: { enabled: false },
    }

    if (isRadial.value) {
      base.labels = labels.value
    } else {
      base.xaxis = {
        categories: labels.value,
        labels: {
          style: { colors: 'var(--color-muted-foreground)', fontSize: '10px' },
          rotateAlways: false,
          rotate: 0,
          hideOverlappingLabels: true,
        },
      }
      base.yaxis = {
        labels: {
          style: { colors: 'var(--color-muted-foreground)', fontSize: '10px' },
        },
      }
      base.grid = {
        borderColor: 'var(--color-border)',
        strokeDashArray: 3,
      }
    }

    if (cfg.chartType === 'bar') {
      base.plotOptions = {
        bar: { borderRadius: 4, columnWidth: '55%' },
      }
    }

    if (cfg.chartType === 'donut') {
      base.plotOptions = {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                color: 'var(--color-muted-foreground)',
                fontSize: '12px',
              },
            },
          },
        },
      }
    }

    if (cfg.chartType === 'radialBar') {
      base.plotOptions = {
        radialBar: {
          hollow: { size: '45%' },
          dataLabels: {
            name: { show: true, color: 'var(--color-muted-foreground)', fontSize: '11px' },
            value: { show: true, color: 'var(--color-foreground)', fontSize: '20px', fontWeight: '700' },
          },
        },
      }
      base.labels = labels.value
    }

    return base
  })

  // ── Show config when no chartConfig is set ──────────────────────────
  const showSetup = computed(() => !props.view.chartConfig)
</script>

<template>
  <div class="h-full w-full flex flex-col">
    <!-- No config yet — prompt user to configure -->
    <div
      v-if="showSetup"
      class="flex-1 flex flex-col items-center justify-center gap-3 text-center p-4">
      <div class="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
        <Icon name="lucide:bar-chart-3" class="h-5 w-5 text-muted-foreground/60" />
      </div>
      <div>
        <p class="text-xs font-medium text-muted-foreground">Chart View</p>
        <p class="text-[10px] text-muted-foreground/60 mt-0.5">Configure chart settings to visualize data</p>
      </div>
      <button
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        @click="emit('open-config')">
        <Icon name="lucide:settings-2" class="h-3 w-3" />
        Configure
      </button>
    </div>

    <!-- Has config but no data -->
    <div
      v-else-if="!hasData"
      class="flex-1 flex flex-col items-center justify-center gap-2 text-center p-4">
      <Icon name="lucide:bar-chart-3" class="h-5 w-5 text-muted-foreground/40" />
      <p class="text-xs text-muted-foreground">No data to chart</p>
      <p class="text-[10px] text-muted-foreground/50">Check data source or adjust dimension</p>
    </div>

    <!-- Render chart -->
    <div v-else class="flex-1 min-h-0 p-1">
      <ClientOnly>
        <UiApexchart
          :key="`${view.id}-${isRadial ? 'radial' : 'axis'}-${resolvedConfig.chartType}`"
          :type="apexType"
          :series="series"
          :options="chartOptions"
          height="100%"
          width="100%" />
        <template #fallback>
          <div class="h-full flex items-center justify-center">
            <Icon name="svg-spinners:ring-resize" class="size-4 text-muted-foreground" />
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>
