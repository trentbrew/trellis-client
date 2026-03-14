<script setup lang="ts">
  type EditorRef = {
    clearContent: () => void
    focusEditor: () => void
    getEditor: () => any
    triggerImageUpload: () => void
  }

  const props = defineProps<{
    disabled?: boolean
  }>()

  const emit = defineEmits<{
    send: [message: string]
  }>()

  const content = ref('')
  const isSending = ref(false)
  const editorRef = ref<EditorRef | null>(null)

  function hasContent(html: string): boolean {
    if (!html) return false
    if (/<img/i.test(html)) return true
    return !!html.replace(/<[^>]+>/g, '').trim()
  }

  const canSend = computed(() => !isSending.value && !props.disabled && hasContent(content.value))

  async function handleSend() {
    if (!canSend.value) return
    isSending.value = true
    try {
      emit('send', content.value)
      content.value = ''
      editorRef.value?.clearContent()
      nextTick(() => editorRef.value?.focusEditor())
    } finally {
      isSending.value = false
    }
  }
</script>

<template>
  <div class="shrink-0  bg-card/50">
    <!-- Input container -->
    <div class="mx-3 mb-2 mt-0 rounded-xl border border-border bg-foreground/5 focus-within:ring-1 focus-within:ring-ring transition-shadow">
      <!-- Rich text editor -->
      <div class="px-3 pt-2 pb-1 max-h-48 overflow-y-auto text-xs">
        <UiRichTextEditor
          ref="editorRef"
          v-model="content"
          placeholder="Ask about your graph..."
          seamless
          mentions
          images
          chat-mode
          submit-on-enter
          @submit="handleSend"
        />
      </div>

      <!-- Bottom bar: attach + send -->
      <div class="flex items-center gap-0.5 px-2 pb-2 pt-0.5">
        <!-- Attach file -->
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              type="button"
              class="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              :disabled="disabled"
              @click="editorRef?.triggerImageUpload()"
            >
              <Icon name="lucide:paperclip" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="top" class="text-xs">Attach file</UiTooltipContent>
        </UiTooltip>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Send -->
        <button
          type="button"
          :disabled="!canSend"
          class="h-7 w-7 flex items-center justify-center rounded-lg transition-all"
          :class="canSend
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
            : 'bg-primary/25 text-muted-foreground/40 cursor-not-allowed'"
          title="Send (⌘Enter)"
          @click="handleSend"
        >
          <Icon name="lucide:send-horizontal" class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- Hint -->
    <div class="px-4 pb-2 text-[10px] text-muted-foreground/40">
      <kbd class="font-mono">@</kbd> mention · <kbd class="font-mono">⌘Enter</kbd> to send · <kbd class="font-mono">Enter</kbd> for new line
    </div>
  </div>
</template>
