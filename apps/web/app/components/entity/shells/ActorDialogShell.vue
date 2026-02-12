<script lang="ts" setup>
  /**
   * ActorDialogShell — Dialog chrome for actor-class entities.
   *
   * Optimized for people/org entities (person, organization, contact, team, department).
   * Differences from TemporalDialogShell:
   *  - Avatar/photo slot in the header
   *  - Contact info properties row
   *  - Relationship/membership section
   *  - Narrower default width (profile-card feel)
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
      dialogTitle?: string
      dialogDescription?: string
      avatar?: string
    }>(),
    {
      mode: 'edit',
      canNavigatePrev: false,
      canNavigateNext: false,
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    'update:title': [value: string]
    'update:description': [value: string]
    close: []
    navigatePrev: []
    navigateNext: []
  }>()

  const isViewMode = computed(() => props.mode === 'view')
  const isCreateMode = computed(() => props.mode === 'create')

  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }

  // ── Stack-aware positioning ─────────────────────────────────────────
  const { buildContentStyle, overlayClass: stackOverlayClass, stackTransform, isStacked, parentTitle, hideNavigation, onBack, reportDimensions } = useDialogStackAware()

  // ── Resize logic ──────────────────────────────────────────────────────
  const MIN_W = 480
  const MIN_H = 420
  const MAX_W = computed(() => window.innerWidth - 64)
  const MAX_H = computed(() => window.innerHeight - 64)
  const DEFAULT_W = 720
  const DEFAULT_H = 640

  const dialogW = ref(DEFAULT_W)
  const dialogH = ref(DEFAULT_H)

  watch(() => props.open, (val) => {
    if (val) {
      dialogW.value = Math.min(DEFAULT_W, MAX_W.value)
      dialogH.value = Math.min(DEFAULT_H, MAX_H.value)
    }
  })

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
    const cursorMap: Record<Edge, string> = {
      n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
      ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize',
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
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :hide-close="true"
      :overlay-class="stackOverlayClass"
      :style="buildContentStyle(dialogW, dialogH)"
      :class="[isResizing ? 'select-none duration-0 transition-none' : '']"
      class="p-0! gap-0! overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex! flex-col relative"
      @pointer-down-outside="(e: Event) => { if (isResizing || !stackTransform.interactive) e.preventDefault() }"
      @interact-outside="(e: Event) => { if (isResizing || !stackTransform.interactive) e.preventDefault() }">

      <!-- Resize handles -->
      <div class="absolute inset-x-2 top-0 h-1 cursor-ns-resize z-50" @pointerdown="startResize('n', $event)" />
      <div class="absolute inset-x-2 bottom-0 h-1 cursor-ns-resize z-50" @pointerdown="startResize('s', $event)" />
      <div class="absolute inset-y-2 left-0 w-1 cursor-ew-resize z-50" @pointerdown="startResize('w', $event)" />
      <div class="absolute inset-y-2 right-0 w-1 cursor-ew-resize z-50" @pointerdown="startResize('e', $event)" />
      <div class="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-50" @pointerdown="startResize('nw', $event)" />
      <div class="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-50" @pointerdown="startResize('ne', $event)" />
      <div class="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-50" @pointerdown="startResize('sw', $event)" />
      <div class="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-50" @pointerdown="startResize('se', $event)" />

      <UiDialogTitle class="sr-only">{{ dialogTitle || title || 'Person' }}</UiDialogTitle>
      <UiDialogDescription class="sr-only">{{ dialogDescription || 'Actor details.' }}</UiDialogDescription>

      <!-- Header — profile-oriented with avatar -->
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
            <div class="flex items-center gap-3 min-w-0">
              <!-- Avatar -->
              <slot name="avatar">
                <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <img v-if="avatar" :src="avatar" :alt="title" class="h-10 w-10 rounded-full object-cover" />
                  <Icon v-else name="lucide:user" class="h-5 w-5 text-primary" />
                </div>
              </slot>
              <div class="min-w-0">
                <span v-if="typeBadge" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary mb-1">
                  <Icon :name="typeBadge.icon" class="h-3 w-3" />
                  {{ typeBadge.label }}
                </span>
                <slot name="header-badges" />
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <template v-if="!isCreateMode && !hideNavigation">
                <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="!canNavigatePrev" @click="emit('navigatePrev')">
                  <Icon name="lucide:chevron-up" class="h-4 w-4" />
                </UiButton>
                <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="!canNavigateNext" @click="emit('navigateNext')">
                  <Icon name="lucide:chevron-down" class="h-4 w-4" />
                </UiButton>
              </template>
              <UiButton v-if="!isStacked" variant="ghost" size="icon" class="h-7 w-7" @click="closeDialog">
                <Icon name="lucide:x" class="h-4 w-4" />
              </UiButton>
            </div>
          </div>
          <input
            v-if="!isViewMode"
            :value="title"
            type="text"
            :placeholder="titlePlaceholder || 'Name...'"
            class="w-full text-xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0 -mx-1 transition-all"
            @input="emit('update:title', ($event.target as HTMLInputElement).value)" />
          <h2 v-else class="text-xl font-semibold px-1">{{ title }}</h2>
          <div class="mt-1 px-1">
            <UiRichTextEditor v-if="!isViewMode" :model-value="description" placeholder="Role, title, or bio..." seamless @update:model-value="emit('update:description', $event)" />
            <p v-else-if="description" class="text-sm text-muted-foreground" v-html="description" />
            <p v-else class="text-sm text-muted-foreground/50 italic">No description</p>
          </div>
        </div>
      </div>

      <!-- Properties Row -->
      <div v-if="$slots.properties" class="sticky top-0 z-10 bg-card px-4 py-2.5 border-b border-border">
        <div class="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none whitespace-nowrap">
          <slot name="properties" />
        </div>
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
