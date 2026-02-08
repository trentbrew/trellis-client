<script setup lang="ts">
  defineProps<{
    title: string
    value: string | number
    icon?: string
    color?: string
    suffix?: string
    trend?: { value: number; label: string }
  }>()
</script>

<template>
  <div class="rounded-xl border border-border bg-card p-5 flex flex-col justify-between gap-3 h-full min-h-[120px]">
    <div class="flex items-center justify-between">
      <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ title }}</span>
      <Icon v-if="icon" :name="icon" :class="['size-4', color || 'text-muted-foreground/60']" />
    </div>
    <div class="flex items-baseline gap-1.5">
      <span class="text-3xl font-bold text-foreground tracking-tight">{{ value }}</span>
      <span v-if="suffix" class="text-sm text-muted-foreground">{{ suffix }}</span>
    </div>
    <div v-if="trend" class="flex items-center gap-1 text-xs">
      <Icon
        :name="trend.value >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'"
        :class="['size-3.5', trend.value >= 0 ? 'text-emerald-500' : 'text-red-500']" />
      <span :class="trend.value >= 0 ? 'text-emerald-500' : 'text-red-500'">
        {{ trend.value >= 0 ? '+' : '' }}{{ trend.value }}%
      </span>
      <span class="text-muted-foreground">{{ trend.label }}</span>
    </div>
  </div>
</template>
