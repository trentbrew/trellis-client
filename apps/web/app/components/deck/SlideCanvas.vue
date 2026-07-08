<script setup lang="ts">
  import type { DeckObjectKind, SlideDefinition, SlideRegions } from '~/types/deck'
  import HtmlEmbedFrame from '~/components/editor-blocks/HtmlEmbedFrame.vue'
  import QueryViewRegion from './QueryViewRegion.vue'
  import SelectableSlideRegion from './SelectableSlideRegion.vue'
  import { effectiveLayoutId } from '~/lib/deck-layout'

  const props = withDefaults(
    defineProps<{
      slide: SlideDefinition
      slideIndex: number
      slideCount: number
      deckTitle?: string
      tabId: string
      labelledBy: string
      readOnly?: boolean
      selectedObjectId?: DeckObjectKind
    }>(),
    { readOnly: false, deckTitle: 'Deck', selectedObjectId: 'slide' },
  )

  const emit = defineEmits<{
    'update-regions': [patch: Partial<SlideRegions>]
    'select-object': [objectId: DeckObjectKind]
  }>()

  const layoutId = computed(() => effectiveLayoutId(props.slide.regions))

  const titleHtml = ref('')
  const bodyHtml = ref('')
  const hasQueryView = computed(() => !!props.slide.regions.queryView?.query)

  const showBody = computed(() => layoutId.value === 'content' || layoutId.value === 'two-col')
  const showQueryView = computed(() => layoutId.value === 'live-data' && hasQueryView.value)
  const showTwoCol = computed(() => layoutId.value === 'two-col')
  const htmlObjects = computed(() => props.slide.regions.objects?.filter((object) => object.kind === 'html') ?? [])

  function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').trim()
  }

  const titleDisplay = computed(() => {
    const stripped = stripHtml(titleHtml.value)
    return stripped || props.slide.title
  })

  function syncFromSlide() {
    titleHtml.value = props.slide.regions.title || ''
    bodyHtml.value = props.slide.regions.body || ''
  }

  watch(() => props.slide.entityId, syncFromSlide, { immediate: true })

  watch(
    () => props.slide.regions.title,
    (val) => {
      if (val !== titleHtml.value) titleHtml.value = val || ''
    },
  )

  watch(
    () => props.slide.regions.body,
    (val) => {
      if (val !== bodyHtml.value) bodyHtml.value = val || ''
    },
  )

  let titleTimer: ReturnType<typeof setTimeout> | null = null
  let bodyTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleTitleSave() {
    if (props.readOnly) return
    if (titleTimer) clearTimeout(titleTimer)
    titleTimer = setTimeout(() => {
      emit('update-regions', { title: titleHtml.value })
    }, 400)
  }

  function scheduleBodySave() {
    if (props.readOnly) return
    if (bodyTimer) clearTimeout(bodyTimer)
    bodyTimer = setTimeout(() => {
      emit('update-regions', { body: bodyHtml.value })
    }, 400)
  }

  function flushSaves() {
    if (titleTimer) {
      clearTimeout(titleTimer)
      titleTimer = null
      if (!props.readOnly) emit('update-regions', { title: titleHtml.value })
    }
    if (bodyTimer) {
      clearTimeout(bodyTimer)
      bodyTimer = null
      if (!props.readOnly) emit('update-regions', { body: bodyHtml.value })
    }
  }

  function selectObject(objectId: DeckObjectKind) {
    if (props.readOnly) return
    emit('select-object', objectId)
  }

  function selectSlide() {
    selectObject('slide')
  }

  function isSelected(objectId: DeckObjectKind): boolean {
    return props.selectedObjectId === objectId
  }

  function objectSelectionId(id: string): DeckObjectKind {
    return `object:${id}`
  }

  function objectStyle(object: NonNullable<SlideRegions['objects']>[number]) {
    return {
      left: `${object.frame.x}%`,
      top: `${object.frame.y}%`,
      width: `${object.frame.width}%`,
      height: `${object.frame.height}%`,
      zIndex: object.frame.zIndex ?? 10,
    }
  }

  function onEditorPointerdown(objectId: DeckObjectKind) {
    selectObject(objectId)
  }

  onBeforeUnmount(flushSaves)
</script>

<template>
  <div
    :id="tabId"
    role="tabpanel"
    :aria-labelledby="labelledBy"
    aria-live="polite"
    class="deck-slide-stage relative flex h-full flex-col overflow-hidden rounded-md bg-[#0d0d11] p-[clamp(10px,2.5cqw,20px)]"
    style="container-type: inline-size"
    @click.self="selectSlide"
  >
    <SelectableSlideRegion
      v-if="slide.regions.eyebrow"
      object-id="eyebrow"
      :selected="isSelected('eyebrow')"
      :read-only="readOnly"
      label="Eyebrow object"
      class="w-fit shrink-0 px-1.5 py-1"
      @select="selectObject"
    >
      <div class="text-[clamp(8px,1.8cqw,10.5px)] font-medium uppercase tracking-[0.14em] text-violet-400/90">
        {{ slide.regions.eyebrow }}
      </div>
    </SelectableSlideRegion>

    <SelectableSlideRegion
      object-id="title"
      :selected="isSelected('title')"
      :read-only="readOnly"
      :label="readOnly ? 'Slide title' : 'Title object'"
      class="shrink-0 px-2 py-1"
      @select="selectObject"
    >
      <UiRichTextEditor
        v-if="!readOnly"
        v-model="titleHtml"
        compact
        seamless
        :embeds="false"
        :mentions="false"
        placeholder="Slide title…"
        class="deck-slide-title-editor"
        aria-label="Slide title"
        @pointerdown="onEditorPointerdown('title')"
        @update:model-value="scheduleTitleSave"
        @blur="scheduleTitleSave"
      />
      <h2
        v-else
        class="text-center text-[clamp(16px,4.5cqw,28px)] font-semibold leading-tight text-foreground"
      >
        {{ titleDisplay }}
      </h2>
    </SelectableSlideRegion>

    <div class="min-h-0 flex-1 overflow-hidden" @click.self="selectSlide">
      <SelectableSlideRegion
        v-if="showQueryView && slide.regions.queryView"
        object-id="queryView"
        :selected="isSelected('queryView')"
        :read-only="readOnly"
        label="Query view object"
        class="h-full p-1"
        @select="selectObject"
      >
        <QueryViewRegion
          :slide-entity-id="slide.entityId"
          :config="slide.regions.queryView"
        />
      </SelectableSlideRegion>

      <div
        v-else-if="showBody && showTwoCol"
        class="grid h-full grid-cols-2 gap-[clamp(6px,1.5cqw,12px)] overflow-hidden text-sm"
      >
        <SelectableSlideRegion
          object-id="body"
          :selected="isSelected('body')"
          :read-only="readOnly"
          label="Body object"
          class="overflow-hidden p-1"
          @select="selectObject"
        >
          <UiRichTextEditor
            v-if="!readOnly"
            v-model="bodyHtml"
            compact
            seamless
            :embeds="false"
            :mentions="false"
            placeholder="Column A…"
            class="deck-slide-body-editor h-full"
            aria-label="Slide body"
            @pointerdown="onEditorPointerdown('body')"
            @update:model-value="scheduleBodySave"
            @blur="scheduleBodySave"
          />
          <div v-else class="prose prose-invert prose-p:my-0 text-muted-foreground" v-html="bodyHtml || '<p>Column A</p>'" />
        </SelectableSlideRegion>
        <div class="prose prose-invert prose-p:my-0 overflow-hidden text-muted-foreground" v-html="bodyHtml || '<p>Column B</p>'" />
      </div>

      <SelectableSlideRegion
        v-else-if="showBody"
        object-id="body"
        :selected="isSelected('body')"
        :read-only="readOnly"
        label="Body object"
        class="mx-auto h-full max-w-[90%] overflow-hidden p-1"
        @select="selectObject"
      >
        <UiRichTextEditor
          v-if="!readOnly"
          v-model="bodyHtml"
          compact
          seamless
          :embeds="false"
          :mentions="false"
          placeholder="Slide body…"
          class="deck-slide-body-editor h-full text-center"
          aria-label="Slide body"
          @pointerdown="onEditorPointerdown('body')"
          @update:model-value="scheduleBodySave"
          @blur="scheduleBodySave"
        />
        <div
          v-else
          class="prose prose-invert prose-p:my-0 text-center text-sm text-muted-foreground"
          v-html="bodyHtml || '<p></p>'"
        />
      </SelectableSlideRegion>
    </div>

    <SelectableSlideRegion
      v-for="object in htmlObjects"
      :key="object.id"
      :object-id="objectSelectionId(object.id)"
      :selected="isSelected(objectSelectionId(object.id))"
      :read-only="readOnly"
      label="HTML embed object"
      class="absolute overflow-hidden p-1"
      :style="objectStyle(object)"
      @select="selectObject"
    >
      <HtmlEmbedFrame
        :config="object.block"
        :selected="isSelected(objectSelectionId(object.id))"
        :editable="false"
        surface="deck"
      />
    </SelectableSlideRegion>

    <div class="shrink-0 pt-1 text-center font-mono text-[clamp(7px,1.5cqw,10px)] uppercase tracking-wider text-muted-foreground/70">
      {{ deckTitle }} · {{ slideIndex + 1 }} / {{ slideCount }}
    </div>
  </div>
</template>

<style scoped>
  .deck-slide-title-editor :deep(.ProseMirror) {
    text-align: center;
    font-size: clamp(16px, 4.5cqw, 28px);
    font-weight: 600;
    line-height: 1.2;
  }

  .deck-slide-body-editor :deep(.ProseMirror) {
    font-size: clamp(11px, 2.2cqw, 14px);
    line-height: 1.45;
  }

  .deck-slide-body-editor.text-center :deep(.ProseMirror) {
    text-align: center;
  }
</style>
