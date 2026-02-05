<script setup lang="ts">
  import { Handle, Position } from '@vue-flow/core'

  defineProps<{
    data: {
      label: string
    }
  }>()
</script>

<template>
  <div
    class="rounded-lg border-2 px-4 py-3 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer"
    :style="{ borderColor: 'var(--chart-1)', backgroundColor: 'color-mix(in srgb, var(--chart-1) 10%, transparent)' }"
  >
    <Handle type="target" :position="Position.Left" :style="{ backgroundColor: 'var(--chart-1)' }" />
    <div class="flex items-center gap-2">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-full text-white"
        :style="{ backgroundColor: 'var(--chart-1)' }"
      >
        <Icon name="lucide:cpu" class="h-4 w-4" />
      </div>
      <div>
        <p class="text-xs font-medium" :style="{ color: 'var(--chart-1)' }">Process</p>
        <p class="text-sm font-semibold text-foreground">{{ data.label }}</p>
      </div>
    </div>
    <Handle type="source" :position="Position.Right" :style="{ backgroundColor: 'var(--chart-1)' }" />
  </div>
</template>
