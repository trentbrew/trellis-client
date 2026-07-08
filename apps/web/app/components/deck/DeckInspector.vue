<script setup lang="ts">
  import type { QueryViewRegionConfig, SlideDefinition, SlideLayoutId } from '~/types/deck'
  import LayoutPicker from './LayoutPicker.vue'
  import VantageChipNav from './VantageChipNav.vue'
  import QueryBuilderPanel from './QueryBuilderPanel.vue'
  import { effectiveLayoutId } from '~/lib/deck-layout'
  import { deckPresentPathFromEntityId } from '~/lib/deck-routes'
  import { useDeckVantageTransition } from '~/composables/useDeckVantageTransition'

  const props = defineProps<{
    slide: SlideDefinition | null
    deckId: string
    deckSlug: string
    activeIndex: number
  }>()

  const emit = defineEmits<{
    'layout-select': [layoutId: SlideLayoutId]
    'query-save': [config: QueryViewRegionConfig]
  }>()

  const { enterPresent } = useDeckVantageTransition()
  const { wpNavigate } = useWorkspacePath()

  const layoutId = computed(() =>
    props.slide ? effectiveLayoutId(props.slide.regions) : 'title',
  )

  const showQueryBuilder = computed(
    () =>
      props.slide &&
      (layoutId.value === 'live-data' || !!props.slide.regions.queryView?.query),
  )

  function goPresent() {
    enterPresent()
    void wpNavigate(deckPresentPathFromEntityId(props.deckId, props.activeIndex))
  }
</script>

<template>
  <aside class="flex shrink-0 flex-col gap-4 border-l border-border bg-muted/20 p-4 md:w-[208px]">
    <div v-if="slide">
      <h3 class="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Slide layout</h3>
      <LayoutPicker :layout-id="layoutId" @select="emit('layout-select', $event)" />
    </div>

    <QueryBuilderPanel
      v-if="showQueryBuilder && slide?.regions.queryView"
      :config="slide.regions.queryView"
      @save="emit('query-save', $event)"
    />

    <div>
      <h3 class="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Vantage</h3>
      <VantageChipNav :deck-id="deckId" :active-index="activeIndex" />
    </div>

    <div v-if="slide">
      <h3 class="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Slide entity</h3>
      <div class="space-y-1 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
        <div>
          id
          <span class="block truncate text-foreground/80">{{ slide.entityId }}</span>
        </div>
        <div>
          rel
          <span class="block truncate text-foreground/80">{{ deckId }} · position {{ slide.order }}</span>
        </div>
        <div v-if="slide.regions.queryView">
          region
          <span class="block text-emerald-400/90">queryView</span>
        </div>
        <div v-if="slide.regions.layoutId">
          layout
          <span class="block text-violet-300/90">{{ slide.regions.layoutId }}</span>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="mt-auto rounded-md border border-violet-500/50 bg-violet-500/15 px-3 py-2 text-xs font-medium text-foreground hover:bg-violet-500/25"
      @click="goPresent"
    >
      ▶ Present
    </button>
  </aside>
</template>
