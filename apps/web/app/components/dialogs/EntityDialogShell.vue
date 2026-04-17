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
    }>(),
    {
      mode: 'edit',
      canNavigatePrev: false,
      canNavigateNext: false,
      summary: '',
      isGeneratingSummary: false,
    },
  )

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
  const { setOriginatingDialogOpen } = useDialogStack()
  watch(
    () => props.open,
    (val) => {
      if (!isStacked.value) setOriginatingDialogOpen(val)
    },
    { immediate: true },
  )
  onUnmounted(() => {
    if (!isStacked.value) setOriginatingDialogOpen(false)
  })

  // ── Resize logic ──────────────────────────────────────────────────────
  const MIN_W = 640
  const MIN_H = 480
  const MAX_W = computed(() => window.innerWidth - 48)
  const MAX_H = computed(() => window.innerHeight - 48)
  const defaultSize = computed(() => {
    const vpW = window.innerWidth
    const vpH = window.innerHeight
    const aspect = vpW / vpH
    const scale = 0.92
    let w = Math.round(vpW * scale)
    let h = Math.round(vpH * scale)
    // Apply max caps while preserving viewport aspect ratio
    if (w > 1680) {
      w = 1680
      h = Math.round(w / aspect)
    }
    if (h > 1200) {
      h = 1200
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
        dialogH.value = Math.min(DEFAULT_H.value, MAX_H.value)
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
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
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
        <div :class="isStacked && parentTitle ? 'px-4 pt-2 pb-3' : 'px-4 pt-4 pb-3'">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-2 min-w-0">
              <span
                v-if="typeBadge"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                <Icon :name="typeBadge.icon" class="h-3 w-3" />
                {{ typeBadge.label }}
              </span>
              <slot name="header-badges" />
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <!-- Per-entity editing presence avatars -->
              <div v-if="peerCount > 0" class="flex items-center -space-x-1.5 mr-1">
                <div
                  v-for="peer in peerList.slice(0, 4)"
                  :key="peer.peerId"
                  :title="peer.name + (peer.editingField ? ` · editing ${peer.editingField}` : ' · viewing')"
                  class="relative flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-card text-[10px] font-medium"
                  :class="peer.editingField ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'">
                  <img
                    v-if="peer.avatar"
                    :src="peer.avatar"
                    :alt="peer.name"
                    class="h-6 w-6 rounded-full object-cover" />
                  <span v-else>
                    {{
                      String(peer.name || peer.email || '?')
                        .charAt(0)
                        .toUpperCase()
                    }}
                  </span>
                  <span
                    class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-card"
                    :class="peer.editingField ? 'bg-primary animate-pulse' : 'bg-green-500'" />
                </div>
                <div
                  v-if="peerList.length > 4"
                  class="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-card bg-muted text-[10px] font-medium text-muted-foreground">
                  +{{ peerList.length - 4 }}
                </div>
              </div>
              <div v-if="peerCount > 0 && !isCreateMode && !hideNavigation" class="h-5 w-px bg-border mx-0.5" />
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
              <div v-if="!isCreateMode && !hideNavigation" class="h-5 w-px bg-border mx-0.5" />
              <UiButton v-if="!isStacked" variant="ghost" size="icon" class="h-7 w-7" @click="closeDialog">
                <Icon name="lucide:x" class="h-4 w-4" />
              </UiButton>
            </div>
          </div>
          <input
            v-if="!isViewMode"
            :value="title"
            type="text"
            :placeholder="titlePlaceholder || 'Item name...'"
            spellcheck="false"
            class="w-full text-xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0 -mx-1 transition-all"
            @input="emit('update:title', ($event.target as HTMLInputElement).value)" />
          <h2 v-else class="text-xl font-semibold px-1">{{ title }}</h2>
          <div class="mt-1 px-1">
            <EntityDescriptionBlock
              :description="description"
              :summary="summary"
              :is-generating-summary="isGeneratingSummary"
              :mode="mode"
              :entity-id="entityId"
              @update:description="emit('update:description', $event)"
              @regenerate-summary="emit('regenerateSummary')" />
          </div>
          <div v-if="$slots['header-tags']" class="mt-2 px-1">
            <slot name="header-tags" />
          </div>
        </div>
      </div>

      <!-- Properties Row -->
      <div v-if="$slots.properties" class="sticky top-0 z-10 bg-card px-4 py-2.5 border-b border-border">
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
      <div class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between">
        <div class="flex items-center gap-3 text-xs text-muted-foreground">
          <slot name="footer-left" />
        </div>
        <div class="flex items-center gap-2">
          <slot name="footer-right" />
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
