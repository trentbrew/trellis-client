<template>
  <Page
    title="Activity"
    subtitle="Inbox"
    description="Notifications from the graph, integrations, and background jobs"
    icon="lucide:bell"
    :fill-height="true">
    <div class="space-y-4 max-w-3xl">
      <!-- Filters -->
      <div class="flex items-center gap-2 flex-wrap">
        <p class="text-sm text-muted-foreground mr-2">
          {{ unreadCount > 0 ? `${unreadCount} unread` : 'All caught up' }}
        </p>
        <UiButton
          v-for="f in filters"
          :key="f.value"
          variant="ghost"
          size="xs"
          class="h-7 text-[11px] font-bold uppercase tracking-wide"
          :class="[activeFilter === f.value ? 'bg-primary/10 text-primary' : 'text-muted-foreground']"
          @click="activeFilter = f.value as any">
          {{ f.label }}
          <span class="ml-1.5 rounded-full bg-muted/50 px-1.5 py-0.5 text-[9px] tabular-nums">{{ f.count }}</span>
        </UiButton>

        <div class="flex-1" />

        <UiButton
          v-if="unreadCount > 0"
          variant="outline"
          size="xs"
          class="h-7 text-[11px] font-bold"
          @click="markAllAsRead">
          <Icon name="lucide:check-check" class="mr-1 h-3 w-3" />
          Mark all as read
        </UiButton>
      </div>

      <!-- Source filter -->
      <div class="flex items-center gap-1.5 flex-wrap">
        <UiButton
          v-for="s in sources"
          :key="s.value ?? 'all'"
          variant="ghost"
          size="xs"
          class="h-6 text-[10px] font-bold uppercase tracking-wider"
          :class="[activeSource === s.value ? 'bg-muted text-foreground' : 'text-muted-foreground/70']"
          @click="activeSource = s.value as any">
          <Icon v-if="s.icon" :name="s.icon" class="mr-1 h-3 w-3" />
          {{ s.label }}
        </UiButton>
      </div>

      <!-- List -->
      <div class="rounded-lg border border-border/50 bg-card/40 overflow-hidden">
        <template v-if="filtered.length > 0">
          <NotificationItem
            v-for="n in filtered"
            :key="n.id"
            :notification="n"
          />
        </template>
        <div v-else class="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div class="relative mb-4">
            <Icon name="lucide:bell" class="h-14 w-14 opacity-10" />
            <Icon name="lucide:check" class="absolute -bottom-1 -right-1 h-6 w-6 text-emerald-500 opacity-60" />
          </div>
          <p class="text-sm font-bold tracking-tight">Nothing here</p>
          <p class="text-xs opacity-60 mt-1">New notifications will show up automatically</p>
        </div>
      </div>
    </div>
  </Page>
</template>

<script setup lang="ts">
import { useTrellisNotifications } from '~/composables/useTrellisNotifications'
import type { NotificationSource } from '~/types/notification'

definePageMeta({
  title: 'Activity',
  icon: 'lucide:bell',
})

const { notifications, unreadCount, archived, snoozed, markAllAsRead } = useTrellisNotifications()

type Tab = 'inbox' | 'unread' | 'snoozed' | 'archived'
const activeFilter = ref<Tab>('inbox')
const activeSource = ref<NotificationSource | null>(null)

const inbox = computed(() => notifications.value.filter((n) => n.status !== 'archived'))
const unreadOnly = computed(() => notifications.value.filter((n) => n.status === 'unread'))

const filters = computed(() => [
  { value: 'inbox',    label: 'Inbox',    count: inbox.value.length },
  { value: 'unread',   label: 'Unread',   count: unreadCount.value },
  { value: 'snoozed',  label: 'Snoozed',  count: snoozed.value.length },
  { value: 'archived', label: 'Archived', count: archived.value.length },
])

const sources: Array<{ value: NotificationSource | null; label: string; icon?: string }> = [
  { value: null,        label: 'All' },
  { value: 'graph',     label: 'Graph',     icon: 'lucide:network' },
  { value: 'email',     label: 'Email',     icon: 'lucide:mail' },
  { value: 'calendar',  label: 'Calendar',  icon: 'lucide:calendar' },
  { value: 'job',       label: 'Jobs',      icon: 'lucide:cog' },
  { value: 'workflow',  label: 'Workflows', icon: 'lucide:zap' },
  { value: 'ops',       label: 'Ops',       icon: 'lucide:activity' },
  { value: 'ai',        label: 'AI',        icon: 'lucide:sparkles' },
  { value: 'system',    label: 'System',    icon: 'lucide:info' },
]

const filtered = computed(() => {
  let list: typeof notifications.value = []
  switch (activeFilter.value) {
    case 'unread':   list = unreadOnly.value; break
    case 'snoozed':  list = snoozed.value; break
    case 'archived': list = archived.value; break
    default:         list = inbox.value
  }
  if (activeSource.value) list = list.filter((n) => n.source === activeSource.value)
  return list
})
</script>
