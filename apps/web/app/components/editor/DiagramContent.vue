<script lang="ts" setup>
  import { useMermaid } from '~/composables/useMermaid'

  const props = defineProps<{
    modelValue: any
    mode: 'view' | 'create' | 'edit'
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const item = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  const isViewMode = computed(() => props.mode === 'view')

  const source = computed({
    get: () => item.value?.content ?? '',
    set: (v: string) => {
      item.value = { ...item.value, content: v }
    },
  })

  const { renderDiagram } = useMermaid()

  const svg = ref('')
  const error = ref('')
  const rendering = ref(false)
  const copied = ref(false)

  let renderTimer: ReturnType<typeof setTimeout> | null = null

  async function render(src: string) {
    if (!src?.trim()) {
      svg.value = ''
      error.value = ''
      return
    }
    rendering.value = true
    const result = await renderDiagram(src)
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

  watch(source, (val) => {
    if (renderTimer) clearTimeout(renderTimer)
    renderTimer = setTimeout(() => render(val), 400)
  }, { immediate: true })

  onUnmounted(() => {
    if (renderTimer) clearTimeout(renderTimer)
  })

  async function copySource() {
    try {
      await navigator.clipboard.writeText(source.value)
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
    }
    catch { /* clipboard not available */ }
  }

  async function copySvg() {
    try {
      await navigator.clipboard.writeText(svg.value)
      copied.value = true
      setTimeout(() => { copied.value = false }, 2000)
    }
    catch { /* clipboard not available */ }
  }

  const STARTER_DIAGRAM = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do it]
    B -->|No| D[Skip]
    C --> E[End]
    D --> E`

  onMounted(() => {
    if (!source.value) {
      source.value = STARTER_DIAGRAM
    }
  })

  const tab = ref<'diagram' | 'code'>('diagram')
</script>

<template>
  <div class="flex flex-col min-h-0 flex-1">
    <!-- Editor pane (tabbed) -->
    <div
      v-if="!isViewMode"
      class="flex flex-col min-h-0 flex-1">
      <!-- Tab bar -->
      <div class="flex items-center border-b border-border shrink-0">
        <button
          class="px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
          :class="tab === 'diagram' ? 'text-foreground border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'"
          @click="tab = 'diagram'">
          Diagram
        </button>
        <button
          class="px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
          :class="tab === 'code' ? 'text-foreground border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'"
          @click="tab = 'code'">
          Code
        </button>
        <div class="flex-1" />
        <div class="flex items-center gap-1 pr-2">
          <Icon
            v-if="rendering"
            name="svg-spinners:ring-resize"
            class="h-3.5 w-3.5 text-muted-foreground" />
          <UiButton
            v-if="tab === 'diagram' && svg"
            variant="ghost"
            size="icon"
            class="h-6 w-6 opacity-60 hover:opacity-100"
            title="Copy SVG"
            @click="copySvg">
            <Icon name="lucide:image" class="h-3 w-3" />
          </UiButton>
          <UiButton
            v-if="tab === 'code'"
            variant="ghost"
            size="icon"
            class="h-6 w-6 opacity-60 hover:opacity-100"
            title="Copy source"
            @click="copySource">
            <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="h-3 w-3" />
          </UiButton>
        </div>
      </div>

      <!-- Diagram tab (default) -->
      <div
        v-if="tab === 'diagram'"
        class="flex-1 p-4 overflow-auto bg-card/50">
        <div
          v-if="error"
          class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <div class="flex items-center gap-1.5 font-medium mb-1">
            <Icon name="lucide:alert-triangle" class="h-3.5 w-3.5 shrink-0" />
            Diagram error
          </div>
          <pre class="whitespace-pre-wrap font-mono text-[10px] opacity-70 leading-relaxed">{{ error }}</pre>
        </div>
        <div
          v-else-if="svg"
          class="overflow-x-auto rounded-md"
          v-html="svg" />
        <div
          v-else-if="!rendering"
          class="flex items-center justify-center py-8 text-muted-foreground/40 text-xs italic">
          Switch to Code tab to add diagram source
        </div>
      </div>

      <!-- Code tab -->
      <div
        v-if="tab === 'code'"
        class="relative flex-1 min-h-0">
        <textarea
          v-model="source"
          class="w-full h-full min-h-[160px] resize-none bg-muted/30 font-mono text-xs p-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:bg-muted/50 transition-colors"
          placeholder="Enter Mermaid diagram source..." />
      </div>
    </div>

    <!-- View mode -->
    <div
      v-else
      class="flex-1 p-4 overflow-x-auto">
      <div
        v-if="svg"
        v-html="svg" />
      <div
        v-else-if="source"
        class="text-xs text-muted-foreground italic">
        Rendering diagram...
      </div>
      <div
        v-else
        class="text-xs text-muted-foreground italic">
        No diagram source.
      </div>
    </div>
  </div>
</template>
