<script setup lang="ts">
  import type { Channel } from '~/types/database'

  const props = defineProps<{
    channel: Channel
    memberCount?: number
  }>()

  const emit = defineEmits<{
    settings: []
    mute: []
    unmute: []
  }>()

  const { getEffectiveLevel } = useChatNotifications()
  const isMuted = computed(() => getEffectiveLevel(props.channel.id) === 'none')

  const channelIcon = computed(() => {
    if (props.channel.type === 'dm') return 'lucide:message-circle'
    if (props.channel.type === 'thread') return 'lucide:git-branch'
    if (props.channel.type === 'private') return 'lucide:lock'
    return 'lucide:hash'
  })
</script>

<template>
  <div class="shrink-0 flex items-center justify-between px-4 h-12 border-b border-border bg-card">
    <!-- Left: channel name + description -->
    <div class="flex items-center gap-2 min-w-0">
      <Icon :name="channelIcon" class="h-4 w-4 text-muted-foreground shrink-0" />
      <span class="font-semibold text-sm truncate">{{ channel.title }}</span>
      <span
        v-if="channel.description"
        class="text-xs text-muted-foreground truncate hidden md:block border-l border-border pl-2 ml-1"
      >
        {{ channel.description }}
      </span>
    </div>

    <!-- Right: actions -->
    <div class="flex items-center gap-1 shrink-0">
      <!-- Member count -->
      <div
        v-if="memberCount !== undefined"
        class="flex items-center gap-1 text-xs text-muted-foreground px-2"
      >
        <Icon name="lucide:users" class="h-3.5 w-3.5" />
        <span>{{ memberCount }}</span>
      </div>

      <!-- Mute/unmute -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            class="h-8 w-8 flex items-center justify-center rounded-lg hover:text-foreground hover:bg-muted transition-colors"
            :class="isMuted ? 'text-muted-foreground' : 'text-primary'"
            @click="isMuted ? emit('unmute') : emit('mute')"
          >
            <Icon :name="isMuted ? 'lucide:bell-off' : 'lucide:bell-ring'" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent>{{ isMuted ? 'Unmute channel' : 'Mute channel' }}</UiTooltipContent>
      </UiTooltip>

      <!-- Settings -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            class="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            @click="emit('settings')"
          >
            <Icon name="lucide:ellipsis" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent>Channel settings</UiTooltipContent>
      </UiTooltip>
    </div>
  </div>
</template>
