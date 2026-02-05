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
  <div :class="cn('relative flex h-full w-max flex-none overflow-clip', props.className)">
    <slot />
  </div>
</template>
