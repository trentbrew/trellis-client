<script lang="ts" setup>
  import EntityDialogShell from '~/components/dialogs/EntityDialogShell.vue'
  import SlideDeckProjection from '~/components/data/SlideDeckProjection.vue'
  import type { SlideDeckItem, Entity } from '~/types/entity'

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'view' | 'create' | 'edit'
      item: SlideDeckItem | null
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
    }>(),
    {
      mode: 'edit',
      canNavigatePrev: false,
      canNavigateNext: false,
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    save: [item: Entity]
    delete: [item: Entity]
    close: []
    navigatePrev: []
    navigateNext: []
  }>()

  // ── Local state ──────────────────────────────────────────────────────────

  const localTitle = ref(props.item?.title ?? '')
  const localDescription = ref(props.item?.description ?? '')
  const localCategory = ref(props.item?.category ?? 'general')
  const localPinned = ref(props.item?.pinned ?? false)
  const localSlideTheme = ref<'dark' | 'light' | 'auto'>(props.item?.slideTheme ?? 'dark')

  // Sync when item changes
  watch(
    () => props.item,
    (item) => {
      if (item) {
        localTitle.value = item.title
        localDescription.value = item.description ?? ''
        localCategory.value = item.category ?? 'general'
        localPinned.value = item.pinned
        localSlideTheme.value = item.slideTheme ?? 'dark'
      }
    },
  )

  // ── Slides data ──────────────────────────────────────────────────────────

  const slidesData = computed(() => {
    if (!props.item?.slides) return '[]'
    // If slides is already a JSON string, return as-is
    try {
      JSON.parse(props.item.slides)
      return props.item.slides
    } catch {
      return '[]'
    }
  })

  const slideCount = computed(() => {
    try {
      const parsed = JSON.parse(slidesData.value)
      return Array.isArray(parsed) ? parsed.length : parsed?.['@graph']?.length ?? 0
    } catch {
      return 0
    }
  })

  // ── Projection ref & derived state ──────────────────────────────────────

  const projectionRef = ref<InstanceType<typeof SlideDeckProjection> | null>(null)
  const activeSlideIndex = ref(0)

  function onSlideIndexChange(idx: number) {
    activeSlideIndex.value = idx
  }

  interface ParsedSlide {
    id: string
    title: string
    speakerNotes: string
  }

  const parsedSlides = computed<ParsedSlide[]>(() => {
    try {
      const parsed = JSON.parse(slidesData.value)
      const items = Array.isArray(parsed) ? parsed : parsed?.['@graph'] ?? []
      return items.map((item: any, idx: number) => {
        const fields = item.fields ?? item
        return {
          id: item.id ?? `slide-${idx}`,
          title: String(fields.title ?? fields.Title ?? ''),
          speakerNotes: String(fields.speakerNotes ?? fields.SpeakerNotes ?? ''),
        }
      })
    } catch {
      return []
    }
  })

  const activeSpeakerNotes = computed(() => {
    return parsedSlides.value[activeSlideIndex.value]?.speakerNotes || ''
  })

  // ── Resizable speaker notes ───────────────────────────────────────────────

  const notesRef = ref<HTMLElement | null>(null)
  const notesHeight = ref(80)

  function startNotesResize(e: MouseEvent) {
    e.preventDefault()
    const startY = e.clientY
    const startH = notesHeight.value

    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY
      notesHeight.value = Math.max(48, Math.min(300, startH + delta))
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleSave() {
    if (!props.item) return
    const updated: SlideDeckItem = {
      ...props.item,
      title: localTitle.value,
      description: localDescription.value,
      category: localCategory.value,
      pinned: localPinned.value,
      slideTheme: localSlideTheme.value,
    }
    emit('save', updated)
  }

  function handleDelete() {
    if (!props.item) return
    emit('delete', props.item)
  }

  const themeOptions = [
    { value: 'dark', label: 'Dark', icon: 'lucide:moon' },
    { value: 'light', label: 'Light', icon: 'lucide:sun' },
    { value: 'auto', label: 'Auto', icon: 'lucide:monitor' },
  ]

  const categoryOptions = [
    { value: 'general', label: 'General' },
    { value: 'work', label: 'Work' },
    { value: 'personal', label: 'Personal' },
  ]
</script>

<template>
  <EntityDialogShell
    :open="open"
    :title="localTitle"
    :description="localDescription"
    :mode="mode"
    :type-badge="{ icon: 'lucide:presentation', label: 'Slide Deck' }"
    title-placeholder="Untitled Slide Deck"
    :can-navigate-prev="canNavigatePrev"
    :can-navigate-next="canNavigateNext"
    dialog-title="Slide Deck"
    dialog-description="View and manage slide deck"
    @update:open="emit('update:open', $event)"
    @update:title="localTitle = $event"
    @update:description="localDescription = $event"
    @close="emit('close')"
    @navigate-prev="emit('navigatePrev')"
    @navigate-next="emit('navigateNext')">
    <!-- Properties row -->
    <template #properties>
      <!-- Theme selector -->
      <UiPopover>
        <UiPopoverTrigger as-child>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium whitespace-nowrap">
            <Icon :name="themeOptions.find((t) => t.value === localSlideTheme)?.icon || 'lucide:moon'" class="h-3.5 w-3.5" />
            {{ themeOptions.find((t) => t.value === localSlideTheme)?.label || 'Dark' }}
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-36 p-1">
          <button
            v-for="opt in themeOptions"
            :key="opt.value"
            type="button"
            class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors"
            :class="localSlideTheme === opt.value ? 'bg-muted font-medium' : ''"
            @click="localSlideTheme = opt.value as 'dark' | 'light' | 'auto'">
            <Icon :name="opt.icon" class="h-3.5 w-3.5" />
            {{ opt.label }}
          </button>
        </UiPopoverContent>
      </UiPopover>

      <!-- Category -->
      <UiPopover>
        <UiPopoverTrigger as-child>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium whitespace-nowrap">
            <Icon name="lucide:tag" class="h-3.5 w-3.5" />
            {{ categoryOptions.find((c) => c.value === localCategory)?.label || 'General' }}
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-36 p-1">
          <button
            v-for="opt in categoryOptions"
            :key="opt.value"
            type="button"
            class="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors"
            :class="localCategory === opt.value ? 'bg-muted font-medium' : ''"
            @click="localCategory = opt.value">
            {{ opt.label }}
          </button>
        </UiPopoverContent>
      </UiPopover>

      <!-- Pin toggle -->
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
        :class="localPinned ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-muted/50 hover:bg-muted text-muted-foreground'"
        @click="localPinned = !localPinned">
        <Icon name="lucide:pin" class="h-3.5 w-3.5" />
        {{ localPinned ? 'Pinned' : 'Pin' }}
      </button>

      <!-- Slide count badge -->
      <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 text-xs font-medium text-muted-foreground whitespace-nowrap">
        <Icon name="lucide:layers" class="h-3.5 w-3.5" />
        {{ slideCount }} slides
      </span>
    </template>

    <!-- Main content: Slide viewport + Speaker notes + Anchors -->
    <div class="flex-1 flex flex-col overflow-hidden min-h-0">
      <!-- Slide projection -->
      <div class="flex-1 overflow-hidden min-h-0">
        <SlideDeckProjection
          v-if="slideCount > 0"
          ref="projectionRef"
          collection-id="slide-deck-dialog"
          :model-value="slidesData"
          hide-thumbnails
          :config="{
            slideTheme: localSlideTheme,
            slideTransition: item?.slideTransition || 'fade',
          }"
          @update:slide-index="onSlideIndexChange" />
        <div v-else class="flex flex-col items-center justify-center h-full py-20 text-center">
          <Icon name="lucide:presentation" class="h-16 w-16 text-muted-foreground/20 mb-4" />
          <h3 class="text-lg font-medium text-foreground mb-1">No slides yet</h3>
          <p class="text-sm text-muted-foreground max-w-sm">
            This slide deck is empty. Add slides to start building your presentation.
          </p>
        </div>
      </div>

      <!-- Speaker notes pane (resizable) -->
      <div v-if="activeSpeakerNotes" ref="notesRef" class="slide-dialog-notes" :style="{ height: notesHeight + 'px' }">
        <div class="slide-dialog-notes-resize" @mousedown="startNotesResize" />
        <div class="slide-dialog-notes-header">
          <Icon name="lucide:message-square-text" class="h-3.5 w-3.5 text-muted-foreground" />
          <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Speaker Notes</span>
        </div>
        <p class="text-xs text-muted-foreground/80 leading-relaxed whitespace-pre-wrap overflow-y-auto flex-1 min-h-0">{{ activeSpeakerNotes }}</p>
      </div>

      <!-- Slide anchors (bottom) -->
      <div v-if="slideCount > 1" class="slide-dialog-anchors">
        <button
          v-for="(slide, idx) in parsedSlides"
          :key="slide.id"
          class="slide-dialog-anchor"
          :class="{ 'slide-dialog-anchor-active': idx === activeSlideIndex }"
          @click="projectionRef?.goTo(idx); activeSlideIndex = idx">
          <span class="slide-dialog-anchor-number">{{ idx + 1 }}</span>
          <span class="slide-dialog-anchor-title">{{ slide.title || `Slide ${idx + 1}` }}</span>
        </button>
      </div>
    </div>

    <!-- Footer -->
    <template #footer-left>
      <span v-if="item" class="text-[11px] text-muted-foreground font-mono">
        {{ item.id.slice(0, 8) }}
      </span>
    </template>
    <template #footer-right>
      <div class="flex items-center gap-2">
        <UiButton v-if="mode === 'edit'" variant="ghost" size="sm" class="text-destructive hover:text-destructive" @click="handleDelete">
          <Icon name="lucide:trash-2" class="h-4 w-4 mr-1" />
          Delete
        </UiButton>
        <UiButton v-if="mode === 'edit'" size="sm" @click="handleSave">
          Save
        </UiButton>
        <UiButton variant="outline" size="sm" @click="emit('close')">
          Close
        </UiButton>
      </div>
    </template>
  </EntityDialogShell>
</template>

<style scoped>
  /* ── Speaker notes pane (resizable) ──────────────────────────────────────── */

  .slide-dialog-notes {
    position: relative;
    display: flex;
    flex-direction: column;
    border-top: 1px solid hsl(var(--border));
    padding: 0.5rem 0.75rem;
    background: hsl(var(--muted) / 0.2);
    flex-shrink: 0;
    overflow: hidden;
  }

  .slide-dialog-notes-resize {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    cursor: ns-resize;
    z-index: 2;
  }

  .slide-dialog-notes-resize:hover,
  .slide-dialog-notes-resize:active {
    background: hsl(var(--primary) / 0.3);
  }

  .slide-dialog-notes-header {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-bottom: 0.25rem;
    flex-shrink: 0;
  }

  /* ── Bottom slide anchors ────────────────────────────────────────────────── */

  .slide-dialog-anchors {
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    overflow-x: auto;
    border-top: 1px solid hsl(var(--border));
    background: hsl(var(--background));
    scrollbar-width: thin;
    flex-shrink: 0;
  }

  .slide-dialog-anchor {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
    border: 1px solid transparent;
    background: transparent;
    color: hsl(var(--muted-foreground));
    font-size: 0.75rem;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .slide-dialog-anchor:hover {
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
  }

  .slide-dialog-anchor-active {
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
    border-color: hsl(var(--border));
  }

  .slide-dialog-anchor-number {
    font-variant-numeric: tabular-nums;
    opacity: 0.5;
    font-size: 0.625rem;
  }

  .slide-dialog-anchor-title {
    max-width: 8rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
