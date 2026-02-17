<script setup lang="ts">
  import { cn } from '@/lib/utils'
  import { useThrottleFn } from '@vueuse/core'
  import GanttToolbar from './GanttToolbar.vue'
  import {
    GanttContextKey,
    type Range,
    type GanttContextProps,
    type TimelineData,
    type GanttMode,
  } from './ganttContext'

  export type { GanttStatus, GanttFeature, GanttMarkerProps, GanttMode, GanttScheduleItemChange } from './ganttContext'

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const createInitialTimelineData = (today: Date): TimelineData => {
    const data: TimelineData = []
    data.push(
      { year: today.getFullYear() - 1, quarters: new Array(4).fill(null) },
      { year: today.getFullYear(), quarters: new Array(4).fill(null) },
      { year: today.getFullYear() + 1, quarters: new Array(4).fill(null) },
    )
    for (const yearObj of data) {
      yearObj.quarters = new Array(4).fill(null).map((_, quarterIndex) => ({
        months: new Array(3).fill(null).map((_, monthIndex) => {
          const month = quarterIndex * 3 + monthIndex
          return {
            days: getDaysInMonth(new Date(yearObj.year, month, 1)),
          }
        }),
      }))
    }
    return data
  }

  interface Props {
    range?: Range
    zoom?: number
    mode?: GanttMode
    onAddItem?: (date: Date) => void
    className?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    range: 'monthly',
    zoom: 100,
    mode: 'edit',
    onAddItem: undefined,
    className: '',
  })

  const emit = defineEmits<{
    (e: 'update:zoom', zoom: number): void
    (e: 'update:mode', mode: GanttMode): void
  }>()

  const scrollRef = ref<HTMLDivElement | null>(null)
  const timelineData = ref<TimelineData>(createInitialTimelineData(new Date()))
  const scrollX = ref(0)

  const zoom = ref(props.zoom)
  const mode = ref<GanttMode>(props.mode)

  const sidebarWidth = computed(() => 300)

  const tickMinutes = computed(() => {
    if (props.range !== 'hourly') {
      return 60
    }

    const z = zoom.value
    if (z < 140) {
      return 60
    }
    if (z < 200) {
      return 30
    }
    if (z < 280) {
      return 10
    }
    return 5
  })

  const headerHeight = 60
  const rowHeight = 56
  let columnWidth = 50

  if (props.range === 'hourly') {
    columnWidth = 60
  } else if (props.range === 'monthly') {
    columnWidth = 150
  } else if (props.range === 'quarterly') {
    columnWidth = 100
  }

  const cssVariables = computed(() => ({
    '--gantt-zoom': `${zoom.value}`,
    '--gantt-column-width': `${(zoom.value / 100) * columnWidth}px`,
    '--gantt-header-height': `${headerHeight}px`,
    '--gantt-row-height': `${rowHeight}px`,
    '--gantt-sidebar-width': `${sidebarWidth.value}px`,
  }))

  const startOfDay = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  const timelineStartDate = ref<Date>(props.range === 'hourly' ? startOfDay(new Date()) : new Date())

  const getTimelineStartDate = () => {
    if (props.range === 'hourly') {
      return timelineStartDate.value
    }
    const startYear = timelineData.value[0]?.year ?? new Date().getFullYear()
    return new Date(startYear, 0, 1)
  }

  const getColumnWidthPx = () => {
    return (columnWidth * zoom.value) / 100
  }

  const ensureTimelineIncludesYear = (year: number) => {
    if (props.range === 'hourly') {
      return
    }
    while ((timelineData.value[0]?.year ?? year) > year) {
      const firstYear = timelineData.value[0]!.year
      const nextYear = firstYear - 1
      const newTimelineData: TimelineData = [...timelineData.value]
      newTimelineData.unshift({
        year: nextYear,
        quarters: new Array(4).fill(null).map((_, quarterIndex) => ({
          months: new Array(3).fill(null).map((_, monthIndex) => {
            const month = quarterIndex * 3 + monthIndex
            return {
              days: getDaysInMonth(new Date(nextYear, month, 1)),
            }
          }),
        })),
      })
      timelineData.value = newTimelineData
    }

    while ((timelineData.value.at(-1)?.year ?? year) < year) {
      const lastYear = timelineData.value.at(-1)!.year
      const nextYear = lastYear + 1
      const newTimelineData: TimelineData = [...timelineData.value]
      newTimelineData.push({
        year: nextYear,
        quarters: new Array(4).fill(null).map((_, quarterIndex) => ({
          months: new Array(3).fill(null).map((_, monthIndex) => {
            const month = quarterIndex * 3 + monthIndex
            return {
              days: getDaysInMonth(new Date(nextYear, month, 1)),
            }
          }),
        })),
      })
      timelineData.value = newTimelineData
    }
  }

  const scrollToDate = (date: Date, options?: { behavior?: ScrollBehavior }) => {
    if (!scrollRef.value) {
      return
    }

    if (props.range === 'hourly') {
      timelineStartDate.value = startOfDay(date)
      context.timelineStartDate = timelineStartDate.value
    }

    ensureTimelineIncludesYear(date.getFullYear())

    const timelineStart = getTimelineStartDate()
    const colWidth = getColumnWidthPx()
    const offsetColumns =
      props.range === 'hourly'
        ? (date.getTime() - timelineStart.getTime()) / (1000 * 60 * 60)
        : props.range === 'daily'
          ? Math.floor((date.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24))
          : (date.getFullYear() - timelineStart.getFullYear()) * 12 + (date.getMonth() - timelineStart.getMonth())

    const targetX = sidebarWidth.value + offsetColumns * colWidth
    const nextLeft = Math.max(0, targetX - scrollRef.value.clientWidth / 2)

    scrollRef.value.scrollTo({ left: nextLeft, behavior: options?.behavior ?? 'auto' })
    scrollX.value = nextLeft
  }

  const scrollToToday = () => {
    scrollToDate(new Date())
  }

  const getDateAtClientX = (clientX: number) => {
    if (!scrollRef.value) {
      return new Date()
    }

    const rect = scrollRef.value.getBoundingClientRect()
    const xInViewport = clientX - rect.left
    const timelineStart = getTimelineStartDate()
    const colWidth = getColumnWidthPx()
    const rawColumns = (scrollRef.value.scrollLeft + xInViewport - sidebarWidth.value) / colWidth
    const columns = Math.max(0, rawColumns)

    const date = new Date(timelineStart)
    if (props.range === 'hourly') {
      date.setTime(date.getTime() + columns * 60 * 60 * 1000)
    } else if (props.range === 'daily') {
      date.setDate(date.getDate() + Math.floor(columns))
    } else {
      date.setMonth(date.getMonth() + Math.floor(columns))
    }
    return date
  }

  const scrollToDateAtClientX = (date: Date, clientX: number) => {
    if (!scrollRef.value) {
      return
    }

    ensureTimelineIncludesYear(date.getFullYear())

    const rect = scrollRef.value.getBoundingClientRect()
    const xInViewport = clientX - rect.left
    const timelineStart = getTimelineStartDate()
    const colWidth = getColumnWidthPx()
    const offsetColumns =
      props.range === 'hourly'
        ? (date.getTime() - timelineStart.getTime()) / (1000 * 60 * 60)
        : props.range === 'daily'
          ? Math.floor((date.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24))
          : (date.getFullYear() - timelineStart.getFullYear()) * 12 + (date.getMonth() - timelineStart.getMonth())

    const targetX = sidebarWidth.value + offsetColumns * colWidth
    scrollRef.value.scrollLeft = Math.max(0, targetX - xInViewport)
    scrollX.value = scrollRef.value.scrollLeft
  }

  const setZoomAtClientX = (nextZoom: number, clientX: number) => {
    const clamped = Math.max(100, Math.min(5000, Math.round(nextZoom)))
    if (clamped === zoom.value) {
      return
    }

    const focalDate = getDateAtClientX(clientX)
    zoom.value = clamped
    emit('update:zoom', clamped)

    queueMicrotask(() => {
      scrollToDateAtClientX(focalDate, clientX)
    })
  }

  const setZoom = (nextZoom: number) => {
    const clamped = Math.max(100, Math.min(5000, Math.round(nextZoom)))
    if (clamped === zoom.value) {
      return
    }

    // preserve the date roughly under the center of the viewport
    let centerDate = new Date()
    if (scrollRef.value) {
      const timelineStartDate = getTimelineStartDate()
      const colWidth = getColumnWidthPx()
      const centerX = scrollRef.value.scrollLeft + scrollRef.value.clientWidth / 2 - sidebarWidth.value
      const centerColumns = Math.max(0, centerX / colWidth)
      if (props.range === 'hourly') {
        centerDate = new Date(timelineStartDate)
        centerDate.setTime(centerDate.getTime() + centerColumns * 60 * 60 * 1000)
      } else if (props.range === 'daily') {
        centerDate = new Date(timelineStartDate)
        centerDate.setDate(centerDate.getDate() + Math.floor(centerColumns))
      } else {
        centerDate = new Date(timelineStartDate)
        centerDate.setMonth(centerDate.getMonth() + Math.floor(centerColumns))
      }
    }

    zoom.value = clamped
    emit('update:zoom', clamped)

    queueMicrotask(() => {
      scrollToDate(centerDate)
    })
  }

  const setMode = (nextMode: GanttMode) => {
    mode.value = nextMode
    emit('update:mode', nextMode)
  }

  const context = shallowReactive<GanttContextProps>({
    mode: mode.value,
    zoom: zoom.value,
    range: props.range,
    tickMinutes: tickMinutes.value,
    columnWidth,
    sidebarWidth: sidebarWidth.value,
    headerHeight,
    rowHeight,
    timelineStartDate: getTimelineStartDate(),
    onAddItem: props.onAddItem,
    setZoom,
    setMode,
    scrollToDate,
    scrollToToday,
    timelineData: timelineData.value,
    placeholderLength: 2,
    ref: scrollRef,
  })

  provide(GanttContextKey, context)

  watch(timelineData, (val) => {
    context.timelineData = val
    if (props.range !== 'hourly') {
      context.timelineStartDate = getTimelineStartDate()
    }
  })

  watch(zoom, (val) => {
    context.zoom = val
  })

  watch(tickMinutes, (val) => {
    context.tickMinutes = val
  })

  watch(mode, (val) => {
    context.mode = val
  })

  watch(
    () => props.zoom,
    (val) => {
      zoom.value = val
    },
  )

  watch(
    () => props.mode,
    (val) => {
      mode.value = val
    },
  )

  const handleScroll = useThrottleFn(() => {
    if (!scrollRef.value) {
      return
    }

    if (props.range === 'hourly') {
      return
    }

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.value
    scrollX.value = scrollLeft

    if (scrollLeft === 0) {
      const firstYear = timelineData.value[0]?.year
      if (!firstYear) {
        return
      }

      const newTimelineData: TimelineData = [...timelineData.value]
      newTimelineData.unshift({
        year: firstYear - 1,
        quarters: new Array(4).fill(null).map((_, quarterIndex) => ({
          months: new Array(3).fill(null).map((_, monthIndex) => {
            const month = quarterIndex * 3 + monthIndex
            return {
              days: getDaysInMonth(new Date(firstYear, month, 1)),
            }
          }),
        })),
      })

      timelineData.value = newTimelineData

      if (scrollRef.value) {
        scrollRef.value.scrollLeft = scrollRef.value.clientWidth
        scrollX.value = scrollRef.value.scrollLeft
      }
    } else if (scrollLeft + clientWidth >= scrollWidth) {
      const lastYear = timelineData.value.at(-1)?.year
      if (!lastYear) {
        return
      }

      const newTimelineData: TimelineData = [...timelineData.value]
      newTimelineData.push({
        year: lastYear + 1,
        quarters: new Array(4).fill(null).map((_, quarterIndex) => ({
          months: new Array(3).fill(null).map((_, monthIndex) => {
            const month = quarterIndex * 3 + monthIndex
            return {
              days: getDaysInMonth(new Date(lastYear, month, 1)),
            }
          }),
        })),
      })

      timelineData.value = newTimelineData

      if (scrollRef.value) {
        scrollRef.value.scrollLeft = scrollRef.value.scrollWidth - scrollRef.value.clientWidth
        scrollX.value = scrollRef.value.scrollLeft
      }
    }
  }, 100)

  onMounted(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollLeft = scrollRef.value.scrollWidth / 2 - scrollRef.value.clientWidth / 2
      scrollX.value = scrollRef.value.scrollLeft
      scrollRef.value.addEventListener('scroll', handleScroll)

      const handleWheelZoom = (e: WheelEvent) => {
        if (!e.ctrlKey) {
          return
        }

        // Trackpad pinch zoom on macOS surfaces as wheel+ctrl.
        e.preventDefault()

        // Exponential mapping feels more natural than linear steps.
        const factor = Math.exp(-e.deltaY * 0.01)
        setZoomAtClientX(zoom.value * factor, e.clientX)
      }

      let pinchStartDistance: number | null = null
      let pinchStartZoom: number | null = null
      let pinchFocalX: number | null = null

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length !== 2) {
          return
        }

        const [t1, t2] = [e.touches.item(0), e.touches.item(1)]
        if (!t1 || !t2) {
          return
        }

        const dx = t2.clientX - t1.clientX
        const dy = t2.clientY - t1.clientY
        pinchStartDistance = Math.hypot(dx, dy)
        pinchStartZoom = zoom.value
        pinchFocalX = (t1.clientX + t2.clientX) / 2
      }

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length !== 2 || pinchStartDistance === null || pinchStartZoom === null || pinchFocalX === null) {
          return
        }

        const [t1, t2] = [e.touches.item(0), e.touches.item(1)]
        if (!t1 || !t2) {
          return
        }

        e.preventDefault()

        const dx = t2.clientX - t1.clientX
        const dy = t2.clientY - t1.clientY
        const distance = Math.hypot(dx, dy)
        if (!Number.isFinite(distance) || distance <= 0) {
          return
        }

        const ratio = distance / pinchStartDistance
        setZoomAtClientX(pinchStartZoom * ratio, pinchFocalX)
      }

      const handleTouchEnd = () => {
        pinchStartDistance = null
        pinchStartZoom = null
        pinchFocalX = null
      }

      scrollRef.value.addEventListener('wheel', handleWheelZoom, { passive: false })
      scrollRef.value.addEventListener('touchstart', handleTouchStart, { passive: true })
      scrollRef.value.addEventListener('touchmove', handleTouchMove, { passive: false })
      scrollRef.value.addEventListener('touchend', handleTouchEnd, { passive: true })
      scrollRef.value.addEventListener('touchcancel', handleTouchEnd, { passive: true })
      ;(scrollRef.value as any).__ganttCleanup = () => {
        scrollRef.value?.removeEventListener('wheel', handleWheelZoom as any)
        scrollRef.value?.removeEventListener('touchstart', handleTouchStart as any)
        scrollRef.value?.removeEventListener('touchmove', handleTouchMove as any)
        scrollRef.value?.removeEventListener('touchend', handleTouchEnd as any)
        scrollRef.value?.removeEventListener('touchcancel', handleTouchEnd as any)
      }
    }
  })

  onUnmounted(() => {
    if (scrollRef.value) {
      scrollRef.value.removeEventListener('scroll', handleScroll)
      ;(scrollRef.value as any).__ganttCleanup?.()
    }
  })

  watch(
    () => [props.range, props.zoom],
    () => {
      if (scrollRef.value) {
        scrollRef.value.scrollLeft = scrollRef.value.scrollWidth / 2 - scrollRef.value.clientWidth / 2
        scrollX.value = scrollRef.value.scrollLeft
      }
    },
  )
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <slot name="toolbar">
      <GanttToolbar />
    </slot>
    <div
      ref="scrollRef"
      :class="
        cn(
          'gantt relative grid h-full w-full max-w-full min-w-0 flex-1 select-none overflow-auto rounded-sm bg-background',
          props.range,
          props.className,
        )
      "
      :style="{
        ...cssVariables,
        gridTemplateColumns: 'var(--gantt-sidebar-width) minmax(0, 1fr)',
      }">
      <slot />
    </div>
  </div>
</template>
