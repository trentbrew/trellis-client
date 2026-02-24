<script setup lang="ts">
  import { inject, ref, computed, onMounted, onUnmounted, watch } from 'vue'
  import { cn } from '@/lib/utils'
  import { GanttContextKey } from './ganttContext'
  import { ArrowLeft, ArrowRight } from 'lucide-vue-next'

  interface Props {
    className?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    className: '',
  })

  const gantt = inject(GanttContextKey)!

  const label = computed(() => (gantt.range === 'hourly' ? 'Now' : 'Today'))
  const now = ref(new Date())

  const playheadEl = ref<HTMLButtonElement | null>(null)
  const playheadWidth = ref(0)

  let resizeObserver: ResizeObserver | null = null

  let timer: number | null = null
  onMounted(() => {
    timer = window.setInterval(() => {
      now.value = new Date()
    }, 15_000)

    if (window.ResizeObserver && playheadEl.value) {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) {
          return
        }
        playheadWidth.value = entry.contentRect.width
      })
      resizeObserver.observe(playheadEl.value as unknown as Element)
    }
  })

  onUnmounted(() => {
    if (timer !== null) {
      window.clearInterval(timer)
    }

    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  })

  const getOffset = (date: Date) => {
    const timelineStartDate = gantt.timelineStartDate

    if (gantt.range === 'hourly') {
      // Hourly view is a single-day window; position the playhead by time-of-day.
      // This keeps the playhead within [0, 24] even if timelineStartDate is not today.
      return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600 + date.getMilliseconds() / 3600000
    }

    if (gantt.range === 'daily') {
      const daysDiff = Math.floor((date.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff
    }

    const monthsDiff = (date.getFullYear() - timelineStartDate.getFullYear()) * 12 + date.getMonth()
    return monthsDiff
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const rawLineOffset = computed(() => getOffset(now.value))

  const clampedLineOffset = computed(() => {
    if (gantt.range !== 'hourly') {
      return rawLineOffset.value
    }
    return Math.max(0, Math.min(24, rawLineOffset.value))
  })

  const isOutsideHourlyWindow = computed(() => {
    if (gantt.range !== 'hourly') {
      return false
    }
    return rawLineOffset.value < 0 || rawLineOffset.value > 24
  })

  const playheadLeft = computed(() => {
    const scrollX = gantt.scrollX ?? 0
    const sidebarWidth = gantt.sidebarWidth ?? 0
    const columnWidth = (gantt.columnWidth * gantt.zoom) / 100
    const markerX = sidebarWidth + clampedLineOffset.value * columnWidth
    const viewportLeft = scrollX
    const viewportRight = scrollX + (gantt.ref?.value?.clientWidth ?? 0)

    const halfWidth = playheadWidth.value > 0 ? playheadWidth.value / 2 : 40
    const padding = 12
    const minCenter = viewportLeft + sidebarWidth + halfWidth + padding
    const maxCenter = viewportRight - halfWidth - padding

    if (markerX < minCenter) {
      return minCenter - markerX
    }
    if (markerX > maxCenter) {
      return maxCenter - markerX
    }
    return 0
  })

  const isOffscreen = computed(() => isOutsideHourlyWindow.value || playheadLeft.value !== 0)

  const offscreenDirection = computed<'left' | 'right' | null>(() => {
    if (isOutsideHourlyWindow.value) {
      return rawLineOffset.value < 0 ? 'left' : 'right'
    }

    if (playheadLeft.value === 0) {
      return null
    }

    // When the marker is left of the viewport, we shift the button right => positive.
    // When the marker is right of the viewport, we shift the button left => negative.
    return playheadLeft.value > 0 ? 'left' : 'right'
  })

  watch(
    [isOffscreen, offscreenDirection],
    ([offscreen, direction]) => {
      gantt.setTodayOffscreen?.(offscreen, direction)
    },
    { immediate: true },
  )

  const containerLeft = computed(() => {
    const columnWidth = (gantt.columnWidth * gantt.zoom) / 100
    return clampedLineOffset.value * columnWidth
  })
</script>

<template>
  <div
    class="pointer-events-none absolute top-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible"
    :style="{
      width: '0',
      left: '0',
      transform: `translateX(${containerLeft}px)`,
    }">
    <button
      id="playhead"
      ref="playheadEl"
      type="button"
      :class="
        cn(
          'group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-primary px-2 py-1 text-primary-foreground text-xs cursor-pointer hover:bg-accent/90 transition-colors',
          isOffscreen && 'shadow-lg',
          props.className,
        )
      "
      :style="{
        left: `${playheadLeft}px`,
      }"
      title="Click to jump to current time"
      @click="gantt.scrollToToday?.()">
      <span class="flex items-center gap-1">
        <span v-if="offscreenDirection === 'left'" data-playhead-arrow="left" class="opacity-80">
          <ArrowLeft :size="12" class="transition-transform duration-200 group-hover:-translate-x-0.5" />
        </span>
        <span>{{ label }}</span>
        <span v-if="offscreenDirection === 'right'" data-playhead-arrow="right" class="opacity-80">
          <ArrowRight :size="12" class="transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </span>
      <span class="max-h-0 overflow-hidden opacity-80 transition-all group-hover:max-h-8">
        {{ formatDate(now) }}
      </span>
    </button>
    <div :class="cn('h-full w-px bg-primary', props.className)" />
  </div>
</template>
