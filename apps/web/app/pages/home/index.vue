<script setup lang="ts">
  definePageMeta({
    title: 'Chat',
    icon: 'lucide:bot',
  })

  const { messages, isStreaming, error, sendMessage, createThread, clearConversation } = useAgent()

  const hasMessages = computed(() => messages.value.length > 0)

  // Curated starter prompts shown in the empty state.
  const suggestions = [
    {
      label: 'Summarize my workspace',
      description: "What's happening across my projects right now?",
      icon: 'lucide:sparkles',
      prompt: 'Give me a concise summary of what is happening in my workspace right now.',
    },
    {
      label: 'Show my open tasks',
      description: 'Pull every task that is not yet done',
      icon: 'lucide:check-square',
      prompt: 'Show me all of my open tasks, grouped by project.',
    },
    {
      label: 'Draft a meeting agenda',
      description: 'Turn recent notes into a working agenda',
      icon: 'lucide:file-text',
      prompt: 'Draft a meeting agenda based on my most recent notes and open tasks.',
    },
    {
      label: 'Create a task',
      description: 'Capture a new task from a single sentence',
      icon: 'lucide:plus-square',
      prompt: 'Create a new task titled "Untitled" assigned to me.',
    },
  ]

  // Message Scroller drives anchoring + auto-scroll. `scrollAnchor` marks each
  // user message as the start of a turn so the viewport keeps a peek of the
  // previous reply above it. `autoScroll` follows the live edge while streaming.
  const handleSend = (payload: { text: string; attachments: import('~/types/agent').AgentAttachment[] }) => {
    if (payload.text.trim() || payload.attachments.length) {
      sendMessage(payload.text, payload.attachments)
    }
  }

  const handleSuggestion = (prompt: string) => {
    handleSend(prompt)
  }

  const handleNewThread = () => {
    createThread()
  }

  const handleClear = () => {
    clearConversation()
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="relative flex h-full w-full flex-col bg-background">
      <!-- Top bar -->
      <header
        class="shrink-0 flex items-center justify-between gap-2 px-6 h-12 border-b border-border/40 bg-background/60 backdrop-blur-sm">
        <div class="flex items-center gap-2 min-w-0">
          <Icon name="lucide:bot" class="h-4 w-4 text-muted-foreground/80 shrink-0" />
          <span class="text-sm font-medium text-foreground/90 truncate">Chat</span>
          <span v-if="hasMessages" class="text-xs text-muted-foreground/70 truncate">· Conversation</span>
        </div>
        <div class="flex items-center gap-1">
          <UiTooltip v-if="hasMessages">
            <UiTooltipTrigger as-child>
              <UiButton
                size="sm"
                variant="ghost"
                class="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                aria-label="Clear conversation"
                @click="handleClear">
                <Icon name="lucide:eraser" class="h-3.5 w-3.5" />
              </UiButton>
            </UiTooltipTrigger>
            <UiTooltipContent side="bottom" :side-offset="8">Clear chat</UiTooltipContent>
          </UiTooltip>
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <UiButton
                size="sm"
                variant="ghost"
                class="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                aria-label="New chat"
                @click="handleNewThread">
                <Icon name="lucide:plus" class="h-3.5 w-3.5" />
              </UiButton>
            </UiTooltipTrigger>
            <UiTooltipContent side="bottom" :side-offset="8">New chat</UiTooltipContent>
          </UiTooltip>
        </div>
      </header>

      <!-- Empty state: centered greeting + composer + starter prompts -->
      <section v-if="!hasMessages" class="flex-1 min-h-0 overflow-y-auto">
        <div class="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 py-10">
          <div class="flex flex-col items-center gap-4 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
              <Icon name="lucide:sparkles" class="h-6 w-6 text-primary" />
            </div>
            <div class="space-y-2">
              <h1 class="text-3xl font-semibold tracking-tight">What's on your mind?</h1>
              <p class="text-sm text-muted-foreground max-w-md">
                Ask anything about your graph, draft something new, or get a quick summary of what's going on.
              </p>
            </div>
          </div>

          <!-- Composer -->
          <div
            class="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/5 ring-1 ring-primary/10 focus-within:ring-primary/30 transition-shadow">
            <AgentInput :disabled="isStreaming" @send="handleSend" />
          </div>

          <!-- Starter prompts -->
          <div class="grid w-full gap-2 sm:grid-cols-2">
            <button
              v-for="s in suggestions"
              :key="s.label"
              type="button"
              class="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 px-3.5 py-3 text-left transition-colors hover:border-border hover:bg-card"
              @click="handleSuggestion(s.prompt)">
              <div
                class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <Icon :name="s.icon" class="h-3.5 w-3.5" />
              </div>
              <div class="min-w-0 space-y-0.5">
                <div class="text-sm font-medium text-foreground/90 truncate">{{ s.label }}</div>
                <div class="text-xs text-muted-foreground/80 line-clamp-2">{{ s.description }}</div>
              </div>
            </button>
          </div>

          <p class="text-[11px] text-muted-foreground/60">
            <kbd class="font-mono">⌘</kbd>
            +
            <kbd class="font-mono">↵</kbd>
            to send · Responses can include tool calls
          </p>
        </div>
      </section>

      <!-- Active chat: message scroller on top, sticky composer at bottom -->
      <section v-else class="flex-1 min-h-0 flex flex-col">
        <UiMessageScrollerProvider
          :auto-scroll="true"
          default-scroll-position="last-anchor"
          :scroll-previous-item-peek="48">
          <UiMessageScroller class="flex-1 min-h-0">
            <UiMessageScrollerViewport class="h-full">
              <UiMessageScrollerContent class="mx-auto w-full max-w-2xl gap-4 px-6 py-8">
                <UiMessageScrollerItem
                  v-for="msg in messages"
                  :key="msg.id"
                  :message-id="msg.id"
                  :scroll-anchor="msg.role === 'user'">
                  <div :class="['ms-anim-slide-up', msg.role === 'user' ? 'ms-anim-slide-side' : '']">
                    <AgentMessage :message="msg" />
                  </div>
                </UiMessageScrollerItem>

                <!-- Streaming indicator -->
                <UiMessageScrollerItem v-if="isStreaming" :message-id="'streaming'" class="ms-anim-fade">
                  <div class="flex gap-2 items-start">
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
                </UiMessageScrollerItem>

                <!-- Error -->
                <UiMessageScrollerItem v-if="error" :message-id="'error'" class="ms-anim-scale-fade">
                  <div
                    class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <div class="flex items-start gap-2">
                      <Icon name="lucide:alert-circle" class="h-4 w-4 mt-0.5 shrink-0" />
                      <div>{{ error }}</div>
                    </div>
                  </div>
                </UiMessageScrollerItem>
              </UiMessageScrollerContent>
            </UiMessageScrollerViewport>
            <UiMessageScrollerButton direction="end" />
          </UiMessageScroller>
        </UiMessageScrollerProvider>

        <div class="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-sm">
          <div class="mx-auto w-full max-w-2xl">
            <AgentInput :disabled="isStreaming" @send="handleSend" />
          </div>
        </div>
      </section>
    </div>
  </Page>
</template>
