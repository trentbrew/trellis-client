<script setup lang="ts">
  import { inject, ref, computed } from 'vue'
  import { cn } from '@/lib/utils'
  import { useMouse } from '@vueuse/core'
  import { PlusIcon } from 'lucide-vue-next'
  import { GanttContextKey } from './ganttContext'

  interface Props {
    onCreateMarker: (date: Date) => void
    className?: string
  }

  const props = defineProps<Props>()

  const gantt = inject(GanttContextKey)!
  const canEdit = computed(() => gantt.mode === 'edit')
  const triggerRef = ref<HTMLElement | null>(null)
  const { x: mouseX } = useMouse({ target: triggerRef })

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getTimelineStartDate = () => {
    return gantt.timelineStartDate
  }

  const getDateByMousePosition = (mouseX: number) => {
    const timelineStartDate = getTimelineStartDate()
    const columnWidth = (gantt.columnWidth * gantt.zoom) / 100

    if (gantt.range === 'hourly') {
      const rawMinutes = (mouseX / columnWidth) * 60
      const snappedMinutes = Math.round(rawMinutes / gantt.tickMinutes) * gantt.tickMinutes
      const clampedMinutes = Math.max(0, Math.min(24 * 60, snappedMinutes))
      const d = new Date(timelineStartDate)
      d.setTime(d.getTime() + clampedMinutes * 60 * 1000)
      d.setSeconds(0, 0)
      return d
    }

    const offset = Math.floor(mouseX / columnWidth)
    const addRange =
      gantt.range === 'monthly' || gantt.range === 'quarterly'
        ? (date: Date, months: number) => {
            const newDate = new Date(date)
            newDate.setMonth(newDate.getMonth() + months)
            return newDate
          }
        : (date: Date, days: number) => {
            const newDate = new Date(date)
            newDate.setDate(newDate.getDate() + days)
            return newDate
          }
    const month = addRange(timelineStartDate, offset)
    const daysInMonth = getDaysInMonth(month)
    const pixelsPerDay = Math.round(columnWidth / daysInMonth)
    const dayOffset = Math.floor((mouseX % columnWidth) / pixelsPerDay)
    const actualDate = new Date(month)
    actualDate.setDate(actualDate.getDate() + dayOffset)
    return actualDate
  }

  const date = computed(() => getDateByMousePosition(mouseX.value || 0))

  const handleClick = () => {
    props.onCreateMarker(date.value)
  }

  const formatDate = (date: Date) => {
    if (gantt.range === 'hourly') {
      if (gantt.tickMinutes < 60) {
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      }
      return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
</script>

<template>
  <div
    ref="triggerRef"
    :class="
      cn('group pointer-events-none absolute top-0 left-0 h-full w-full select-none overflow-visible', props.className)
    ">
    <div
      v-if="canEdit"
      class="-ml-2 pointer-events-auto sticky top-6 z-20 flex w-4 flex-col items-center justify-center gap-1 overflow-visible opacity-0 group-hover:opacity-100"
      :style="{ transform: `translateX(${mouseX}px)` }">
      <button
        type="button"
        class="z-50 inline-flex h-4 w-4 items-center justify-center rounded-full bg-card"
        @click="handleClick">
        <PlusIcon :size="12" class="text-muted-foreground" />
      </button>
      <div
        class="whitespace-nowrap rounded-full border border-border/50 bg-background/90 px-2 py-1 text-foreground text-xs backdrop-blur-lg">
        {{ formatDate(date) }}
      </div>
    </div>
  </div>
</template>
