<script setup lang="ts">
  import type { AgentAttachment } from '~/types/agent'
  import { AGENT_FILE_ACCEPT, extractInlineImageAttachments, mergeAgentAttachments, plainTextFromAgentHtml } from '~/lib/agent-attachments'

  type EditorRef = {
    clearContent: () => void
    focusEditor: () => void
    getEditor: () => any
    triggerImageUpload: () => void
  }

  export interface AgentSendPayload {
    text: string
    attachments: AgentAttachment[]
  }

  const props = defineProps<{
    disabled?: boolean
  }>()

  const emit = defineEmits<{
    send: [payload: AgentSendPayload]
  }>()

  const content = ref('')
  const isSending = ref(false)
  const editorRef = ref<EditorRef | null>(null)
  const fileInputRef = ref<HTMLInputElement | null>(null)
  const { enterKeyBehavior } = useLayoutPreferences()
  const { pending, isUploading, uploadError, addFiles, finalizeForSend, remove, clear } = useAgentAttachmentUpload()

  function hasContent(html: string): boolean {
    if (pending.value.length > 0) return true
    if (!html) return false
    if (/<img/i.test(html)) return true
    return !!plainTextFromAgentHtml(html)
  }

  const canSend = computed(() =>
    !isSending.value && !props.disabled && !isUploading.value && hasContent(content.value),
  )

  function triggerFilePicker() {
    fileInputRef.value?.click()
  }

  async function handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files?.length) return
    await addFiles(input.files)
    input.value = ''
  }

  async function handleSend() {
    if (!canSend.value) return
    isSending.value = true
    try {
      const merged = mergeAgentAttachments(
        pending.value,
        extractInlineImageAttachments(content.value),
      )
      const attachments = await finalizeForSend(merged)
      emit('send', {
        text: plainTextFromAgentHtml(content.value),
        attachments,
      })
      content.value = ''
      clear()
      editorRef.value?.clearContent()
      nextTick(() => editorRef.value?.focusEditor())
    } finally {
      isSending.value = false
    }
  }
</script>

<template>
  <div class="shrink-0 bg-card/50">
    <div
      class="mx-3 mb-2 mt-0 rounded-xl border border-border bg-foreground/5 focus-within:ring-1 focus-within:ring-ring transition-shadow">
      <div v-if="pending.length" class="flex flex-wrap gap-2 px-3 pt-2">
        <AgentAttachmentChip
          v-for="attachment in pending"
          :key="attachment.id"
          :attachment="attachment"
          removable
          @remove="remove(attachment.id)" />
      </div>

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
          :enter-key-behavior="enterKeyBehavior"
          @submit="handleSend" />
      </div>

      <div class="flex items-center gap-0.5 px-2 pb-2 pt-0.5">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              type="button"
              class="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              :disabled="disabled || isUploading"
              @click="triggerFilePicker">
              <Icon
                :name="isUploading ? 'lucide:loader-2' : 'lucide:paperclip'"
                class="h-3.5 w-3.5"
                :class="{ 'animate-spin': isUploading }" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="top" class="text-xs">Attach image or file</UiTooltipContent>
        </UiTooltip>

        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              type="button"
              class="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              :disabled="disabled || isUploading"
              @click="editorRef?.triggerImageUpload()">
              <Icon name="lucide:image-plus" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="top" class="text-xs">Insert image inline</UiTooltipContent>
        </UiTooltip>

        <div class="flex-1" />

        <button
          type="button"
          :disabled="!canSend"
          class="h-7 w-7 flex items-center justify-center rounded-lg transition-all"
          :class="
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
              : 'bg-primary/25 text-muted-foreground/40 cursor-not-allowed'
          "
          title="Send (⌘Enter)"
          @click="handleSend">
          <Icon name="lucide:send-horizontal" class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      multiple
      :accept="AGENT_FILE_ACCEPT"
      @change="handleFileInput" />

    <p v-if="uploadError" class="px-4 pb-1 text-[10px] text-destructive">{{ uploadError }}</p>

    <div class="px-4 pb-2 text-[10px] text-muted-foreground/40">
      <kbd class="font-mono">@</kbd>
      mention · attach images, PDFs, markdown, code
      <template v-if="enterKeyBehavior === 'send'">
        ·
        <kbd class="font-mono">Enter</kbd>
        to send ·
        <kbd class="font-mono">Shift+Enter</kbd>
        for new line
      </template>
      <template v-else>
        ·
        <kbd class="font-mono">⌘Enter</kbd>
        to send ·
        <kbd class="font-mono">Enter</kbd>
        for new line
      </template>
    </div>
  </div>
</template>
