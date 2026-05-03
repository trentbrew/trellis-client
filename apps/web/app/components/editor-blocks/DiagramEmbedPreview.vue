<script lang="ts" setup>
  import { useMermaid } from '~/composables/useMermaid'

  const props = defineProps<{
    source: string
    compact?: boolean
  }>()

  const { renderDiagram } = useMermaid()

  const svg = ref('')
  const error = ref('')
  const rendering = ref(false)

  async function render() {
    if (!props.source?.trim()) {
      svg.value = ''
      error.value = ''
      return
    }
    rendering.value = true
    const result = await renderDiagram(props.source)
    rendering.value = false
    if ('error' in result && result.error) {
      error.value = result.error
      svg.value = ''
    }
    else {
      svg.value = result.svg ?? ''
      error.value = ''
    }
  }

  watch(() => props.source, render, { immediate: true })
</script>

<template>
  <div
    class="diagram-embed-preview"
    :class="{ 'diagram-embed-preview--compact': compact }">
    <div
      v-if="rendering"
      class="flex items-center justify-center py-4 text-muted-foreground">
      <Icon name="svg-spinners:ring-resize" class="h-4 w-4" />
    </div>
    <div
      v-else-if="error"
      class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      <div class="flex items-center gap-1.5 font-medium mb-1">
        <Icon name="lucide:alert-triangle" class="h-3.5 w-3.5 shrink-0" />
        Invalid diagram
      </div>
      <pre class="whitespace-pre-wrap font-mono text-[10px] opacity-70 leading-relaxed">{{ error }}</pre>
    </div>
    <div
      v-else-if="svg"
      class="diagram-svg-wrapper"
      v-html="svg" />
    <div
      v-else
      class="flex items-center justify-center py-6 text-muted-foreground/40 text-xs italic">
      Empty diagram
    </div>
  </div>
</template>

<style scoped>
  .diagram-embed-preview {
    width: 100%;
    overflow-x: auto;
  }

  .diagram-embed-preview--compact {
    max-height: 160px;
    overflow: hidden;
  }

  .diagram-svg-wrapper :deep(svg) {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }
</style>
