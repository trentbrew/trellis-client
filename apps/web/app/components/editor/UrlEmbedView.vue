<script lang="ts" setup>
  import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

  const props = defineProps(nodeViewProps)

  const src = computed(() => props.node.attrs.src as string | null)
  const title = computed(() => props.node.attrs.title as string)
  const mode = computed(() => (props.node.attrs.mode as 'embed' | 'image' | 'youtube' | 'spotify') || 'embed')
  const storedHeight = computed(() => (props.node.attrs.height as number) || 480)

  // ── Input state ────────────────────────────────────────────────────
  const inputValue = ref('')
  const inputMode = ref<'embed' | 'image' | 'youtube' | 'spotify'>(mode.value)
  const inputRef = ref<HTMLInputElement | null>(null)
  const isValidUrl = computed(() => {
    try {
      new URL(inputValue.value)
      return true
    } catch {
      return false
    }
  })

  onMounted(() => {
    if (!src.value) {
      inputMode.value = mode.value
      nextTick(() => inputRef.value?.focus())
    }
  })

  function confirm() {
    const url = inputValue.value.trim()
    if (!url) return
    // For youtube/spotify we also accept plain IDs that aren't valid URLs
    const validForMode = isValidUrl.value || inputMode.value === 'youtube' || inputMode.value === 'spotify'
    if (!validForMode) return

    if (inputMode.value === 'image') {
      props.deleteNode()
      props.editor.chain().focus().insertContent({
        type: 'image',
        attrs: { src: url, alt: '', title: '' },
      }).run()
    } else if (inputMode.value === 'youtube') {
      const id = extractYoutubeId(url)
      props.updateAttributes({ src: id, title: title.value || 'YouTube', mode: 'youtube', height: 360 })
    } else if (inputMode.value === 'spotify') {
      props.updateAttributes({ src: url, title: title.value || 'Spotify', mode: 'spotify', height: 152 })
    } else {
      let resolvedTitle = title.value || url
      try { resolvedTitle = new URL(url).hostname } catch { /* leave as url */ }
      props.updateAttributes({ src: url, title: resolvedTitle, mode: 'embed' })
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      props.deleteNode()
    }
  }

  // ── URL helpers ────────────────────────────────────────────────────
  function extractYoutubeId(input: string): string {
    const watchMatch = input.match(/[?&]v=([^&]+)/)
    if (watchMatch) return watchMatch[1]!
    const shortMatch = input.match(/youtu\.be\/([^?&]+)/)
    if (shortMatch) return shortMatch[1]!
    const embedMatch = input.match(/youtube\.com\/embed\/([^?&]+)/)
    if (embedMatch) return embedMatch[1]!
    return input.trim()
  }

  function toYoutubeEmbedUrl(id: string): string {
    const clean = extractYoutubeId(id)
    return `https://www.youtube.com/embed/${clean}?rel=0&modestbranding=1`
  }

  function toSpotifyEmbedUrl(url: string): string {
    if (url.includes('open.spotify.com/embed/')) return url
    const m = url.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([^?]+)/)
    if (m) return `https://open.spotify.com/embed/${m[1]}/${m[2]}`
    return url
  }

  const computedEmbedSrc = computed(() => {
    if (!src.value) return null
    if (mode.value === 'youtube') return toYoutubeEmbedUrl(src.value)
    if (mode.value === 'spotify') return toSpotifyEmbedUrl(src.value)
    return src.value
  })

  // ── Iframe overlay (captures mouse events so drag-handle can detect this node) ──
  const iframeInteractive = ref(false)

  function activateIframe() {
    iframeInteractive.value = true
  }

  function deactivateIframe() {
    iframeInteractive.value = false
  }

  // ── Iframe state ───────────────────────────────────────────────────
  const iframeHeight = ref(storedHeight.value)
  const isResizing = ref(false)
  let resizeStartY = 0
  let resizeStartH = 0

  function startResize(e: MouseEvent | TouchEvent) {
    isResizing.value = true
    resizeStartY = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY
    resizeStartH = iframeHeight.value
    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', stopResize)
    document.addEventListener('touchmove', onResizeMove as any)
    document.addEventListener('touchend', stopResize)
  }

  function onResizeMove(e: MouseEvent | TouchEvent) {
    if (!isResizing.value) return
    const y = 'touches' in e ? ((e as TouchEvent).touches[0]?.clientY ?? resizeStartY) : (e as MouseEvent).clientY
    const delta = y - resizeStartY
    iframeHeight.value = Math.max(120, Math.min(1200, resizeStartH + delta))
  }

  function stopResize() {
    if (!isResizing.value) return
    isResizing.value = false
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', stopResize)
    document.removeEventListener('touchmove', onResizeMove as any)
    document.removeEventListener('touchend', stopResize)
    props.updateAttributes({ height: iframeHeight.value })
  }

  function handleDelete() {
    props.deleteNode()
  }

  function openInNewTab() {
    if (!src.value) return
    if (mode.value === 'youtube') {
      window.open(`https://www.youtube.com/watch?v=${src.value}`, '_blank', 'noopener,noreferrer')
    } else {
      window.open(src.value, '_blank', 'noopener,noreferrer')
    }
  }

  // Favicon URL helper
  const faviconSrc = computed(() => {
    if (!src.value) return null
    if (mode.value === 'youtube') return 'https://www.google.com/s2/favicons?domain=youtube.com&sz=16'
    if (mode.value === 'spotify') return 'https://www.google.com/s2/favicons?domain=spotify.com&sz=16'
    try {
      const url = new URL(src.value)
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=16`
    } catch {
      return null
    }
  })

  // Mode-based icon for input state
  const inputIcon = computed(() => {
    if (inputMode.value === 'image') return 'lucide:image'
    if (inputMode.value === 'youtube') return 'lucide:youtube'
    if (inputMode.value === 'spotify') return 'lucide:music'
    return 'lucide:globe'
  })

  // Mode-based placeholder
  const inputPlaceholder = computed(() => {
    if (inputMode.value === 'image') return 'Paste image URL…'
    if (inputMode.value === 'youtube') return 'YouTube URL or video ID…'
    if (inputMode.value === 'spotify') return 'Spotify track / album / playlist URL…'
    return 'Paste URL to embed…'
  })

  // Display title
  const displayTitle = computed(() => {
    if (title.value) return title.value
    if (mode.value === 'youtube') return src.value ? `youtube.com/watch?v=${src.value}` : 'YouTube'
    if (mode.value === 'spotify') return 'Spotify'
    if (src.value) {
      try { return new URL(src.value).hostname } catch { return src.value }
    }
    return 'Embed'
  })
</script>

<template>
  <NodeViewWrapper class="url-embed-wrapper" data-type="url-embed" contenteditable="false">
    <!-- ── Input state ── -->
    <div v-if="!src" class="url-embed-input-state">
      <div class="url-embed-input-icon">
        <Icon :name="inputIcon" class="h-4 w-4 text-muted-foreground" />
      </div>
      <input
        ref="inputRef"
        v-model="inputValue"
        type="url"
        :placeholder="inputPlaceholder"
        class="url-embed-input"
        spellcheck="false"
        @keydown="onKeydown" />
      <!-- Mode toggle: only for generic embed mode -->
      <div v-if="inputMode === 'embed' || inputMode === 'image'" class="url-embed-mode-toggle">
        <button
          type="button"
          class="url-embed-mode-btn"
          :class="{ 'is-active': inputMode === 'embed' }"
          @click="inputMode = 'embed'">
          Embed
        </button>
        <button
          type="button"
          class="url-embed-mode-btn"
          :class="{ 'is-active': inputMode === 'image' }"
          @click="inputMode = 'image'">
          Image
        </button>
      </div>
      <button
        type="button"
        class="url-embed-confirm-btn"
        :disabled="!isValidUrl"
        title="Confirm"
        @click="confirm">
        <Icon name="lucide:arrow-right" class="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        class="url-embed-cancel-btn"
        title="Cancel (Esc)"
        @click="props.deleteNode()">
        <Icon name="lucide:x" class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- ── Iframe state ── -->
    <div
      v-else
      class="url-embed-iframe-state"
      :class="{ 'url-embed-iframe-state--selected': selected }">
      <!-- Header bar -->
      <div class="url-embed-header">
        <img
          v-if="faviconSrc"
          :src="faviconSrc"
          class="url-embed-favicon"
          aria-hidden="true"
          @error="($event.target as HTMLImageElement).style.display = 'none'" />
        <Icon v-else name="lucide:globe" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span class="url-embed-title">{{ displayTitle }}</span>
        <div class="url-embed-actions">
          <button
            type="button"
            class="url-embed-action-btn"
            title="Open in new tab"
            @click.stop="openInNewTab">
            <Icon name="lucide:external-link" class="h-3 w-3" />
          </button>
          <button
            v-if="editor?.isEditable"
            type="button"
            class="url-embed-action-btn url-embed-action-btn--danger"
            title="Remove embed"
            @click.stop="handleDelete">
            <Icon name="lucide:x" class="h-3 w-3" />
          </button>
        </div>
      </div>

      <!-- Iframe -->
      <div
        class="url-embed-iframe-container"
        :class="{ 'url-embed-iframe-container--aspect': mode === 'youtube' }"
        :style="mode === 'youtube' ? undefined : { height: iframeHeight + 'px' }"
        @mouseleave="deactivateIframe">
        <iframe
          :src="computedEmbedSrc ?? undefined"
          :title="displayTitle"
          frameborder="0"
          allowfullscreen
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
          class="url-embed-iframe" />
        <!-- Transparent overlay: captures mouse events so the drag handle can detect this block.
             Clicking the overlay hides it, allowing direct iframe interaction. -->
        <div
          v-if="!iframeInteractive"
          class="url-embed-iframe-overlay"
          @click.stop="activateIframe" />
      </div>

      <!-- Resize handle (hidden for fixed-aspect modes) -->
      <div
        v-if="editor?.isEditable && mode !== 'youtube' && mode !== 'spotify'"
        class="url-embed-resize-handle"
        @mousedown.prevent="startResize"
        @touchstart.prevent="startResize">
        <div class="url-embed-resize-grip" />
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style>
  .url-embed-wrapper {
    margin: 0.75rem 0;
  }

  /* ── Input state ── */
  .url-embed-input-state {
    align-items: center;
    background: hsl(var(--muted) / 0.5);
    border: 1px dashed hsl(var(--border));
    border-radius: 0.5rem;
    display: flex;
    gap: 0.375rem;
    padding: 0.5rem 0.625rem;
  }

  .url-embed-input-icon {
    flex-shrink: 0;
  }

  .url-embed-input {
    background: transparent;
    border: none;
    color: hsl(var(--foreground));
    flex: 1;
    font-size: 0.8125rem;
    min-width: 0;
    outline: none;
  }

  .url-embed-input::placeholder {
    color: hsl(var(--muted-foreground));
  }

  .url-embed-mode-toggle {
    display: flex;
    gap: 0.125rem;
    background: hsl(var(--background));
    border: 1px solid hsl(var(--border));
    border-radius: 0.375rem;
    padding: 0.125rem;
    flex-shrink: 0;
  }

  .url-embed-mode-btn {
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    font-size: 0.6875rem;
    font-weight: 500;
    padding: 0.1875rem 0.5rem;
    transition: background 120ms, color 120ms;
  }

  .url-embed-mode-btn.is-active {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }

  .url-embed-confirm-btn,
  .url-embed-cancel-btn {
    align-items: center;
    background: transparent;
    border: 1px solid hsl(var(--border));
    border-radius: 0.375rem;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    display: flex;
    flex-shrink: 0;
    height: 1.625rem;
    justify-content: center;
    transition: background 120ms, color 120ms, border-color 120ms;
    width: 1.625rem;
  }

  .url-embed-confirm-btn:not(:disabled):hover {
    background: hsl(var(--primary));
    border-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }

  .url-embed-confirm-btn:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .url-embed-cancel-btn:hover {
    background: hsl(var(--destructive) / 0.1);
    border-color: hsl(var(--destructive) / 0.4);
    color: hsl(var(--destructive));
  }

  /* ── Iframe state ── */
  .url-embed-iframe-state {
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    overflow: hidden;
    transition: border-color 150ms, box-shadow 150ms;
  }

  .url-embed-iframe-state--selected {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.15);
  }

  .url-embed-header {
    align-items: center;
    background: hsl(var(--muted) / 0.5);
    border-bottom: 1px solid hsl(var(--border));
    display: flex;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
  }

  .url-embed-favicon {
    flex-shrink: 0;
    height: 14px;
    width: 14px;
  }

  .url-embed-title {
    color: hsl(var(--muted-foreground));
    flex: 1;
    font-size: 0.6875rem;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .url-embed-actions {
    align-items: center;
    display: flex;
    flex-shrink: 0;
    gap: 0.125rem;
  }

  .url-embed-action-btn {
    align-items: center;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    display: flex;
    height: 1.25rem;
    justify-content: center;
    opacity: 0;
    padding: 0;
    transition: opacity 150ms, color 150ms, background 150ms;
    width: 1.25rem;
  }

  .url-embed-iframe-state:hover .url-embed-action-btn {
    opacity: 1;
  }

  .url-embed-action-btn:hover {
    background: hsl(var(--accent));
    color: hsl(var(--foreground));
  }

  .url-embed-action-btn--danger:hover {
    background: hsl(var(--destructive) / 0.1);
    color: hsl(var(--destructive));
  }

  .url-embed-iframe-container {
    position: relative;
    width: 100%;
  }

  .url-embed-iframe-container--aspect {
    aspect-ratio: 16 / 9;
    height: auto !important;
  }

  .url-embed-iframe {
    border: none;
    display: block;
    height: 100%;
    width: 100%;
  }

  .url-embed-iframe-overlay {
    cursor: pointer;
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
    z-index: 1;
  }

  .url-embed-resize-handle {
    align-items: center;
    background: hsl(var(--muted) / 0.5);
    border-top: 1px solid hsl(var(--border));
    cursor: ns-resize;
    display: flex;
    height: 10px;
    justify-content: center;
    user-select: none;
  }

  .url-embed-resize-handle:hover {
    background: hsl(var(--accent));
  }

  .url-embed-resize-grip {
    background: hsl(var(--muted-foreground) / 0.4);
    border-radius: 9999px;
    height: 3px;
    width: 2rem;
  }

  .url-embed-resize-handle:hover .url-embed-resize-grip {
    background: hsl(var(--muted-foreground) / 0.7);
  }
</style>
