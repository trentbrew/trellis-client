<script setup lang="ts">
  import { cn } from '@/lib/utils'

  interface Props {
    name: string
    className?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    className: '',
  })
</script>

<template>
  <div :class="props.className">
    <p
      :style="{ height: 'var(--gantt-row-height)' }"
      class="w-full truncate p-2.5 text-left font-medium text-muted-foreground text-xs">
      {{ name }}
    </p>
    <div class="divide-y divide-border/50">
      <slot />
    </div>
  </div>
</template>
