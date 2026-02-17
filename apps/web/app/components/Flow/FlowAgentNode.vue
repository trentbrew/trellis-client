<script setup lang="ts">
  import { Handle, Position } from '@vue-flow/core'

  const props = defineProps<{
    data: {
      label: string
      kind: string
      model?: string
      system?: string
    }
  }>()

  const modelLabel = computed(() => {
    const m = props.data.model
    if (!m) return null
    if (m.length > 16) return m.slice(0, 14) + '…'
    return m
  })
</script>

<template>
  <div
    class="flow-node flow-node--agent rounded-lg border-2 px-4 py-3 shadow-md transition-all duration-200 hover:shadow-lg"
    style="border-color: var(--chart-2); background-color: color-mix(in srgb, var(--chart-2) 8%, transparent)"
  >
    <Handle type="target" :position="Position.Left" style="background-color: var(--chart-2)" />
    <div class="flex items-center gap-2.5">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-full text-white"
        style="background-color: var(--chart-2)"
      >
        <Icon name="lucide:sparkles" class="h-4 w-4" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--chart-2)">Agent</p>
        <p class="truncate text-sm font-medium text-foreground">{{ data.label }}</p>
      </div>
    </div>
    <div v-if="modelLabel" class="mt-2 flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1">
      <Icon name="lucide:cpu" class="h-3 w-3 text-muted-foreground" />
      <span class="text-[11px] text-muted-foreground">{{ modelLabel }}</span>
    </div>
    <Handle type="source" :position="Position.Right" style="background-color: var(--chart-2)" />
  </div>
</template>
