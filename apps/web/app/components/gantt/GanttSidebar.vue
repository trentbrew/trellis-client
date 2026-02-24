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
    :class="cn('sticky left-0 z-30 h-max min-h-full border-border border-r bg-background', props.className)">
    <div
      class="sticky top-0 z-10 flex shrink-0 items-end justify-between border-border/50 border-b font-medium text-muted-foreground text-xs bg-background"
      :style="{ height: 'var(--gantt-header-height)' }">
      <slot name="header">
        <p class="flex-1 truncate text-left">Channels</p>
      </slot>
    </div>
    <div class="space-y-4">
      <slot />
    </div>
  </div>
</template>
