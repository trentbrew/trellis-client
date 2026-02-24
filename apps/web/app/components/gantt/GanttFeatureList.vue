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
    :class="cn('absolute top-0 left-0 h-full w-max space-y-4', props.className)"
    :style="{ marginTop: 'var(--gantt-header-height)' }">
    <slot />
  </div>
</template>
