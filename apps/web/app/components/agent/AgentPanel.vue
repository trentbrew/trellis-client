<script setup lang="ts">
const { messages, isStreaming, error, sendMessage, createThread } = useAgent()

const messageContainer = ref<HTMLElement | null>(null)

// Auto-scroll to bottom when new messages arrive
watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      if (messageContainer.value) {
        messageContainer.value.scrollTop = messageContainer.value.scrollHeight
      }
    })
  }
)

// Scroll on mount if there are existing messages
onMounted(() => {
  if (messages.value.length > 0 && messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
})

const handleSend = (message: string) => {
  const plain = message.replace(/<[^>]+>/g, '').trim()
  if (plain) sendMessage(plain)
}

function handleNewThread() {
  createThread()
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="shrink-0 border-b border-border p-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Icon name="lucide:bot" class="h-4 w-4 text-primary" />
        <span class="font-medium text-sm">Graph Assistant</span>
      </div>
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <UiButton
            size="sm"
            variant="ghost"
            class="text-muted-foreground hover:text-foreground"
            @click="handleNewThread">
            <Icon name="lucide:plus" class="h-3.5 w-3.5" />
          </UiButton>
        </UiTooltipTrigger>
        <UiTooltipContent side="bottom" :side-offset="8">New thread</UiTooltipContent>
      </UiTooltip>
    </div>

    <!-- Message List -->
    <div
      ref="messageContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Empty state -->
      <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center px-4">
        <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Icon name="lucide:bot" class="h-6 w-6 text-primary" />
        </div>
        <h3 class="font-medium text-sm mb-1">Ask me anything</h3>
        <p class="text-xs text-muted-foreground mb-4 max-w-[240px]">
          I can query your graph, create entities, and help you explore your data
        </p>
        <div class="space-y-2 w-full max-w-[240px]">
          <button
            class="w-full text-left px-3 py-2 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
            @click="handleSend('Show me all my tasks')">
            <div class="font-medium">Show me all my tasks</div>
          </button>
          <button
            class="w-full text-left px-3 py-2 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
            @click="handleSend('What are my overdue tasks?')">
            <div class="font-medium">What are my overdue tasks?</div>
          </button>
          <button
            class="w-full text-left px-3 py-2 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
            @click="handleSend('Create a task to review the budget')">
            <div class="font-medium">Create a new task</div>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <template v-else>
        <AgentMessage
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
        />

        <!-- Streaming indicator -->
        <div v-if="isStreaming" class="flex gap-2 items-start">
          <div class="shrink-0 mt-1">
            <div class="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="lucide:bot" class="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
          <div class="flex gap-1 mt-2">
            <div class="w-2 h-2 rounded-full bg-primary animate-bounce" />
            <div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 0.2s" />
            <div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 0.4s" />
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <div class="flex items-start gap-2">
            <Icon name="lucide:alert-circle" class="h-4 w-4 mt-0.5 shrink-0" />
            <div>{{ error }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- Input -->
    <AgentInput
      :disabled="isStreaming"
      @send="handleSend"
    />
  </div>
</template>

<style scoped>
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.animate-bounce {
  animation: bounce 1s ease-in-out infinite;
}
</style>
