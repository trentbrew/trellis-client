<script setup lang="ts">
  import { Handle, Position } from '@vue-flow/core'
  import { computed } from 'vue'

  const props = defineProps<{
    data: {
      label: string
    }
  }>()

  // Use green for success nodes, red for error nodes, purple for others
  const nodeColor = computed(() => {
    const label = props.data.label.toLowerCase()
    if (label.includes('success')) return '#22c55e'
    if (label.includes('error')) return '#ef4444'
    return 'var(--chart-4)'
  })
</script>

<template>
  <div
    class="rounded-lg border-2 px-4 py-3 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer"
    :style="{ borderColor: nodeColor, backgroundColor: `color-mix(in srgb, ${nodeColor} 10%, transparent)` }"
  >
    <Handle type="target" :position="Position.Left" :style="{ backgroundColor: nodeColor }" />
    <div class="flex items-center gap-2">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-full text-white"
        :style="{ backgroundColor: nodeColor }"
      >
        <Icon name="lucide:flag" class="h-4 w-4" />
      </div>
      <div>
        <p class="text-xs font-medium" :style="{ color: nodeColor }">Output</p>
        <p class="text-sm font-semibold text-foreground">{{ data.label }}</p>
      </div>
    </div>
  </div>
</template>
