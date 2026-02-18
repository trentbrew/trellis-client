<script setup lang="ts">
  import type { EntityRef } from '~/types/database'

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
  const textareaRef = ref<HTMLTextAreaElement | null>(null)
  const isSending = ref(false)

  function autoResize() {
    const el = textareaRef.value
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  async function handleSend() {
    const text = content.value.trim()
    if (!text || isSending.value) return

    isSending.value = true
    try {
      emit('send', text, [], props.replyTo?.id)
      content.value = ''
      nextTick(() => {
        if (textareaRef.value) {
          textareaRef.value.style.height = 'auto'
          textareaRef.value.focus()
        }
      })
    } finally {
      isSending.value = false
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape' && props.replyTo) {
      emit('cancelReply')
    }
  }

  const canSend = computed(() => content.value.trim().length > 0 && !isSending.value)
</script>

<template>
  <div class="shrink-0 border-t border-border bg-card">
    <!-- Reply preview -->
    <div
      v-if="replyTo"
      class="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border text-xs"
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

    <!-- Input area -->
    <div class="flex items-end gap-2 px-3 py-3">
      <div class="flex-1 flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring transition-shadow">
        <textarea
          ref="textareaRef"
          v-model="content"
          rows="1"
          :placeholder="placeholder ?? `Message #${channelId}`"
          class="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 max-h-[200px] min-h-[24px]"
          @input="autoResize"
          @keydown="handleKeydown"
        />

        <!-- Emoji button (placeholder) -->
        <button
          class="shrink-0 text-muted-foreground hover:text-foreground transition-colors mb-0.5"
          title="Add emoji"
        >
          <Icon name="lucide:smile" class="h-4 w-4" />
        </button>
      </div>

      <!-- Send button -->
      <UiButton
        size="icon"
        :disabled="!canSend"
        class="h-9 w-9 shrink-0 rounded-xl"
        @click="handleSend"
      >
        <Icon name="lucide:send" class="h-4 w-4" />
      </UiButton>
    </div>

    <!-- Hint -->
    <div class="px-4 pb-2 text-[10px] text-muted-foreground/50">
      <kbd class="font-mono">Enter</kbd> to send · <kbd class="font-mono">Shift+Enter</kbd> for new line
    </div>
  </div>
</template>
