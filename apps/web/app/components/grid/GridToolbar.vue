<script setup lang="ts">
  import type { GridGap } from '~/types/grid'

  defineProps<{
    editMode: boolean
    gap: GridGap
    viewCount: number
  }>()

  const emit = defineEmits<{
    'toggle-edit': []
    'set-gap': [gap: GridGap]
    'add-view': []
    'show-presets': []
  }>()

  const gapOptions: { value: GridGap; label: string }[] = [
    { value: 'sm', label: 'S' },
    { value: 'md', label: 'M' },
    { value: 'lg', label: 'L' },
  ]
</script>

<template>
  <div v-if="editMode" class="flex items-center gap-2 shrink-0">
    <!-- Gap toggle -->
    <div class="flex items-center rounded-md border border-border bg-card/50 p-0.5">
      <button
        v-for="opt in gapOptions"
        :key="opt.value"
        class="px-2 py-1 rounded text-[11px] font-medium transition-colors"
        :class="gap === opt.value
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:text-foreground'"
        :title="`Gap: ${opt.label}`"
        @click="emit('set-gap', opt.value)">
        {{ opt.label }}
      </button>
    </div>

    <!-- Preset picker -->
    <button
      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      @click="emit('show-presets')">
      <Icon name="lucide:layout-template" class="h-3.5 w-3.5" />
      Templates
    </button>

  </div>
</template>
