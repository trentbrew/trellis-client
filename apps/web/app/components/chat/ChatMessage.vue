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
    :class="{ 'pt-3': !isGrouped }"
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
      <!-- Timestamp on hover for grouped messages -->
      <span
        v-else
        class="text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity leading-9 block text-right"
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
        class="text-sm leading-relaxed text-foreground/90 wrap-break-word"
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
</style>
