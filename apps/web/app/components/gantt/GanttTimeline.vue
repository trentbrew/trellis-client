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
  <div :class="cn('relative flex flex-col h-full w-max flex-none', props.className)">
    <slot />
  </div>
</template>
