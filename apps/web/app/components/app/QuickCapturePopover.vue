<script lang="ts" setup>
  import { createDefaultNote } from '~/types/entity'

  const props = withDefaults(defineProps<{ position?: 'left' | 'bottom' }>(), { position: 'left' })

  const isBottom = computed(() => props.position === 'bottom')

  const open = ref(false)
  const content = ref('')
  const isSaving = ref(false)
  const saved = ref(false)
  const triggerRef = ref<HTMLButtonElement | null>(null)

  const panelStyle = ref<Record<string, string>>({})
  const PANEL_W = 420
  const PANEL_H = 640
  const VIEWPORT_PADDING = 16
  const GAP = 8

  /** localStorage key for draft persistence — survives page refresh. */
  const DRAFT_KEY = 'trellis:quicknote:draft'

  /** Selectors for floating overlays spawned by the editor (mentions, slash menu, etc.). */
  const FLOATING_SELECTORS = '.tippy-box, [data-tippy-root], [data-radix-popper-content-wrapper], [data-sonner-toaster]'

  /**
   * Anchor the panel's bottom edge to the trigger's top, clamping so the
   * panel stays within the viewport (top >= VIEWPORT_PADDING).
   */
  function computePanelPosition() {
    if (!triggerRef.value) return
    const rect = triggerRef.value.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth

    // Effective panel height respects the CSS max-h cap.
    const effectiveH = Math.min(PANEL_H, vh - 80)

    // bottom = distance from viewport bottom to trigger top, minus gap
    let bottom = vh - rect.top + GAP
    // Ensure panel top (vh - bottom - effectiveH) >= VIEWPORT_PADDING
    const maxBottom = vh - effectiveH - VIEWPORT_PADDING
    if (bottom > maxBottom) bottom = Math.max(VIEWPORT_PADDING, maxBottom)

    // Center over trigger, clamped within viewport
    const idealLeft = rect.left + rect.width / 2 - PANEL_W / 2
    const left = Math.min(Math.max(idealLeft, VIEWPORT_PADDING), vw - PANEL_W - VIEWPORT_PADDING)
    panelStyle.value = { bottom: `${bottom}px`, left: `${left}px` }
  }

  const { create } = useTrellisEntities()
  const { wp } = useWorkspacePath()
  const nuxtApp = useNuxtApp()
  const router = useRouter()

  const hasContent = computed(() => content.value.replace(/<[^>]+>/g, '').trim().length > 0)

  // ── Draft persistence ──────────────────────────────────────────────
  // Auto-saves editor content to localStorage so drafts survive refreshes.

  function loadDraft() {
    if (typeof window === 'undefined') return
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY)
      if (saved) content.value = saved
    } catch (err) {
      console.warn('[QuickCapture] Failed to load draft:', err)
    }
  }

  function persistDraft(value: string) {
    if (typeof window === 'undefined') return
    try {
      const hasText = value.replace(/<[^>]+>/g, '').trim().length > 0
      if (hasText) {
        window.localStorage.setItem(DRAFT_KEY, value)
      } else {
        window.localStorage.removeItem(DRAFT_KEY)
      }
    } catch (err) {
      console.warn('[QuickCapture] Failed to persist draft:', err)
    }
  }

  function clearDraft() {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* noop */
    }
  }

  // Persist draft on every edit (debounce via microtask batching is sufficient
  // because TipTap emits model updates in batches already).
  watch(content, (v) => persistDraft(v))

  /** Generate a human-readable date/time title: "Quick Note — Feb 18, 2:34 PM" */
  function generateTitle(): string {
    const now = new Date()
    return `Quick Note — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }

  async function handleSave() {
    if (isSaving.value || !hasContent.value) return
    const noteTitle = generateTitle()

    isSaving.value = true
    try {
      const noteId = await create({
        ...createDefaultNote(),
        title: noteTitle,
        content: content.value,
        tags: ['quicknote'],
      } as any)

      saved.value = true
      ;(nuxtApp as any).$toast?.success('Quick note saved', {
        description: noteTitle,
        action: {
          label: 'Open note',
          onClick: () => router.push({ path: wp('/workspace/notes'), query: { id: noteId } }),
        },
      })
      setTimeout(() => {
        saved.value = false
        content.value = ''
        clearDraft()
        open.value = false
      }, 500)
    } catch (err: any) {
      console.error('[QuickCapture] Failed to create note:', err)
      ;(nuxtApp as any).$toast?.error('Failed to save note')
    } finally {
      isSaving.value = false
    }
  }

  function handleDiscard() {
    content.value = ''
    clearDraft()
    open.value = false
  }

  function toggleOpen() {
    open.value = !open.value
  }

  /** Handle Cmd/Ctrl+Enter — intercept before TipTap. */
  function onWrapperKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      handleSave()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      open.value = false
    }
  }

  /** Focus the ProseMirror editor, retrying until TipTap has mounted it. */
  function focusEditor(attempts = 0) {
    const el = document.querySelector<HTMLElement>('[data-quick-capture-panel] .ProseMirror')
    if (el) {
      el.focus()
    } else if (attempts < 10) {
      setTimeout(() => focusEditor(attempts + 1), 50)
    }
  }

  /**
   * Focus trap: when focus leaves the panel to an unrelated element (e.g. the
   * page behind us), bounce it back to the editor so shortcuts like ⌘A, ⌘Z,
   * and text selection target the quick note instead of the background.
   * Floating overlays spawned by the editor (mentions, slash menu, popovers)
   * are allowed to receive focus.
   */
  function onPanelFocusOut(event: FocusEvent) {
    if (!open.value) return
    const panel = document.querySelector('[data-quick-capture-panel]')
    if (!panel) return
    const next = event.relatedTarget as HTMLElement | null
    if (!next) {
      // Focus moved to the body — reclaim it.
      setTimeout(() => focusEditor(), 0)
      return
    }
    if (panel.contains(next)) return
    if (next.closest?.(FLOATING_SELECTORS)) return
    setTimeout(() => focusEditor(), 0)
  }

  /**
   * Close on outside click, but delegated through a document listener so we
   * don't need a full-viewport overlay — that means the page behind the panel
   * remains fully scrollable and interactive until a click dismisses us.
   */
  function onDocMouseDown(event: MouseEvent) {
    if (!open.value) return
    const target = event.target as Node | null
    if (!(target instanceof Element)) return
    if (target.closest('[data-quick-capture-panel]')) return
    if (target.closest(FLOATING_SELECTORS)) return
    // Clicking the trigger toggles — let its own handler deal with it.
    if (triggerRef.value && (target === triggerRef.value || triggerRef.value.contains(target))) return
    open.value = false
  }

  function onWindowResize() {
    if (open.value) computePanelPosition()
  }

  watch(open, (val) => {
    if (val) {
      computePanelPosition()
      nextTick(() => focusEditor())
      document.addEventListener('mousedown', onDocMouseDown, true)
      window.addEventListener('resize', onWindowResize)
    } else {
      document.removeEventListener('mousedown', onDocMouseDown, true)
      window.removeEventListener('resize', onWindowResize)
    }
  })

  const { register } = useKeyboardShortcuts()
  let unregister: (() => void) | null = null
  onMounted(() => {
    loadDraft()
    unregister = register('quick-capture', () => {
      toggleOpen()
      return undefined
    })
  })
  onUnmounted(() => {
    unregister?.()
    document.removeEventListener('mousedown', onDocMouseDown, true)
    window.removeEventListener('resize', onWindowResize)
  })
</script>

<template>
  <UiTooltip>
    <UiTooltipTrigger as-child>
      <button
        ref="triggerRef"
        :class="[
          'flex items-center justify-center rounded-full transition-all duration-200 ease-out bg-card border',
          'h-8 w-8',
          saved
            ? 'bg-emerald-500/20 text-emerald-500'
            : open
              ? 'bg-rail-foreground/15 text-foreground'
              : 'text-rail-foreground/60 hover:bg-rail-foreground/10 hover:text-rail-foreground',
        ]"
        :aria-label="open ? 'Close quick capture' : 'Quick capture'"
        :aria-expanded="open"
        @click="toggleOpen">
        <Transition
          enter-active-class="transition-all duration-150 ease-out"
          enter-from-class="opacity-0 scale-75"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-100 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-75"
          mode="out-in">
          <Icon v-if="saved" key="check" name="lucide:check" class="h-4 w-4" />
          <Icon v-else key="pen" name="lucide:pencil-line" class="h-4 w-4 opacity-50" />
        </Transition>
      </button>
    </UiTooltipTrigger>
    <UiTooltipContent :side="isBottom ? 'top' : 'right'" :side-offset="8">
      Quick capture
      <kbd
        class="ml-1.5 inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/60 px-1 py-0.5 text-[10px] font-mono opacity-70 select-none">
        ⌘⇧N
      </kbd>
    </UiTooltipContent>
  </UiTooltip>

  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95">
      <div
        v-if="open"
        data-quick-capture-panel
        :style="panelStyle"
        class="fixed z-9999 w-[420px] h-[640px] max-h-[calc(100vh-80px)] shadow-2xl border border-border/60 bg-card/75 supports-backdrop-filter:bg-card/60 backdrop-blur-xl backdrop-saturate-150 rounded-xl overflow-hidden flex flex-col"
        @keydown="onWrapperKeydown"
        @focusout="onPanelFocusOut">
        <!-- Header -->
        <div class="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-muted/20 shrink-0">
          <div class="flex items-center gap-1.5 flex-1 min-w-0">
            <Icon name="lucide:pencil-line" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span class="text-xs font-medium text-muted-foreground">Quick Note</span>
          </div>
          <div class="flex items-center gap-1">
            <kbd
              class="inline-flex items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground select-none">
              <span class="text-[11px]">⌘</span>
              ↩
            </kbd>
            <span class="text-[10px] text-muted-foreground">to save</span>
          </div>
          <button
            class="ml-1 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close"
            @click.stop="open = false">
            <Icon name="lucide:x" class="h-3 w-3" />
          </button>
        </div>

        <!-- Rich Text Editor (full-featured, matches Pages/Notes editor) -->
        <div class="flex-1 min-h-0 px-4 py-4 overflow-y-auto">
          <UiRichTextEditor
            v-model="content"
            :seamless="true"
            :mentions="true"
            :tasklist="true"
            :images="true"
            :embeds="true"
            :tables="true"
            :mathematics="true"
            :draghandle="true"
            :templates="true"
            fill-height
            placeholder="Start writing... / for commands, @ to mention"
            class="text-sm h-full" />
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/10 shrink-0">
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1.5">
              <Icon name="lucide:tag" class="h-3 w-3 text-muted-foreground/40" />
              <span class="text-[10px] text-muted-foreground/40 font-medium">quicknote</span>
            </div>
            <NuxtLink
              to="/workspace/notes"
              class="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors underline-offset-2 hover:underline"
              @click.stop="open = false">
              View all notes
            </NuxtLink>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              @click.stop="handleDiscard">
              Discard
            </button>
            <UiButton
              size="sm"
              class="h-6 px-2.5 text-xs gap-1"
              :disabled="!hasContent || isSaving"
              @click.stop="handleSave">
              <Icon v-if="isSaving" name="svg-spinners:ring-resize" class="h-3 w-3" />
              <Icon v-else-if="saved" name="lucide:check" class="h-3 w-3" />
              <span>{{ isSaving ? 'Saving…' : saved ? 'Saved!' : 'Save' }}</span>
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
