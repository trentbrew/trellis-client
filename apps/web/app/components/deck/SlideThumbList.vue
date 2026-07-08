<script setup lang="ts">
  import type { SlideDefinition } from '~/types/deck'
  import { useSlideThumbReorder } from '~/composables/useSlideThumbReorder'
  import SlideThumbPreview from './SlideThumbPreview.vue'

  const props = withDefaults(
    defineProps<{
      slides: SlideDefinition[]
      variant?: 'default' | 'narrow'
      creating?: boolean
    }>(),
    { variant: 'default', creating: false },
  )

  const activeIndex = defineModel<number>('activeIndex', { required: true })

  const emit = defineEmits<{
    reorder: [orderedIds: string[]]
    keydown: [event: KeyboardEvent]
    'create-slide': []
  }>()

  const slidesRef = toRef(props, 'slides')
  const isNarrow = computed(() => props.variant === 'narrow')

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

  function onKeydown(e: KeyboardEvent, index: number) {
    emit('keydown', e)
    if (e.altKey) return
    const last = props.slides.length - 1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      selectSlide(Math.min(last, index + 1))
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      selectSlide(Math.max(0, index - 1))
    }
  }

  function thumbLabel(slide: SlideDefinition, index: number): string {
    return slide.title || `Slide ${index + 1}`
  }
</script>

<template>
  <div
    class="flex min-h-0 shrink-0 flex-col border-r border-border bg-muted/20"
    :class="isNarrow ? 'w-[108px]' : 'w-[168px]'"
  >
    <nav
      role="tablist"
      aria-label="Slides"
      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
      class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2"
    >
      <p v-if="!slides.length" class="px-1 py-2 text-center text-[10px] text-muted-foreground">No slides</p>

      <template v-for="(slide, index) in slides" :key="slide.entityId">
        <div
          v-if="dropIndex === index && dragFrom != null && dragFrom !== index"
          class="mx-1 h-0.5 rounded-full bg-violet-500"
          aria-hidden="true"
        />
        <button
          :id="`slide-tab-${index}`"
          type="button"
          role="tab"
          draggable="true"
          :aria-selected="index === activeIndex"
          :aria-grabbed="dragFrom === index"
          :tabindex="index === activeIndex ? 0 : -1"
          class="group relative overflow-hidden rounded-md border text-left transition-colors"
          :class="[
            index === activeIndex
              ? 'border-violet-500/60 ring-1 ring-violet-500/40'
              : 'border-border/60 hover:border-muted-foreground/40',
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
            class="absolute left-1 top-1 z-10 cursor-grab rounded bg-background/80 px-0.5 font-mono text-[8px] text-muted-foreground group-active:cursor-grabbing"
            aria-hidden="true"
          >
            ⋮⋮
          </span>
          <SlideThumbPreview :slide="slide" :index="index" :compact="isNarrow" />
          <span class="block border-t border-border/60 px-2 py-1 font-mono text-[9px] leading-tight text-muted-foreground">
            <span class="text-foreground/70">{{ index + 1 }}.</span>
            {{ thumbLabel(slide, index) }}
          </span>
        </button>
      </template>
    </nav>

    <div class="mt-auto shrink-0 border-t border-border/60 p-2">
      <UiButton
        class="w-full justify-center gap-1.5"
        size="sm"
        variant="secondary"
        :disabled="creating"
        @click="emit('create-slide')"
      >
        <Icon :name="creating ? 'lucide:loader-2' : 'lucide:plus'" :class="['h-3.5 w-3.5', creating && 'animate-spin']" />
        <span class="text-[11px]">New slide</span>
      </UiButton>
    </div>
  </div>
</template>
