<script setup lang="ts">
  import { Handle, Position } from '@vue-flow/core'

  const props = defineProps<{
    data: {
      label: string
      kind: string
    }
  }>()

  const nodeColor = computed(() => {
    const label = (props.data.label || '').toLowerCase()
    if (label.includes('success') || label.includes('done')) return '#22c55e'
    if (label.includes('error') || label.includes('fail')) return '#ef4444'
    return 'var(--muted-foreground)'
  })
</script>

<template>
  <div
    class="flow-node flow-node--end rounded-lg border-2 px-4 py-3 shadow-md transition-all duration-200 hover:shadow-lg"
    :style="{ borderColor: nodeColor, backgroundColor: `color-mix(in srgb, ${nodeColor} 8%, transparent)` }"
  >
    <Handle type="target" :position="Position.Left" :style="{ backgroundColor: nodeColor }" />
    <div class="flex items-center gap-2.5">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-full text-white"
        :style="{ backgroundColor: nodeColor }"
      >
        <Icon name="lucide:flag" class="h-4 w-4" />
      </div>
      <div class="min-w-0">
        <p class="text-[10px] font-semibold uppercase tracking-wider" :style="{ color: nodeColor }">End</p>
        <p class="truncate text-sm font-medium text-foreground">{{ data.label }}</p>
      </div>
    </div>
  </div>
</template>
