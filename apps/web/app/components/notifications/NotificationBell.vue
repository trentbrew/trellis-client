<template>
  <UiDropdownMenu>
    <UiDropdownMenuTrigger as-child>
      <UiButton
        variant="outline"
        size="icon-sm"
        class="text-muted-foreground hover:text-foreground bg-transparent! relative transition-transform active:scale-95 mr-1 rounded-full!">
        <Icon name="lucide:bell" class="h-4 w-4" />
        <span
          v-if="unreadCount > 0"
          class="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card"
          aria-hidden="true" />
      </UiButton>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent align="end" class="w-[420px] p-0 overflow-hidden shadow-2xl border-border/50">
      <div class="p-4 border-b bg-muted/20 flex items-center justify-between">
        <div>
          <UiDropdownMenuLabel class="p-0 font-bold text-base tracking-tight">
            Notifications
          </UiDropdownMenuLabel>
          <p class="text-[11px] text-muted-foreground leading-none mt-1">
            <span v-if="unreadCount > 0">{{ unreadCount }} unread</span>
            <span v-else>You're all caught up</span>
          </p>
        </div>
        <UiButton
          v-if="unreadCount > 0"
          variant="ghost"
          size="xs"
          class="text-[10px] h-7 px-3 font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
          @click="markAllAsRead">
          Mark all as read
        </UiButton>
      </div>

      <div class="max-h-[520px] overflow-y-auto custom-scrollbar">
        <template v-if="visible.length > 0">
          <NotificationItem
            v-for="n in visible"
            :key="n.id"
            :notification="n"
          />
        </template>
        <div v-else class="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div class="relative mb-4">
            <Icon name="lucide:bell" class="h-12 w-12 opacity-10" />
            <Icon name="lucide:check" class="absolute -bottom-1 -right-1 h-5 w-5 text-emerald-500 opacity-50" />
          </div>
          <p class="text-sm font-bold tracking-tight">All caught up!</p>
          <p class="text-xs opacity-60">No new notifications</p>
        </div>
      </div>

      <div class="p-3 border-t bg-muted/5 text-center">
        <UiButton
          variant="ghost"
          size="sm"
          class="w-full text-xs font-bold text-muted-foreground hover:text-primary transition-colors hover:bg-primary/5"
          @click="navigateTo('/activity')">
          View all activity
        </UiButton>
      </div>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>

<script setup lang="ts">
import { useTrellisNotifications } from '~/composables/useTrellisNotifications'

const { notifications, unreadCount, markAllAsRead } = useTrellisNotifications()

// Show unread + snoozed-past-due + recently-read; skip archived
const visible = computed(() =>
  notifications.value
    .filter((n) => n.status !== 'archived')
    .slice(0, 20),
)
</script>
