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
    :style="{ borderColor: 'var(--chart-3)', backgroundColor: 'color-mix(in srgb, var(--chart-3) 10%, transparent)' }"
  >
    <Handle type="target" :position="Position.Left" :style="{ backgroundColor: 'var(--chart-3)' }" />
    <div class="flex items-center gap-2">
      <div
        class="flex h-8 w-8 rotate-45 items-center justify-center rounded-sm text-white"
        :style="{ backgroundColor: 'var(--chart-3)' }"
      >
        <Icon name="lucide:git-branch" class="-rotate-45 h-4 w-4" />
      </div>
      <div>
        <p class="text-xs font-medium" :style="{ color: 'var(--chart-3)' }">Decision</p>
        <p class="text-sm font-semibold text-foreground">{{ data.label }}</p>
      </div>
    </div>
    <Handle id="yes" type="source" :position="Position.Right" :style="{ top: '30%', backgroundColor: '#22c55e' }" />
    <Handle id="no" type="source" :position="Position.Right" :style="{ top: '70%', backgroundColor: '#ef4444' }" />
    <div class="absolute -right-8 top-[30%] -translate-y-1/2">
      <span class="text-xs font-medium" :style="{ color: '#22c55e' }">Yes</span>
    </div>
    <div class="absolute -right-6 top-[70%] -translate-y-1/2">
      <span class="text-xs font-medium" :style="{ color: '#ef4444' }">No</span>
    </div>
  </div>
</template>
