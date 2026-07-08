<script setup lang="ts">
  import type { SlideDefinition } from '~/types/deck'
  import { useSlideThumbReorder } from '~/composables/useSlideThumbReorder'

  const props = defineProps<{
    slides: SlideDefinition[]
  }>()

  const activeIndex = defineModel<number>('activeIndex', { required: true })

  const emit = defineEmits<{
    reorder: [orderedIds: string[]]
    keydown: [event: KeyboardEvent]
  }>()

  const slidesRef = toRef(props, 'slides')

  const { dragFrom, dropIndex, onDragStart, onDragEnd, onDragOver, onDrop } = useSlideThumbReorder(
    slidesRef,
    {
      reorder: (ids) => emit('reorder', ids),
      activeIndex: (i) => { activeIndex.value = i },
    },
  )

  function selectSlide(index: number) {
    activeIndex.value = index
  }

  function thumbLabel(slide: SlideDefinition, index: number): string {
    return slide.title || `Slide ${index + 1}`
  }

  function onKeydown(e: KeyboardEvent, index: number) {
    emit('keydown', e)
    const last = props.slides.length - 1
    if (e.altKey) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      selectSlide(Math.min(last, index + 1))
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      selectSlide(Math.max(0, index - 1))
    }
  }
</script>

<template>
  <div
    role="tablist"
    aria-label="Slide filmstrip"
    aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
    class="flex gap-3 overflow-x-auto border-b border-border bg-muted/20 px-4 py-3"
  >
    <template v-for="(slide, index) in slides" :key="slide.entityId">
      <div
        v-if="dropIndex === index && dragFrom != null && dragFrom !== index"
        class="w-0.5 shrink-0 self-stretch rounded-full bg-violet-500"
        aria-hidden="true"
      />
      <button
        :id="`filmstrip-tab-${index}`"
        type="button"
        role="tab"
        draggable="true"
        :aria-selected="index === activeIndex"
        :aria-grabbed="dragFrom === index"
        :tabindex="index === activeIndex ? 0 : -1"
        class="group relative w-32 shrink-0 overflow-hidden rounded-sm border text-left transition-opacity"
        :class="[
          index === activeIndex
            ? 'border-violet-500/60 ring-1 ring-violet-500/40'
            : 'border-border hover:border-muted-foreground/40',
          dragFrom === index ? 'opacity-45' : '',
        ]"
        @click="selectSlide(index)"
        @keydown="onKeydown($event, index)"
        @dragstart="onDragStart($event, index)"
        @dragend="onDragEnd"
        @dragover="onDragOver($event, index)"
        @drop="onDrop($event, index)"
      >
        <span
          class="absolute left-1 top-1 z-10 cursor-grab font-mono text-[8px] text-muted-foreground/70 group-active:cursor-grabbing"
          aria-hidden="true"
        >
          ⋮⋮
        </span>
        <div class="aspect-video bg-[#0d0d11] p-2">
          <div class="flex h-full flex-col justify-center gap-1">
            <span class="block h-1 w-3/5 rounded-sm bg-muted-foreground/40" />
            <span class="block h-0.5 w-full rounded-sm bg-muted/60" />
          </div>
        </div>
        <span class="block border-t border-border px-2 py-1 font-mono text-[9px] text-muted-foreground">
          {{ index + 1 }} · {{ thumbLabel(slide, index) }}
        </span>
      </button>
    </template>
  </div>
</template>
