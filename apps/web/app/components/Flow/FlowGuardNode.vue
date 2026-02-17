<script setup lang="ts">
  import { Handle, Position } from '@vue-flow/core'

  const props = defineProps<{
    data: {
      label: string
      kind: string
      mode?: 'allow' | 'block'
    }
  }>()

  const modeLabel = computed(() => props.data.mode === 'block' ? 'Block' : 'Allow')
</script>

<template>
  <div
    class="flow-node flow-node--guard rounded-lg border-2 px-4 py-3 shadow-md transition-all duration-200 hover:shadow-lg"
    style="border-color: var(--chart-5); background-color: color-mix(in srgb, var(--chart-5) 8%, transparent)"
  >
    <Handle type="target" :position="Position.Left" style="background-color: var(--chart-5)" />
    <div class="flex items-center gap-2.5">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-full text-white"
        style="background-color: var(--chart-5)"
      >
        <Icon name="lucide:shield" class="h-4 w-4" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--chart-5)">Guard</p>
        <p class="truncate text-sm font-medium text-foreground">{{ data.label }}</p>
      </div>
    </div>
    <div class="mt-2 flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1">
      <Icon :name="modeLabel === 'Allow' ? 'lucide:check' : 'lucide:x'" class="h-3 w-3 text-muted-foreground" />
      <span class="text-[11px] text-muted-foreground">{{ modeLabel }}</span>
    </div>
    <Handle id="pass" type="source" :position="Position.Right" :style="{ top: '30%', backgroundColor: '#22c55e' }" />
    <Handle id="fail" type="source" :position="Position.Right" :style="{ top: '70%', backgroundColor: '#ef4444' }" />
    <div class="absolute -right-9 top-[30%] -translate-y-1/2">
      <span class="text-[10px] font-semibold text-green-500">Pass</span>
    </div>
    <div class="absolute -right-7 top-[70%] -translate-y-1/2">
      <span class="text-[10px] font-semibold text-red-500">Fail</span>
    </div>
  </div>
</template>
