<script setup lang="ts">
  import SlideCanvas from './SlideCanvas.vue'
  import { useDeckProjection } from '~/composables/useDeckProjection'
  import { useDeckVantageTransition } from '~/composables/useDeckVantageTransition'
  import { deckPathFromEntityId } from '~/lib/deck-routes'

  const props = defineProps<{
    deckId: string
    deckSlug: string
    initialSlideIndex?: number
  }>()

  const activeIndex = ref(props.initialSlideIndex ?? 0)
  const { enterPresent, exitPresent: exitVantage } = useDeckVantageTransition()
  const { wpNavigate } = useWorkspacePath()

  const { slides, slidesLoading, deckLoading, deckError, deckDef } = useDeckProjection(toRef(props, 'deckId'))

  watch(
    slides,
    (list) => {
      if (activeIndex.value >= list.length) activeIndex.value = Math.max(0, list.length - 1)
    },
    { immediate: true },
  )

  const activeSlide = computed(() => slides.value[activeIndex.value] ?? null)
  const loading = computed(() => deckLoading.value || slidesLoading.value)

  function transitionMs(): number {
    if (import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0
    return 280
  }

  function exitPresent() {
    exitVantage()
    const delay = transitionMs()
    setTimeout(() => {
      void wpNavigate(`${deckPathFromEntityId(props.deckId)}?slide=${activeIndex.value}`)
    }, delay)
  }

  function prevSlide() {
    activeIndex.value = Math.max(0, activeIndex.value - 1)
  }

  function nextSlide() {
    activeIndex.value = Math.min(slides.value.length - 1, activeIndex.value + 1)
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      exitPresent()
    }
    if (e.key === 'ArrowLeft') prevSlide()
    if (e.key === 'ArrowRight') nextSlide()
  }

  onMounted(() => {
    enterPresent()
    window.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
    data-vantage="present"
    aria-label="Presentation mode"
  >
    <div v-if="loading" class="text-sm text-muted-foreground">Loading…</div>
    <div v-else-if="deckError" class="text-sm text-destructive">{{ deckError }}</div>
    <div v-else-if="activeSlide" class="flex w-full max-w-6xl flex-col items-center px-6">
      <div class="aspect-video w-full overflow-hidden rounded-md border border-border/40 bg-[#0d0d11]">
        <SlideCanvas
          :slide="activeSlide"
          :slide-index="activeIndex"
          :slide-count="slides.length"
          :deck-title="deckDef?.title || 'Deck'"
          :tab-id="`present-panel-${activeIndex}`"
          :labelled-by="`present-slide-${activeIndex}`"
          read-only
        />
      </div>
    </div>

    <div
      class="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border/60 bg-background/90 px-4 py-2 font-mono text-[11px] text-muted-foreground backdrop-blur-sm"
    >
      <button
        type="button"
        class="rounded-full border border-border px-3 py-1 text-foreground hover:border-violet-500"
        @click="prevSlide"
      >
        ← Prev
      </button>
      <span>{{ activeIndex + 1 }} / {{ slides.length }}</span>
      <button
        type="button"
        class="rounded-full border border-border px-3 py-1 text-foreground hover:border-violet-500"
        @click="nextSlide"
      >
        Next →
      </button>
      <button
        type="button"
        class="rounded-full border border-border px-3 py-1 text-foreground hover:border-violet-500"
        @click="exitPresent"
      >
        Esc · Exit
      </button>
    </div>
  </div>
</template>
