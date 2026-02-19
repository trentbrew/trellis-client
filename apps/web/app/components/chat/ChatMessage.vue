<script setup lang="ts">
  import type { Message } from '~/types/database'

  const props = defineProps<{
    message: Message
    isGrouped?: boolean
    currentUserId?: string
  }>()

  const emit = defineEmits<{
    reply: [message: Message]
    edit: [message: Message]
    delete: [messageId: string]
    addReaction: [messageId: string, emoji: string]
    removeReaction: [messageId: string, emoji: string]
  }>()

  const isOwn = computed(() => props.message.authorId === props.currentUserId)
  const showHover = ref(false)

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👀']
</script>

<template>
  <div
    class="group relative flex gap-3 px-4 py-0.5 hover:bg-muted/30 transition-colors"
    :class="{ 'pt-4': !isGrouped, 'mt-0.5': isGrouped }"
    @mouseenter="showHover = true"
    @mouseleave="showHover = false"
  >
    <!-- Avatar (only shown for first message in group) -->
    <div class="w-9 shrink-0 mt-0.5">
      <template v-if="!isGrouped">
        <UiAvatar class="h-9 w-9">
          <UiAvatarImage v-if="message.authorAvatar" :src="message.authorAvatar" :alt="message.authorName" />
          <UiAvatarFallback class="text-xs bg-primary/15 text-primary">
            {{ message.authorName.slice(0, 2).toUpperCase() }}
          </UiAvatarFallback>
        </UiAvatar>
      </template>
      <!-- Timestamp always visible for grouped messages -->
      <span
        v-else
        class="text-[10px] text-muted-foreground/35 leading-9 block text-right select-none"
      >
        {{ formatTime(message.createdAt) }}
      </span>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Header (only for first in group) -->
      <div v-if="!isGrouped" class="flex items-baseline gap-2 mb-0.5">
        <span class="text-sm font-semibold leading-none">{{ message.authorName }}</span>
        <span class="text-[11px] text-muted-foreground">{{ formatTime(message.createdAt) }}</span>
        <span v-if="message.edited" class="text-[10px] text-muted-foreground/60 italic">(edited)</span>
      </div>

      <!-- Message body -->
      <div
        class="chat-prose text-sm leading-relaxed text-foreground/90 wrap-break-word"
        v-html="message.content"
      />

      <!-- Entity refs -->
      <div v-if="message.entityRefs?.length" class="flex flex-wrap gap-1 mt-1.5">
        <ChatEntityChip
          v-for="ref in message.entityRefs"
          :key="ref.id"
          :entity="ref"
        />
      </div>

      <!-- Reactions -->
      <ChatReactions
        v-if="message.reactions && Object.keys(message.reactions).length"
        :reactions="message.reactions"
        :current-user-id="currentUserId"
        @add="(emoji) => emit('addReaction', message.id, emoji)"
        @remove="(emoji) => emit('removeReaction', message.id, emoji)"
      />
    </div>

    <!-- Hover actions -->
    <Transition name="fade">
      <div
        v-if="showHover"
        class="absolute right-4 top-0 -translate-y-1/2 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-sm px-1 py-0.5 z-10"
      >
        <!-- Quick reactions -->
        <button
          v-for="emoji in QUICK_REACTIONS"
          :key="emoji"
          class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-sm transition-colors"
          :title="`React with ${emoji}`"
          @click="emit('addReaction', message.id, emoji)"
        >
          {{ emoji }}
        </button>

        <div class="w-px h-4 bg-border mx-0.5" />

        <!-- Reply -->
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              @click="emit('reply', message)"
            >
              <Icon name="lucide:reply" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent>Reply in thread</UiTooltipContent>
        </UiTooltip>

        <!-- Edit (own messages only) -->
        <UiTooltip v-if="isOwn">
          <UiTooltipTrigger as-child>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              @click="emit('edit', message)"
            >
              <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent>Edit message</UiTooltipContent>
        </UiTooltip>

        <!-- Delete (own messages only) -->
        <UiTooltip v-if="isOwn">
          <UiTooltipTrigger as-child>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              @click="emit('delete', message.id)"
            >
              <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent>Delete message</UiTooltipContent>
        </UiTooltip>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Rich text message body */
.chat-prose :deep(p) {
  margin: 0 0 0.25em;
}
.chat-prose :deep(p:last-child) {
  margin-bottom: 0;
}
.chat-prose :deep(strong) {
  font-weight: 600;
  color: var(--foreground);
}
.chat-prose :deep(em) {
  font-style: italic;
}
.chat-prose :deep(s) {
  text-decoration: line-through;
  opacity: 0.7;
}
.chat-prose :deep(code) {
  font-family: 'JetBrainsMono', ui-monospace, monospace;
  font-size: 0.8em;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.25rem;
  padding: 0.1em 0.3em;
}
.chat-prose :deep(pre) {
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  overflow-x: auto;
  margin: 0.375rem 0;
}
.chat-prose :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.8em;
}
.chat-prose :deep(blockquote) {
  border-left: 2px solid var(--border);
  padding-left: 0.625rem;
  color: var(--muted-foreground);
  margin: 0.25rem 0;
}
.chat-prose :deep(ul),
.chat-prose :deep(ol) {
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.chat-prose :deep(li) {
  margin: 0.1rem 0;
}
.chat-prose :deep(img) {
  max-width: 100%;
  max-height: 320px;
  border-radius: 0.375rem;
  margin: 0.375rem 0;
  display: block;
}
.chat-prose :deep(a) {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
/* Mention chip */
.chat-prose :deep(.mention) {
  display: inline-flex;
  align-items: center;
  background: color-mix(in oklch, var(--primary) 12%, transparent);
  color: var(--primary);
  border-radius: 0.25rem;
  padding: 0 0.3em;
  font-weight: 500;
  font-size: 0.9em;
}
</style>
