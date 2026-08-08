<script setup lang="ts">
import type { Entity } from '~/types/entity'
import CalendarView from '~/components/views/CalendarView.vue'

const props = defineProps<{
  items: Entity[]
  entityType?: string
}>()

const emit = defineEmits<{
  openDetail: [item: Entity]
  createRequest: [date: Date]
  reschedule: [item: Entity, patch: Partial<Entity>]
}>()

const calendarNodes = computed(() =>
  props.items.map((item) => ({
    '@id': `item:${item.id}`,
    '@type': item.type.charAt(0).toUpperCase() + item.type.slice(1),
    'trellis:title': item.title,
    'user:dueDate': item.endDate ? { start: item.startDate, end: item.endDate } : item.startDate,
    'user:recurrence': item.recurrence,
    'user:status':
      (item as unknown as Record<string, unknown>).taskStatus ||
      (item as unknown as Record<string, unknown>).tripStatus ||
      (item as unknown as Record<string, unknown>).paymentStatus ||
      (item as unknown as Record<string, unknown>).eventType ||
      'note',
    'user:priority': item.priority,
    'user:urgency': item.urgency,
  })),
)

const calendarSchema = computed(() => ({
  id: 'browse-calendar-schema',
  collectionId: 'browse',
  fields: [
    { id: 'dueDate', name: 'Date', type: 'date' as const, order: 0, required: false },
    { id: 'status', name: 'Status', type: 'select' as const, order: 1, required: false },
    { id: 'priority', name: 'Priority', type: 'select' as const, order: 2, required: false },
  ],
  views: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}))

function parseCalendarEventId(eventId: string): string {
  return eventId.replace(/^item:/, '').replace(/-repeat-\d+$/, '').replace(/-\d+-\d+$/, '')
}

function findItem(eventId: string): Entity | undefined {
  const rawId = parseCalendarEventId(eventId)
  return props.items.find((item) => item.id === rawId)
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function handleTaskClick(calEvent: { id: string }) {
  const item = findItem(calEvent.id)
  if (item) emit('openDetail', item)
}

function handleCellClick(date: Date) {
  emit('createRequest', date)
}

function handleEventReschedule(eventId: string, newDate: Date) {
  const item = findItem(eventId)
  if (!item) return
  emit('reschedule', item, { startDate: toIsoDate(newDate) as Entity['startDate'] })
}

function handleEventResize(eventId: string, edge: 'start' | 'end', newDate: Date) {
  const item = findItem(eventId)
  if (!item) return
  const newStr = toIsoDate(newDate)
  if (edge === 'start') {
    const endStr = item.endDate || item.startDate
    if (endStr && newStr > endStr) return
    emit('reschedule', item, { startDate: newStr as Entity['startDate'] })
    return
  }
  const startStr = item.startDate
  if (startStr && newStr < startStr) return
  const patch: Partial<Entity> =
    startStr && newStr === startStr ? { endDate: undefined } : { endDate: newStr as Entity['endDate'] }
  emit('reschedule', item, patch)
}
</script>

<template>
  <div class="flex h-full min-h-112 flex-1 flex-col overflow-hidden rounded-lg border border-border/50">
    <CalendarView
      collection-id="browse"
      :nodes="calendarNodes"
      :schema="calendarSchema"
      hide-sidebar
      fullscreen
      @task-click="handleTaskClick"
      @cell-click="handleCellClick"
      @event-reschedule="handleEventReschedule"
      @event-resize="handleEventResize" />
  </div>
</template>
