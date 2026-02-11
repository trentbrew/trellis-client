<script setup lang="ts">
  import type { DashboardInsight } from '~/composables/useDashboardInsights'
  import { CALENDAR_ITEM_TYPES } from '~/types/calendarItem'
  import InlineSparkline from '~/components/dashboard/InlineSparkline.vue'

  const props = defineProps<{
    insight: DashboardInsight
  }>()

  const emit = defineEmits<{
    itemClick: [id: string]
    viewAll: [insight: DashboardInsight]
  }>()

  const severityConfig = {
    info: {
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/5',
      icon: 'lucide:info',
      iconColor: 'text-blue-400',
      sparkColor: 'var(--color-blue-400, #60a5fa)',
    },
    warning: {
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/5',
      icon: 'lucide:alert-triangle',
      iconColor: 'text-amber-400',
      sparkColor: 'var(--color-amber-400, #fbbf24)',
    },
    urgent: {
      border: 'border-red-500/25',
      bg: 'bg-red-500/5',
      icon: 'lucide:alert-circle',
      iconColor: 'text-red-400',
      sparkColor: 'var(--color-red-400, #f87171)',
    },
  } as const

  const trendIcon = computed(() => {
    switch (props.insight.trend) {
      case 'rising': return 'lucide:trending-up'
      case 'falling': return 'lucide:trending-down'
      default: return ''
    }
  })

  const trendColor = computed(() => {
    // For overdue/due-today, rising = bad. For streaks, rising = good.
    const badTypes = new Set(['overdue', 'due-today', 'due-soon', 'payment-due', 'stale'])
    if (props.insight.trend === 'rising') {
      return badTypes.has(props.insight.type) ? 'text-red-400' : 'text-emerald-400'
    }
    if (props.insight.trend === 'falling') {
      return badTypes.has(props.insight.type) ? 'text-emerald-400' : 'text-amber-400'
    }
    return 'text-muted-foreground'
  })

  const config = computed(() => severityConfig[props.insight.severity])

  const previewItems = computed(() => props.insight.items.slice(0, 3))
  const remainingCount = computed(() => Math.max(0, props.insight.items.length - 3))
</script>

<template>
  <div
    :class="[
      'rounded-xl border p-4 transition-all duration-300',
      config.border,
      config.bg,
    ]">
    <!-- Header row: icon + title + sparkline + trend -->
    <div class="flex items-center gap-3">
      <Icon
        :name="config.icon"
        :class="['size-4 shrink-0', config.iconColor]" />

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-foreground">
            {{ insight.title }}
          </span>

          <!-- Inline sparkline -->
          <InlineSparkline
            v-if="insight.sparkline.length >= 3"
            :values="insight.sparkline"
            :color="config.sparkColor"
            :width="40"
            :height="14"
            :stroke-width="1.5"
            class="shrink-0 opacity-70" />

          <!-- Trend arrow -->
          <Icon
            v-if="trendIcon"
            :name="trendIcon"
            :class="['size-3 shrink-0', trendColor]" />
        </div>
      </div>
    </div>

    <!-- Item previews -->
    <div class="mt-2.5 space-y-1">
      <button
        v-for="item in previewItems"
        :key="item.id"
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-foreground/5"
        @click="emit('itemClick', item.id)">
        <Icon
          :name="CALENDAR_ITEM_TYPES.find((t) => t.value === item.type)?.icon || 'lucide:circle'"
          class="size-3.5 shrink-0 text-muted-foreground/60" />
        <span class="flex-1 truncate text-xs text-foreground/80">
          {{ item.title }}
        </span>
        <span v-if="(item as any).startTime" class="text-[10px] text-muted-foreground/50 shrink-0">
          {{ (item as any).startTime }}
        </span>
      </button>
    </div>

    <!-- "and N more" / View all -->
    <button
      v-if="remainingCount > 0"
      type="button"
      class="mt-1.5 flex items-center gap-1 px-2 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      @click="emit('viewAll', insight)">
      <span>and {{ remainingCount }} more</span>
      <Icon name="lucide:arrow-right" class="size-3" />
    </button>
  </div>
</template>
