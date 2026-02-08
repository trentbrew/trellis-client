<script setup lang="ts">
  import type { ApexOptions } from 'apexcharts'
  import type { ChartType } from '~/types/database'

  const props = defineProps<{
    title: string
    chartType: ChartType
    labels: string[]
    series: number[] | ApexAxisChartSeries
    colors?: string[]
    height?: number
    sparkline?: boolean
    showLegend?: boolean
    stacked?: boolean
  }>()

  const isRadialType = computed(() =>
    ['pie', 'donut', 'radialBar'].includes(props.chartType),
  )

  const apexType = computed(() => {
    const map: Record<string, string> = {
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
    return (map[props.chartType] || 'bar') as any
  })

  const chartSeries = computed(() => {
    if (isRadialType.value) {
      return Array.isArray(props.series) ? props.series : []
    }
    if (Array.isArray(props.series) && props.series.length > 0 && typeof props.series[0] === 'number') {
      return [{ name: props.title, data: props.series as number[] }]
    }
    return props.series
  })

  const chartOptions = computed<ApexOptions>(() => {
    const base: ApexOptions = {
      chart: {
        id: `dashboard-${props.title.replace(/\s+/g, '-').toLowerCase()}`,
        sparkline: { enabled: props.sparkline ?? false },
        stacked: props.stacked ?? false,
        toolbar: { show: false },
      },
      colors: props.colors?.length ? props.colors : undefined,
      legend: {
        show: props.showLegend ?? false,
        position: 'bottom',
        labels: { colors: 'var(--color-muted-foreground)' },
      },
      tooltip: { enabled: true },
    }

    if (isRadialType.value) {
      base.labels = props.labels
    } else {
      base.xaxis = {
        categories: props.labels,
        labels: {
          style: { colors: 'var(--color-muted-foreground)', fontSize: '11px' },
        },
      }
      base.yaxis = {
        labels: {
          style: { colors: 'var(--color-muted-foreground)', fontSize: '11px' },
        },
      }
    }

    if (props.chartType === 'bar') {
      base.plotOptions = {
        bar: { borderRadius: 4, columnWidth: '60%' },
      }
    }

    if (props.chartType === 'donut') {
      base.plotOptions = {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                color: 'var(--color-muted-foreground)',
              },
            },
          },
        },
      }
    }

    if (props.chartType === 'radialBar') {
      base.plotOptions = {
        radialBar: {
          hollow: { size: '50%' },
          dataLabels: {
            name: { show: true, color: 'var(--color-muted-foreground)', fontSize: '12px' },
            value: { show: true, color: 'var(--color-foreground)', fontSize: '24px', fontWeight: '700' },
          },
        },
      }
      base.labels = props.labels
    }

    return base
  })
</script>

<template>
  <div class="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 h-full">
    <div class="flex items-center justify-between shrink-0">
      <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ title }}</span>
    </div>
    <div class="flex-1 min-h-0">
      <ClientOnly>
        <UiApexchart
          :type="apexType"
          :series="chartSeries"
          :options="chartOptions"
          :height="height || '100%'"
          width="100%" />
        <template #fallback>
          <div class="h-full flex items-center justify-center">
            <Icon name="svg-spinners:ring-resize" class="size-5 text-muted-foreground" />
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>
