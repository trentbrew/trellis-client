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
  <div :class="props.className" :style="{ paddingTop: 'var(--gantt-row-height)' }">
    <slot />
  </div>
</template>
