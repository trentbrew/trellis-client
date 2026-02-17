<script setup lang="ts">
  import { Handle, Position } from '@vue-flow/core'

  const props = defineProps<{
    data: {
      label: string
      kind: 'memory-read' | 'memory-write'
      key?: string
    }
  }>()

  const isWrite = computed(() => props.data.kind === 'memory-write')
  const icon = computed(() => isWrite.value ? 'lucide:database-zap' : 'lucide:database')
  const kindLabel = computed(() => isWrite.value ? 'Memory Write' : 'Memory Read')
</script>

<template>
  <div
    class="flow-node flow-node--memory rounded-lg border-2 px-4 py-3 shadow-md transition-all duration-200 hover:shadow-lg"
    style="border-color: #14b8a6; background-color: color-mix(in srgb, #14b8a6 8%, transparent)"
  >
    <Handle type="target" :position="Position.Left" style="background-color: #14b8a6" />
    <div class="flex items-center gap-2.5">
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-white">
        <Icon :name="icon" class="h-4 w-4" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-teal-500">{{ kindLabel }}</p>
        <p class="truncate text-sm font-medium text-foreground">{{ data.label }}</p>
      </div>
    </div>
    <div v-if="data.key" class="mt-2 flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1">
      <Icon name="lucide:key" class="h-3 w-3 text-muted-foreground" />
      <span class="font-mono text-[11px] text-muted-foreground">{{ data.key }}</span>
    </div>
    <Handle type="source" :position="Position.Right" style="background-color: #14b8a6" />
  </div>
</template>
