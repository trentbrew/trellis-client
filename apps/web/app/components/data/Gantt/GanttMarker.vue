<script setup lang="ts">
  import { inject, computed } from 'vue'
  import { cn } from '@/lib/utils'
  import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ContextMenu.vue'
  import { TrashIcon } from 'lucide-vue-next'
  import { GanttContextKey } from './ganttContext'

  interface Props {
    id: string
    date: Date
    label: string
    onRemove?: (id: string) => void
    className?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    className: '',
  })

  const gantt = inject(GanttContextKey)!
  const canEdit = computed(() => gantt.mode === 'edit')

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

  const handleRemove = () => {
    props.onRemove?.(props.id)
  }
</script>

<template>
  <div
    class="pointer-events-none absolute top-0 left-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible"
    :style="{
      width: '0',
      transform: `translateX(calc(var(--gantt-column-width) * ${getOffset(date)}))`,
    }">
    <ContextMenu>
      <ContextMenuTrigger as-child>
        <div
          :class="
            cn(
              'group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-card px-2 py-1 text-foreground text-xs',
              props.className,
            )
          ">
          {{ label }}
          <span class="max-h-[0] overflow-hidden opacity-80 transition-all group-hover:max-h-[2rem]">
            {{ formatDate(date) }}
          </span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          v-if="canEdit && onRemove"
          class="flex items-center gap-2 text-destructive"
          @click="handleRemove">
          <TrashIcon :size="16" />
          Remove marker
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
    <div :class="cn('h-full w-px bg-card', props.className)" />
  </div>
</template>
