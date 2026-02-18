<script setup lang="ts">
  definePageMeta({ layout: 'default' })
  useHead({ title: 'Messages' })

  const { publicChannels, loading, ensureGeneralChannel } = useChannels()

  const firstChannel = computed(() => publicChannels.value[0])

  watch(loading, async (isLoading) => {
    if (!isLoading) {
      await ensureGeneralChannel()
      await nextTick()
      if (firstChannel.value) {
        navigateTo(`/messages/${firstChannel.value.id}`, { replace: true })
      }
    }
  }, { immediate: true })
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
    <template v-if="loading">
      <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin opacity-30" />
    </template>
    <template v-else-if="!firstChannel">
      <Icon name="lucide:message-square" class="h-12 w-12 opacity-20" />
      <div class="text-center space-y-1">
        <p class="text-sm font-medium text-foreground">No channels yet</p>
        <p class="text-xs">Create a channel from the sidebar to get started.</p>
      </div>
    </template>
  </div>
</template>
