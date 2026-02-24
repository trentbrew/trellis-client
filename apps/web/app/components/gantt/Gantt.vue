<script setup lang="ts">
  import { ref, computed, provide /*, inject */, onMounted, onUnmounted, watch, type Ref, type InjectionKey } from 'vue'
  // import { Card } from './Card.vue'
  // import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ContextMenu.vue'
  import { cn } from '@/lib/utils'
  // import { DndContext, MouseSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core'
  // import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
  import {
    /*
    formatDate,
    formatDistance,
    isSameDay,
    // format,
    addDays,
    addMonths,
    differenceInDays,
    differenceInHours,
    differenceInMonths,
    endOfDay,
    endOfMonth,
    */
    getDaysInMonth,
    /*
    startOfDay,
    startOfMonth,
    */
    // getDate,
  } from 'date-fns'
  // import { PlusIcon, TrashIcon } from 'lucide-vue-next'
  import throttle from 'lodash.throttle'

  type Range = 'daily' | 'monthly' | 'quarterly'

  export type GanttStatus = {
    id: string
    name: string
    color: string
  }

  export type GanttFeature = {
    id: string
    name: string
    startAt: Date
    endAt: Date
    status: GanttStatus
  }

  export type GanttMarkerProps = {
    id: string
    date: Date
    label: string
  }

  export type TimelineData = {
    year: number
    quarters: {
      months: {
        days: number
      }[]
    }[]
  }[]

  export type GanttContextProps = {
    zoom: number
    range: Range
    columnWidth: number
    sidebarWidth: number
    headerHeight: number
    rowHeight: number
    onAddItem: ((date: Date) => void) | undefined
    placeholderLength: number
    timelineData: TimelineData
    ref: Ref<HTMLDivElement | null>
  }

  const GanttContextKey: InjectionKey<GanttContextProps> = Symbol('GanttContext')

  /*
  const getsDaysIn = (range: Range) => {
    let fn = (_date: Date) => 1
    if (range === 'monthly' || range === 'quarterly') {
      fn = getDaysInMonth
    }
    return fn
  }

  const getDifferenceIn = (range: Range) => {
    let fn = differenceInDays
    if (range === 'monthly' || range === 'quarterly') {
      fn = differenceInMonths
    }
    return fn
  }

  const getInnerDifferenceIn = (range: Range) => {
    let fn = differenceInHours
    if (range === 'monthly' || range === 'quarterly') {
      fn = differenceInDays
    }
    return fn
  }

  const getStartOf = (range: Range) => {
    let fn = startOfDay
    if (range === 'monthly' || range === 'quarterly') {
      fn = startOfMonth
    }
    return fn
  }

  const getEndOf = (range: Range) => {
    let fn = endOfDay
    if (range === 'monthly' || range === 'quarterly') {
      fn = endOfMonth
    }
    return fn
  }

  const getAddRange = (range: Range) => {
    let fn = addDays
    if (range === 'monthly' || range === 'quarterly') {
      fn = addMonths
    }
    return fn
  }
  */

  /*
  const getDateByMousePosition = (context: GanttContextProps, mouseX: number) => {
    const timelineStartDate = new Date(context.timelineData[0].year, 0, 1)
    const columnWidth = (context.columnWidth * context.zoom) / 100
    const offset = Math.floor(mouseX / columnWidth)
    const daysIn = getsDaysIn(context.range)
    const addRange = getAddRange(context.range)
    const month = addRange(timelineStartDate, offset)
    const daysInMonth = daysIn(month)
    const pixelsPerDay = Math.round(columnWidth / daysInMonth)
    const dayOffset = Math.floor((mouseX % columnWidth) / pixelsPerDay)
    const actualDate = addDays(month, dayOffset)
    return actualDate
  }
  */

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

  /*
  const getOffset = (date: Date, timelineStartDate: Date, context: GanttContextProps) => {
    const parsedColumnWidth = (context.columnWidth * context.zoom) / 100
    const differenceIn = getDifferenceIn(context.range)
    const startOf = getStartOf(context.range)
    const fullColumns = differenceIn(startOf(date), timelineStartDate)

    if (context.range === 'daily') {
      return parsedColumnWidth * fullColumns
    }

    const partialColumns = date.getDate()
    const daysInMonth = getDaysInMonth(date)
    const pixelsPerDay = parsedColumnWidth / daysInMonth

    return fullColumns * parsedColumnWidth + partialColumns * pixelsPerDay
  }
  */

  /*
  const getWidth = (startAt: Date, endAt: Date | null, context: GanttContextProps) => {
    const parsedColumnWidth = (context.columnWidth * context.zoom) / 100

    if (!endAt) {
      return parsedColumnWidth * 2
    }

    const differenceIn = getDifferenceIn(context.range)

    if (context.range === 'daily') {
      const delta = differenceIn(endAt, startAt)
      return parsedColumnWidth * (delta ? delta : 1)
    }

    const daysInStartMonth = getDaysInMonth(startAt)
    const pixelsPerDayInStartMonth = parsedColumnWidth / daysInStartMonth

    if (isSameDay(startAt, endAt)) {
      return pixelsPerDayInStartMonth
    }

    const innerDifferenceIn = getInnerDifferenceIn(context.range)
    const startOf = getStartOf(context.range)

    if (isSameDay(startOf(startAt), startOf(endAt))) {
      return innerDifferenceIn(endAt, startAt) * pixelsPerDayInStartMonth
    }

    const startRangeOffset = daysInStartMonth - getDate(startAt)
    const endRangeOffset = getDate(endAt)
    const fullRangeOffset = differenceIn(startOf(endAt), startOf(startAt))
    const daysInEndMonth = getDaysInMonth(endAt)
    const pixelsPerDayInEndMonth = parsedColumnWidth / daysInEndMonth

    return (
      (fullRangeOffset - 1) * parsedColumnWidth +
      startRangeOffset * pixelsPerDayInStartMonth +
      endRangeOffset * pixelsPerDayInEndMonth
    )
  }
  */

  /*
  const calculateInnerOffset = (date: Date, range: Range, columnWidth: number) => {
    const startOf = getStartOf(range)
    const endOf = getEndOf(range)
    const differenceIn = getInnerDifferenceIn(range)
    const startOfRange = startOf(date)
    const endOfRange = endOf(date)
    const totalRangeDays = differenceIn(endOfRange, startOfRange)
    const dayOfMonth = date.getDate()

    return (dayOfMonth / totalRangeDays) * columnWidth
  }
  */

  interface Props {
    className?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    className: '',
  })

  const scrollRef = ref<HTMLDivElement | null>(null)
  const timelineData = ref<TimelineData>(createInitialTimelineData(new Date()))
  const scrollX = ref(0)
  // const dragging = ref(false)

  const sidebarWidth = computed(() => 300)

  const headerHeight = 60
  const rowHeight = 36
  let columnWidth = 50

  if (props.range === 'monthly') {
    columnWidth = 150
  } else if (props.range === 'quarterly') {
    columnWidth = 100
  }

  /*
  const cssVariables = computed(() => ({
    '--gantt-zoom': `${props.zoom}`,
    '--gantt-column-width': `${(props.zoom / 100) * columnWidth}px`,
    '--gantt-header-height': `${headerHeight}px`,
    '--gantt-row-height': `${rowHeight}px`,
    '--gantt-sidebar-width': `${sidebarWidth.value}px`,
  }))
  */

  const context: GanttContextProps = {
    zoom: props.zoom,
    range: props.range,
    columnWidth,
    sidebarWidth: sidebarWidth.value,
    headerHeight,
    rowHeight,
    onAddItem: props.onAddItem,
    timelineData: timelineData.value,
    placeholderLength: 2,
    ref: scrollRef,
  }

  provide(GanttContextKey, context)

  const handleScroll = throttle(() => {
    if (!scrollRef.value) {
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
    }
  })

  onUnmounted(() => {
    if (scrollRef.value) {
      scrollRef.value.removeEventListener('scroll', handleScroll)
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
  <div :class="cn('relative h-full w-full', props.className)">
    <slot />
  </div>
</template>
