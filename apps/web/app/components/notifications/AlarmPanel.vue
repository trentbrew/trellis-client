<script setup lang="ts">
import { useTrellisNotifications } from '~/composables/useTrellisNotifications'
import { resolveNotificationDelivery } from '~/types/notification'

const { notifications, unreadCount, markAllAsRead } = useTrellisNotifications()

const visible = computed(() =>
  notifications.value
    .filter((n) => n.status !== 'archived' && resolveNotificationDelivery(n) === 'interrupt')
    .slice(0, 20),
)

const headerTitle = computed(() => (unreadCount.value > 0 ? 'Action required' : 'All caught up'))

const headerSubtitle = computed(() =>
  unreadCount.value > 0
    ? `${unreadCount.value} need your attention`
    : 'No action required',
)
</script>

<template>
  <div class="flex max-h-[min(70dvh,520px)] flex-col overflow-hidden">
    <div
      class="flex shrink-0 items-center justify-between border-b bg-muted/20 p-4"
      :class="unreadCount > 0 ? 'bg-destructive/5' : ''">
      <div>
        <UiDropdownMenuLabel class="p-0 text-base font-bold tracking-tight">
          {{ headerTitle }}
        </UiDropdownMenuLabel>
        <p class="mt-1 text-[11px] leading-none text-muted-foreground">
          {{ headerSubtitle }}
        </p>
        <NuxtLink
          to="/lobby/activity"
          data-testid="alarm-view-lobby-activity-header"
          class="mt-2 inline-block text-[10px] font-bold text-primary hover:underline">
          View activity in Lobby
        </NuxtLink>
      </div>
      <UiButton
        v-if="unreadCount > 0"
        variant="ghost"
        size="xs"
        class="h-7 px-3 text-[10px] font-semibold hover:bg-primary/10 hover:text-primary"
        @click="markAllAsRead">
        Mark all read
      </UiButton>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
      <template v-if="visible.length > 0">
        <NotificationItem
          v-for="n in visible"
          :key="n.id"
          :notification="n"
          delivery-variant="interrupt" />
      </template>
      <div v-else class="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <div class="relative mb-3">
          <Icon name="lucide:bell" class="h-10 w-10 opacity-10" />
          <Icon name="lucide:check" class="absolute -bottom-1 -right-1 h-4 w-4 text-emerald-500 opacity-50" />
        </div>
        <p class="text-sm font-bold tracking-tight">All caught up!</p>
        <p class="text-xs opacity-60">Passive status lives in Lobby activity</p>
      </div>
    </div>

    <div class="shrink-0 border-t bg-muted/5 p-2">
      <NuxtLink
        to="/lobby/activity"
        data-testid="alarm-view-lobby-activity"
        class="flex w-full items-center justify-center rounded-md px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary">
        View activity in Lobby
      </NuxtLink>
    </div>
  </div>
</template>
