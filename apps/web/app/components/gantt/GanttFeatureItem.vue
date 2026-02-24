<script setup lang="ts">
  import { inject, computed, ref, watch, onUnmounted } from 'vue'
  import { cn } from '@/lib/utils'
  import Card from './Card.vue'
  import {
    GanttContextKey,
    type GanttFeature,
    type GanttScheduleItemChange,
    type GanttScheduleItemChangeAction,
  } from './ganttContext'

  interface Props {
    feature: GanttFeature
    onMove?: (id: string, startDate: Date, endDate: Date | null) => void
    className?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    className: '',
  })

  const emit = defineEmits<{
    (e: 'schedule-item-change', payload: GanttScheduleItemChange): void
  }>()

  const gantt = inject(GanttContextKey)!

  const canEdit = computed(() => gantt.mode === 'edit')
  const canInteract = computed(() => canEdit.value)

  const localStartAt = ref<Date>(props.feature.startAt)
  const localEndAt = ref<Date | null>(props.feature.endAt)

  watch(
    () => props.feature.startAt,
    (val) => {
      localStartAt.value = val
    },
  )

  watch(
    () => props.feature.endAt,
    (val) => {
      localEndAt.value = val
    },
  )

  type DragMode = 'move' | 'resize-left' | 'resize-right'
  type DragState = {
    mode: DragMode
    originX: number
    originDate: Date
    originStartAt: Date
    originEndAt: Date | null
    activated: boolean
  }

  let activeDrag: DragState | null = null
  let cleanupDragListeners: (() => void) | null = null

  const clampDate = (date: Date, min: Date, max: Date) => {
    if (date.getTime() < min.getTime()) return min
    if (date.getTime() > max.getTime()) return max
    return date
  }

  const addDays = (date: Date, days: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  const addHours = (date: Date, hours: number) => {
    const d = new Date(date)
    d.setTime(d.getTime() + hours * 60 * 60 * 1000)
    return d
  }

  const addMinutes = (date: Date, minutes: number) => {
    const d = new Date(date)
    d.setTime(d.getTime() + minutes * 60 * 1000)
    return d
  }

  const getUtcDayStamp = (date: Date) => {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  }

  const getDayDiff = (a: Date, b: Date) => {
    const msPerDay = 24 * 60 * 60 * 1000
    return Math.round((getUtcDayStamp(a) - getUtcDayStamp(b)) / msPerDay)
  }

  const getRawMinutesFromTimelineStart = (date: Date) => {
    const start = gantt.timelineStartDate
    const dayDiff = getDayDiff(date, start)
    return (
      dayDiff * 24 * 60 +
      date.getHours() * 60 +
      date.getMinutes() +
      date.getSeconds() / 60 +
      date.getMilliseconds() / 60000
    )
  }

  const clampMinutesToDayWindow = (minutes: number) => {
    return Math.max(0, Math.min(24 * 60, minutes))
  }

  const diffInDays = (a: Date, b: Date) => {
    const msPerDay = 24 * 60 * 60 * 1000
    return Math.round((a.getTime() - b.getTime()) / msPerDay)
  }

  const _diffInHours = (a: Date, b: Date) => {
    const msPerHour = 60 * 60 * 1000
    return Math.round((a.getTime() - b.getTime()) / msPerHour)
  }

  const diffInMinutes = (a: Date, b: Date) => {
    const msPerMinute = 60 * 1000
    return Math.round((a.getTime() - b.getTime()) / msPerMinute)
  }

  const getXForPointerEvent = (event: PointerEvent) => {
    const el = gantt.ref.value
    if (!el) {
      return null
    }
    const rect = el.getBoundingClientRect()
    const x = event.clientX - rect.left + el.scrollLeft - gantt.sidebarWidth
    return x
  }

  const getDateByX = (x: number) => {
    const timelineStartDate = gantt.timelineStartDate
    const columnWidthPx = (gantt.columnWidth * gantt.zoom) / 100

    if (gantt.range === 'hourly') {
      const rawMinutes = (x / columnWidthPx) * 60
      const snappedMinutes = Math.round(rawMinutes / gantt.tickMinutes) * gantt.tickMinutes
      const clampedMinutes = Math.max(0, Math.min(24 * 60, snappedMinutes))
      const d = addMinutes(timelineStartDate, clampedMinutes)
      d.setSeconds(0, 0)
      return d
    }

    if (gantt.range === 'daily') {
      const offsetDays = Math.floor(x / columnWidthPx)
      return addDays(timelineStartDate, offsetDays)
    }

    const offsetMonths = Math.floor(x / columnWidthPx)
    const month = new Date(timelineStartDate)
    month.setMonth(month.getMonth() + offsetMonths)

    const daysInMonth = getDaysInMonth(month)
    const pixelsPerDay = Math.max(1, Math.round(columnWidthPx / daysInMonth))
    const dayOffset = Math.floor((x % columnWidthPx) / pixelsPerDay)

    return addDays(month, dayOffset)
  }

  const getTimelineStartDate = () => {
    return gantt.timelineStartDate
  }

  const getTimelineEndDate = () => {
    if (gantt.range === 'hourly') {
      return addHours(gantt.timelineStartDate, 24)
    }
    const endYear = gantt.timelineData.at(-1)?.year ?? new Date().getFullYear()
    return new Date(endYear, 11, 31)
  }

  const stopActiveDrag = () => {
    cleanupDragListeners?.()
    cleanupDragListeners = null
    activeDrag = null
  }

  onUnmounted(() => {
    stopActiveDrag()
  })

  const startDrag = (mode: DragMode, event: PointerEvent) => {
    if (!canInteract.value) {
      return
    }
    const x = getXForPointerEvent(event)
    if (x === null) {
      return
    }

    const isResize = mode === 'resize-left' || mode === 'resize-right'
    if (isResize) {
      event.preventDefault()
      event.stopPropagation()
    }

    const originDate = getDateByX(x)
    activeDrag = {
      mode,
      originX: x,
      originDate,
      originStartAt: localStartAt.value,
      originEndAt: localEndAt.value,
      activated: isResize,
    }

    const activationDistancePx = 8
    let suppressClick = false
    const stopClickOnce = (e: MouseEvent) => {
      if (!suppressClick) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      window.removeEventListener('click', stopClickOnce, true)
      suppressClick = false
    }
    const applyGlobalDragStyles = (cursor: string) => {
      document.documentElement.style.cursor = cursor
      document.documentElement.style.userSelect = 'none'
    }
    const clearGlobalDragStyles = () => {
      document.documentElement.style.cursor = ''
      document.documentElement.style.userSelect = ''
    }

    const onMove = (e: PointerEvent) => {
      if (!activeDrag) {
        return
      }
      const nextX = getXForPointerEvent(e)
      if (nextX === null) {
        return
      }

      if (!activeDrag.activated) {
        const deltaPx = Math.abs(nextX - activeDrag.originX)
        if (deltaPx < activationDistancePx) {
          return
        }
        activeDrag.activated = true
        applyGlobalDragStyles(activeDrag.mode === 'move' ? 'grabbing' : 'col-resize')
        suppressClick = true
        window.addEventListener('click', stopClickOnce, true)
      }

      const nextDate = getDateByX(nextX)
      if (activeDrag.mode === 'move') {
        if (gantt.range === 'hourly') {
          const deltaMinutes = diffInMinutes(nextDate, activeDrag.originDate)
          const tentativeStart = addMinutes(activeDrag.originStartAt, deltaMinutes)
          const tentativeEnd = activeDrag.originEndAt ? addMinutes(activeDrag.originEndAt, deltaMinutes) : null
          const min = getTimelineStartDate()
          const max = getTimelineEndDate()

          const durationMinutes = tentativeEnd ? diffInMinutes(tentativeEnd, tentativeStart) : 0
          let clampedStart = clampDate(tentativeStart, min, max)
          let clampedEnd = tentativeEnd ? addMinutes(clampedStart, durationMinutes) : null

          if (clampedEnd && clampedEnd.getTime() > max.getTime()) {
            clampedEnd = max
            clampedStart = addMinutes(clampedEnd, -durationMinutes)
            clampedStart = clampDate(clampedStart, min, max)
          }

          localStartAt.value = clampedStart
          localEndAt.value = clampedEnd
        } else {
          const deltaDays = diffInDays(nextDate, activeDrag.originDate)
          localStartAt.value = addDays(activeDrag.originStartAt, deltaDays)
          localEndAt.value = activeDrag.originEndAt ? addDays(activeDrag.originEndAt, deltaDays) : null
        }
        return
      }

      if (activeDrag.mode === 'resize-left') {
        const currentEnd = localEndAt.value
        const min = getTimelineStartDate()
        const max = currentEnd ?? getTimelineEndDate()
        localStartAt.value = clampDate(nextDate, min, max)
        return
      }

      // resize-right
      const currentStart = localStartAt.value
      localEndAt.value = clampDate(nextDate, currentStart, getTimelineEndDate())
    }

    const onUp = (_e: PointerEvent) => {
      if (activeDrag?.activated) {
        const action = activeDrag.mode as GanttScheduleItemChangeAction
        props.onMove?.(props.feature.id, localStartAt.value, localEndAt.value)
        emit('schedule-item-change', {
          action,
          feature: props.feature,
          startAt: localStartAt.value,
          endAt: localEndAt.value,
        } satisfies GanttScheduleItemChange)
      }
      clearGlobalDragStyles()
      stopActiveDrag()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })

    cleanupDragListeners = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      clearGlobalDragStyles()
      window.removeEventListener('click', stopClickOnce, true)
      suppressClick = false
    }
  }

  const handleResizeLeftPointerDown = (event: PointerEvent) => {
    startDrag('resize-left', event)
  }

  const handleMovePointerDown = (event: PointerEvent) => {
    if (!canInteract.value) {
      return
    }
    startDrag('move', event)
  }

  const handleResizeRightPointerDown = (event: PointerEvent) => {
    startDrag('resize-right', event)
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getOffset = (date: Date) => {
    const timelineStartDate = getTimelineStartDate()
    const parsedColumnWidth = (gantt.columnWidth * gantt.zoom) / 100

    if (gantt.range === 'hourly') {
      const rawMinutes = getRawMinutesFromTimelineStart(date)
      const clampedMinutes = clampMinutesToDayWindow(rawMinutes)
      return parsedColumnWidth * (clampedMinutes / 60)
    }

    if (gantt.range === 'daily') {
      const daysDiff = Math.floor((date.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60 * 24))
      return parsedColumnWidth * daysDiff
    }

    const partialColumns = date.getDate()
    const daysInMonth = getDaysInMonth(date)
    const pixelsPerDay = parsedColumnWidth / daysInMonth

    const monthsDiff = (date.getFullYear() - timelineStartDate.getFullYear()) * 12 + date.getMonth()
    return monthsDiff * parsedColumnWidth + partialColumns * pixelsPerDay
  }

  const getWidth = () => {
    const parsedColumnWidth = (gantt.columnWidth * gantt.zoom) / 100
    const startAt = localStartAt.value
    const endAt = localEndAt.value

    if (!endAt) {
      return parsedColumnWidth * 2
    }

    if (gantt.range === 'hourly') {
      const startMinutesRaw = getRawMinutesFromTimelineStart(startAt)
      const endMinutesRaw = getRawMinutesFromTimelineStart(endAt)
      const startMinutes = clampMinutesToDayWindow(startMinutesRaw)
      const endMinutes = clampMinutesToDayWindow(endMinutesRaw)
      const startPx = parsedColumnWidth * (startMinutes / 60)
      const endPx = parsedColumnWidth * (endMinutes / 60)
      const widthPx = endPx - startPx
      return Math.max(1, widthPx)
    }

    if (gantt.range === 'daily') {
      const startPx = getOffset(startAt)
      const endPx = getOffset(addDays(endAt, 1))
      const widthPx = endPx - startPx

      return Math.max(1, widthPx)
    }

    const startPx = getOffset(startAt)
    const endPx = getOffset(addDays(endAt, 1))
    const widthPx = endPx - startPx

    return Math.max(1, widthPx)
  }

  const width = computed(() => getWidth())
  const offset = computed(() => getOffset(localStartAt.value))

  const isVisible = computed(() => {
    if (gantt.range !== 'hourly') {
      return true
    }
    const startMinutes = getRawMinutesFromTimelineStart(localStartAt.value)
    const endMinutes = localEndAt.value
      ? getRawMinutesFromTimelineStart(localEndAt.value)
      : startMinutes + gantt.tickMinutes
    return endMinutes > 0 && startMinutes < 24 * 60
  })
</script>

<template>
  <div
    :class="cn('relative flex w-max min-w-full py-0.5', props.className)"
    :style="{ height: 'var(--gantt-row-height)' }">
    <div
      v-if="isVisible"
      class="pointer-events-auto absolute top-0.5 group"
      :style="{
        height: 'calc(var(--gantt-row-height) - 4px)',
        width: Math.round(width) + 'px',
        left: Math.round(offset) + 'px',
      }">
      <div
        v-if="canInteract"
        data-gantt-resize="left"
        class="absolute -left-2 top-1/2 z-3 h-full w-4 -translate-y-1/2 cursor-col-resize rounded-md outline-none opacity-0 pointer-events-auto transition-opacity group-hover:opacity-100 hover:opacity-100"
        @click.stop.prevent
        @pointerdown.stop="handleResizeLeftPointerDown" />

      <div
        class="h-full w-full"
        :class="canInteract ? 'cursor-grab active:cursor-grabbing' : ''"
        @pointerdown="handleMovePointerDown">
        <Card class="h-full w-full rounded-md bg-background p-2 text-xs shadow-sm">
          <div class="flex h-full w-full items-center justify-between gap-2 text-left">
            <p class="sticky z-2 flex-1 truncate text-xs" :style="{ left: 'calc(var(--gantt-sidebar-width) + 12px)' }">
              {{ feature.name }}
            </p>
          </div>
        </Card>
      </div>

      <div
        v-if="canInteract"
        data-gantt-resize="right"
        class="absolute -right-2 top-1/2 z-3 h-full w-4 -translate-y-1/2 cursor-col-resize rounded-md outline-none opacity-0 pointer-events-auto transition-opacity group-hover:opacity-100 hover:opacity-100"
        @click.stop.prevent
        @pointerdown.stop="handleResizeRightPointerDown" />
    </div>
  </div>
</template>
