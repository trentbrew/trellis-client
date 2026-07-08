<script setup lang="ts">
  import type { DeckObjectFrame, DeckObjectKind, DeckSlideObject, QueryViewRegionConfig, SlideDefinition, SlideLayoutId, SlideRegions } from '~/types/deck'
  import LayoutPicker from './LayoutPicker.vue'
  import VantageChipNav from './VantageChipNav.vue'
  import QueryBuilderPanel from './QueryBuilderPanel.vue'
  import { deckObjectLabel } from '~/composables/useDeckSelection'
  import { effectiveLayoutId } from '~/lib/deck-layout'
  import {
    createDeckHtmlObject,
    htmlSourceContainsScript,
  } from '~/lib/block-registry/html-embed'

  const props = defineProps<{
    slide: SlideDefinition | null
    deckId: string
    deckSlug: string
    activeIndex: number
    selectedObjectId: DeckObjectKind
  }>()

  const emit = defineEmits<{
    'layout-select': [layoutId: SlideLayoutId]
    'query-save': [config: QueryViewRegionConfig]
    'update-regions': [patch: Partial<SlideRegions>]
    'select-object': [objectId: DeckObjectKind]
    present: []
  }>()

  const titleDraft = ref('')
  const bodyDraft = ref('')
  const eyebrowDraft = ref('')
  const htmlSourceDraft = ref('')
  const htmlSourceObjectId = ref<string | null>(null)
  const htmlSourceDirty = ref(false)

  const layoutId = computed(() =>
    props.slide ? effectiveLayoutId(props.slide.regions) : 'title',
  )

  const selectedHtmlObject = computed(() => {
    if (!props.selectedObjectId.startsWith('object:')) return null
    const id = props.selectedObjectId.slice('object:'.length)
    return props.slide?.regions.objects?.find((object) => object.id === id) ?? null
  })

  const selectedLabel = computed(() => deckObjectLabel(props.selectedObjectId, props.slide))
  const hasQueryView = computed(() => !!props.slide?.regions.queryView?.query)
  const htmlContainsScript = computed(() => htmlSourceContainsScript(htmlSourceDraft.value))

  const queryConfig = computed<QueryViewRegionConfig>(() =>
    props.slide?.regions.queryView ?? {
      title: 'Live query',
      query: 'FIND entity AS ?e WHERE ?e.type = "task"',
      viz: 'both',
    },
  )

  watch(
    () => props.slide?.entityId,
    () => {
      titleDraft.value = props.slide?.regions.title ?? ''
      bodyDraft.value = props.slide?.regions.body ?? ''
      eyebrowDraft.value = props.slide?.regions.eyebrow ?? ''
    },
    { immediate: true },
  )

  watch(
    () => props.slide?.regions,
    (regions) => {
      if (!regions) return
      if (regions.title !== titleDraft.value) titleDraft.value = regions.title ?? ''
      if (regions.body !== bodyDraft.value) bodyDraft.value = regions.body ?? ''
      if (regions.eyebrow !== eyebrowDraft.value) eyebrowDraft.value = regions.eyebrow ?? ''
    },
  )

  watch(
    () => [props.selectedObjectId, selectedHtmlObject.value?.id, selectedHtmlObject.value?.block.source] as const,
    ([objectId, htmlId, htmlSource]) => {
      if (!objectId.startsWith('object:')) {
        htmlSourceObjectId.value = null
        htmlSourceDraft.value = ''
        htmlSourceDirty.value = false
        return
      }
      if (!htmlId) {
        return
      }
      if (htmlSourceObjectId.value !== htmlId) {
        htmlSourceObjectId.value = htmlId
        htmlSourceDraft.value = htmlSource ?? ''
        htmlSourceDirty.value = false
        return
      }
      if (!htmlSourceDirty.value && htmlSource != null && htmlSource !== htmlSourceDraft.value) {
        htmlSourceDraft.value = htmlSource
      }
    },
    { immediate: true },
  )

  let regionTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleRegionUpdate(patch: Partial<SlideRegions>) {
    if (regionTimer) clearTimeout(regionTimer)
    regionTimer = setTimeout(() => emit('update-regions', patch), 350)
  }

  function flushRegionUpdate(patch: Partial<SlideRegions>) {
    if (regionTimer) clearTimeout(regionTimer)
    regionTimer = null
    emit('update-regions', patch)
  }

  function onTitleInput() {
    scheduleRegionUpdate({ title: titleDraft.value })
  }

  function onBodyInput() {
    scheduleRegionUpdate({ body: bodyDraft.value })
  }

  function onEyebrowInput() {
    scheduleRegionUpdate({ eyebrow: eyebrowDraft.value })
  }

  function clearEyebrow() {
    eyebrowDraft.value = ''
    flushRegionUpdate({ eyebrow: '' })
  }

  function clearTitle() {
    titleDraft.value = ''
    flushRegionUpdate({ title: '' })
  }

  function clearBody() {
    bodyDraft.value = ''
    flushRegionUpdate({ body: '' })
  }

  function saveQuery(config: QueryViewRegionConfig) {
    emit('query-save', config)
  }

  function addQueryView() {
    emit('layout-select', 'live-data')
    emit('query-save', queryConfig.value)
  }

  function patchObjects(updater: (_objects: DeckSlideObject[]) => DeckSlideObject[]) {
    const objects = props.slide?.regions.objects ?? []
    emit('update-regions', { objects: updater(objects) })
  }

  function addHtmlEmbed() {
    const object = createDeckHtmlObject()
    patchObjects((objects) => [...objects, object])
    emit('select-object', `object:${object.id}`)
  }

  type DeckSlideObjectPatch = Partial<Omit<DeckSlideObject, 'block' | 'frame'>> & {
    block?: Partial<DeckSlideObject['block']>
    frame?: Partial<DeckObjectFrame>
  }

  function updateSelectedHtmlObject(patch: DeckSlideObjectPatch) {
    const object = selectedHtmlObject.value
    if (!object) return
    patchObjects((objects) =>
      objects.map((item) =>
        item.id === object.id
          ? {
              ...item,
              ...patch,
              block: patch.block ? { ...item.block, ...patch.block, safety: { allowScripts: false, trusted: false } } : item.block,
              frame: patch.frame ? { ...item.frame, ...patch.frame } : item.frame,
              style: patch.style ? { ...item.style, ...patch.style } : item.style,
              motion: patch.motion ? { ...item.motion, ...patch.motion } : item.motion,
            }
          : item,
      ),
    )
  }

  function saveHtmlSource() {
    updateSelectedHtmlObject({
      block: {
        source: htmlSourceDraft.value,
        lastValidSource: htmlSourceDraft.value,
      },
    })
    htmlSourceDirty.value = false
  }

  function removeSelectedHtmlObject() {
    const object = selectedHtmlObject.value
    if (!object) return
    patchObjects((objects) => objects.filter((item) => item.id !== object.id))
  }

  onBeforeUnmount(() => {
    if (regionTimer) clearTimeout(regionTimer)
  })
</script>

<template>
  <aside class="flex shrink-0 flex-col border-l border-border bg-muted/20 md:w-[260px]" aria-label="Object inspector">
    <div class="shrink-0 border-b border-border px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ selectedLabel }}</span>
        <span class="rounded-full border border-violet-400/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-violet-300">
          {{ selectedObjectId === 'slide' ? 'slide' : 'object' }}
        </span>
      </div>
      <p v-if="slide" class="mt-1 truncate font-mono text-[10px] text-muted-foreground">
        {{ slide.entityId }}
      </p>
    </div>

    <div v-if="!slide" class="p-4 text-xs text-muted-foreground">Select a slide to edit its objects.</div>

    <div v-else class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
      <section v-if="selectedObjectId === 'slide'" class="space-y-4">
        <div>
          <h3 class="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Slide layout</h3>
          <LayoutPicker :layout-id="layoutId" @select="emit('layout-select', $event)" />
        </div>

        <div>
          <h3 class="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Vantage</h3>
          <VantageChipNav :deck-id="deckId" :active-index="activeIndex" />
        </div>

        <div class="space-y-1 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
          <div>
            rel
            <span class="block truncate text-foreground/80">{{ deckId }} · position {{ slide.order }}</span>
          </div>
          <div>
            layout
            <span class="block text-violet-300/90">{{ layoutId }}</span>
          </div>
        </div>

        <div v-if="layoutId === 'live-data' && !hasQueryView" class="rounded-lg border border-violet-500/30 bg-violet-500/10 p-3">
          <p class="text-xs leading-relaxed text-muted-foreground">
            This live-data slide does not have a query view yet.
          </p>
          <UiButton size="sm" class="mt-3 w-full" @click="addQueryView">Add query view</UiButton>
        </div>

        <div class="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
          <p class="text-xs leading-relaxed text-muted-foreground">
            Add a sandboxed HTML object to this slide. Source and safety settings live in this inspector.
          </p>
          <UiButton size="sm" variant="secondary" class="mt-3 w-full" @click="addHtmlEmbed">Add HTML embed</UiButton>
        </div>

        <button
          type="button"
          class="w-full rounded-md border border-violet-500/50 bg-violet-500/15 px-3 py-2 text-xs font-medium text-foreground hover:bg-violet-500/25"
          @click="emit('present')"
        >
          ▶ Present
        </button>
      </section>

      <section v-else-if="selectedObjectId === 'eyebrow'" class="space-y-3">
        <div>
          <label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground" for="deck-eyebrow-field">
            Eyebrow
          </label>
          <input
            id="deck-eyebrow-field"
            v-model="eyebrowDraft"
            class="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-violet-400"
            placeholder="Optional eyebrow"
            @input="onEyebrowInput"
            @blur="flushRegionUpdate({ eyebrow: eyebrowDraft })"
          />
        </div>
        <UiButton size="sm" variant="secondary" class="w-full" @click="clearEyebrow">Hide eyebrow</UiButton>
      </section>

      <section v-else-if="selectedHtmlObject" class="space-y-4">
        <div class="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
          <div class="flex items-center gap-2">
            <span class="min-w-0 flex-1 text-xs font-semibold">HTML embed</span>
            <span
              class="rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide"
              :class="htmlContainsScript ? 'border-amber-400/50 text-amber-300' : 'border-emerald-400/40 text-emerald-300'"
            >
              {{ htmlContainsScript ? 'scripts disabled' : 'sandboxed' }}
            </span>
          </div>
          <p class="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Rendered with iframe srcdoc. Scripts, forms, popups, and same-origin access stay disabled in P0.
          </p>
        </div>

        <div>
          <label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground" for="deck-html-source-field">
            Source HTML
          </label>
          <textarea
            id="deck-html-source-field"
            v-model="htmlSourceDraft"
            aria-label="Source HTML"
            class="min-h-40 w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus:border-orange-400"
            spellcheck="false"
            @input="htmlSourceDirty = true"
            @blur="saveHtmlSource"
          />
          <UiButton size="sm" class="mt-2 w-full" @click="saveHtmlSource">Save source</UiButton>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            X
            <input
              class="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground"
              type="number"
              min="0"
              max="100"
              :value="selectedHtmlObject.frame.x"
              @change="updateSelectedHtmlObject({ frame: { x: Number(($event.target as HTMLInputElement).value) } })"
            />
          </label>
          <label class="space-y-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Y
            <input
              class="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground"
              type="number"
              min="0"
              max="100"
              :value="selectedHtmlObject.frame.y"
              @change="updateSelectedHtmlObject({ frame: { y: Number(($event.target as HTMLInputElement).value) } })"
            />
          </label>
          <label class="space-y-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Width
            <input
              class="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground"
              type="number"
              min="10"
              max="100"
              :value="selectedHtmlObject.frame.width"
              @change="updateSelectedHtmlObject({ frame: { width: Number(($event.target as HTMLInputElement).value) } })"
            />
          </label>
          <label class="space-y-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Height
            <input
              class="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground"
              type="number"
              min="10"
              max="100"
              :value="selectedHtmlObject.frame.height"
              @change="updateSelectedHtmlObject({ frame: { height: Number(($event.target as HTMLInputElement).value) } })"
            />
          </label>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <label class="space-y-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Frame
            <select
              class="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              :value="selectedHtmlObject.style?.frame ?? 'card'"
              @change="updateSelectedHtmlObject({ style: { frame: ($event.target as HTMLSelectElement).value as 'none' | 'card' | 'glass' } })"
            >
              <option value="none">None</option>
              <option value="card">Card</option>
              <option value="glass">Glass</option>
            </select>
          </label>
          <label class="space-y-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Motion
            <select
              class="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              :value="selectedHtmlObject.motion?.enter ?? 'none'"
              @change="updateSelectedHtmlObject({ motion: { enter: ($event.target as HTMLSelectElement).value as 'none' | 'fade' | 'rise' } })"
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="rise">Rise</option>
            </select>
          </label>
        </div>

        <UiButton size="sm" variant="secondary" class="w-full" @click="removeSelectedHtmlObject">Remove HTML embed</UiButton>
      </section>

      <section v-else-if="selectedObjectId === 'title'" class="space-y-3">
        <div>
          <label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground" for="deck-title-field">
            Title HTML
          </label>
          <textarea
            id="deck-title-field"
            v-model="titleDraft"
            class="min-h-24 w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus:border-violet-400"
            placeholder="<p>Slide title</p>"
            @input="onTitleInput"
            @blur="flushRegionUpdate({ title: titleDraft })"
          />
        </div>
        <p class="text-[11px] leading-relaxed text-muted-foreground">
          Inline TipTap and this field both save to <span class="font-mono">regions.title</span>.
        </p>
        <UiButton size="sm" variant="secondary" class="w-full" @click="clearTitle">Clear title</UiButton>
      </section>

      <section v-else-if="selectedObjectId === 'body'" class="space-y-3">
        <div>
          <label class="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground" for="deck-body-field">
            Body HTML
          </label>
          <textarea
            id="deck-body-field"
            v-model="bodyDraft"
            class="min-h-32 w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus:border-violet-400"
            placeholder="<p>Slide body</p>"
            @input="onBodyInput"
            @blur="flushRegionUpdate({ body: bodyDraft })"
          />
        </div>
        <UiButton size="sm" variant="secondary" class="w-full" @click="clearBody">Clear body</UiButton>
      </section>

      <section v-else-if="selectedObjectId === 'queryView'" class="space-y-3">
        <QueryBuilderPanel
          v-if="hasQueryView"
          :config="queryConfig"
          @save="saveQuery"
        />
        <div v-else class="space-y-3">
          <p class="text-xs leading-relaxed text-muted-foreground">
            This slide does not have a query view yet. Add one to make the region live.
          </p>
          <UiButton size="sm" class="w-full" @click="addQueryView">Add query view</UiButton>
        </div>
      </section>
    </div>
  </aside>
</template>
