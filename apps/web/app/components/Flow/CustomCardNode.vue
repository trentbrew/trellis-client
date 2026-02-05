<script setup lang="ts">
  import { Handle, Position } from '@vue-flow/core'

  defineProps<{
    data: {
      label: string
      type?: string
      icon?: string
      iconBg?: string
      status?: string
      description?: string
      metrics?: Record<string, string | number>
    }
  }>()
</script>

<template>
  <div
    class="bg-card text-card-foreground w-64 rounded-xl border shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl cursor-pointer"
  >
    <Handle type="target" :position="Position.Left" class="!bg-primary" />

    <div class="border-b p-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div :class="['flex h-8 w-8 items-center justify-center rounded-lg', data.iconBg || 'bg-primary/10']">
            <Icon :name="data.icon || 'lucide:box'" class="text-primary h-4 w-4" />
          </div>
          <div>
            <p class="text-xs text-muted-foreground">{{ data.type || 'Node' }}</p>
            <p class="text-sm font-semibold">{{ data.label }}</p>
          </div>
        </div>
        <UiBadge variant="secondary" class="text-xs">{{ data.status || 'Active' }}</UiBadge>
      </div>
    </div>

    <div v-if="data.description" class="p-3">
      <p class="text-xs text-muted-foreground">{{ data.description }}</p>
    </div>

    <div v-if="data.metrics" class="border-t p-3">
      <div class="grid grid-cols-2 gap-2">
        <div v-for="(value, key) in data.metrics" :key="key" class="text-center">
          <p class="text-xs text-muted-foreground">{{ key }}</p>
          <p class="text-sm font-semibold">{{ value }}</p>
        </div>
      </div>
    </div>

    <Handle type="source" :position="Position.Right" class="!bg-primary" />
  </div>
</template>
