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
  <div :class="cn('relative', props.className)" :style="{ height: 'var(--gantt-row-height)' }">
    <slot />
  </div>
</template>
