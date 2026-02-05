<script setup lang="ts">
  import { cn } from '@/lib/utils'

  interface Props {
    className?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    className: '',
  })
</script>

<template>
  <div
    data-roadmap-ui="gantt-sidebar"
    :class="
      cn(
        'sticky left-0 z-30 h-max min-h-full overflow-clip border-border/50 border-r bg-background/90 backdrop-blur-md',
        props.className,
      )
    ">
    <div
      class="sticky top-0 z-10 flex shrink-0 items-end justify-between gap-2.5 border-border/50 border-b bg-backdrop/90 p-2.5 font-medium text-muted-foreground text-xs backdrop-blur-sm"
      :style="{ height: 'var(--gantt-header-height)' }">
      <p class="flex-1 truncate text-left">Items</p>
      <p class="shrink-0">Duration</p>
    </div>
    <div class="space-y-4">
      <slot />
    </div>
  </div>
</template>
