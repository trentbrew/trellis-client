<script lang="ts" setup>
  import { useNow } from '@vueuse/core'

  const { timezone, prefs } = useAmbientBar()

  const now = useNow({ interval: 1000 })

  const formatted = computed(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: timezone.value,
      })
        .format(now.value)
        .replace(',', ' ·')
    } catch {
      return now.value.toLocaleTimeString(undefined, { hour12: true })
    }
  })
</script>

<template>
  <button
    v-if="prefs.showClock.value"
    type="button"
    class="menubar-chip inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground tabular-nums whitespace-nowrap"
    :title="`Time (${timezone})`"
    :aria-label="`Current time: ${formatted}`">
    <Icon name="lucide:clock" class="size-3.5 shrink-0 opacity-70" />
    <span>{{ formatted }}</span>
  </button>
</template>
