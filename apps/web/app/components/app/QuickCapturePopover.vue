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
  const PANEL_W = 360
  const GAP = 8

  /** Anchor the panel's bottom edge to the trigger's top — no height estimate needed. */
  function computePanelPosition() {
    if (!triggerRef.value) return
    const rect = triggerRef.value.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth

    // bottom = distance from viewport bottom to trigger top, minus gap
    const bottom = vh - rect.top + GAP
    // Center over trigger, clamped within viewport
    const idealLeft = rect.left + rect.width / 2 - PANEL_W / 2
    const left = Math.min(Math.max(idealLeft, 16), vw - PANEL_W - 16)
    panelStyle.value = { bottom: `${bottom}px`, left: `${left}px` }
  }

  const { create } = useTrellisEntities()
  const nuxtApp = useNuxtApp()
  const router = useRouter()

  const hasContent = computed(() => content.value.replace(/<[^>]+>/g, '').trim().length > 0)

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
          onClick: () => router.push({ path: '/workspace/notes', query: { id: noteId } }),
        },
      })
      setTimeout(() => {
        saved.value = false
        content.value = ''
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

  /** Close on outside click — content is preserved. */
  function onBackdropClick(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target.closest('[data-quick-capture-panel]')) {
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

  watch(open, (val) => {
    if (val) {
      computePanelPosition()
      nextTick(() => focusEditor())
    }
  })

  const { register } = useKeyboardShortcuts()
  let unregister: (() => void) | null = null
  onMounted(() => { unregister = register('quick-capture', () => { toggleOpen(); return undefined }) })
  onUnmounted(() => { unregister?.() })
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
      <kbd class="ml-1.5 inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/60 px-1 py-0.5 text-[10px] font-mono opacity-70 select-none">
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
        class="fixed inset-0 z-9999"
        @mousedown="onBackdropClick">
        <div
          data-quick-capture-panel
          :style="panelStyle"
          class="absolute w-[360px] shadow-2xl border border-border bg-card rounded-xl overflow-hidden"
          @keydown="onWrapperKeydown">

      <!-- Header -->
      <div class="flex items-center gap-2 px-3 py-2.5 border-b border-border/60 bg-muted/20">
        <div class="flex items-center gap-1.5 flex-1 min-w-0">
          <Icon name="lucide:pencil-line" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span class="text-xs font-medium text-muted-foreground">Quick Note</span>
        </div>
        <div class="flex items-center gap-1">
          <kbd class="inline-flex items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground select-none">
            <span class="text-[11px]">⌘</span>↩
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

      <!-- Rich Text Editor (seamless, mentions enabled) -->
      <div class="px-3 pb-2 min-h-[80px] max-h-[200px] overflow-y-auto">
        <UiRichTextEditor
          v-model="content"
          :seamless="true"
          :mentions="true"
          :tables="false"
          :mathematics="false"
          :draghandle="false"
          :embeds="false"
          :images="false"
          placeholder="Start writing... @mention to link entities"
          class="text-sm"
        />
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-3 py-2 border-t border-border/60 bg-muted/10">
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
      </div>
    </Transition>
  </Teleport>
</template>
