<script setup lang="ts">
import type { WidgetTypeDefinition } from '~/composables/useDashboardBuilder'

const props = defineProps<{
  widgetType: WidgetTypeDefinition
  selected?: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  select: [widgetType: WidgetTypeDefinition]
}>()

const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  metrics: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-600' },
  charts: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600' },
  lists: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-600' },
  activity: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600' },
  custom: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-600' },
}

const defaultColors = { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-600' }
const colors = computed(() => categoryColors[props.widgetType.category] ?? defaultColors)
</script>

<template>
  <button
    type="button"
    class="w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm"
    :class="[
      colors.border,
      selected ? `${colors.bg} ring-2 ring-offset-2 ring-primary` : 'bg-card hover:bg-muted/50',
      compact ? 'p-2' : 'p-3',
    ]"
    @click="emit('select', widgetType)">
    <div class="flex items-start gap-3">
      <div class="shrink-0 p-2 rounded-md" :class="colors.bg">
        <Icon :name="widgetType.icon" class="w-4 h-4" :class="colors.text" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="font-medium text-sm text-foreground">{{ widgetType.label }}</div>
        <p v-if="!compact" class="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {{ widgetType.description }}
        </p>
      </div>
    </div>
  </button>
</template>
