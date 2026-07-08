<script lang="ts" setup>
  /**
   * EntityDialogShell — Reusable dialog chrome for all Entity dialogs.
   *
   * Provides:
   *  - UiDialog + UiDialogContent with correct sizing & zero-padding
   *  - Header: type badge, schedule badge (edit mode), nav arrows, close, title input, seamless description
   *  - Properties row: single-line, scrollable, via #properties slot
   *  - Content area: via default slot (caller owns layout: sidebars, divide-y, etc.)
   *  - Footer: left info + right actions via #footer-left / #footer-right slots
   */

  const props = withDefaults(
    defineProps<{
      open: boolean
      title: string
      description: string
      mode?: 'view' | 'create' | 'edit'
      typeBadge?: { icon: string; label: string }
      titlePlaceholder?: string
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
      /** sr-only dialog title override */
      dialogTitle?: string
      /** sr-only dialog description override */
      dialogDescription?: string
      /** Entity ID for per-entity editing presence */
      entityId?: string
      /** AI-generated summary of the description (optional) */
      summary?: string
      /** Whether the summary is currently being generated */
      isGeneratingSummary?: boolean
      /**
       * Entity type identifier (e.g. 'email', 'task'). Used by the shell to
       * specialize behaviour for certain types — currently:
       * - 'email' → render description as a read-only AI summary (no editable
       *   textarea), since summaries are owned by the gmail ingest pipeline.
       */
      itemType?: string
      /**
       * Presentation variant.
       * - 'dialog': portal overlay modal (default)
       * - 'inset': resizable right-anchored panel with tabbed layout
       * - 'inline': fills its parent container; same 3-column layout as 'dialog'
       *   but rendered inline without the UiDialog portal, resize handles, or
       *   stack-aware chrome. Use this when embedding the entity UI inside a
       *   page (e.g. the mail viewer).
       */
      variant?: 'dialog' | 'inset' | 'inline'
      /**
       * When true, the shell strips title/description/properties from the
       * fixed header chrome — the caller renders them inside its scrollable
       * body (e.g. via `EntityBodyHeader`). The `#properties` slot is
       * ignored in this mode; properties live in the right sidebar tab.
       */
      headerInBody?: boolean
      /** Tags slot on the same row as type badge (dialog variant only). */
      inlineHeaderTags?: boolean
    }>(),
    {
      mode: 'edit',
      canNavigatePrev: false,
      canNavigateNext: false,
      summary: '',
      isGeneratingSummary: false,
      itemType: undefined,
      variant: 'dialog',
      headerInBody: false,
      inlineHeaderTags: false,
    },
  )

  /** Whether the description block should render as read-only AI summary. */
  const isAiOnlyDescription = computed(() => props.itemType === 'email')

  const isInset = computed(() => props.variant === 'inset')
  const isInline = computed(() => props.variant === 'inline')

  const emit = defineEmits<{
    'update:open': [value: boolean]
    'update:title': [value: string]
    'update:description': [value: string]
    close: []
    navigatePrev: []
    navigateNext: []
    regenerateSummary: []
  }>()

  const isViewMode = computed(() => props.mode === 'view')
  const isCreateMode = computed(() => props.mode === 'create')

  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }

  // ── Per-entity editing presence ────────────────────────────────────
  const presenceEntityId = computed(() => props.entityId)
  const { peerList, peerCount } = useEntityPresence(presenceEntityId)

  // ── Stack-aware positioning ─────────────────────────────────────────
  const {
    buildContentStyle,
    overlayClass: stackOverlayClass,
    stackTransform,
    isStacked,
    parentTitle,
    hideNavigation,
    onBack,
    reportDimensions,
  } = useDialogStackAware()

  // ── Originating-dialog tracking (for backdrop blur on pages route) ──
  // Only the modal 'dialog' variant participates in the stack — 'inset' and
  // 'inline' render inline and must not influence modal backdrop state.
  const { setOriginatingDialogOpen } = useDialogStack()
  watch(
    () => props.open,
    (val) => {
      if (!isStacked.value && !isInset.value && !isInline.value) setOriginatingDialogOpen(val)
    },
    { immediate: true },
  )
  onUnmounted(() => {
    if (!isStacked.value && !isInset.value && !isInline.value) setOriginatingDialogOpen(false)
  })

  const closeOriginSignal = useState<number>('navigation:closeOriginDialog', () => 0)
  watch(closeOriginSignal, () => {
    if (props.open && !isStacked.value && !isInset.value && !isInline.value) closeDialog()
  })

  // ── Inset panel width (resizable, persisted) ───────────────────────────
  const INSET_DEFAULT_W = 520
  const INSET_MIN_W = 380
  const INSET_MAX_W = computed(() => Math.min(720, window.innerWidth - 48))
  const insetPanelW = ref(INSET_DEFAULT_W)
  const isInsetResizing = ref(false)

  function loadInsetWidth(): number {
    if (!import.meta.client) return INSET_DEFAULT_W
    try {
      const raw = window.localStorage.getItem('entity:inset-panel-width')
      const n = raw ? Number(raw) : INSET_DEFAULT_W
      return Number.isFinite(n) ? n : INSET_DEFAULT_W
    } catch {
      return INSET_DEFAULT_W
    }
  }

  function persistInsetWidth() {
    if (!import.meta.client) return
    try {
      window.localStorage.setItem('entity:inset-panel-width', String(insetPanelW.value))
    } catch {
      // ignore quota / private mode
    }
  }

  onMounted(() => {
    insetPanelW.value = Math.max(INSET_MIN_W, Math.min(INSET_MAX_W.value, loadInsetWidth()))
  })

  function startInsetResize(e: PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    isInsetResizing.value = true
    const startX = e.clientX
    const startW = insetPanelW.value
    document.body.style.cursor = 'ew-resize'
    const onMove = (ev: PointerEvent) => {
      const dx = startX - ev.clientX
      insetPanelW.value = Math.max(INSET_MIN_W, Math.min(INSET_MAX_W.value, startW + dx))
    }
    const onUp = () => {
      isInsetResizing.value = false
      document.body.style.cursor = ''
      persistInsetWidth()
      el.releasePointerCapture(e.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  // ── Resize logic ──────────────────────────────────────────────────────
  const MIN_W = 640
  const MIN_H = 480
  const MAX_W = computed(() => window.innerWidth - 48)
  const MAX_H = computed(() => window.innerHeight - 48)
  const defaultSize = computed(() => {
    const vpW = window.innerWidth
    const vpH = window.innerHeight
    const aspect = vpW / vpH
    const scale = 0.86
    let w = Math.round(vpW * scale)
    let h = Math.round(vpH * scale)
    // Apply max caps while preserving viewport aspect ratio
    if (w > 1560) {
      w = 1560
      h = Math.round(w / aspect)
    }
    if (h > 1080) {
      h = 1080
      w = Math.round(h * aspect)
    }
    return { w, h }
  })
  const DEFAULT_W = computed(() => defaultSize.value.w)
  const DEFAULT_H = computed(() => defaultSize.value.h)

  const dialogW = ref(DEFAULT_W.value)
  const dialogH = ref(DEFAULT_H.value)

  // Reset to default when dialog opens
  watch(
    () => props.open,
    (val) => {
      if (val) {
        dialogW.value = Math.min(DEFAULT_W.value, MAX_W.value)
        dialogH.value =
          props.itemType === 'file' ? MAX_H.value : Math.min(DEFAULT_H.value, MAX_H.value)
      }
    },
  )

  const clampW = (v: number) => Math.max(MIN_W, Math.min(v, MAX_W.value))
  const clampH = (v: number) => Math.max(MIN_H, Math.min(v, MAX_H.value))

  type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

  const isResizing = ref(false)

  const startResize = (edge: Edge, e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    isResizing.value = true

    const startX = e.clientX
    const startY = e.clientY
    const startW = dialogW.value
    const startH = dialogH.value

    // Set body cursor so it persists even when pointer leaves the handle
    const cursorMap: Record<Edge, string> = {
      n: 'ns-resize',
      s: 'ns-resize',
      e: 'ew-resize',
      w: 'ew-resize',
      ne: 'nesw-resize',
      sw: 'nesw-resize',
      nw: 'nwse-resize',
      se: 'nwse-resize',
    }
    document.body.style.cursor = cursorMap[edge]

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY

      if (edge.includes('e')) dialogW.value = clampW(startW + dx * 2)
      if (edge.includes('w')) dialogW.value = clampW(startW - dx * 2)
      if (edge.includes('s')) dialogH.value = clampH(startH + dy * 2)
      if (edge.includes('n')) dialogH.value = clampH(startH - dy * 2)
    }

    const onUp = () => {
      isResizing.value = false
      document.body.style.cursor = ''
      el.releasePointerCapture(e.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  // Report dimensions to shared state so stacked dialogs can match
  watch([dialogW, dialogH], ([w, h]) => reportDimensions(w, h), { immediate: true })

  const preventOutsideClose = (e: Event) => {
    const target = ((e as any).detail?.originalEvent?.target ?? (e as any).target) as HTMLElement | null
    if (isResizing.value || !stackTransform.value.interactive || target?.closest('[data-slot="right-sidebar"]')) {
      e.preventDefault()
    }
  }
</script>

<template>
  <!-- ═══ Inline variant — fills parent container, no portal/modal ═══ -->
  <div v-if="isInline" v-show="open" class="h-full w-full flex flex-col bg-card overflow-hidden relative">
    <h2 class="sr-only">{{ dialogTitle || title || 'Item' }}</h2>
    <p class="sr-only">{{ dialogDescription || 'Item details.' }}</p>

    <!-- Header -->
    <div class="shrink-0 border-b border-border">
      <div class="px-3 pt-1.5 pb-1.5">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0 flex-wrap">
            <span
              v-if="typeBadge"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
              <Icon :name="typeBadge.icon" class="h-3 w-3" />
              {{ typeBadge.label }}
            </span>
            <slot name="header-badges" />
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <template v-if="!isCreateMode">
              <UiButton
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                :disabled="!canNavigatePrev"
                title="Previous"
                @click="emit('navigatePrev')">
                <Icon name="lucide:chevron-up" class="h-4 w-4" />
              </UiButton>
              <UiButton
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                :disabled="!canNavigateNext"
                title="Next"
                @click="emit('navigateNext')">
                <Icon name="lucide:chevron-down" class="h-4 w-4" />
              </UiButton>
            </template>
            <span v-if="!isCreateMode" class="mx-0.5 h-4 w-px shrink-0 bg-border/60" aria-hidden="true" />
            <slot name="header-actions" />
            <UiButton variant="ghost" size="icon" class="h-7 w-7" title="Close" @click="closeDialog">
              <Icon name="lucide:x" class="h-4 w-4" />
            </UiButton>
          </div>
        </div>
        <div v-if="$slots['header-tags']" class="mt-2">
          <slot name="header-tags" />
        </div>
        <template v-if="!headerInBody">
          <textarea
            v-if="!isViewMode"
            :value="title"
            rows="1"
            :placeholder="titlePlaceholder || 'Item name...'"
            spellcheck="false"
            class="w-full min-h-0 mt-3 resize-none overflow-hidden field-sizing-content text-xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0.5 -mx-1 transition-all break-words whitespace-pre-wrap leading-snug"
            @input="emit('update:title', ($event.target as HTMLTextAreaElement).value)" />
          <h2 v-else class="text-xl font-semibold px-1 mt-3 break-words whitespace-pre-wrap leading-snug">
            {{ title }}
          </h2>
          <div class="mt-1 px-1">
            <EntityDescriptionBlock
              :description="description"
              :summary="summary"
              :is-generating-summary="isGeneratingSummary"
              :mode="mode"
              :entity-id="entityId"
              :ai-only="isAiOnlyDescription"
              @update:description="emit('update:description', $event)"
              @regenerate-summary="emit('regenerateSummary')" />
          </div>
        </template>
      </div>
    </div>

    <!-- Properties Row (hidden when headerInBody — properties live in right sidebar tab) -->
    <div v-if="!headerInBody && $slots.properties" class="bg-card px-4 py-2.5 border-b border-border shrink-0">
      <div class="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none whitespace-nowrap">
        <slot name="properties" />
        <slot name="properties-tags" />
        <slot name="extension-properties" />
      </div>
    </div>

    <!-- Comments -->
    <div v-if="$slots.comments" class="shrink-0 border-b border-border">
      <slot name="comments" />
    </div>

    <!-- Content Area — 3-column layout delegated to default slot -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <slot />
    </div>

    <!-- Footer -->
    <div class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 text-xs text-muted-foreground min-w-0 flex-1 overflow-hidden">
        <slot name="footer-left" />
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <slot name="footer-right" />
      </div>
    </div>
  </div>

  <!-- ═══ Inset variant — resizable right panel with tabbed layout ═══ -->
  <div
    v-else-if="isInset"
    v-show="open"
    class="absolute top-3 bottom-3 right-3 z-20 flex flex-col rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
    :class="isInsetResizing ? 'select-none' : ''"
    :style="{ width: `${insetPanelW}px` }">
    <div
      class="absolute inset-y-3 left-0 z-30 w-1.5 -translate-x-1/2 cursor-ew-resize rounded-full hover:bg-primary/25 active:bg-primary/35 transition-colors"
      aria-label="Resize detail panel"
      @pointerdown="startInsetResize" />
    <h2 class="sr-only">{{ dialogTitle || title || 'Item' }}</h2>
    <p class="sr-only">{{ dialogDescription || 'Item details.' }}</p>

    <!-- Header -->
    <div class="shrink-0 border-b border-border">
      <div class="px-4 pt-3 pb-3">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0 flex-wrap">
            <span
              v-if="typeBadge"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
              <Icon :name="typeBadge.icon" class="h-3 w-3" />
              {{ typeBadge.label }}
            </span>
            <slot name="header-badges" />
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <UiButton variant="ghost" size="icon" class="h-7 w-7" @click="closeDialog">
              <Icon name="lucide:x" class="h-4 w-4" />
            </UiButton>
          </div>
        </div>
        <div v-if="$slots['header-tags']" class="mt-2">
          <slot name="header-tags" />
        </div>
        <template v-if="!headerInBody">
          <textarea
            v-if="!isViewMode"
            :value="title"
            rows="1"
            :placeholder="titlePlaceholder || 'Item name...'"
            spellcheck="false"
            class="w-full min-h-0 mt-3 resize-none overflow-hidden field-sizing-content text-xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0.5 -mx-1 transition-all break-words whitespace-pre-wrap leading-snug"
            @input="emit('update:title', ($event.target as HTMLTextAreaElement).value)" />
          <h2 v-else class="text-xl font-semibold px-1 mt-3 break-words whitespace-pre-wrap leading-snug">
            {{ title }}
          </h2>
          <div class="mt-1 px-1">
            <EntityDescriptionBlock
              :description="description"
              :summary="summary"
              :is-generating-summary="isGeneratingSummary"
              :mode="mode"
              :entity-id="entityId"
              :ai-only="isAiOnlyDescription"
              @update:description="emit('update:description', $event)"
              @regenerate-summary="emit('regenerateSummary')" />
          </div>
        </template>
      </div>
    </div>

    <!-- Properties Row (hidden when headerInBody — properties live in right sidebar tab) -->
    <div v-if="!headerInBody && $slots.properties" class="sticky top-0 z-10 bg-card px-4 py-2.5 border-b border-border">
      <div class="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none whitespace-nowrap">
        <slot name="properties" />
        <slot name="properties-tags" />
        <slot name="extension-properties" />
      </div>
    </div>

    <!-- Comments -->
    <div v-if="$slots.comments" class="shrink-0 border-b border-border">
      <slot name="comments" />
    </div>

    <!-- Content -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <slot />
    </div>

    <!-- Footer -->
    <div class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 text-xs text-muted-foreground min-w-0 flex-1 overflow-hidden">
        <slot name="footer-left" />
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <slot name="footer-right" />
      </div>
    </div>
  </div>

  <UiDialog v-else :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :hide-close="true"
      :overlay-class="stackOverlayClass"
      :style="buildContentStyle(dialogW, dialogH)"
      :class="[isResizing ? 'select-none duration-0 transition-none' : '']"
      class="p-0! gap-0! overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex! flex-col relative"
      @pointer-down-outside="preventOutsideClose"
      @interact-outside="preventOutsideClose">
      <!-- Resize handles -->
      <div class="absolute inset-x-2 top-0 h-1 cursor-ns-resize z-50" @pointerdown="startResize('n', $event)" />
      <div class="absolute inset-x-2 bottom-0 h-1 cursor-ns-resize z-50" @pointerdown="startResize('s', $event)" />
      <div class="absolute inset-y-2 left-0 w-1 cursor-ew-resize z-50" @pointerdown="startResize('w', $event)" />
      <div class="absolute inset-y-2 right-0 w-1 cursor-ew-resize z-50" @pointerdown="startResize('e', $event)" />
      <div class="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-50" @pointerdown="startResize('nw', $event)" />
      <div class="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-50" @pointerdown="startResize('ne', $event)" />
      <div class="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-50" @pointerdown="startResize('sw', $event)" />
      <div class="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-50" @pointerdown="startResize('se', $event)" />
      <UiDialogTitle class="sr-only">
        {{ dialogTitle || title || 'Item' }}
      </UiDialogTitle>
      <UiDialogDescription class="sr-only">
        {{ dialogDescription || 'Item details.' }}
      </UiDialogDescription>

      <!-- Header -->
      <div class="shrink-0 border-b border-border">
        <!-- Back button for stacked dialogs -->
        <div v-if="isStacked && parentTitle" class="px-4 pt-2 pb-0">
          <button
            class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors -ml-1 px-1 py-0.5 rounded-md hover:bg-muted/50"
            @click="onBack">
            <Icon name="lucide:arrow-left" class="h-3.5 w-3.5" />
            <span class="truncate max-w-[240px]">{{ parentTitle }}</span>
          </button>
        </div>
        <div :class="isStacked && parentTitle ? 'p-3' : 'p-3'">
          <div class="flex items-center justify-between gap-3 mb-0">
            <div class="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <span
                v-if="typeBadge"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary shrink-0">
                <Icon :name="typeBadge.icon" class="h-3 w-3" />
                {{ typeBadge.label }}
              </span>
              <slot name="header-badges" />
              <div
                v-if="inlineHeaderTags && $slots['header-tags']"
                class="flex items-center min-w-0 flex-1 overflow-hidden pl-1">
                <slot name="header-tags" />
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <template v-if="!isCreateMode && !hideNavigation">
                <UiButton
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7"
                  :disabled="!canNavigatePrev"
                  @click="emit('navigatePrev')">
                  <Icon name="lucide:chevron-up" class="h-4 w-4" />
                </UiButton>
                <UiButton
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7"
                  :disabled="!canNavigateNext"
                  @click="emit('navigateNext')">
                  <Icon name="lucide:chevron-down" class="h-4 w-4" />
                </UiButton>
              </template>
              <span
                v-if="!isCreateMode && !hideNavigation"
                class="mx-0.5 h-4 w-px shrink-0 bg-border/60"
                aria-hidden="true" />
              <slot name="header-actions" />
              <UiButton v-if="!isStacked" variant="ghost" size="icon" class="h-7 w-7" @click="closeDialog">
                <Icon name="lucide:x" class="h-4 w-4" />
              </UiButton>
            </div>
          </div>
          <div v-if="!inlineHeaderTags && $slots['header-tags']" class="mt-2">
            <slot name="header-tags" />
          </div>
          <template v-if="!headerInBody">
            <textarea
              v-if="!isViewMode"
              :value="title"
              rows="1"
              :placeholder="titlePlaceholder || 'Item name...'"
              spellcheck="false"
              class="w-full min-h-0 mt-3 resize-none overflow-hidden field-sizing-content text-xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0.5 -mx-1 transition-all break-words whitespace-pre-wrap leading-snug"
              @input="emit('update:title', ($event.target as HTMLTextAreaElement).value)" />
            <h2 v-else class="text-xl font-semibold px-1 mt-3 break-words whitespace-pre-wrap leading-snug">
              {{ title }}
            </h2>
            <div class="mt-1 px-1">
              <EntityDescriptionBlock
                :description="description"
                :summary="summary"
                :is-generating-summary="isGeneratingSummary"
                :mode="mode"
                :entity-id="entityId"
                :ai-only="isAiOnlyDescription"
                @update:description="emit('update:description', $event)"
                @regenerate-summary="emit('regenerateSummary')" />
            </div>
          </template>
        </div>
      </div>

      <!-- Properties Row (hidden when headerInBody — properties live in right sidebar tab) -->
      <div
        v-if="!headerInBody && $slots.properties"
        class="sticky top-0 z-10 bg-card px-4 py-2.5 border-b border-border">
        <div class="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none whitespace-nowrap">
          <slot name="properties" />
          <slot name="properties-tags" />
          <slot name="extension-properties" />
        </div>
      </div>

      <!-- Comments (Notion-style, below properties) -->
      <div v-if="$slots.comments" class="shrink-0 border-b border-border">
        <slot name="comments" />
      </div>

      <!-- Content Area -->
      <div class="flex-1 flex min-h-0 overflow-hidden">
        <slot />
      </div>

      <!-- Footer -->
      <div class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 text-xs text-muted-foreground min-w-0 flex-1 overflow-hidden">
          <slot name="footer-left" />
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <slot name="footer-right" />
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
