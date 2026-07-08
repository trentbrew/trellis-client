<script setup lang="ts">
  import SlideThumbList from './SlideThumbList.vue'
  import SlideCanvas from './SlideCanvas.vue'
  import DeckInspector from './DeckInspector.vue'
  import PresenceAvatarStack from './PresenceAvatarStack.vue'
  import { useDeckProjection } from '~/composables/useDeckProjection'
  import { useEditorLease } from '~/composables/useEditorLease'
  import { useDeckKeyboardReorder } from '~/composables/useDeckKeyboardReorder'
  import { useDeckPresence } from '~/composables/useDeckPresence'
  import { parseSlideRegionKey } from '~/lib/slide-region-key'
  import type { QueryViewRegionConfig, SlideLayoutId } from '~/types/deck'

  const props = defineProps<{
    deckId: string
    initialSlideIndex?: number
  }>()

  const {
    deckDef,
    deckLoading,
    deckError,
    slides,
    slidesLoading,
    updateSlideRegions,
    updateSpeakerNotes,
    updateSlideOrder,
  } = useDeckProjection(toRef(props, 'deckId'))

  const route = useRoute()
  const activeIndex = ref(props.initialSlideIndex ?? 0)
  const leaseHtml = ref('')

  const deckSlug = computed(() =>
    props.deckId.replace(/^entity:deck-/, '').replace(/^entity:/, ''),
  )

  const { viewers } = useDeckPresence(toRef(props, 'deckId'))

  onMounted(() => {
    const raw = route.query.slide
    if (raw != null) {
      const n = Number(Array.isArray(raw) ? raw[0] : raw)
      if (Number.isFinite(n)) activeIndex.value = Math.max(0, Math.floor(n))
    }
  })

  watch(slides, (list) => {
    if (activeIndex.value >= list.length) activeIndex.value = Math.max(0, list.length - 1)
  }, { immediate: true })

  const activeSlide = computed(() => slides.value[activeIndex.value] ?? null)

  const lease = useEditorLease(async (cellKey, html) => {
    const parsed = parseSlideRegionKey(cellKey)
    if (!parsed) return
    if (parsed.regionId === 'title') await updateSlideRegions(parsed.entityId, { title: html })
    if (parsed.regionId === 'body') await updateSlideRegions(parsed.entityId, { body: html })
    if (parsed.regionId === 'notes') await updateSpeakerNotes(parsed.entityId, html)
  })

  async function onReorder(orderedIds: string[]) {
    await updateSlideOrder(orderedIds)
  }

  async function onLayoutSelect(layoutId: SlideLayoutId) {
    if (!activeSlide.value) return
    await updateSlideRegions(activeSlide.value.entityId, { layoutId })
  }

  async function onQuerySave(config: QueryViewRegionConfig) {
    if (!activeSlide.value) return
    await updateSlideRegions(activeSlide.value.entityId, { queryView: config })
  }

  const { announcement, handleKeydown } = useDeckKeyboardReorder({
    slides,
    activeIndex,
    onReorder,
  })

  watch(() => lease.pendingHtml.value, (html) => {
    if (lease.cellKey.value) leaseHtml.value = html
  })
  watch(leaseHtml, (html) => {
    if (lease.cellKey.value) lease.setContent(html)
  })
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card" data-vantage="thumb">
    <div class="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-xs">
      <DeckBackNav />
      <span class="font-medium">{{ deckDef?.title || 'Deck' }}</span>
      <span class="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-400">
        <span class="size-1.5 rounded-full bg-violet-400" />
        THUMB
      </span>
      <span class="flex-1" />
      <PresenceAvatarStack :viewers="viewers" />
    </div>

    <div v-if="deckLoading || slidesLoading" class="p-8 text-center text-sm text-muted-foreground">Loading projection…</div>
    <div v-else-if="deckError" class="p-8 text-center text-sm text-destructive">{{ deckError }}</div>
    <div v-else-if="!slides.length" class="p-8 text-center text-sm text-muted-foreground">No slides in this deck.</div>

    <template v-else>
      <div class="flex min-h-0 flex-1 flex-col md:flex-row">
        <SlideThumbList
          v-model:active-index="activeIndex"
          :slides="slides"
          variant="narrow"
          @reorder="onReorder"
          @keydown="handleKeydown"
        />
        <div class="flex min-w-0 flex-1 items-center justify-center bg-[#0a0a0e] p-6">
          <div
            v-if="activeSlide"
            class="relative w-full max-w-3xl origin-center scale-[0.92] overflow-hidden rounded-md border border-border bg-[#0d0d11] aspect-video"
          >
            <SlideCanvas
              :slide="activeSlide"
              :slide-index="activeIndex"
              :slide-count="slides.length"
              :deck-title="deckDef?.title || 'Deck'"
              read-only
              :tab-id="`thumb-panel-${activeIndex}`"
              :labelled-by="`thumb-tab-${activeIndex}`"
            />
          </div>
        </div>
        <DeckInspector
          :slide="activeSlide"
          :deck-id="deckId"
          :deck-slug="deckSlug"
          :active-index="activeIndex"
          @layout-select="onLayoutSelect"
          @query-save="onQuerySave"
        />
      </div>
      <span class="sr-only" aria-live="polite">{{ announcement }}</span>
    </template>
  </div>
</template>
