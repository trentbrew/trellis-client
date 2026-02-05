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

  const label = computed(() => (gantt.range === 'hourly' ? 'Now' : 'Today'))
  const now = ref(new Date())

  let timer: number | null = null
  onMounted(() => {
    timer = window.setInterval(() => {
      now.value = new Date()
    }, 15_000)
  })

  onUnmounted(() => {
    if (timer !== null) {
      window.clearInterval(timer)
    }
  })

  const getOffset = (date: Date) => {
    const timelineStartDate = gantt.timelineStartDate

    if (gantt.range === 'hourly') {
      const hoursDiff = (date.getTime() - timelineStartDate.getTime()) / (1000 * 60 * 60)
      return hoursDiff
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
</script>

<template>
  <div
    class="pointer-events-none absolute top-0 left-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible"
    :style="{
      width: '0',
      transform: `translateX(calc(var(--gantt-column-width) * ${getOffset(now)}))`,
    }">
    <div
      :class="
        cn(
          'group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-red-600 px-2 py-1 text-white text-xs',
          props.className,
        )
      ">
      {{ label }}
      <span class="max-h-[0] overflow-hidden opacity-80 transition-all group-hover:max-h-[2rem]">
        {{ formatDate(now) }}
      </span>
    </div>
    <div :class="cn('h-full w-px bg-red-600', props.className)" />
  </div>
</template>
