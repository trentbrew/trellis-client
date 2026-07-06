<script setup lang="ts">
import { useTrellisNotifications } from '~/composables/useTrellisNotifications'
import { filterActivityNotifications, groupNotificationsByDay } from '~/lib/notification-day-groups'

const props = defineProps<{
  tab: 'status' | 'alerts'
}>()

const { notifications, loading } = useTrellisNotifications()

const filtered = computed(() => filterActivityNotifications(notifications.value, props.tab))

const dayGroups = computed(() => groupNotificationsByDay(filtered.value))

const emptyCopy = computed(() =>
  props.tab === 'alerts'
    ? { title: 'No alerts in history', body: 'Interrupt notifications you act on will appear here.' }
    : { title: 'Nothing to review yet', body: 'Task completions and sync status will show up here quietly.' },
)
</script>

<template>
  <div
    aria-live="polite"
    aria-label="Activity feed"
    class="min-h-[200px]">
    <div v-if="loading" class="flex items-center justify-center py-16 text-sm text-muted-foreground">
      Loading activity…
    </div>

    <template v-else-if="dayGroups.length > 0">
      <ActivityDayGroup v-for="group in dayGroups" :key="group.label" :label="group.label">
        <NotificationItem
          v-for="n in group.items"
          :key="n.id"
          :notification="n"
          delivery-variant="auto" />
      </ActivityDayGroup>
    </template>

    <div v-else class="flex flex-col items-center justify-center px-6 py-20 text-center text-muted-foreground">
      <Icon name="lucide:activity" class="mb-4 h-10 w-10 opacity-15" />
      <p class="text-sm font-semibold text-foreground">{{ emptyCopy.title }}</p>
      <p class="mt-1 max-w-sm text-xs leading-relaxed">{{ emptyCopy.body }}</p>
    </div>
  </div>
</template>
