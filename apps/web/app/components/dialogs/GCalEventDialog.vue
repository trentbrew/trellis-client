<script setup lang="ts">
  interface GCalEventData {
    title?: string
    startDate?: string
    endDate?: string
    startTime?: string
    endTime?: string
    allDay?: boolean
    description?: string
    location?: string
    htmlLink?: string
    googleStatus?: string
    googleCalendarId?: string
    googleEventId?: string
    source?: string
    tags?: string[]
  }

  const props = defineProps<{
    open: boolean
    event: GCalEventData | null
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
  }>()

  function close() {
    emit('update:open', false)
  }

  const formattedDate = computed(() => {
    if (!props.event) return ''
    const { startDate, endDate, startTime, endTime, allDay } = props.event
    if (!startDate) return ''

    const fmt = (d: string) => {
      const [y, m, day] = d.split('-').map(Number) as [number, number, number]
      return new Date(y, m - 1, day).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }

    if (allDay) {
      if (endDate && endDate !== startDate) {
        return `${fmt(startDate)} – ${fmt(endDate)}`
      }
      return fmt(startDate)
    }

    const timePart = startTime
      ? ` · ${startTime}${endTime ? ` – ${endTime}` : ''}`
      : ''

    if (endDate && endDate !== startDate) {
      return `${fmt(startDate)} – ${fmt(endDate)}${timePart}`
    }
    return `${fmt(startDate)}${timePart}`
  })
</script>

<template>
  <UiDialog :open="open" @update:open="close">
    <UiDialogContent class="max-w-lg p-0 overflow-hidden">
      <!-- Header -->
      <div class="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-border/50">
        <div class="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <Icon name="simple-icons:googlecalendar" class="h-5 w-5 text-blue-500" />
        </div>
        <div class="flex-1 min-w-0 pr-6">
          <UiDialogTitle class="text-base font-semibold leading-snug">
            {{ event?.title || '(No title)' }}
          </UiDialogTitle>
          <UiDialogDescription class="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Icon name="simple-icons:googlecalendar" class="h-3 w-3 text-blue-500 shrink-0" />
            Google Calendar
          </UiDialogDescription>
        </div>
      </div>

      <!-- Body -->
      <div class="px-6 py-4 space-y-4">
        <!-- Date / Time -->
        <div v-if="formattedDate" class="flex items-start gap-3">
          <Icon name="lucide:calendar-days" class="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p class="text-sm text-foreground leading-relaxed">{{ formattedDate }}</p>
        </div>

        <!-- Location -->
        <div v-if="event?.location" class="flex items-start gap-3">
          <Icon name="lucide:map-pin" class="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p class="text-sm text-foreground leading-relaxed">{{ event.location }}</p>
        </div>

        <!-- Description -->
        <div v-if="event?.description" class="flex items-start gap-3">
          <Icon name="lucide:align-left" class="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p class="text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-6">
            {{ event.description }}
          </p>
        </div>

        <!-- Status badge -->
        <div v-if="event?.googleStatus && event.googleStatus !== 'confirmed'" class="flex items-center gap-3">
          <Icon name="lucide:info" class="h-4 w-4 text-muted-foreground shrink-0" />
          <span class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
            {{ event.googleStatus }}
          </span>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
        <p class="text-[11px] text-muted-foreground/60">Read-only · Managed by Google Calendar</p>
        <div class="flex items-center gap-2">
          <UiButton variant="ghost" size="sm" @click="close">
            Close
          </UiButton>
          <UiButton
            v-if="event?.htmlLink"
            size="sm"
            class="gap-1.5"
            as="a"
            :href="event.htmlLink"
            target="_blank"
            rel="noopener noreferrer"
            @click="close">
            <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
            Open in Google Calendar
          </UiButton>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
