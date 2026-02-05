<script setup lang="ts">
  import { inject, ref, computed, onMounted, onUnmounted } from 'vue'
  import { cn } from '@/lib/utils'
  import { GanttContextKey } from './ganttContext'

  interface Props {
    className?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    className: '',
  })

  const gantt = inject(GanttContextKey)!

  const getMonthName = (monthIndex: number, year: number) => {
    return new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'short' })
  }

  const formatDayLabel = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatHourLabel = (hour: number) => {
    const d = new Date(2000, 0, 1, hour)
    return d.toLocaleTimeString('en-US', { hour: 'numeric' }).replace(' ', '')
  }

  const formatTimeLabel = (hour: number, minute: number) => {
    const d = new Date(2000, 0, 1, hour, minute)
    if (gantt.tickMinutes >= 60) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric' }).replace(' ', '')
    }
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').replace(':00', '')
  }

  const tickCount = computed(() => {
    if (gantt.range !== 'hourly') {
      return 0
    }
    return Math.floor((24 * 60) / gantt.tickMinutes)
  })

  const scrollLeft = ref(0)
  const handleScroll = () => {
    scrollLeft.value = gantt.ref.value?.scrollLeft ?? 0
  }

  const stickyTimeLabel = computed(() => {
    if (gantt.range !== 'hourly') {
      return ''
    }

    const el = gantt.ref.value
    if (!el) {
      return ''
    }

    const colWidthPx = (gantt.columnWidth * gantt.zoom) / 100
    const timelineLeftPx = Math.max(0, scrollLeft.value - gantt.sidebarWidth)
    const minutesFromStart = (timelineLeftPx / colWidthPx) * 60
    const snappedMinutes = Math.max(0, Math.floor(minutesFromStart / gantt.tickMinutes) * gantt.tickMinutes)
    const hour = Math.floor(snappedMinutes / 60) % 24
    const minute = snappedMinutes % 60
    return formatTimeLabel(hour, minute)
  })

  const formatTickLabel = (tickIndex: number) => {
    const minutes = tickIndex * gantt.tickMinutes
    const hour = Math.floor(minutes / 60) % 24
    const minute = minutes % 60

    const shouldShow =
      minute === 0 ||
      (gantt.tickMinutes >= 30 && minute === 30) ||
      (gantt.tickMinutes === 10 && minute === 30) ||
      (gantt.tickMinutes === 5 && minute === 30)

    if (!shouldShow) {
      return ''
    }

    if (gantt.tickMinutes >= 60) {
      return minute === 0 ? formatHourLabel(hour) : ''
    }

    return formatTimeLabel(hour, minute)
  }

  onMounted(() => {
    handleScroll()
    gantt.ref.value?.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    gantt.ref.value?.removeEventListener('scroll', handleScroll)
  })
</script>

<template>
  <div :class="cn('-space-x-px flex h-full w-max divide-x divide-border/50', props.className)">
    <div
      class="sticky top-0 z-20 flex w-max shrink-0 bg-backdrop/90 backdrop-blur-sm overflow-hidden"
      :style="{ height: 'var(--gantt-header-height)' }">
      <div class="flex h-full">
        <div class="flex h-full">
          <template v-if="gantt.range === 'hourly'">
            <div class="relative flex h-full flex-none flex-col">
              <div
                class="sticky z-10 inline-flex whitespace-nowrap px-3 py-2 text-muted-foreground text-xs bg-backdrop/90 backdrop-blur-sm"
                :style="{ left: 'var(--gantt-sidebar-width)' }">
                <p>
                  {{ formatDayLabel(gantt.timelineStartDate) }}
                  <span v-if="stickyTimeLabel" class="ml-2 text-[10px] opacity-80">{{ stickyTimeLabel }}</span>
                </p>
              </div>

              <div
                class="grid"
                :style="{
                  width: `calc(24 * var(--gantt-column-width))`,
                  gridTemplateColumns: `repeat(${tickCount}, calc(var(--gantt-column-width) * ${gantt.tickMinutes} / 60))`,
                }">
                <div
                  v-for="tick in tickCount"
                  :key="`tick-${tick}`"
                  class="shrink-0 border-border/50 border-b py-1 text-center text-[10px] text-muted-foreground">
                  {{ formatTickLabel(tick - 1) }}
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div v-for="year in gantt.timelineData" :key="year.year" class="relative flex h-full flex-none flex-col">
              <div class="inline-flex whitespace-nowrap px-3 py-2 text-muted-foreground text-xs">
                <p>{{ year.year }}</p>
              </div>

              <div
                class="grid"
                :style="{
                  width: `calc(${year.quarters.flatMap((q) => q.months).length} * var(--gantt-column-width))`,
                  gridTemplateColumns: `repeat(${year.quarters.flatMap((q) => q.months).length}, var(--gantt-column-width))`,
                }">
                <div
                  v-for="(month, mIndex) in year.quarters.flatMap((q) => q.months)"
                  :key="`${year.year}-${mIndex}`"
                  class="shrink-0 border-border/50 border-b py-1 text-center text-xs">
                  {{ getMonthName(mIndex, year.year) }}
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
