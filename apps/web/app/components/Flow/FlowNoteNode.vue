<script setup lang="ts">
  import { Handle, Position } from '@vue-flow/core'

  defineProps<{
    data: {
      label: string
      kind: string
      content?: string
    }
  }>()
</script>

<template>
  <div
    class="flow-node flow-node--note rounded-lg border-2 border-dashed px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md"
    style="border-color: #eab308; background-color: color-mix(in srgb, #eab308 6%, transparent)"
  >
    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-600">
        <Icon name="lucide:sticky-note" class="h-4 w-4" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-yellow-600">Note</p>
        <p class="truncate text-sm font-medium text-foreground">{{ data.label }}</p>
      </div>
    </div>
    <p v-if="data.content" class="mt-2 line-clamp-3 text-xs text-muted-foreground">{{ data.content }}</p>
    <Handle type="target" :position="Position.Left" style="background-color: #eab308; opacity: 0.4" />
    <Handle type="source" :position="Position.Right" style="background-color: #eab308; opacity: 0.4" />
  </div>
</template>
