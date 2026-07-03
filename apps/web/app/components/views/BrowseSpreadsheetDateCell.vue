<script setup lang="ts">
  import type { Entity } from '~/types/entity'
  import { extractYmd, formatYmdLocal, parseYmdLocal } from '~/utils/date'

  const props = defineProps<{
    item: Entity
  }>()

  const emit = defineEmits<{
    update: [patch: { startDate: string; startTime?: string; allDay?: boolean }]
  }>()

  const popoverOpen = ref(false)

  const allDay = computed({
    get: () => !!(props.item as any).allDay,
    set: (value: boolean) => {
      const ymd = extractYmd((props.item as any).startDate)
      emit('update', {
        startDate: ymd,
        allDay: value,
        startTime: value ? undefined : (props.item as any).startTime || '09:00',
      })
    },
  })

  const combineDateAndTime = (ymd: string, time?: string): Date | null => {
    const base = parseYmdLocal(ymd)
    if (!base) return null
    if (!time) return base
    const [h, m] = time.split(':').map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return base
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m)
  }

  const calendarModel = computed({
    get: () => {
      const ymd = extractYmd((props.item as any).startDate)
      if (!ymd) return undefined
      return allDay.value
        ? (parseYmdLocal(ymd) ?? undefined)
        : (combineDateAndTime(ymd, (props.item as any).startTime) ?? undefined)
    },
    set: (value: Date | string | undefined) => {
      if (!value) {
        emit('update', { startDate: '', allDay: allDay.value })
        return
      }
      const d = value instanceof Date ? value : new Date(value)
      const patch: { startDate: string; startTime?: string; allDay?: boolean } = {
        startDate: formatYmdLocal(d),
        allDay: allDay.value,
      }
      if (!allDay.value) {
        patch.startTime = d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      }
      emit('update', patch)
      popoverOpen.value = false
    },
  })

  const displayLabel = computed(() => {
    const ymd = extractYmd((props.item as any).startDate)
    if (!ymd) return ''
    const d = allDay.value
      ? parseYmdLocal(ymd)
      : combineDateAndTime(ymd, (props.item as any).startTime)
    if (!d) return ''
    if (allDay.value) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${(props.item as any).startTime || ''}`
  })
</script>

<template>
  <UiPopover v-model:open="popoverOpen">
    <UiPopoverTrigger as-child>
      <button
        type="button"
        class="inline-flex h-8 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-xs transition-colors"
        :class="displayLabel ? 'text-foreground hover:bg-muted/50' : 'text-muted-foreground hover:bg-muted/40'">
        <Icon name="lucide:calendar" class="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span class="truncate">{{ displayLabel || 'Set date…' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" :side-offset="6" class="w-auto border-border bg-popover p-0">
      <div class="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <span class="text-xs font-medium text-muted-foreground">Schedule</span>
        <label class="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <UiSwitch v-model:checked="allDay" class="scale-75" />
          All day
        </label>
      </div>
      <UiDatepicker
        v-model="calendarModel"
        :mode="allDay ? 'date' : 'dateTime'"
        is24hr
        embedded
        color="primary"
        class="p-2" />
    </UiPopoverContent>
  </UiPopover>
</template>
