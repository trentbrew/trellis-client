<template>
  <div
    class="relative flex cursor-pointer gap-3 border-b p-3 transition-all duration-200 group last:border-0"
    :class="rowClass"
    :data-delivery="resolvedDelivery"
    :data-notification-title="notification.title"
    @click="handleRowClick">
    <!-- Interrupt accent bar -->
    <div
      v-if="isInterrupt && isUnread"
      class="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-destructive transition-all duration-200 group-hover:w-1" />

    <!-- Unread indicator (non-interrupt legacy) -->
    <div
      v-else-if="isUnread && !isInterrupt"
      class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary/60 transition-all duration-200 group-hover:w-1.5" />

    <!-- Icon -->
    <div
      class="flex shrink-0 items-center justify-center ring-1 transition-all duration-200 group-hover:scale-105"
      :class="iconClass"
      :style="iconStyle">
      <Icon :name="visual.icon" class="h-4.5 w-4.5" />
    </div>

    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex items-center justify-between gap-2">
        <span class="truncate text-sm tracking-tight" :class="titleClass">
          {{ notification.title }}
        </span>
        <span
          class="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 tabular-nums">
          {{ timeAgo(notification.createdAt) }}
        </span>
      </div>

      <p
        v-if="notification.body"
        class="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {{ notification.body }}
      </p>

      <div class="flex flex-wrap items-center gap-1.5 pt-1">
        <span
          class="rounded-md bg-muted/40 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground ring-1 ring-border/40">
          {{ notification.source }}
        </span>
        <span
          class="rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ring-1"
          :class="deliveryChipClass">
          {{ isInterrupt ? 'Action' : 'Status' }}
        </span>
        <span
          v-if="notification.priority && notification.priority !== 'normal'"
          class="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-destructive ring-1 ring-destructive/30">
          {{ notification.priority }}
        </span>

        <div class="flex-1" />

        <div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
import type { NotificationAction, NotificationDelivery, TrellisNotification } from '~/types/notification'
import { resolveNotificationDelivery } from '~/types/notification'
import { useTrellisNotifications } from '~/composables/useTrellisNotifications'

const props = withDefaults(
  defineProps<{
    notification: TrellisNotification
    deliveryVariant?: 'auto' | 'interrupt' | 'passive'
  }>(),
  { deliveryVariant: 'auto' },
)

const { markAsRead, snooze, archive, dismiss, runAction, resolveNotificationVisual, timeAgo } =
  useTrellisNotifications()

const isUnread = computed(() => props.notification.status === 'unread')
const visual = computed(() => resolveNotificationVisual(props.notification))

const resolvedDelivery = computed<NotificationDelivery>(() => {
  if (props.deliveryVariant === 'auto') return resolveNotificationDelivery(props.notification)
  return props.deliveryVariant
})

const isInterrupt = computed(() => resolvedDelivery.value === 'interrupt')

const rowClass = computed(() => {
  if (isInterrupt.value && isUnread.value) return 'bg-destructive/5 hover:bg-destructive/10'
  if (isUnread.value) return 'bg-primary/5 hover:bg-primary/10'
  if (!isInterrupt.value) return 'bg-transparent hover:bg-muted/30 opacity-90'
  return 'bg-transparent hover:bg-muted/30'
})

const titleClass = computed(() => {
  if (isInterrupt.value && isUnread.value) return 'font-semibold text-foreground'
  if (isUnread.value) return 'font-medium text-foreground'
  return 'font-normal text-muted-foreground/80'
})

const iconClass = computed(() =>
  isInterrupt.value ? 'h-9 w-9 rounded-xl' : 'h-8 w-8 rounded-lg opacity-90',
)

const deliveryChipClass = computed(() =>
  isInterrupt.value
    ? 'bg-destructive/10 text-destructive ring-destructive/30'
    : 'bg-slate-500/10 text-slate-400 ring-slate-500/30',
)

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
  const alpha = isInterrupt.value ? 0.15 : 0.1
  return {
    backgroundColor: `rgb(${rgb} / ${alpha})`,
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
