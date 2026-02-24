<script setup lang="ts">
  import type { Message } from '~/types/database'

  const props = defineProps<{
    messages: Message[]
    loading?: boolean
    currentUserId?: string
  }>()

  const emit = defineEmits<{
    reply: [message: Message]
    edit: [message: Message]
    delete: [messageId: string]
    addReaction: [messageId: string, emoji: string]
    removeReaction: [messageId: string, emoji: string]
  }>()

  const listRef = ref<HTMLElement | null>(null)

  // ── Message grouping ─────────────────────────────────────────────
  // Group consecutive messages from same author within 5 minutes
  const GROUP_THRESHOLD_MS = 5 * 60 * 1000

  interface MessageGroup {
    date: string
    messages: Array<Message & { isGrouped: boolean }>
  }

  const groupedMessages = computed((): MessageGroup[] => {
    const visible = props.messages.filter((m) => !m.deletedAt)
    if (!visible.length) return []

    const groups: MessageGroup[] = []
    let currentDate = ''

    for (let i = 0; i < visible.length; i++) {
      const msg = visible[i] as Message
      const prev = visible[i - 1] as Message | undefined
      const msgDate = new Date(msg.createdAt).toDateString()

      if (msgDate !== currentDate) {
        currentDate = msgDate
        groups.push({ date: msgDate, messages: [] })
      }

      const isGrouped = !!(
        prev
        && prev.authorId === msg.authorId
        && msg.createdAt - prev.createdAt < GROUP_THRESHOLD_MS
        && new Date(prev.createdAt).toDateString() === msgDate
      )

      groups[groups.length - 1]!.messages.push({ ...(msg as Message), isGrouped })
    }

    return groups
  })

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  }

  // ── Auto-scroll to bottom ────────────────────────────────────────
  const isAtBottom = ref(true)

  function scrollToBottom(smooth = false) {
    nextTick(() => {
      if (!listRef.value) return
      listRef.value.scrollTo({
        top: listRef.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      })
    })
  }

  function onScroll() {
    if (!listRef.value) return
    const { scrollTop, scrollHeight, clientHeight } = listRef.value
    isAtBottom.value = scrollHeight - scrollTop - clientHeight < 80
  }

  watch(
    () => props.messages.length,
    () => {
      if (isAtBottom.value) scrollToBottom()
    },
  )

  onMounted(() => scrollToBottom())
</script>

<template>
  <div
    ref="listRef"
    class="h-full overflow-y-auto"
    @scroll="onScroll"
  >
    <!-- Loading skeleton -->
    <div v-if="loading" class="flex flex-col gap-4 p-4">
      <div v-for="i in 5" :key="i" class="flex gap-3 animate-pulse">
        <div class="w-9 h-9 rounded-full bg-muted shrink-0" />
        <div class="flex-1 space-y-2">
          <div class="h-3 bg-muted rounded w-24" />
          <div class="h-3 bg-muted rounded w-3/4" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!groupedMessages.length"
      class="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground bg-card/50"
    >
      <Icon name="lucide:message-square" class="h-10 w-10 opacity-20" />
      <p class="text-sm">No messages yet. Say hello!</p>
    </div>

    <!-- Messages grouped by date -->
    <template v-else>
      <div v-for="group in groupedMessages" :key="group.date">
        <!-- Date separator -->
        <div class="flex items-center gap-3 py-3 sticky top-0 z-10 bg-background/0">
          <div class="flex-1 h-px bg-border/50" />
          <span class="text-[11px] text-muted-foreground/70 font-medium px-3 py-0.5 rounded-full border border-border/50 bg-card shrink-0 select-none">
            {{ formatDateLabel(group.date) }}
          </span>
          <div class="flex-1 h-px bg-border/50" />
        </div>

        <!-- Messages in this date group -->
        <ChatMessage
          v-for="msg in group.messages"
          :key="msg.id"
          :message="msg"
          :is-grouped="msg.isGrouped"
          :current-user-id="currentUserId"
          @reply="emit('reply', $event)"
          @edit="emit('edit', $event)"
          @delete="emit('delete', $event)"
          @add-reaction="(msgId, emoji) => emit('addReaction', msgId, emoji)"
          @remove-reaction="(msgId, emoji) => emit('removeReaction', msgId, emoji)"
        />
      </div>

      <!-- Bottom padding -->
      <div class="h-2" />
    </template>

    <!-- Scroll to bottom button -->
    <Transition name="fade">
      <button
        v-if="!isAtBottom && !loading"
        class="absolute bottom-4 right-12 flex items-center justify-center gap-1.5 bg-card max-w-fit border border-border rounded-full px-3 py-1.5 text-xs shadow-md hover:bg-muted transition-colors z-10"
        @click="scrollToBottom(true)"
      >
        <Icon name="lucide:arrow-down" class="h-3 w-3" />
        New messages
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
