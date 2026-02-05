<script setup lang="ts">
  import { cn } from '@/lib/utils'
  import { inject } from 'vue'
  import type { GanttFeature } from './ganttContext'
  import { GanttContextKey } from './ganttContext'

  interface Props {
    feature: GanttFeature
    onSelectItem?: (id: string) => void
    className?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    className: '',
  })

  const gantt = inject(GanttContextKey, null)

  const handleClick = () => {
    props.onSelectItem?.(props.feature.id)
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      props.onSelectItem?.(props.feature.id)
    }
  }

  const getDuration = () => {
    const start = props.feature.startAt
    const end = props.feature.endAt || new Date()
    const diffTime = Math.abs(end.getTime() - start.getTime())
    if (gantt?.range === 'hourly') {
      const diffHours = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60)))
      return `${diffHours} hrs`
    }
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    return `${diffDays} days`
  }
</script>

<template>
  <div
    role="button"
    tabindex="0"
    :class="cn('relative flex items-center gap-2.5 p-2.5 text-xs', props.className)"
    :style="{ height: 'var(--gantt-row-height)' }"
    @click="handleClick"
    @keydown="handleKeydown">
    <div class="pointer-events-none h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: feature.status.color }" />
    <p class="pointer-events-none flex-1 truncate text-left font-medium">
      {{ feature.name }}
    </p>
    <p class="pointer-events-none text-muted-foreground">{{ getDuration() }}</p>
  </div>
</template>
