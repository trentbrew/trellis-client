<script setup lang="ts">
  import { Handle, Position } from '@vue-flow/core'

  const props = defineProps<{
    data: {
      label: string
      kind: string
      toolName?: string
    }
  }>()

  const toolLabel = computed(() => props.data.toolName || null)
</script>

<template>
  <div
    class="flow-node flow-node--tool rounded-lg border-2 px-4 py-3 shadow-md transition-all duration-200 hover:shadow-lg"
    style="border-color: var(--chart-1); background-color: color-mix(in srgb, var(--chart-1) 8%, transparent)"
  >
    <Handle type="target" :position="Position.Left" style="background-color: var(--chart-1)" />
    <div class="flex items-center gap-2.5">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-full text-white"
        style="background-color: var(--chart-1)"
      >
        <Icon name="lucide:wrench" class="h-4 w-4" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--chart-1)">Tool</p>
        <p class="truncate text-sm font-medium text-foreground">{{ data.label }}</p>
      </div>
    </div>
    <div v-if="toolLabel" class="mt-2 flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1">
      <Icon name="lucide:terminal" class="h-3 w-3 text-muted-foreground" />
      <span class="font-mono text-[11px] text-muted-foreground">{{ toolLabel }}</span>
    </div>
    <Handle type="source" :position="Position.Right" style="background-color: var(--chart-1)" />
  </div>
</template>
