<script setup lang="ts">
  definePageMeta({ layout: 'default' })

  const route = useRoute()
  const channelId = computed(() => route.params.channelId as string)

  const { channels, loading } = useChannels()

  const channel = computed(() =>
    channels.value.find((c) => c.id === channelId.value),
  )

  useHead(() => ({
    title: channel.value ? `#${channel.value.slug ?? channel.value.title} | Messages` : 'Messages',
  }))
</script>

<template>
  <div class="flex h-full overflow-hidden">
    <!-- Loading state -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin text-muted-foreground/40" />
    </div>

    <!-- Channel not found -->
    <div
      v-else-if="!channel"
      class="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <Icon name="lucide:hash" class="h-10 w-10 opacity-20" />
      <p class="text-sm">Channel not found</p>
      <NuxtLink to="/messages" class="text-xs text-primary hover:underline">
        Back to Messages
      </NuxtLink>
    </div>

    <!-- Chat view -->
    <ChatView
      v-else
      :channel="channel"
      class="flex-1"
    />
  </div>
</template>
