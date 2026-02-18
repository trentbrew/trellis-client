<script setup lang="ts">
  import type { Message, Channel } from '~/types/database'

  const props = defineProps<{
    channel: Channel
  }>()

  const { user } = useInstantAuth()
  const channelId = computed(() => props.channel.id)

  const { messages, loading, sendMessage, deleteMessage, addReaction, removeReaction } = useChat(channelId)
  const { typingUsers, publishTyping, markSeen } = useChatPresence(channelId)
  const { muteChannel, unmuteChannel } = useChatNotifications()

  const replyTo = ref<{ id: string; authorName: string; content: string } | null>(null)

  function handleReply(message: Message) {
    replyTo.value = {
      id: message.id,
      authorName: message.authorName,
      content: message.content,
    }
  }

  async function handleSend(content: string, _entityRefs: any[], replyToId?: string) {
    publishTyping(false)
    await sendMessage(content, { replyToId })
    replyTo.value = null
    markSeen()
  }

  async function handleDelete(messageId: string) {
    await deleteMessage(messageId)
  }

  onMounted(() => markSeen())
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <ChatChannelHeader
      :channel="channel"
      @mute="muteChannel(channel.id)"
      @unmute="unmuteChannel(channel.id)"
    />

    <!-- Message list -->
    <div class="relative flex-1 min-h-0">
      <ChatMessageList
        :messages="messages"
        :loading="loading"
        :current-user-id="user?.id"
        @reply="handleReply"
        @edit="() => {}"
        @delete="handleDelete"
        @add-reaction="(msgId, emoji) => addReaction(msgId, emoji)"
        @remove-reaction="(msgId, emoji) => removeReaction(msgId, emoji)"
      />
    </div>

    <!-- Typing indicator -->
    <ChatTypingIndicator :typing-users="typingUsers" />

    <!-- Input -->
    <ChatInput
      :channel-id="channel.id"
      :reply-to="replyTo"
      :placeholder="`Message ${channel.type === 'dm' ? channel.title : '#' + (channel.slug ?? channel.title)}`"
      @send="handleSend"
      @cancel-reply="replyTo = null"
    />
  </div>
</template>
