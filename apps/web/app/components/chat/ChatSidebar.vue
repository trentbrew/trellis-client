<script setup lang="ts">
  import type { Channel } from '~/types/database'

  const emit = defineEmits<{
    select: [channel: Channel]
  }>()

  const { user } = useInstantAuth()
  const { publicChannels, dms, threads, unreadCounts, createChannel, loading } = useChannels()
  const { canEditContent } = useAdminUI()
  const { $toast } = useNuxtApp()

  const route = useRoute()
  const activeChannelId = computed(() => route.params.channelId as string | undefined)

  function isActive(channelId: string) {
    return activeChannelId.value === channelId
  }

  // ── Create channel dialog ────────────────────────────────────────
  const showCreate = ref(false)
  const newChannelName = ref('')
  const creating = ref(false)

  async function handleCreate() {
    const name = newChannelName.value.trim()
    if (!name || creating.value) return

    if (!canEditContent.value) {
      ;($toast as any)?.error('Only admins can create channels')
      showCreate.value = false
      return
    }

    creating.value = true
    try {
      const id = await createChannel({ title: name, type: 'public' })
      newChannelName.value = ''
      showCreate.value = false
      navigateTo(`/messages/${id}`)
    } catch {
      ;($toast as any)?.error('Failed to create channel')
    } finally {
      creating.value = false
    }
  }

  // ── Channel icon ─────────────────────────────────────────────────
  function channelIcon(ch: Channel) {
    if (ch.type === 'private') return 'lucide:lock'
    if (ch.type === 'dm') return 'lucide:message-circle'
    if (ch.type === 'thread') return 'lucide:git-branch'
    return 'lucide:hash'
  }

  function dmLabel(ch: Channel) {
    if (!user.value?.id || !ch.memberIds) return ch.title
    const otherId = ch.memberIds.find((id) => id !== user.value!.id)
    return otherId ? ch.title : ch.title
  }
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- CHANNELS section -->
    <div class="shrink-0">
      <div class="flex items-center justify-between px-3 py-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Channels</span>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              class="h-5 w-5 flex items-center justify-center rounded transition-colors"
              :class="canEditContent
                ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                : 'text-muted-foreground/30 cursor-not-allowed'"
              :disabled="!canEditContent"
              @click="canEditContent ? (showCreate = !showCreate) : undefined"
            >
              <Icon name="lucide:plus" class="h-3.5 w-3.5" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="right">
            {{ canEditContent ? 'New channel' : 'Only admins can create channels' }}
          </UiTooltipContent>
        </UiTooltip>
      </div>

      <!-- Create channel inline input -->
      <Transition name="slide-down">
        <div v-if="showCreate" class="px-3 pb-2">
          <div class="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1">
            <Icon name="lucide:hash" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              v-model="newChannelName"
              placeholder="channel-name"
              class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
              @keydown.enter="handleCreate"
              @keydown.escape="showCreate = false"
            />
            <button
              :disabled="!newChannelName.trim() || creating"
              class="text-xs text-primary disabled:opacity-40 hover:text-primary/80 transition-colors font-medium"
              @click="handleCreate"
            >
              Add
            </button>
          </div>
        </div>
      </Transition>

      <!-- Loading skeleton -->
      <div v-if="loading" class="px-3 space-y-1">
        <div v-for="i in 3" :key="i" class="h-7 rounded-lg bg-muted/40 animate-pulse" />
      </div>

      <!-- Channel list -->
      <nav v-else class="px-2 space-y-0.5">
        <NuxtLink
          v-for="ch in publicChannels"
          :key="ch.id"
          :to="`/messages/${ch.id}`"
          class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors group"
          :class="isActive(ch.id)
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
          @click="emit('select', ch)"
        >
          <Icon :name="channelIcon(ch)" class="h-3.5 w-3.5 shrink-0" />
          <span class="flex-1 truncate">{{ ch.slug ?? ch.title }}</span>
          <span
            v-if="unreadCounts[ch.id]"
            class="h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0"
          >
            {{ unreadCounts[ch.id] }}
          </span>
        </NuxtLink>

        <div v-if="!publicChannels.length && !loading" class="px-2 py-1.5 text-xs text-muted-foreground/60 italic">
          No channels yet
        </div>
      </nav>
    </div>

    <!-- DIRECT MESSAGES section -->
    <div v-if="dms.length" class="shrink-0 mt-4">
      <div class="px-3 py-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Direct Messages</span>
      </div>
      <nav class="px-2 space-y-0.5">
        <NuxtLink
          v-for="ch in dms"
          :key="ch.id"
          :to="`/messages/${ch.id}`"
          class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors"
          :class="isActive(ch.id)
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
          @click="emit('select', ch)"
        >
          <div class="relative shrink-0">
            <div class="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
              {{ dmLabel(ch).slice(0, 1).toUpperCase() }}
            </div>
          </div>
          <span class="flex-1 truncate">{{ dmLabel(ch) }}</span>
          <span
            v-if="unreadCounts[ch.id]"
            class="h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0"
          >
            {{ unreadCounts[ch.id] }}
          </span>
        </NuxtLink>
      </nav>
    </div>

    <!-- THREADS section -->
    <div v-if="threads.length" class="shrink-0 mt-4">
      <div class="px-3 py-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Threads</span>
      </div>
      <nav class="px-2 space-y-0.5">
        <NuxtLink
          v-for="ch in threads"
          :key="ch.id"
          :to="`/messages/${ch.id}`"
          class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors"
          :class="isActive(ch.id)
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'"
          @click="emit('select', ch)"
        >
          <Icon name="lucide:git-branch" class="h-3.5 w-3.5 shrink-0" />
          <span class="flex-1 truncate">{{ ch.title }}</span>
        </NuxtLink>
      </nav>
    </div>

    <div class="flex-1" />
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.15s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
