<script setup lang="ts">
  import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
  import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
  import { useMermaid } from '~/composables/useMermaid'

  const props = defineProps(nodeViewProps)

  const { renderDiagram, resetTheme } = useMermaid()
  const colorMode = useColorMode()

  const copied = ref(false)
  const svgContent = ref('')
  const isLoading = ref(false)
  const renderError = ref('')
  const showSource = ref(false)
  const diagramEl = ref<HTMLElement | null>(null)
  const isVisible = ref(false)

  // Get available languages from lowlight
  const languages = computed(() => {
    const lowlight = props.extension.options.lowlight
    if (!lowlight) return []
    try {
      return lowlight.listLanguages().sort()
    } catch {
      return []
    }
  })

  // Get/set selected language
  const selectedLanguage = computed({
    get() {
      const lang = props.node.attrs.language
      return lang || 'auto'
    },
    set(language: string) {
      props.updateAttributes({ language: language === 'auto' ? null : language })
    },
  })

  function setLanguage(language: unknown) {
    selectedLanguage.value = String(language || '')
  }

  const isMermaid = computed(() => selectedLanguage.value === 'mermaid')

  // Copy code to clipboard
  async function copyCode() {
    const content = props.node.textContent
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  let renderTimer: ReturnType<typeof setTimeout> | null = null

  async function doRender() {
    if (!isMermaid.value || !isVisible.value) return
    const source = props.node.textContent?.trim()
    if (!source) {
      svgContent.value = ''
      renderError.value = ''
      return
    }
    isLoading.value = true
    renderError.value = ''
    const result = await renderDiagram(source)
    isLoading.value = false
    if (result.error) {
      renderError.value = result.error
      svgContent.value = ''
    }
    else {
      svgContent.value = result.svg ?? ''
      renderError.value = ''
    }
  }

  function scheduleRender() {
    if (renderTimer) clearTimeout(renderTimer)
    renderTimer = setTimeout(doRender, 600)
  }

  // Lazy render via IntersectionObserver
  let observer: IntersectionObserver | null = null
  onMounted(() => {
    if (!import.meta.client) return
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isVisible.value) {
          isVisible.value = true
        }
      },
      { rootMargin: '200px' },
    )
    if (diagramEl.value) observer.observe(diagramEl.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    if (renderTimer) clearTimeout(renderTimer)
  })

  // Re-render when source changes (debounced) or when it first becomes visible
  watch(() => props.node.textContent, () => {
    if (isMermaid.value && isVisible.value) scheduleRender()
  })
  watch(() => isVisible.value, (v) => {
    if (v && isMermaid.value) doRender()
  })
  watch(() => isMermaid.value, (v) => {
    if (v && isVisible.value) doRender()
    if (!v) { svgContent.value = ''; renderError.value = '' }
  })

  // Re-render on theme change
  watch(() => colorMode.value, () => {
    if (isMermaid.value) { resetTheme(); scheduleRender() }
  })
</script>

<template>
  <node-view-wrapper class="code-block relative group">

    <!-- ── Mermaid Diagram ──────────────────────────────────────────── -->
    <template v-if="isMermaid">
      <div ref="diagramEl" class="rounded-lg border border-border/50 bg-card overflow-hidden">

        <!-- Source always in DOM for TipTap; hidden visually in preview mode -->
        <div :class="showSource ? 'block' : 'sr-only'" class="relative">
          <pre
            class="bg-muted/50 p-4 pt-10 pb-0 font-mono text-sm leading-relaxed overflow-x-auto m-0"
          ><code><node-view-content /></code></pre>
        </div>

        <!-- Diagram preview (hidden in source mode) -->
        <div v-if="!showSource">
          <!-- Loading -->
          <div
            v-if="isLoading"
            class="flex items-center justify-center min-h-[80px] p-6 text-muted-foreground">
            <Icon name="lucide:loader-circle" class="h-5 w-5 animate-spin" />
          </div>

          <!-- Error -->
          <div
            v-else-if="renderError"
            class="m-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <div class="flex items-start gap-2">
              <Icon name="lucide:triangle-alert" class="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p class="text-xs font-medium text-destructive">Diagram syntax error</p>
                <p class="mt-0.5 font-mono text-xs text-muted-foreground break-all">{{ renderError }}</p>
              </div>
            </div>
          </div>

          <!-- Rendered SVG -->
          <div
            v-else-if="svgContent"
            class="flex items-center justify-center p-4 overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
            v-html="svgContent" />

          <!-- Empty state -->
          <div
            v-else
            class="flex flex-col items-center justify-center gap-2 min-h-[80px] p-6 text-muted-foreground">
            <Icon name="lucide:workflow" class="h-5 w-5 opacity-40" />
            <span class="text-xs">Start typing mermaid syntax to preview</span>
          </div>
        </div>

        <!-- Hover controls -->
        <div
          class="absolute right-2 top-2 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          contenteditable="false">
          <!-- Edit / Preview toggle -->
          <button
            class="h-7 px-2 flex items-center gap-1.5 text-xs rounded-md
                   bg-background/90 backdrop-blur-sm border border-border/50
                   hover:bg-accent hover:text-accent-foreground"
            @click="showSource = !showSource">
            <Icon :name="showSource ? 'lucide:eye' : 'lucide:pencil'" class="h-3.5 w-3.5" />
            <span>{{ showSource ? 'Preview' : 'Edit' }}</span>
          </button>
          <!-- Copy source -->
          <button
            class="h-7 px-2 flex items-center gap-1.5 text-xs rounded-md
                   bg-background/90 backdrop-blur-sm border border-border/50
                   hover:bg-accent hover:text-accent-foreground"
            @click="copyCode">
            <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="h-3.5 w-3.5" />
          </button>
          <!-- Language badge -->
          <span
            class="h-7 px-2 flex items-center text-xs rounded-md
                   bg-background/90 backdrop-blur-sm border border-border/50
                   text-muted-foreground font-mono">
            mermaid
          </span>
        </div>
      </div>
    </template>

    <!-- ── Regular Code Block ───────────────────────────────────────── -->
    <template v-else>
      <!-- Language Selector -->
      <div
        class="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        contenteditable="false">
        <UiSelect
          :model-value="selectedLanguage"
          @update:model-value="setLanguage">
          <UiSelectTrigger class="h-7 w-[140px] text-xs bg-background/90 backdrop-blur-sm border-border/50">
            <Icon name="lucide:code-2" class="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <UiSelectValue placeholder="auto" />
          </UiSelectTrigger>
          <UiSelectContent class="max-h-[200px]">
            <UiSelectItem value="auto" class="text-xs">
              auto
            </UiSelectItem>
            <UiSelectSeparator />
            <UiSelectItem
              v-for="lang in languages"
              :key="lang"
              :value="lang"
              class="text-xs">
              {{ lang }}
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>
      </div>

      <!-- Copy Button -->
      <button
        contenteditable="false"
        class="absolute right-2 bottom-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200
               h-7 px-2 flex items-center gap-1.5 text-xs rounded-md
               bg-background/90 backdrop-blur-sm border border-border/50
               hover:bg-accent hover:text-accent-foreground"
        @click="copyCode">
        <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="h-3.5 w-3.5" />
        <span>{{ copied ? 'Copied!' : 'Copy' }}</span>
      </button>

      <!-- Code Block -->
      <pre
        class="bg-muted/50 rounded-lg p-4 pt-10 pb-10 font-mono text-sm leading-relaxed overflow-x-auto
               border border-border/50"><code><node-view-content /></code></pre>
    </template>

  </node-view-wrapper>
</template>

<style scoped>
  .code-block pre {
    /* Ensure proper code block styling */
    tab-size: 2;
    -moz-tab-size: 2;
  }

  .code-block pre :deep(.hljs) {
    background: transparent;
    padding: 0;
  }

  /* Syntax highlighting colors - using CSS variables for theming */
  .code-block :deep(.hljs-comment),
  .code-block :deep(.hljs-quote) {
    color: var(--muted-foreground);
    font-style: italic;
  }

  .code-block :deep(.hljs-keyword),
  .code-block :deep(.hljs-selector-tag),
  .code-block :deep(.hljs-addition) {
    color: oklch(0.65 0.18 295);
  }

  .code-block :deep(.hljs-number),
  .code-block :deep(.hljs-string),
  .code-block :deep(.hljs-meta .hljs-string),
  .code-block :deep(.hljs-literal),
  .code-block :deep(.hljs-doctag),
  .code-block :deep(.hljs-regexp) {
    color: oklch(0.6 0.2 145);
  }

  .code-block :deep(.hljs-attribute),
  .code-block :deep(.hljs-attr),
  .code-block :deep(.hljs-variable),
  .code-block :deep(.hljs-template-variable),
  .code-block :deep(.hljs-class .hljs-title),
  .code-block :deep(.hljs-type) {
    color: oklch(0.65 0.15 250);
  }

  .code-block :deep(.hljs-symbol),
  .code-block :deep(.hljs-bullet),
  .code-block :deep(.hljs-subst),
  .code-block :deep(.hljs-meta),
  .code-block :deep(.hljs-link) {
    color: oklch(0.7 0.15 50);
  }

  .code-block :deep(.hljs-built_in),
  .code-block :deep(.hljs-title),
  .code-block :deep(.hljs-section),
  .code-block :deep(.hljs-name) {
    color: oklch(0.65 0.17 265);
  }

  .code-block :deep(.hljs-tag),
  .code-block :deep(.hljs-tag .hljs-title),
  .code-block :deep(.hljs-selector-id),
  .code-block :deep(.hljs-selector-class) {
    color: oklch(0.7 0.15 25);
  }

  .code-block :deep(.hljs-emphasis) {
    font-style: italic;
  }

  .code-block :deep(.hljs-strong) {
    font-weight: 700;
  }

  .code-block :deep(.hljs-deletion) {
    color: oklch(0.6 0.2 25);
  }
</style>
