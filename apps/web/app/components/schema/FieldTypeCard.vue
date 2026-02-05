<script setup lang="ts">
import type { FieldTypeDefinition } from '~/composables/useSchemaBuilder'

const props = defineProps<{
  fieldType: FieldTypeDefinition
  selected?: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  select: [fieldType: FieldTypeDefinition]
}>()

const categoryColors: Record<string, string> = {
  basic: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  rich: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  relation: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  computed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  ontology: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
}

const categoryColor = computed(() => categoryColors[props.fieldType.category] || 'bg-muted text-muted-foreground')
</script>

<template>
  <button
    type="button"
    class="group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/50"
    :class="[
      selected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border',
      compact ? 'p-2' : 'p-3',
    ]"
    @click="emit('select', fieldType)">
    <div
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
      :class="categoryColor">
      <Icon :name="fieldType.icon" class="h-4 w-4" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="font-medium text-sm">{{ fieldType.label }}</span>
        <span
          v-if="fieldType.category === 'ontology'"
          class="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-500">
          Ontology
        </span>
      </div>
      <p v-if="!compact" class="mt-0.5 text-xs text-muted-foreground line-clamp-2">
        {{ fieldType.description }}
      </p>
    </div>

    <Icon
      v-if="selected"
      name="lucide:check"
      class="h-4 w-4 shrink-0 text-primary" />
  </button>
</template>
