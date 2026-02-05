<script setup lang="ts">
import type { BlockTypeDefinition } from '~/composables/usePageBuilder'

const props = defineProps<{
  blockType: BlockTypeDefinition
  selected?: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  select: [blockType: BlockTypeDefinition]
}>()

const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  content: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600' },
  data: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-600' },
  embed: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600' },
  layout: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600' },
  widget: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-600' },
}

const colors = computed(() => categoryColors[props.blockType.category] || categoryColors.content)
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
    @click="emit('select', blockType)">
    <div class="flex items-start gap-3">
      <div class="shrink-0 p-2 rounded-md" :class="colors.bg">
        <Icon :name="blockType.icon" class="w-4 h-4" :class="colors.text" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="font-medium text-sm text-foreground">{{ blockType.label }}</div>
        <p v-if="!compact" class="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {{ blockType.description }}
        </p>
      </div>
    </div>
  </button>
</template>
