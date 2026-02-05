<script setup lang="ts">
  import * as pdfjsLib from 'pdfjs-dist'
  import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

  interface Props {
    src: string
    initialPage?: number
    initialScale?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    initialPage: 1,
    initialScale: 1,
  })

  const emit = defineEmits<{
    pageChange: [page: number]
    scaleChange: [scale: number]
    textSelect: [text: string, rect: DOMRect]
    documentLoad: [numPages: number]
    error: [error: Error]
  }>()

  const containerRef = ref<HTMLDivElement>()
  const canvasRef = ref<HTMLCanvasElement>()
  const textLayerRef = ref<HTMLDivElement>()

  const pdfDoc = ref<PDFDocumentProxy | null>(null)
  const currentPage = ref(props.initialPage)
  const numPages = ref(0)
  const scale = ref(props.initialScale)
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  const isRendering = ref(false)
  const pendingPage = ref<number | null>(null)

  const MIN_SCALE = 0.5
  const MAX_SCALE = 3
  const SCALE_STEP = 0.25

  async function loadDocument() {
    if (!props.src) return

    isLoading.value = true
    error.value = null

    try {
      const loadingTask = pdfjsLib.getDocument(props.src)
      pdfDoc.value = await loadingTask.promise
      numPages.value = pdfDoc.value.numPages
      emit('documentLoad', numPages.value)
      await renderPage(currentPage.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load PDF'
      emit('error', err instanceof Error ? err : new Error(String(err)))
    } finally {
      isLoading.value = false
    }
  }

  async function renderPage(pageNum: number) {
    if (!pdfDoc.value || !canvasRef.value) return

    if (isRendering.value) {
      pendingPage.value = pageNum
      return
    }

    isRendering.value = true

    try {
      const page: PDFPageProxy = await pdfDoc.value.getPage(pageNum)
      const viewport = page.getViewport({ scale: scale.value })

      const canvas = canvasRef.value
      const context = canvas.getContext('2d')
      if (!context) return

      const dpr = window.devicePixelRatio || 1
      canvas.width = viewport.width * dpr
      canvas.height = viewport.height * dpr
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      context.scale(dpr, dpr)

      await page.render({
        canvasContext: context,
        viewport,
      }).promise

      await renderTextLayer(page, viewport)

      currentPage.value = pageNum
      emit('pageChange', pageNum)
    } catch (err) {
      console.error('Error rendering page:', err)
    } finally {
      isRendering.value = false

      if (pendingPage.value !== null) {
        const next = pendingPage.value
        pendingPage.value = null
        await renderPage(next)
      }
    }
  }

  async function renderTextLayer(page: PDFPageProxy, viewport: ReturnType<PDFPageProxy['getViewport']>) {
    if (!textLayerRef.value) return

    textLayerRef.value.innerHTML = ''
    textLayerRef.value.style.width = `${viewport.width}px`
    textLayerRef.value.style.height = `${viewport.height}px`

    const textContent = await page.getTextContent()

    const textItems = textContent.items as Array<{
      str: string
      transform: number[]
      width: number
      height: number
    }>

    for (const item of textItems) {
      if (!item.str) continue

      const [, , , , tx, ty] = item.transform
      const span = document.createElement('span')
      span.textContent = item.str
      span.style.position = 'absolute'
      span.style.left = `${tx}px`
      span.style.top = `${viewport.height - ty - item.height}px`
      span.style.fontSize = `${item.height}px`
      span.style.fontFamily = 'sans-serif'
      span.style.transformOrigin = '0 0'
      span.style.whiteSpace = 'pre'
      span.style.color = 'transparent'
      span.style.cursor = 'text'

      textLayerRef.value.appendChild(span)
    }
  }

  function goToPage(page: number) {
    const targetPage = Math.max(1, Math.min(page, numPages.value))
    if (targetPage !== currentPage.value) {
      renderPage(targetPage)
    }
  }

  function nextPage() {
    if (currentPage.value < numPages.value) {
      goToPage(currentPage.value + 1)
    }
  }

  function prevPage() {
    if (currentPage.value > 1) {
      goToPage(currentPage.value - 1)
    }
  }

  function zoomIn() {
    const newScale = Math.min(scale.value + SCALE_STEP, MAX_SCALE)
    if (newScale !== scale.value) {
      scale.value = newScale
      emit('scaleChange', newScale)
      renderPage(currentPage.value)
    }
  }

  function zoomOut() {
    const newScale = Math.max(scale.value - SCALE_STEP, MIN_SCALE)
    if (newScale !== scale.value) {
      scale.value = newScale
      emit('scaleChange', newScale)
      renderPage(currentPage.value)
    }
  }

  function resetZoom() {
    scale.value = 1
    emit('scaleChange', 1)
    renderPage(currentPage.value)
  }

  function fitToWidth() {
    if (!containerRef.value || !pdfDoc.value) return

    pdfDoc.value.getPage(currentPage.value).then((page) => {
      const viewport = page.getViewport({ scale: 1 })
      const containerWidth = containerRef.value!.clientWidth - 48
      scale.value = Math.min(containerWidth / viewport.width, MAX_SCALE)
      emit('scaleChange', scale.value)
      renderPage(currentPage.value)
    })
  }

  function handleTextSelection() {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const text = selection.toString().trim()
    if (text && textLayerRef.value) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      emit('textSelect', text, rect)
    }
  }

  onMounted(() => {
    loadDocument()
    document.addEventListener('mouseup', handleTextSelection)
  })

  onUnmounted(() => {
    document.removeEventListener('mouseup', handleTextSelection)
    pdfDoc.value?.destroy()
  })

  watch(() => props.src, loadDocument)

  defineExpose({
    goToPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToWidth,
    currentPage,
    numPages,
    scale,
  })
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Toolbar -->
    <div class="flex shrink-0 items-center justify-between border-b border-border bg-card/50 px-3 py-2">
      <div class="flex items-center gap-1">
        <UiButton variant="ghost" size="icon" :disabled="currentPage <= 1" @click="prevPage">
          <Icon name="lucide:chevron-left" class="size-4" />
        </UiButton>
        <div class="flex items-center gap-1.5 text-sm">
          <input
            :value="currentPage"
            type="number"
            min="1"
            :max="numPages"
            class="w-12 rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            @change="(e) => goToPage(Number((e.target as HTMLInputElement).value))" />
          <span class="text-muted-foreground">of {{ numPages }}</span>
        </div>
        <UiButton variant="ghost" size="icon" :disabled="currentPage >= numPages" @click="nextPage">
          <Icon name="lucide:chevron-right" class="size-4" />
        </UiButton>
      </div>

      <div class="flex items-center gap-1">
        <UiButton variant="ghost" size="icon" :disabled="scale <= MIN_SCALE" @click="zoomOut">
          <Icon name="lucide:zoom-out" class="size-4" />
        </UiButton>
        <span class="min-w-[4rem] text-center text-sm text-muted-foreground">{{ Math.round(scale * 100) }}%</span>
        <UiButton variant="ghost" size="icon" :disabled="scale >= MAX_SCALE" @click="zoomIn">
          <Icon name="lucide:zoom-in" class="size-4" />
        </UiButton>
        <UiButton variant="ghost" size="icon" title="Fit to width" @click="fitToWidth">
          <Icon name="lucide:maximize-2" class="size-4" />
        </UiButton>
      </div>

      <div class="flex items-center gap-1">
        <slot name="toolbar-end" />
      </div>
    </div>

    <!-- PDF Container -->
    <div ref="containerRef" class="relative min-h-0 flex-1 overflow-auto bg-muted/30">
      <!-- Loading state -->
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
        <div class="flex flex-col items-center gap-3">
          <Icon name="svg-spinners:ring-resize" class="size-8 text-primary" />
          <span class="text-sm text-muted-foreground">Loading PDF...</span>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="absolute inset-0 flex items-center justify-center">
        <div class="flex flex-col items-center gap-3 text-center">
          <Icon name="lucide:file-warning" class="size-12 text-destructive/50" />
          <div>
            <p class="font-medium text-destructive">Failed to load PDF</p>
            <p class="mt-1 text-sm text-muted-foreground">{{ error }}</p>
          </div>
          <UiButton variant="outline" size="sm" @click="loadDocument">
            <Icon name="lucide:refresh-cw" class="mr-2 size-4" />
            Retry
          </UiButton>
        </div>
      </div>

      <!-- PDF Canvas -->
      <div v-else class="flex justify-center p-6">
        <div class="relative shadow-lg">
          <canvas ref="canvasRef" class="block bg-white" />
          <!-- Text layer for selection -->
          <div
            ref="textLayerRef"
            class="pointer-events-auto absolute left-0 top-0 select-text overflow-hidden"
            style="line-height: 1" />
          <!-- Annotation layer slot -->
          <slot name="annotations" :page="currentPage" :scale="scale" />
        </div>
      </div>
    </div>
  </div>
</template>
