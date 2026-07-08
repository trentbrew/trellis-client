<script setup lang="ts">
  import type { SlideLayoutId } from '~/types/deck'
  import { SLIDE_LAYOUT_OPTIONS } from '~/lib/deck-layout'

  const props = defineProps<{
    layoutId: SlideLayoutId
  }>()

  const emit = defineEmits<{
    select: [layoutId: SlideLayoutId]
  }>()

  function select(id: SlideLayoutId) {
    emit('select', id)
  }

  function onKeydown(e: KeyboardEvent, id: SlideLayoutId) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      select(id)
    }
  }
</script>

<template>
  <div role="radiogroup" aria-label="Slide layout" class="grid grid-cols-2 gap-1.5">
    <button
      v-for="opt in SLIDE_LAYOUT_OPTIONS"
      :key="opt.id"
      type="button"
      role="radio"
      :aria-checked="layoutId === opt.id"
      :aria-label="opt.label"
      class="flex min-h-[52px] flex-col gap-1 rounded-sm border px-1.5 py-2 text-left transition-colors"
      :class="
        layoutId === opt.id
          ? 'border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/40'
          : 'border-border bg-card hover:border-muted-foreground/40'
      "
      @click="select(opt.id)"
      @keydown="onKeydown($event, opt.id)"
    >
      <span class="flex flex-1 flex-col gap-0.5 px-0.5">
        <span class="block h-0.5 w-3/5 rounded-sm bg-muted-foreground/50" />
        <span
          v-if="opt.id === 'live-data'"
          class="block h-2.5 rounded-sm bg-emerald-500/30"
        />
        <span v-else class="block h-0.5 w-full rounded-sm bg-muted/60" />
        <span v-if="opt.id === 'two-col'" class="flex gap-0.5">
          <span class="block h-0.5 flex-1 rounded-sm bg-muted/60" />
          <span class="block h-0.5 flex-1 rounded-sm bg-muted/60" />
        </span>
      </span>
      <span
        class="font-mono text-[8.5px] uppercase tracking-wide"
        :class="layoutId === opt.id ? 'text-violet-300' : 'text-muted-foreground'"
      >
        {{ opt.label }}
      </span>
    </button>
  </div>
</template>
