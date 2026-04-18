<template>
  <div
    class="relative flex cursor-pointer gap-3 border-b p-3 transition-all duration-200 group last:border-0"
    :class="[
      isUnread ? 'bg-primary/5 hover:bg-primary/10' : 'bg-transparent hover:bg-muted/30',
    ]"
    @click="handleRowClick">
    <!-- Unread indicator -->
    <div
      v-if="isUnread"
      class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary transition-all duration-200 group-hover:w-1.5"></div>

    <!-- Icon -->
    <div
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-200 group-hover:scale-105"
      :style="iconStyle">
      <Icon :name="visual.icon" class="h-4.5 w-4.5" />
    </div>

    <div class="flex-1 min-w-0 space-y-1">
      <div class="flex items-center justify-between gap-2">
        <span
          class="text-sm font-semibold tracking-tight truncate"
          :class="isUnread ? 'text-foreground' : 'text-muted-foreground/80'">
          {{ notification.title }}
        </span>
        <span class="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest tabular-nums whitespace-nowrap">
          {{ timeAgo(notification.createdAt) }}
        </span>
      </div>

      <p
        v-if="notification.body"
        class="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {{ notification.body }}
      </p>

      <div class="flex items-center gap-1.5 pt-1 flex-wrap">
        <span
          class="rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ring-1 ring-border/40 bg-muted/40 text-muted-foreground">
          {{ notification.source }}
        </span>
        <span
          v-if="notification.priority && notification.priority !== 'normal'"
          class="rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ring-1 ring-destructive/30 bg-destructive/10 text-destructive">
          {{ notification.priority }}
        </span>

        <div class="flex-1" />

        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <UiButton
            v-for="a in (notification.actions || []).slice(0, 3)"
            :key="a.id"
            variant="ghost"
            size="xs"
            class="h-6 px-2 text-[10px] font-bold uppercase tracking-wider"
            @click.stop="run(a)">
            <Icon v-if="a.icon" :name="a.icon" class="mr-1 h-3 w-3" />
            {{ a.label }}
          </UiButton>
          <UiButton
            variant="ghost"
            size="xs"
            class="h-6 w-6 p-0"
            title="Snooze 1h"
            @click.stop="snooze(notification.id, 60)">
            <Icon name="lucide:clock" class="h-3.5 w-3.5" />
          </UiButton>
          <UiButton
            variant="ghost"
            size="xs"
            class="h-6 w-6 p-0"
            title="Archive"
            @click.stop="archive(notification.id)">
            <Icon name="lucide:archive" class="h-3.5 w-3.5" />
          </UiButton>
          <UiButton
            variant="ghost"
            size="xs"
            class="h-6 w-6 p-0 hover:text-destructive"
            title="Dismiss"
            @click.stop="dismiss(notification.id)">
            <Icon name="lucide:x" class="h-3.5 w-3.5" />
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NotificationAction, TrellisNotification } from '~/types/notification'
import { useTrellisNotifications } from '~/composables/useTrellisNotifications'

const props = defineProps<{ notification: TrellisNotification }>()

const { markAsRead, snooze, archive, dismiss, runAction, resolveNotificationVisual, timeAgo } =
  useTrellisNotifications()

const isUnread = computed(() => props.notification.status === 'unread')
const visual = computed(() => resolveNotificationVisual(props.notification))

// Tailwind color token → subtle tinted chip using CSS var mapping.
// Matches the existing graph/entity color-token approach (bg/10, text-/, ring-/30).
const TOKEN_TO_RGB: Record<string, string> = {
  emerald: '16 185 129',
  red: '239 68 68',
  amber: '245 158 11',
  sky: '14 165 233',
  violet: '139 92 246',
  slate: '100 116 139',
  indigo: '99 102 241',
  rose: '244 63 94',
  blue: '59 130 246',
  purple: '168 85 247',
  cyan: '6 182 212',
  teal: '20 184 166',
  lime: '132 204 22',
  zinc: '113 113 122',
  yellow: '234 179 8',
  orange: '249 115 22',
}

const iconStyle = computed(() => {
  const rgb = TOKEN_TO_RGB[visual.value.color] || TOKEN_TO_RGB.sky!
  return {
    backgroundColor: `rgb(${rgb} / 0.15)`,
    color: `rgb(${rgb})`,
    boxShadow: `inset 0 0 0 1px rgb(${rgb} / 0.30)`,
  }
})

async function handleRowClick() {
  if (isUnread.value) await markAsRead(props.notification.id)
  if (props.notification.url) {
    if (/^https?:\/\//.test(props.notification.url)) {
      window.open(props.notification.url, '_blank', 'noopener')
    } else {
      await navigateTo(props.notification.url)
    }
  } else if (props.notification.entityId) {
    await navigateTo(`#${props.notification.entityId}`)
  }
}

async function run(a: NotificationAction) {
  await runAction(props.notification, a)
}
</script>
