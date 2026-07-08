<script setup lang="ts">
  const props = defineProps<{
    deckId: string
    selectedLabel: string
    slideIndex: number
    slideCount: number
  }>()

  const emit = defineEmits<{
    'select-slide': []
  }>()

  const viewportRef = ref<HTMLElement | null>(null)
  const stageRef = ref<HTMLElement | null>(null)
  const deckIdRef = toRef(props, 'deckId')

  const { transform, zoomPercent, bind, fit, zoomIn, zoomOut, zoomTo100 } = useDeckViewport({
    deckId: deckIdRef,
    viewportEl: viewportRef,
    stageEl: stageRef,
  })

  const stageStyle = computed(() => ({
    transform: `translate(${transform.value.x}px, ${transform.value.y}px) scale(${transform.value.k})`,
  }))

  let cleanup: (() => void) | undefined

  onMounted(() => {
    cleanup = bind()
  })

  onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <section
    ref="viewportRef"
    class="deck-stage-viewport relative min-h-0 flex-1 overflow-hidden bg-[#0b0b0f]"
    role="region"
    aria-label="Deck canvas"
    @click.self="emit('select-slide')"
  >
    <div
      class="pointer-events-none absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/90 px-2.5 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur"
      aria-hidden="true"
    >
      <span>Slide</span>
      <span>{{ slideIndex + 1 }} / {{ slideCount }}</span>
      <template v-if="selectedLabel !== 'Slide'">
        <span class="text-muted-foreground/50">/</span>
        <span class="text-foreground">{{ selectedLabel }}</span>
      </template>
    </div>

    <div
      ref="stageRef"
      data-deck-stage
      class="absolute left-0 top-0 w-[min(86%,960px)] origin-top-left will-change-transform"
      :style="stageStyle"
    >
      <slot />
    </div>

    <div
      class="absolute bottom-3 left-3 z-20 flex items-center gap-1 rounded-full border border-border bg-card/90 p-1 text-xs shadow-lg backdrop-blur"
      aria-label="Viewport controls"
    >
      <button
        type="button"
        class="flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Zoom out"
        @click.stop="zoomOut"
      >
        −
      </button>
      <button
        type="button"
        class="flex h-7 min-w-12 items-center justify-center rounded-full px-2 font-mono text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Zoom to 100 percent"
        @click.stop="zoomTo100"
      >
        {{ zoomPercent }}%
      </button>
      <button
        type="button"
        class="flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Zoom in"
        @click.stop="zoomIn"
      >
        +
      </button>
      <button
        type="button"
        class="flex h-7 min-w-10 items-center justify-center rounded-full px-2 font-mono text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Fit slide"
        @click.stop="fit"
      >
        Fit
      </button>
    </div>
  </section>
</template>

<style scoped>
  .deck-stage-viewport {
    background-image:
      linear-gradient(rgba(36, 36, 43, 0.85) 1px, transparent 1px),
      linear-gradient(90deg, rgba(36, 36, 43, 0.85) 1px, transparent 1px),
      linear-gradient(rgba(23, 23, 28, 0.9) 1px, transparent 1px),
      linear-gradient(90deg, rgba(23, 23, 28, 0.9) 1px, transparent 1px),
      radial-gradient(circle at 50% 10%, rgba(139, 92, 246, 0.12), transparent 38%);
    background-size: 80px 80px, 80px 80px, 20px 20px, 20px 20px, auto;
  }

  @media (prefers-reduced-motion: reduce) {
    [data-deck-stage] {
      transition: none !important;
    }
  }
</style>
