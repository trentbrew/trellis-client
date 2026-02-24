<script setup lang="ts">
  import { inject, computed } from 'vue'
  import { cn } from '@/lib/utils'
  import UiButton from '@/components/Ui/Button.vue'
  import { MinusIcon, PlusIcon /*, LocateFixedIcon, ChevronLeft, ChevronRight */ } from 'lucide-vue-next'
  import { GanttContextKey } from './ganttContext'

  interface Props {
    className?: string
    zoomStep?: number
    minZoom?: number
    maxZoom?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    className: '',
    zoomStep: 25,
    minZoom: 100,
    maxZoom: 20000,
  })

  const gantt = inject(GanttContextKey)!

  const canEdit = computed(() => gantt.mode === 'edit')

  const handleZoomOut = () => {
    gantt.setZoom?.(Math.max(props.minZoom, gantt.zoom - props.zoomStep))
  }

  const handleZoomIn = () => {
    gantt.setZoom?.(Math.min(props.maxZoom, gantt.zoom + props.zoomStep))
  }

  /*
  const handleJumpToToday = () => {
    if (gantt.scrollToDate) {
      gantt.scrollToDate(new Date(), { behavior: 'smooth' })
      return
    }
    gantt.scrollToToday?.()
  }
  */
</script>

<template>
  <div
    :class="cn('flex items-center justify-between gap-2 border-b bg-card px-2 py-2 backdrop-blur-sm', props.className)">
    <div class="flex items-center gap-2">
      <span class="text-xs font-medium text-muted-foreground">Zoom</span>
      <div class="flex items-center gap-1">
        <UiButton
          data-gantt-toolbar="zoom-out"
          variant="outline"
          size="icon-sm"
          :disabled="!gantt.setZoom"
          @click="handleZoomOut">
          <MinusIcon :size="16" />
        </UiButton>
        <div
          data-gantt-toolbar="zoom-value"
          class="min-w-[48px] text-center text-xs tabular-nums text-muted-foreground">
          {{ gantt.zoom }}%
        </div>
        <UiButton
          data-gantt-toolbar="zoom-in"
          variant="outline"
          size="icon-sm"
          :disabled="!gantt.setZoom"
          @click="handleZoomIn">
          <PlusIcon :size="16" />
        </UiButton>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <div class="text-xs text-muted-foreground">
        <span v-if="canEdit">Edit mode</span>
        <span v-else>Read-only</span>
      </div>
    </div>
  </div>
</template>
