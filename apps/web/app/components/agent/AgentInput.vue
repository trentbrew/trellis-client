<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [message: string]
}>()

const input = ref('')

const canSend = computed(() => input.value.trim().length > 0 && !props.disabled)

function handleSend() {
  if (!canSend.value) return
  emit('send', input.value.trim())
  input.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="flex items-end gap-2">
    <textarea
      v-model="input"
      :disabled="disabled"
      placeholder="Ask about your graph..."
      class="flex-1 min-h-[40px] max-h-[120px] px-3 py-2 text-sm rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      rows="1"
      @keydown="handleKeydown"
    />
    <UiButton
      size="sm"
      :disabled="!canSend"
      class="shrink-0"
      @click="handleSend">
      <Icon name="lucide:send-horizontal" class="h-4 w-4" />
    </UiButton>
  </div>
</template>
