<script setup lang="ts">
  const props = defineProps<{
    title: string
    current: number
    target: number
    icon?: string
    color?: string
    label?: string
  }>()

  const percentage = computed(() => {
    if (props.target === 0) return 0
    return Math.min(100, Math.round((props.current / props.target) * 100))
  })
</script>

<template>
  <div class="rounded-xl border border-border bg-card p-5 flex flex-col justify-between gap-3 h-full min-h-[120px]">
    <div class="flex items-center justify-between">
      <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{{ title }}</span>
      <Icon v-if="icon" :name="icon" :class="['size-4', color || 'text-muted-foreground/60']" />
    </div>
    <div class="space-y-2">
      <div class="flex items-baseline justify-between">
        <span class="text-2xl font-bold text-foreground tracking-tight">{{ percentage }}%</span>
        <span class="text-xs text-muted-foreground">{{ current }} / {{ target }}</span>
      </div>
      <div class="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-700 ease-out"
          :class="[
            percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-blue-500',
          ]"
          :style="{ width: `${percentage}%` }" />
      </div>
      <p v-if="label" class="text-[10px] text-muted-foreground">{{ label }}</p>
    </div>
  </div>
</template>
