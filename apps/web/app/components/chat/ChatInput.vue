<script setup lang="ts">
  import type { EntityRef } from '~/types/database'

  type EditorRef = {
    clearContent: () => void
    focusEditor: () => void
    getEditor: () => any
    triggerImageUpload: () => void
  }

  const props = defineProps<{
    channelId: string
    placeholder?: string
    replyTo?: { id: string; authorName: string; content: string } | null
  }>()

  const emit = defineEmits<{
    send: [content: string, entityRefs: EntityRef[], replyToId?: string]
    cancelReply: []
  }>()

  const content = ref('')
  const isSending = ref(false)
  const editorRef = ref<EditorRef | null>(null)

  function hasContent(html: string): boolean {
    if (!html) return false
    if (/<img/i.test(html)) return true
    return !!html.replace(/<[^>]+>/g, '').trim()
  }

  const canSend = computed(() => !isSending.value && hasContent(content.value))

  async function handleSend() {
    if (!canSend.value) return
    isSending.value = true
    try {
      emit('send', content.value, [], props.replyTo?.id)
      content.value = ''
      editorRef.value?.clearContent()
      nextTick(() => editorRef.value?.focusEditor())
    } finally {
      isSending.value = false
    }
  }

  function handleWrapperKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && props.replyTo) {
      emit('cancelReply')
    }
  }

  function fmt(cmd: string) {
    const e = editorRef.value?.getEditor()
    if (!e) return
    switch (cmd) {
      case 'bold': e.chain().focus().toggleBold().run(); break
      case 'italic': e.chain().focus().toggleItalic().run(); break
      case 'strike': e.chain().focus().toggleStrike().run(); break
      case 'code': e.chain().focus().toggleCode().run(); break
      case 'blockquote': e.chain().focus().toggleBlockquote().run(); break
    }
  }
</script>

<template>
  <div class="shrink-0 border-t-none border-border bg-card" @keydown="handleWrapperKeydown">
    <!-- Reply preview -->
    <div
      v-if="replyTo"
      class="flex items-center gap-2 px-4 py-8 bg-muted/30 border-b border-border text-xs"
    >
      <Icon name="lucide:reply" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span class="text-muted-foreground">Replying to</span>
      <span class="font-medium">{{ replyTo.authorName }}</span>
      <span class="text-muted-foreground truncate flex-1">— {{ replyTo.content.replace(/<[^>]+>/g, '').slice(0, 60) }}</span>
      <button
        class="ml-auto text-muted-foreground hover:text-foreground transition-colors"
        @click="emit('cancelReply')"
      >
        <Icon name="lucide:x" class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Input container -->
    <div class="mx-3 mb-2 rounded-xl border border-border bg-foreground/5 focus-within:ring-1 focus-within:ring-ring transition-shadow">
      <!-- Rich text editor -->
      <div class="px-3 pt-0 pb-1 max-h-96 overflow-y-auto text-xs">
        <UiRichTextEditor
          ref="editorRef"
          v-model="content"
          :placeholder="placeholder ?? `Message #${channelId}`"
          seamless
          mentions
          images
          embeds
          templates
          chat-mode
          submit-on-enter
          @submit="handleSend"
        />
      </div>

      <!-- Bottom bar: formatting + actions -->
      <div class="flex items-center gap-0.5 px-2 pb-2 pt-0.5">
        <!-- Formatting -->
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              class="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              @click="fmt('bold')"
            >
              <Icon name="lucide:bold" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="top" class="text-xs">Bold</UiTooltipContent>
        </UiTooltip>

        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              class="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              @click="fmt('italic')"
            >
              <Icon name="lucide:italic" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="top" class="text-xs">Italic</UiTooltipContent>
        </UiTooltip>

        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              class="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              @click="fmt('strike')"
            >
              <Icon name="lucide:strikethrough" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="top" class="text-xs">Strikethrough</UiTooltipContent>
        </UiTooltip>

        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              class="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              @click="fmt('code')"
            >
              <Icon name="lucide:code" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="top" class="text-xs">Inline code</UiTooltipContent>
        </UiTooltip>

        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              class="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              @click="fmt('blockquote')"
            >
              <Icon name="lucide:quote" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="top" class="text-xs">Blockquote</UiTooltipContent>
        </UiTooltip>

        <div class="w-px h-3.5 bg-border/60 mx-0.5" />

        <!-- Image attach -->
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              class="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              @click="editorRef?.triggerImageUpload()"
            >
              <Icon name="lucide:image-plus" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="top" class="text-xs">Attach image</UiTooltipContent>
        </UiTooltip>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Send -->
        <button
          :disabled="!canSend"
          class="h-7 w-7 flex items-center justify-center rounded-lg transition-all"
          :class="canSend
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
            : 'bg-primary/25 text-muted-foreground/40 cursor-not-allowed'"
          title="Send (Enter)"
          @click="handleSend"
        >
          <Icon name="lucide:send-horizontal" class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <!-- Hint -->
    <div class="px-4 pb-2 text-[10px] text-muted-foreground/40">
      <kbd class="font-mono">@</kbd> mention · <kbd class="font-mono">/</kbd> commands · <kbd class="font-mono">⌘Enter</kbd> to send · <kbd class="font-mono">Enter</kbd> for new line
    </div>
  </div>
</template>
