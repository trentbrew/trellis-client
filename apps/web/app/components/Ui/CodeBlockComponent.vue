<script setup lang="ts">
  import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
  import { ref, computed } from 'vue'

  const props = defineProps(nodeViewProps)

  const copied = ref(false)

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

  function setLanguage(language: string | number | boolean | object | null | undefined) {
    selectedLanguage.value = String(language || '')
  }

  // Copy code to clipboard
  async function copyCode() {
    const content = props.node.textContent
    if (!content) return

    try {
      await navigator.clipboard.writeText(content)
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }
</script>

<template>
  <node-view-wrapper class="code-block relative group">
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
