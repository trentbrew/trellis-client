<script setup lang="ts">
  import type { DatabaseSchema } from '~/types/database'

  const props = defineProps<{
    collectionId: string
    modelValue?: string
    schema?: DatabaseSchema | null
    hideThumbnails?: boolean
    config?: {
      slideTheme?: 'dark' | 'light' | 'auto'
      slideTransition?: 'fade' | 'slide' | 'none'
      slideOrderField?: string
    }
  }>()

  const emit = defineEmits<{
    'update:slideIndex': [index: number]
  }>()

  // ── Slide data extraction ──────────────────────────────────────────────────

  interface Slide {
    id: string
    order: number
    title: string
    subtitle: string
    body: string
    layout: 'title' | 'section' | 'content' | 'split' | 'quote' | 'image' | 'blank'
    background: string
    speakerNotes: string
    media: string
  }

  const extractSlides = (raw: string | undefined): Slide[] => {
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      const candidates = ['@graph', 'items', 'records', 'data', 'nodes']
      let items: any[] = []

      if (Array.isArray(parsed)) {
        items = parsed
      } else if (parsed && typeof parsed === 'object') {
        for (const key of candidates) {
          if (Array.isArray(parsed[key])) {
            items = parsed[key]
            break
          }
        }
        if (!items.length && !Array.isArray(parsed)) {
          items = [parsed]
        }
      }

      const orderField = props.config?.slideOrderField ?? 'order'

      return items
        .map((item: any, idx: number) => {
          const fields = item.fields ?? item
          return {
            id: item.id ?? `slide-${idx}`,
            order: Number(fields[orderField] ?? fields.order ?? idx),
            title: String(fields.title ?? fields.Title ?? ''),
            subtitle: String(fields.subtitle ?? fields.Subtitle ?? ''),
            body: String(fields.body ?? fields.Body ?? fields.content ?? ''),
            layout: (fields.layout ?? fields.Layout ?? 'content') as Slide['layout'],
            background: String(fields.background ?? fields.Background ?? ''),
            speakerNotes: String(fields.speakerNotes ?? fields.SpeakerNotes ?? ''),
            media: String(fields.media ?? fields.Media ?? fields.image ?? ''),
          }
        })
        .sort((a, b) => a.order - b.order)
    } catch {
      return []
    }
  }

  const slides = computed(() => extractSlides(props.modelValue))

  // ── Navigation ─────────────────────────────────────────────────────────────

  const currentIndex = ref(0)
  const isFullscreen = ref(false)
  const containerRef = ref<HTMLElement | null>(null)

  const totalSlides = computed(() => slides.value.length)
  const currentSlide = computed(() => slides.value[currentIndex.value] ?? null)
  const progress = computed(() => (totalSlides.value > 1 ? (currentIndex.value / (totalSlides.value - 1)) * 100 : 100))

  const goTo = (index: number) => {
    if (index >= 0 && index < totalSlides.value) {
      currentIndex.value = index
      emit('update:slideIndex', index)
    }
  }

  const next = () => goTo(currentIndex.value + 1)
  const prev = () => goTo(currentIndex.value - 1)

  const toggleFullscreen = async () => {
    if (!containerRef.value) return
    try {
      if (!document.fullscreenElement) {
        await containerRef.value.requestFullscreen()
        isFullscreen.value = true
      } else {
        await document.exitFullscreen()
        isFullscreen.value = false
      }
    } catch {
      // Fullscreen not supported
    }
  }

  const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement
  }

  // ── Keyboard navigation ────────────────────────────────────────────────────

  const handleKeydown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
        e.preventDefault()
        next()
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        prev()
        break
      case 'Home':
        e.preventDefault()
        goTo(0)
        break
      case 'End':
        e.preventDefault()
        goTo(totalSlides.value - 1)
        break
      case 'f':
      case 'F':
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault()
          toggleFullscreen()
        }
        break
      case 'Escape':
        if (isFullscreen.value) {
          e.preventDefault()
          // Browser handles fullscreen exit on Escape
        }
        break
    }
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
  })

  // ── Lightweight markdown renderer ──────────────────────────────────────────

  const renderMarkdown = (md: string): string => {
    if (!md) return ''
    let html = md

    // Extract mermaid blocks BEFORE escaping (they need raw syntax)
    const mermaidBlocks: string[] = []
    html = html.replace(/```mermaid\n([\s\S]*?)```/g, (_match, code) => {
      const idx = mermaidBlocks.length
      mermaidBlocks.push(code.trim())
      return `%%MERMAID_${idx}%%`
    })

    // Escape HTML
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Code blocks (```...```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
      return `<pre class="slide-code"><code>${code.trim()}</code></pre>`
    })

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="slide-inline-code">$1</code>')

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

    // Blockquotes
    html = html.replace(/^&gt;\s*(.+)$/gm, '<blockquote class="slide-blockquote">$1</blockquote>')

    // Tables: detect lines with | separators
    const lines = html.split('\n')
    const processed: string[] = []
    let inTable = false
    let tableRows: string[] = []

    const flushTable = () => {
      if (tableRows.length < 2) {
        processed.push(...tableRows)
      } else {
        let tableHtml = '<table class="slide-table"><thead><tr>'
        const headerCells = tableRows[0]!.split('|').filter((c) => c.trim())
        for (const cell of headerCells) {
          tableHtml += `<th>${cell.trim()}</th>`
        }
        tableHtml += '</tr></thead><tbody>'
        // Skip separator row (index 1)
        for (let i = 2; i < tableRows.length; i++) {
          const cells = tableRows[i]!.split('|').filter((c) => c.trim())
          tableHtml += '<tr>'
          for (const cell of cells) {
            tableHtml += `<td>${cell.trim()}</td>`
          }
          tableHtml += '</tr>'
        }
        tableHtml += '</tbody></table>'
        processed.push(tableHtml)
      }
      tableRows = []
      inTable = false
    }

    for (const line of lines) {
      const isTableLine = line.includes('|') && line.trim().startsWith('|')
      if (isTableLine) {
        // Skip separator rows
        if (/^\|[\s\-:|]+\|$/.test(line.trim())) {
          if (!inTable) {
            inTable = true
          }
          tableRows.push(line)
          continue
        }
        inTable = true
        tableRows.push(line)
      } else {
        if (inTable) flushTable()
        processed.push(line)
      }
    }
    if (inTable) flushTable()
    html = processed.join('\n')

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="slide-list">$1</ul>')
    // Clean up nested ul
    html = html.replace(/<\/ul>\s*<ul class="slide-list">/g, '')

    // Headings (process after other transforms)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

    // Paragraphs: wrap remaining bare text lines
    html = html
      .split('\n')
      .map((line) => {
        const trimmed = line.trim()
        if (!trimmed) return ''
        if (trimmed.startsWith('<') || trimmed.startsWith('%%MERMAID_')) return line
        return `<p>${line}</p>`
      })
      .join('\n')

    // Replace mermaid sentinels with actual placeholder divs
    for (let i = 0; i < mermaidBlocks.length; i++) {
      const encoded = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(mermaidBlocks[i]!))) : ''
      html = html.replace(
        `%%MERMAID_${i}%%`,
        `<div class="slide-mermaid" data-mermaid-idx="${i}" data-mermaid="${encoded}"><div class="slide-mermaid-loading">Rendering diagram…</div></div>`,
      )
    }

    return html
  }

  // ── Slide background style ─────────────────────────────────────────────────

  const slideStyle = computed(() => {
    const bg = currentSlide.value?.background
    if (!bg) return {}
    if (bg.startsWith('url(') || bg.startsWith('http')) {
      const url = bg.startsWith('url(') ? bg : `url(${bg})`
      return { backgroundImage: url, backgroundSize: 'cover', backgroundPosition: 'center' }
    }
    return { background: bg }
  })

  // ── Theme ──────────────────────────────────────────────────────────────────

  const theme = computed(() => props.config?.slideTheme ?? 'dark')
  const transition = computed(() => props.config?.slideTransition ?? 'fade')

  // ── Mermaid diagram renderer ──────────────────────────────────────────────

  let mermaidInstance: any = null
  let mermaidRenderCounter = 0

  const getMermaidTheme = (): string => {
    switch (theme.value) {
      case 'dark':
        return 'dark'
      case 'light':
        return 'default'
      default:
        // auto — check if OS / app prefers dark
        if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
          return 'dark'
        }
        return 'default'
    }
  }

  const renderMermaidDiagrams = async () => {
    if (!containerRef.value) return
    const placeholders = containerRef.value.querySelectorAll<HTMLElement>('.slide-mermaid[data-mermaid]')
    if (!placeholders.length) return

    try {
      if (!mermaidInstance) {
        const mod = await import('mermaid')
        mermaidInstance = mod.default
      }

      mermaidInstance.initialize({
        startOnLoad: false,
        theme: getMermaidTheme(),
        fontFamily: 'inherit',
        securityLevel: 'loose',
      })

      for (const el of placeholders) {
        const encoded = el.getAttribute('data-mermaid')
        if (!encoded || el.querySelector('svg')) continue // already rendered

        try {
          const source = decodeURIComponent(escape(atob(encoded)))
          const id = `mermaid-slide-${mermaidRenderCounter++}`
          const { svg } = await mermaidInstance.render(id, source)
          el.innerHTML = svg
        } catch {
          // Graceful degradation: show raw source with error badge
          const raw = (() => {
            try {
              return decodeURIComponent(escape(atob(encoded)))
            } catch {
              return '(unable to decode diagram)'
            }
          })()
          el.innerHTML = `<div class="slide-mermaid-error"><span class="slide-mermaid-error-badge">Diagram error</span><pre class="slide-code"><code>${raw.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre></div>`
        }
      }
    } catch (err) {
      console.warn('[SlideDeckProjection] Failed to load mermaid:', err)
    }
  }

  watch(
    () => currentSlide.value?.id,
    async () => {
      await nextTick()
      renderMermaidDiagrams()
    },
  )

  watch(
    () => theme.value,
    async () => {
      // Re-render diagrams when theme changes (mermaid bakes colors into SVG)
      if (!containerRef.value) return
      const rendered = containerRef.value.querySelectorAll<HTMLElement>('.slide-mermaid[data-mermaid] svg')
      if (!rendered.length) return
      // Clear rendered SVGs so they re-render with new theme
      for (const svg of rendered) {
        svg.remove()
      }
      await nextTick()
      renderMermaidDiagrams()
    },
  )

  onMounted(async () => {
    await nextTick()
    renderMermaidDiagrams()
  })

  // ── Expose for external control ──────────────────────────────────────────

  defineExpose({
    slides,
    currentIndex,
    currentSlide,
    totalSlides,
    goTo,
    next,
    prev,
  })
</script>

<template>
  <div
    ref="containerRef"
    class="slide-deck-projection"
    :class="[`slide-theme-${theme}`, { 'slide-fullscreen': isFullscreen }]"
    tabindex="0"
    @keydown="handleKeydown">
    <!-- Empty state -->
    <div v-if="!slides.length" class="slide-empty">
      <Icon name="lucide:presentation" class="h-12 w-12 text-muted-foreground/40" />
      <h3 class="mt-4 text-lg font-semibold text-muted-foreground">No slides yet</h3>
      <p class="mt-1 text-sm text-muted-foreground/60">
        Add records to this collection with <code>title</code>, <code>body</code>, and <code>layout</code> fields to
        create slides.
      </p>
    </div>

    <!-- Slide viewport -->
    <div v-else class="slide-viewport" :style="slideStyle">
      <Transition :name="`slide-${transition}`" mode="out-in" @after-enter="renderMermaidDiagrams">
        <div v-if="currentSlide" :key="currentSlide.id" class="slide-content" :class="`slide-layout-${currentSlide.layout}`">

          <!-- Layout: title -->
          <template v-if="currentSlide.layout === 'title'">
            <div class="slide-center">
              <h1 class="slide-title-xl" v-html="renderMarkdown(currentSlide.title)" />
              <p v-if="currentSlide.subtitle" class="slide-subtitle-lg" v-html="renderMarkdown(currentSlide.subtitle)" />
            </div>
          </template>

          <!-- Layout: section -->
          <template v-else-if="currentSlide.layout === 'section'">
            <div class="slide-center">
              <div class="slide-section-marker" />
              <h1 class="slide-title-lg" v-html="renderMarkdown(currentSlide.title)" />
              <p v-if="currentSlide.subtitle" class="slide-subtitle" v-html="renderMarkdown(currentSlide.subtitle)" />
            </div>
          </template>

          <!-- Layout: content -->
          <template v-else-if="currentSlide.layout === 'content' || !currentSlide.layout">
            <div class="slide-top-left">
              <h1 v-if="currentSlide.title" class="slide-title" v-html="renderMarkdown(currentSlide.title)" />
              <p v-if="currentSlide.subtitle" class="slide-subtitle-sm" v-html="renderMarkdown(currentSlide.subtitle)" />
              <div v-if="currentSlide.body" class="slide-body" v-html="renderMarkdown(currentSlide.body)" />
            </div>
          </template>

          <!-- Layout: split -->
          <template v-else-if="currentSlide.layout === 'split'">
            <div class="slide-split">
              <div class="slide-split-text">
                <h1 v-if="currentSlide.title" class="slide-title" v-html="renderMarkdown(currentSlide.title)" />
                <div v-if="currentSlide.body" class="slide-body" v-html="renderMarkdown(currentSlide.body)" />
              </div>
              <div class="slide-split-media">
                <img v-if="currentSlide.media" :src="currentSlide.media" alt="" class="slide-media-img" />
                <div v-else class="slide-media-placeholder">
                  <Icon name="lucide:image" class="h-16 w-16 opacity-20" />
                </div>
              </div>
            </div>
          </template>

          <!-- Layout: quote -->
          <template v-else-if="currentSlide.layout === 'quote'">
            <div class="slide-center">
              <blockquote class="slide-quote">
                <div v-html="renderMarkdown(currentSlide.body || currentSlide.title)" />
              </blockquote>
              <p v-if="currentSlide.subtitle" class="slide-attribution">— {{ currentSlide.subtitle }}</p>
            </div>
          </template>

          <!-- Layout: image -->
          <template v-else-if="currentSlide.layout === 'image'">
            <div class="slide-image-full">
              <img v-if="currentSlide.media" :src="currentSlide.media" alt="" class="slide-bg-img" />
              <div v-if="currentSlide.title" class="slide-image-overlay">
                <h1 class="slide-title-lg" v-html="renderMarkdown(currentSlide.title)" />
              </div>
            </div>
          </template>

          <!-- Layout: blank -->
          <template v-else-if="currentSlide.layout === 'blank'">
            <div class="slide-top-left">
              <div v-if="currentSlide.body" class="slide-body" v-html="renderMarkdown(currentSlide.body)" />
            </div>
          </template>

          <!-- Fallback: content layout -->
          <template v-else>
            <div class="slide-top-left">
              <h1 v-if="currentSlide.title" class="slide-title" v-html="renderMarkdown(currentSlide.title)" />
              <div v-if="currentSlide.body" class="slide-body" v-html="renderMarkdown(currentSlide.body)" />
            </div>
          </template>
        </div>
      </Transition>

      <!-- Controls overlay -->
      <div class="slide-controls">
        <!-- Progress bar -->
        <div class="slide-progress-track">
          <div class="slide-progress-fill" :style="{ width: `${progress}%` }" />
        </div>

        <!-- Bottom bar -->
        <div class="slide-bottom-bar">
          <div class="slide-nav-buttons">
            <button class="slide-btn" :disabled="currentIndex === 0" @click="prev">
              <Icon name="lucide:chevron-left" class="h-4 w-4" />
            </button>
            <button class="slide-btn" :disabled="currentIndex >= totalSlides - 1" @click="next">
              <Icon name="lucide:chevron-right" class="h-4 w-4" />
            </button>
          </div>

          <span class="slide-counter">{{ currentIndex + 1 }} / {{ totalSlides }}</span>

          <div class="slide-action-buttons">
            <button class="slide-btn" title="Toggle fullscreen (F)" @click="toggleFullscreen">
              <Icon :name="isFullscreen ? 'lucide:minimize-2' : 'lucide:maximize-2'" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Click zones for navigation -->
      <div class="slide-click-prev" @click="prev" />
      <div class="slide-click-next" @click="next" />
    </div>

    <!-- Slide thumbnails strip (non-fullscreen only) -->
    <div v-if="!hideThumbnails && !isFullscreen && slides.length > 1" class="slide-thumbnails">
      <button
        v-for="(slide, idx) in slides"
        :key="slide.id"
        class="slide-thumb"
        :class="{ 'slide-thumb-active': idx === currentIndex }"
        @click="goTo(idx)">
        <span class="slide-thumb-number">{{ idx + 1 }}</span>
        <span class="slide-thumb-title">{{ slide.title || `Slide ${idx + 1}` }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
  /* ── Base layout ──────────────────────────────────────────────────────────── */

  .slide-deck-projection {
    display: flex;
    flex-direction: column;
    height: 100%;
    outline: none;
    overflow: hidden;
  }

  .slide-deck-projection:focus {
    outline: none;
  }

  /* ── Empty state ──────────────────────────────────────────────────────────── */

  .slide-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    text-align: center;
  }

  .slide-empty code {
    background: hsl(var(--muted));
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.8em;
  }

  /* ── Viewport ─────────────────────────────────────────────────────────────── */

  .slide-viewport {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .slide-theme-dark .slide-viewport {
    background: #09090b;
    color: #fafafa;
  }

  .slide-theme-light .slide-viewport {
    background: #fafafa;
    color: #09090b;
  }

  .slide-theme-auto .slide-viewport {
    background: hsl(var(--background));
    color: hsl(var(--foreground));
  }

  /* ── Slide content area ───────────────────────────────────────────────────── */

  .slide-content {
    width: 100%;
    height: 100%;
    display: flex;
    padding: 4rem 5rem;
  }

  .slide-fullscreen .slide-content {
    padding: 5rem 7rem;
  }

  /* ── Layout: centered ─────────────────────────────────────────────────────── */

  .slide-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    text-align: center;
    gap: 1rem;
  }

  /* ── Layout: top-left ─────────────────────────────────────────────────────── */

  .slide-top-left {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    width: 100%;
    gap: 1.5rem;
  }

  /* ── Layout: split ────────────────────────────────────────────────────────── */

  .slide-split {
    display: flex;
    width: 100%;
    height: 100%;
    gap: 3rem;
  }

  .slide-split-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1.5rem;
  }

  .slide-split-media {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 0.75rem;
  }

  .slide-media-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 0.75rem;
  }

  .slide-media-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border: 1px dashed currentColor;
    opacity: 0.15;
    border-radius: 0.75rem;
  }

  /* ── Layout: image ────────────────────────────────────────────────────────── */

  .slide-layout-image .slide-content {
    padding: 0;
  }

  .slide-image-full {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .slide-bg-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .slide-image-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    padding: 4rem 5rem;
    background: linear-gradient(transparent 40%, rgba(0, 0, 0, 0.7) 100%);
  }

  /* ── Layout: quote ────────────────────────────────────────────────────────── */

  .slide-quote {
    font-size: 2rem;
    font-style: italic;
    line-height: 1.4;
    max-width: 48rem;
    opacity: 0.9;
  }

  .slide-quote::before {
    content: '\201C';
    font-size: 4rem;
    line-height: 0;
    vertical-align: -0.4em;
    opacity: 0.3;
    margin-right: 0.25rem;
  }

  .slide-attribution {
    font-size: 1.125rem;
    opacity: 0.5;
    margin-top: 1rem;
  }

  /* ── Section marker ───────────────────────────────────────────────────────── */

  .slide-section-marker {
    width: 3rem;
    height: 0.25rem;
    border-radius: 9999px;
    margin-bottom: 1rem;
  }

  .slide-theme-dark .slide-section-marker {
    background: #a1a1aa;
  }

  .slide-theme-light .slide-section-marker {
    background: #52525b;
  }

  .slide-theme-auto .slide-section-marker {
    background: hsl(var(--muted-foreground));
  }

  /* ── Typography ───────────────────────────────────────────────────────────── */

  .slide-title-xl :deep(h1),
  .slide-title-xl :deep(p),
  .slide-title-xl {
    font-size: 3.5rem;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }

  .slide-title-lg :deep(h1),
  .slide-title-lg :deep(p),
  .slide-title-lg {
    font-size: 2.75rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .slide-title :deep(h1),
  .slide-title :deep(p),
  .slide-title {
    font-size: 2.25rem;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.01em;
  }

  .slide-subtitle-lg :deep(p),
  .slide-subtitle-lg {
    font-size: 1.5rem;
    font-weight: 400;
    opacity: 0.6;
    line-height: 1.4;
  }

  .slide-subtitle :deep(p),
  .slide-subtitle {
    font-size: 1.25rem;
    font-weight: 400;
    opacity: 0.5;
    line-height: 1.4;
  }

  .slide-subtitle-sm :deep(p),
  .slide-subtitle-sm {
    font-size: 1.125rem;
    font-weight: 400;
    opacity: 0.5;
    line-height: 1.4;
  }

  /* ── Body content ─────────────────────────────────────────────────────────── */

  .slide-body {
    font-size: 1.375rem;
    line-height: 1.6;
  }

  .slide-body :deep(h1) {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
  }

  .slide-body :deep(h2) {
    font-size: 1.625rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .slide-body :deep(h3) {
    font-size: 1.375rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .slide-body :deep(p) {
    margin-bottom: 0.75rem;
  }

  .slide-body :deep(p:last-child) {
    margin-bottom: 0;
  }

  .slide-body :deep(strong) {
    font-weight: 700;
  }

  .slide-body :deep(em) {
    font-style: italic;
    opacity: 0.85;
  }

  .slide-body :deep(ul.slide-list) {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0;
  }

  .slide-body :deep(li) {
    position: relative;
    padding-left: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .slide-body :deep(li)::before {
    content: '•';
    position: absolute;
    left: 0;
    opacity: 0.4;
  }

  .slide-body :deep(pre.slide-code) {
    padding: 1rem 1.25rem;
    border-radius: 0.5rem;
    font-size: 0.9em;
    overflow-x: auto;
    margin: 0.75rem 0;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    line-height: 1.5;
  }

  .slide-theme-dark .slide-body :deep(pre.slide-code) {
    background: rgba(255, 255, 255, 0.06);
  }

  .slide-theme-light .slide-body :deep(pre.slide-code) {
    background: rgba(0, 0, 0, 0.04);
  }

  .slide-theme-auto .slide-body :deep(pre.slide-code) {
    background: hsl(var(--muted));
  }

  .slide-body :deep(code.slide-inline-code) {
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }

  .slide-theme-dark .slide-body :deep(code.slide-inline-code) {
    background: rgba(255, 255, 255, 0.1);
  }

  .slide-theme-light .slide-body :deep(code.slide-inline-code) {
    background: rgba(0, 0, 0, 0.06);
  }

  .slide-theme-auto .slide-body :deep(code.slide-inline-code) {
    background: hsl(var(--muted));
  }

  .slide-body :deep(blockquote.slide-blockquote) {
    border-left: 3px solid currentColor;
    padding-left: 1rem;
    opacity: 0.8;
    font-style: italic;
    margin: 0.75rem 0;
  }

  .slide-body :deep(table.slide-table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9em;
    margin: 0.75rem 0;
  }

  .slide-body :deep(table.slide-table th) {
    text-align: left;
    font-weight: 600;
    padding: 0.5rem 1rem;
    border-bottom: 2px solid currentColor;
    opacity: 0.7;
  }

  .slide-body :deep(table.slide-table td) {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid currentColor;
    opacity: 0.9;
  }

  .slide-theme-dark .slide-body :deep(table.slide-table th) {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .slide-theme-dark .slide-body :deep(table.slide-table td) {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .slide-theme-light .slide-body :deep(table.slide-table th) {
    border-color: rgba(0, 0, 0, 0.15);
  }

  .slide-theme-light .slide-body :deep(table.slide-table td) {
    border-color: rgba(0, 0, 0, 0.08);
  }

  /* ── Mermaid diagrams ─────────────────────────────────────────────────────── */

  .slide-body :deep(.slide-mermaid) {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 1rem 0;
    min-height: 4rem;
    max-width: 100%;
    overflow-x: auto;
  }

  .slide-body :deep(.slide-mermaid svg) {
    max-width: 100%;
    height: auto;
  }

  .slide-body :deep(.slide-mermaid-loading) {
    font-size: 0.875rem;
    opacity: 0.4;
    font-style: italic;
  }

  .slide-body :deep(.slide-mermaid-error) {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .slide-body :deep(.slide-mermaid-error-badge) {
    display: inline-flex;
    align-self: flex-start;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  /* Mermaid in non-body contexts (title, subtitle) */
  .slide-center :deep(.slide-mermaid),
  .slide-top-left :deep(.slide-mermaid),
  .slide-split :deep(.slide-mermaid) {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 1rem 0;
    max-width: 100%;
    overflow-x: auto;
  }

  .slide-center :deep(.slide-mermaid svg),
  .slide-top-left :deep(.slide-mermaid svg),
  .slide-split :deep(.slide-mermaid svg) {
    max-width: 100%;
    height: auto;
  }

  /* ── Controls ─────────────────────────────────────────────────────────────── */

  .slide-controls {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .slide-viewport:hover .slide-controls,
  .slide-viewport:focus-within .slide-controls {
    opacity: 1;
  }

  .slide-progress-track {
    height: 2px;
    width: 100%;
  }

  .slide-theme-dark .slide-progress-track {
    background: rgba(255, 255, 255, 0.1);
  }

  .slide-theme-light .slide-progress-track {
    background: rgba(0, 0, 0, 0.08);
  }

  .slide-theme-auto .slide-progress-track {
    background: hsl(var(--muted));
  }

  .slide-progress-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .slide-theme-dark .slide-progress-fill {
    background: rgba(255, 255, 255, 0.5);
  }

  .slide-theme-light .slide-progress-fill {
    background: rgba(0, 0, 0, 0.3);
  }

  .slide-theme-auto .slide-progress-fill {
    background: hsl(var(--foreground) / 0.4);
  }

  .slide-bottom-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1.5rem;
  }

  .slide-theme-dark .slide-bottom-bar {
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
  }

  .slide-theme-light .slide-bottom-bar {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(8px);
  }

  .slide-theme-auto .slide-bottom-bar {
    background: hsl(var(--background) / 0.7);
    backdrop-filter: blur(8px);
  }

  .slide-nav-buttons,
  .slide-action-buttons {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .slide-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
    transition:
      opacity 0.15s,
      background 0.15s;
  }

  .slide-btn:hover:not(:disabled) {
    opacity: 1;
  }

  .slide-theme-dark .slide-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }

  .slide-theme-light .slide-btn:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.06);
  }

  .slide-btn:disabled {
    opacity: 0.2;
    cursor: default;
  }

  .slide-counter {
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    opacity: 0.5;
    user-select: none;
  }

  /* ── Click zones ──────────────────────────────────────────────────────────── */

  .slide-click-prev,
  .slide-click-next {
    position: absolute;
    top: 0;
    bottom: 3rem;
    width: 15%;
    z-index: 5;
    cursor: pointer;
  }

  .slide-click-prev {
    left: 0;
  }

  .slide-click-next {
    right: 0;
  }

  /* ── Thumbnail strip ──────────────────────────────────────────────────────── */

  .slide-thumbnails {
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    overflow-x: auto;
    border-top: 1px solid hsl(var(--border));
    background: hsl(var(--background));
    scrollbar-width: thin;
  }

  .slide-thumb {
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

  .slide-thumb:hover {
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
  }

  .slide-thumb-active {
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
    border-color: hsl(var(--border));
  }

  .slide-thumb-number {
    font-variant-numeric: tabular-nums;
    opacity: 0.5;
    font-size: 0.625rem;
  }

  .slide-thumb-title {
    max-width: 8rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Transitions ──────────────────────────────────────────────────────────── */

  .slide-fade-enter-active,
  .slide-fade-leave-active {
    transition: opacity 0.25s ease;
  }

  .slide-fade-enter-from,
  .slide-fade-leave-to {
    opacity: 0;
  }

  .slide-slide-enter-active,
  .slide-slide-leave-active {
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
  }

  .slide-slide-enter-from {
    transform: translateX(3%);
    opacity: 0;
  }

  .slide-slide-leave-to {
    transform: translateX(-3%);
    opacity: 0;
  }

  .slide-none-enter-active,
  .slide-none-leave-active {
    transition: none;
  }

  /* ── Fullscreen ───────────────────────────────────────────────────────────── */

  .slide-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 9999;
  }

  .slide-fullscreen .slide-thumbnails {
    display: none;
  }
</style>
