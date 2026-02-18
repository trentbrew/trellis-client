<script setup lang="ts">
  import type { ChatPeer } from '~/composables/useChatPresence'

  defineProps<{
    typingUsers: ChatPeer[]
  }>()
</script>

<template>
  <Transition name="fade">
    <div
      v-if="typingUsers.length"
      class="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground"
    >
      <span class="flex gap-0.5 items-center">
        <span class="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
        <span class="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
        <span class="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
      </span>
      <span>
        <template v-if="typingUsers.length === 1">
          {{ typingUsers[0]?.userId }} is typing…
        </template>
        <template v-else-if="typingUsers.length === 2">
          {{ typingUsers[0]?.userId }} and {{ typingUsers[1]?.userId }} are typing…
        </template>
        <template v-else>
          Several people are typing…
        </template>
      </span>
    </div>
  </Transition>
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
