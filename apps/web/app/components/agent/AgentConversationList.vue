<script setup lang="ts">
  import { computed } from 'vue'

  const { threads, activeThreadId, switchThread, createThread } = useAgent()

  const items = computed(() =>
    threads.value.map((t) => ({
      id: t.id,
      title: t.title || 'New chat',
      updatedAt: t.updatedAt,
    })),
  )

  function formatTime(ts: number) {
    const now = Date.now()
    const diff = now - ts
    const minute = 60_000
    const hour = 60 * minute
    const day = 24 * hour
    if (diff < minute) return 'just now'
    if (diff < hour) return `${Math.floor(diff / minute)}m`
    if (diff < day) return `${Math.floor(diff / hour)}h`
    if (diff < 7 * day) return `${Math.floor(diff / day)}d`
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
</script>

<template>
  <div class="flex flex-col gap-2 px-2">
    <div class="flex items-center justify-between px-1">
      <span class="text-xs font-medium tracking-wide uppercase text-muted-foreground">Conversations</span>
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground rounded p-1 hover:bg-white/10"
            aria-label="New chat"
            @click="createThread">
            <Icon name="lucide:plus" class="h-3.5 w-3.5" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="right" :side-offset="6">New chat</UiTooltipContent>
      </UiTooltip>
    </div>

    <div v-if="items.length === 0" class="px-2 py-6 text-center">
      <Icon name="lucide:message-square" class="mx-auto mb-2 h-6 w-6 text-sidebar-foreground/40" />
      <p class="text-xs text-sidebar-foreground/60">No conversations yet</p>
      <button
        type="button"
        class="mt-2 text-xs text-primary hover:underline"
        @click="createThread">
        Start a new chat
      </button>
    </div>

    <ul v-else class="flex flex-col gap-0.5">
      <li v-for="t in items" :key="t.id">
        <button
          type="button"
          class="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
          :class="
            t.id === activeThreadId
              ? 'bg-white/10 text-foreground'
              : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground'
          "
          @click="switchThread(t.id)">
          <Icon
            name="lucide:message-square"
            class="h-3.5 w-3.5 shrink-0 opacity-60"
            :class="{ 'text-primary opacity-100': t.id === activeThreadId }" />
          <span class="flex-1 truncate text-xs">{{ t.title }}</span>
          <span class="shrink-0 text-[10px] text-muted-foreground/60">{{ formatTime(t.updatedAt) }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
