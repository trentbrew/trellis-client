<script setup lang="ts">
  import { Handle, Position } from '@vue-flow/core'

  defineProps<{
    data: {
      label: string
      kind: string
    }
  }>()
</script>

<template>
  <div
    class="flow-node flow-node--start rounded-lg border-2 px-4 py-3 shadow-md transition-all duration-200 hover:shadow-lg"
    style="border-color: #22c55e; background-color: color-mix(in srgb, #22c55e 8%, transparent)"
  >
    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white">
        <Icon name="lucide:play" class="h-4 w-4" />
      </div>
      <div class="min-w-0">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-green-500">Start</p>
        <p class="truncate text-sm font-medium text-foreground">{{ data.label }}</p>
      </div>
    </div>
    <Handle type="source" :position="Position.Right" style="background-color: #22c55e" />
  </div>
</template>
