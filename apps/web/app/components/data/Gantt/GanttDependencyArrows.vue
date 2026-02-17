<script setup lang="ts">
  import { inject, computed, ref, onMounted, onUnmounted } from 'vue'
  import { GanttContextKey, type GanttFeature } from './ganttContext'

  interface DependencyEdge {
    fromId: string
    toId: string
  }

  interface Props {
    features: GanttFeature[]
    edges: DependencyEdge[]
  }

  const props = defineProps<Props>()
  const gantt = inject(GanttContextKey)!

  const scrollLeft = ref(0)
  const scrollTop = ref(0)

  const handleScroll = () => {
    scrollLeft.value = gantt.ref.value?.scrollLeft ?? 0
    scrollTop.value = gantt.ref.value?.scrollTop ?? 0
  }

  onMounted(() => {
    handleScroll()
    gantt.ref.value?.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    gantt.ref.value?.removeEventListener('scroll', handleScroll)
  })

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const addDays = (date: Date, days: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }

  const getOffset = (date: Date) => {
    const timelineStartDate = gantt.timelineStartDate
    const parsedColumnWidth = (gantt.columnWidth * gantt.zoom) / 100

    if (gantt.range === 'hourly') {
      const minutesDiff = (date.getTime() - timelineStartDate.getTime()) / (1000 * 60)
      return parsedColumnWidth * (minutesDiff / 60)
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

  const getEndOffset = (feature: GanttFeature) => {
    const endDate = feature.endAt ?? addDays(feature.startAt, 1)
    return getOffset(addDays(endDate, 1))
  }

  const featureIndexMap = computed(() => {
    const map = new Map<string, number>()
    props.features.forEach((f, i) => {
      map.set(f.id, i)
    })
    return map
  })

  const arrows = computed(() => {
    const result: { id: string; x1: number; y1: number; x2: number; y2: number }[] = []
    const indexMap = featureIndexMap.value

    for (const edge of props.edges) {
      const fromFeature = props.features.find((f) => f.id === edge.fromId)
      const toFeature = props.features.find((f) => f.id === edge.toId)

      if (!fromFeature || !toFeature) continue

      const fromIndex = indexMap.get(edge.fromId)
      const toIndex = indexMap.get(edge.toId)

      if (fromIndex === undefined || toIndex === undefined) continue

      const x1 = getEndOffset(fromFeature)
      const y1 = gantt.headerHeight + fromIndex * gantt.rowHeight + gantt.rowHeight / 2
      const x2 = getOffset(toFeature.startAt)
      const y2 = gantt.headerHeight + toIndex * gantt.rowHeight + gantt.rowHeight / 2

      result.push({
        id: `${edge.fromId}-${edge.toId}`,
        x1,
        y1,
        x2,
        y2,
      })
    }

    return result
  })

  const buildPath = (arrow: { x1: number; y1: number; x2: number; y2: number }) => {
    const { x1, y1, x2, y2 } = arrow
    const gap = 12
    const radius = 6

    if (x2 > x1 + gap * 2) {
      const midX = (x1 + x2) / 2
      if (y1 === y2) {
        return `M ${x1} ${y1} L ${x2} ${y2}`
      }
      const dir = y2 > y1 ? 1 : -1
      return (
        `M ${x1} ${y1}` +
        ` L ${midX - radius} ${y1}` +
        ` Q ${midX} ${y1} ${midX} ${y1 + dir * radius}` +
        ` L ${midX} ${y2 - dir * radius}` +
        ` Q ${midX} ${y2} ${midX + radius} ${y2}` +
        ` L ${x2} ${y2}`
      )
    }

    const bendX = x1 + gap
    const midY = (y1 + y2) / 2
    const dir = y2 > y1 ? 1 : -1
    return (
      `M ${x1} ${y1}` +
      ` L ${bendX - radius} ${y1}` +
      ` Q ${bendX} ${y1} ${bendX} ${y1 + dir * radius}` +
      ` L ${bendX} ${midY - dir * radius}` +
      ` Q ${bendX} ${midY} ${bendX - radius} ${midY}` +
      ` L ${x2 - gap + radius} ${midY}` +
      ` Q ${x2 - gap} ${midY} ${x2 - gap} ${midY + dir * radius}` +
      ` L ${x2 - gap} ${y2 - dir * radius}` +
      ` Q ${x2 - gap} ${y2} ${x2 - gap + radius} ${y2}` +
      ` L ${x2} ${y2}`
    )
  }
</script>

<template>
  <svg class="pointer-events-none absolute top-0 left-0 z-10 overflow-visible" style="width: 0; height: 0">
    <defs>
      <marker id="gantt-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M 0 0 L 8 3 L 0 6 Z" fill="currentColor" class="text-muted-foreground/60" />
      </marker>
    </defs>

    <g v-for="arrow in arrows" :key="arrow.id">
      <path
        :d="buildPath(arrow)"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-dasharray="4 3"
        marker-end="url(#gantt-arrow)"
        class="text-muted-foreground/40 transition-colors hover:text-muted-foreground/70" />
    </g>
  </svg>
</template>
