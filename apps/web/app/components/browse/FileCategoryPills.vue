<script setup lang="ts">
import {
  FILE_BROWSE_FACETS,
  type FileBrowseCategory,
} from '~/lib/file-browse-categories'

defineProps<{
  active: FileBrowseCategory
  counts: Partial<Record<FileBrowseCategory, number>>
}>()

const emit = defineEmits<{
  select: [category: FileBrowseCategory]
}>()
</script>

<template>
  <div
    class="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
    role="tablist"
    aria-label="File categories">
    <button
      v-for="facet in FILE_BROWSE_FACETS"
      :key="facet.id"
      type="button"
      role="tab"
      :aria-selected="active === facet.id"
      class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
      :class="
        active === facet.id
          ? 'border-primary/50 bg-primary/10 text-foreground'
          : 'border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground'
      "
      @click="emit('select', facet.id)">
      <Icon :name="facet.icon" :class="['h-3.5 w-3.5 shrink-0', `text-${facet.color}-400`]" />
      <span>{{ facet.label }}</span>
      <span
        v-if="(counts[facet.id] ?? 0) > 0"
        class="tabular-nums text-[10px] opacity-70">
        {{ counts[facet.id] }}
      </span>
    </button>
  </div>
</template>
