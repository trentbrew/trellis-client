<script setup lang="ts">
  import SlideThumbList from './SlideThumbList.vue'
  import SlideCanvas from './SlideCanvas.vue'
  import DeckStageViewport from './DeckStageViewport.vue'
  import DeckObjectInspector from './DeckObjectInspector.vue'
  import SpeakerNotesStrip from './SpeakerNotesStrip.vue'
  import PresenceAvatarStack from './PresenceAvatarStack.vue'
  import { useDeckProjection } from '~/composables/useDeckProjection'
  import { useDeckKeyboardReorder } from '~/composables/useDeckKeyboardReorder'
  import { useDeckPresence } from '~/composables/useDeckPresence'
  import { useDeckVantageTransition } from '~/composables/useDeckVantageTransition'
  import { deckPresentPathFromEntityId } from '~/lib/deck-routes'
  import type { QueryViewRegionConfig, SlideLayoutId, SlideRegions } from '~/types/deck'

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
    sseConnected,
    creatingSlide,
    updateSlideRegions,
    updateSpeakerNotes,
    updateSlideOrder,
    createSlide,
  } = useDeckProjection(toRef(props, 'deckId'))

  const route = useRoute()
  const { wpNavigate } = useWorkspacePath()
  const { enterPresent } = useDeckVantageTransition()
  const activeIndex = ref(props.initialSlideIndex ?? 0)
  const pendingSelectLast = ref(false)

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

  watch(
    slides,
    (list) => {
      if (pendingSelectLast.value && list.length) {
        activeIndex.value = list.length - 1
        pendingSelectLast.value = false
        return
      }
      if (activeIndex.value >= list.length) activeIndex.value = Math.max(0, list.length - 1)
    },
    { immediate: true },
  )

  const activeSlide = computed(() => slides.value[activeIndex.value] ?? null)
  const {
    selectedObjectId,
    selectedLabel,
    announcement: selectionAnnouncement,
    selectObject,
    selectSlide,
  } = useDeckSelection(activeSlide)

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

  async function onUpdateRegions(patch: Partial<SlideRegions>) {
    if (!activeSlide.value) return
    await updateSlideRegions(activeSlide.value.entityId, patch)
  }

  function goPresent() {
    enterPresent()
    void wpNavigate(deckPresentPathFromEntityId(props.deckId, activeIndex.value))
  }

  async function handleCreateSlide() {
    pendingSelectLast.value = true
    await createSlide()
  }

  const { announcement, handleKeydown } = useDeckKeyboardReorder({
    slides,
    activeIndex,
    onReorder,
  })

  function onFrameKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    const target = event.target as HTMLElement | null
    if (target?.closest?.('.ProseMirror')) return
    selectSlide()
  }

  onMounted(() => window.addEventListener('keydown', onFrameKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onFrameKeydown))
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card" data-vantage="editor">
    <div class="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-xs">
      <DeckBackNav />
      <span class="font-medium">{{ deckDef?.title || 'Deck' }}</span>
      <span
        class="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-400"
      >
        <span class="size-1.5 rounded-full bg-violet-400" />
        PROJECTION
      </span>
      <span v-if="slides.length" class="text-[10px] text-muted-foreground">
        {{ slides.length }} slide{{ slides.length === 1 ? '' : 's' }}
      </span>
      <span class="flex-1" />
      <PresenceAvatarStack :viewers="viewers" />
      <span
        class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
        :class="sseConnected ? 'text-emerald-400' : 'text-muted-foreground'"
        aria-live="polite"
      >
        <span class="size-1.5 rounded-full" :class="sseConnected ? 'bg-emerald-400' : 'bg-muted-foreground'" />
        LIVE
      </span>
    </div>

    <div v-if="deckLoading || slidesLoading" class="p-8 text-center text-sm text-muted-foreground">
      Loading projection…
    </div>
    <div v-else-if="deckError" class="p-8 text-center text-sm text-destructive">{{ deckError }}</div>

    <template v-else>
      <div class="flex min-h-0 flex-1 flex-col md:flex-row">
        <SlideThumbList
          v-model:active-index="activeIndex"
          :slides="slides"
          :creating="creatingSlide"
          @reorder="onReorder"
          @keydown="handleKeydown"
          @create-slide="handleCreateSlide"
        />

        <div v-if="!slides.length" class="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 p-8">
          <Icon name="lucide:presentation" class="h-10 w-10 text-muted-foreground/40" />
          <p class="text-sm text-muted-foreground">No slides in this deck yet.</p>
          <UiButton size="sm" class="gap-1.5" :disabled="creatingSlide" @click="handleCreateSlide">
            <Icon :name="creatingSlide ? 'lucide:loader-2' : 'lucide:plus'" :class="['h-4 w-4', creatingSlide && 'animate-spin']" />
            Add first slide
          </UiButton>
        </div>

        <div v-else class="flex min-h-0 min-w-0 flex-1 flex-col">
          <DeckStageViewport
            :deck-id="deckId"
            :selected-label="selectedLabel"
            :slide-index="activeIndex"
            :slide-count="slides.length"
            @select-slide="selectSlide"
          >
            <div
              class="relative w-full overflow-hidden rounded-md border border-border bg-[#0d0d11] aspect-video"
            >
              <SlideCanvas
                v-if="activeSlide"
                :slide="activeSlide"
                :slide-index="activeIndex"
                :slide-count="slides.length"
                :deck-title="deckDef?.title || 'Deck'"
                :selected-object-id="selectedObjectId"
                :tab-id="`slide-panel-${activeIndex}`"
                :labelled-by="`slide-tab-${activeIndex}`"
                @select-object="selectObject"
                @update-regions="onUpdateRegions"
              />
            </div>
          </DeckStageViewport>

          <SpeakerNotesStrip
            v-if="activeSlide"
            :slide="activeSlide"
            @save="(html) => updateSpeakerNotes(activeSlide!.entityId, html)"
          />
        </div>

        <DeckObjectInspector
          v-if="slides.length"
          :slide="activeSlide"
          :deck-id="deckId"
          :deck-slug="deckSlug"
          :active-index="activeIndex"
          :selected-object-id="selectedObjectId"
          @layout-select="onLayoutSelect"
          @query-save="onQuerySave"
          @update-regions="onUpdateRegions"
          @select-object="selectObject"
          @present="goPresent"
        />
      </div>

      <span class="sr-only" aria-live="polite">{{ announcement }} {{ selectionAnnouncement }}</span>
    </template>
  </div>
</template>
