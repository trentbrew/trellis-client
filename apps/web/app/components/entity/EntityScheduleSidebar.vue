<script lang="ts" setup>
  /**
   * EntityScheduleSidebar — Collapsible left sidebar for temporal entity dialogs.
   *
   * Contains: all-day toggle, start/end date picker, recurrence presets,
   * custom repeat form, reminder presets, custom reminder form.
   *
   * Reads/writes `editableItem` directly (passed as prop, reactive).
   */
  import type { RecurrenceRule, PropertyFieldId } from '~/types/entity'
  import { extractYmd, formatYmdLocal, parseYmdLocal } from '~/utils/date'

  const editableItem = defineModel<any>('editableItem', { required: true })

  const props = defineProps<{
    hasField: (_fieldId: PropertyFieldId) => boolean
    isViewMode: boolean
    isDark: boolean
  }>()

  // ── Recurrence ──────────────────────────────────────────────────────
  type RepeatPreset = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'weekdays' | 'custom' | 'none'
  const selectedRepeat = defineModel<string>('selectedRepeat', { default: 'none' })
  const repeatPresets: { value: RepeatPreset; label: string; sub?: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'weekdays', label: 'Every Weekday', sub: '(Mon-Fri)' },
    { value: 'custom', label: 'Custom' },
  ]
  const repeatCustom = reactive({
    interval: 1,
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    weekdays: [] as number[],
    endMode: 'never' as 'never' | 'after' | 'on',
    occurrences: 10,
    endDate: '',
  })
  const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const FREQUENCY_OPTIONS = [
    { value: 'daily', label: 'day(s)' },
    { value: 'weekly', label: 'week(s)' },
    { value: 'monthly', label: 'month(s)' },
    { value: 'yearly', label: 'year(s)' },
  ]

  const selectRepeat = (p: RepeatPreset) => {
    selectedRepeat.value = p
    if (p === 'none') {
      editableItem.value.recurrence = undefined
    } else if (p === 'custom') {
      editableItem.value.recurrence = {
        frequency: 'custom',
        interval: repeatCustom.interval,
        weekdays: repeatCustom.weekdays.length ? repeatCustom.weekdays : undefined,
        endDate: repeatCustom.endMode === 'on' ? repeatCustom.endDate : undefined,
        occurrences: repeatCustom.endMode === 'after' ? repeatCustom.occurrences : undefined,
      }
    } else {
      editableItem.value.recurrence = { frequency: p } as RecurrenceRule
    }
  }

  watch(
    repeatCustom,
    () => {
      if (selectedRepeat.value === 'custom') {
        editableItem.value.recurrence = {
          frequency: 'custom',
          interval: repeatCustom.interval,
          weekdays: repeatCustom.weekdays.length ? repeatCustom.weekdays : undefined,
          endDate: repeatCustom.endMode === 'on' ? repeatCustom.endDate : undefined,
          occurrences: repeatCustom.endMode === 'after' ? repeatCustom.occurrences : undefined,
        }
      }
    },
    { deep: true },
  )

  const toggleWeekday = (day: number) => {
    const idx = repeatCustom.weekdays.indexOf(day)
    if (idx >= 0) repeatCustom.weekdays.splice(idx, 1)
    else repeatCustom.weekdays.push(day)
  }

  // ── Reminder ────────────────────────────────────────────────────────
  type ReminderPreset = 'none' | 'on-the-day' | '1-day-early' | '2-days-early' | '1-week-early' | 'custom'
  const selectedReminder = ref<ReminderPreset>('none')
  const reminderPresets: { value: ReminderPreset; label: string; time?: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'on-the-day', label: 'On the day', time: '09:00' },
    { value: '1-day-early', label: '1 day early', time: '09:00' },
    { value: '2-days-early', label: '2 days early', time: '09:00' },
    { value: '1-week-early', label: '1 week early', time: '09:00' },
    { value: 'custom', label: 'Custom' },
  ]
  const reminderCustom = reactive({ daysInAdvance: 1, time: '09:00' })
  const repeatOpen = ref(false)
  const reminderOpen = ref(false)

  // ── Calendar models ─────────────────────────────────────────────────
  const scheduleTab = ref<'start' | 'end'>('start')

  const combineDateAndTime = (ymd: string, time?: string): Date | null => {
    const base = parseYmdLocal(ymd)
    if (!base) return null
    if (!time) return base
    const [h, m] = time.split(':').map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return base
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m)
  }

  const calendarModel: any = computed({
    get: () => {
      const ymd = extractYmd(editableItem.value.startDate)
      if (!ymd) return undefined
      return editableItem.value.allDay
        ? (parseYmdLocal(ymd) ?? undefined)
        : (combineDateAndTime(ymd, editableItem.value.startTime) ?? undefined)
    },
    set: (v: Date | string | undefined) => {
      if (!v) {
        editableItem.value.startDate = ''
        return
      }
      const d = v instanceof Date ? v : new Date(v)
      editableItem.value.startDate = formatYmdLocal(d)
      if (!editableItem.value.allDay) {
        editableItem.value.startTime = d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      }
      if (!editableItem.value.endDate && props.hasField('endDate')) {
        const end = new Date(d.getTime() + 60 * 60 * 1000)
        editableItem.value.endDate = formatYmdLocal(end)
        if (!editableItem.value.allDay) {
          editableItem.value.endTime = end.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        }
      }
    },
  })

  const endCalendarModel: any = computed({
    get: () => {
      const ymd = extractYmd(editableItem.value.endDate)
      if (!ymd) return undefined
      return editableItem.value.allDay
        ? (parseYmdLocal(ymd) ?? undefined)
        : (combineDateAndTime(ymd, editableItem.value.endTime) ?? undefined)
    },
    set: (v: Date | string | undefined) => {
      if (!v) {
        editableItem.value.endDate = undefined
        return
      }
      const d = v instanceof Date ? v : new Date(v)
      editableItem.value.endDate = formatYmdLocal(d)
      if (!editableItem.value.allDay) {
        editableItem.value.endTime = d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      }
    },
  })

  // Calendar model accessors kept for parent compatibility
  const _calendarModel = calendarModel
  const _endCalendarModel = endCalendarModel

  const startSummary = computed(() => {
    if (!editableItem.value.startDate) return 'Not set'
    const d = combineDateAndTime(
      extractYmd(editableItem.value.startDate),
      editableItem.value.allDay ? undefined : editableItem.value.startTime,
    )
    if (!d) return 'Not set'
    return editableItem.value.allDay
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + (editableItem.value.startTime || '')
  })

  const endSummary = computed(() => {
    if (!editableItem.value.endDate) return 'Not set'
    const d = combineDateAndTime(
      extractYmd(editableItem.value.endDate),
      editableItem.value.allDay ? undefined : editableItem.value.endTime,
    )
    if (!d) return 'Not set'
    return editableItem.value.allDay
      ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + (editableItem.value.endTime || '')
  })

  // Picker mode no longer needed (calendar removed), kept for backwards compatibility
  const _pickerMode = editableItem.value.allDay ? 'date' : 'dateTime'

  // Expose for parent to reset on item change
  defineExpose({ selectedRepeat, selectedReminder, repeatOpen, reminderOpen })
</script>

<template>
  <div class="p-3 space-y-3">
    <!-- All Day toggle -->
    <div v-if="hasField('allDay')" class="flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <Icon name="lucide:sun" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-xs font-medium">All day</span>
      </div>
      <button
        v-if="!isViewMode"
        :class="[
          'w-8 h-4.5 rounded-full transition-colors relative',
          editableItem.allDay ? 'bg-primary/50' : 'bg-muted-foreground/30',
        ]"
        @click="editableItem.allDay = !editableItem.allDay">
        <span
          :class="[
            'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-foreground shadow-sm transition-transform',
            !editableItem.allDay ? '-translate-x-4' : 'translate-x-0.5',
          ]" />
      </button>
    </div>

    <!-- Start/End segmented toggle -->
    <div v-if="hasField('endDate')" class="flex rounded-lg border border-border bg-muted/0 p-1">
      <button
        type="button"
        class="flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-md text-[10px] font-medium transition-colors"
        :class="
          scheduleTab === 'start'
            ? 'bg-foreground/5 shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="scheduleTab = 'start'">
        <span class="uppercase tracking-wide">Start</span>
        <span class="text-[10px] opacity-70">{{ startSummary }}</span>
      </button>
      <button
        type="button"
        class="flex-1 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors"
        :class="
          scheduleTab === 'end'
            ? 'bg-foreground/5 shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="scheduleTab = 'end'">
        <span class="uppercase tracking-wide">End</span>
        <span class="text-[10px] opacity-70">{{ endSummary }}</span>
      </button>
    </div>

    <!-- Repeat -->
    <div class="space-y-1.5 pt-2 border-t border-border">
      <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Repeat</p>
      <UiPopover v-model:open="repeatOpen">
        <UiPopoverTrigger as-child>
          <button
            class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            :class="
              selectedRepeat !== 'none'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/50 hover:bg-muted text-muted-foreground'
            ">
            <div class="flex items-center gap-1.5">
              <Icon name="lucide:repeat" class="h-3.5 w-3.5" />
              <span>{{ repeatPresets.find((p) => p.value === selectedRepeat)?.label || 'None' }}</span>
            </div>
            <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-50" />
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-52 p-1">
          <button
            v-for="preset in repeatPresets"
            :key="preset.value"
            type="button"
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs hover:bg-muted/50 transition-colors"
            :class="selectedRepeat === preset.value ? 'bg-muted/50' : ''"
            @click="
              () => {
                selectRepeat(preset.value)
                repeatOpen = false
              }
            ">
            <div class="flex items-center gap-1.5">
              <span>{{ preset.label }}</span>
              <span v-if="preset.sub" class="text-muted-foreground text-[10px]">{{ preset.sub }}</span>
            </div>
            <Icon v-if="selectedRepeat === preset.value" name="lucide:check" class="h-3 w-3 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>
      <!-- Custom repeat inline form -->
      <div v-if="selectedRepeat === 'custom'" class="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-2.5">
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] text-muted-foreground shrink-0">Every</span>
          <UiInput
            v-model.number="repeatCustom.interval"
            type="number"
            min="1"
            max="99"
            class="w-11 h-6 text-[10px] text-center" />
          <select
            v-model="repeatCustom.frequency"
            class="h-6 rounded-md border border-border bg-transparent text-[10px] px-1.5 outline-none">
            <option v-for="opt in FREQUENCY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div v-if="repeatCustom.frequency === 'weekly'" class="space-y-1">
          <span class="text-[10px] text-muted-foreground">On</span>
          <div class="flex gap-1">
            <button
              v-for="(label, i) in WEEKDAY_LABELS"
              :key="i"
              type="button"
              class="w-6 h-6 rounded-md text-[10px] font-medium transition-colors"
              :class="
                repeatCustom.weekdays.includes(i)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              "
              @click="toggleWeekday(i)">
              {{ label }}
            </button>
          </div>
        </div>
        <div class="space-y-1.5">
          <span class="text-[10px] text-muted-foreground">Ends</span>
          <div class="space-y-1">
            <label class="flex items-center gap-1.5 text-[10px] cursor-pointer">
              <input v-model="repeatCustom.endMode" type="radio" value="never" class="accent-primary w-3 h-3" />
              <span>Never</span>
            </label>
            <label class="flex items-center gap-1.5 text-[10px] cursor-pointer">
              <input v-model="repeatCustom.endMode" type="radio" value="after" class="accent-primary w-3 h-3" />
              <span>After</span>
              <UiInput
                v-if="repeatCustom.endMode === 'after'"
                v-model.number="repeatCustom.occurrences"
                type="number"
                min="1"
                class="w-11 h-5 text-[10px] text-center" />
              <span v-if="repeatCustom.endMode === 'after'">times</span>
            </label>
            <label class="flex items-center gap-1.5 text-[10px] cursor-pointer">
              <input v-model="repeatCustom.endMode" type="radio" value="on" class="accent-primary w-3 h-3" />
              <span>On</span>
              <input
                v-if="repeatCustom.endMode === 'on'"
                v-model="repeatCustom.endDate"
                type="date"
                class="h-5 rounded-md border border-border bg-transparent text-[10px] px-1.5 outline-none" />
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Reminder -->
    <div class="space-y-1.5">
      <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Reminder</p>
      <UiPopover v-model:open="reminderOpen">
        <UiPopoverTrigger as-child>
          <button
            class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            :class="
              selectedReminder !== 'none'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/50 hover:bg-muted text-muted-foreground'
            ">
            <div class="flex items-center gap-1.5">
              <Icon name="lucide:bell" class="h-3.5 w-3.5" />
              <span>{{ reminderPresets.find((p) => p.value === selectedReminder)?.label || 'None' }}</span>
            </div>
            <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-50" />
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-52 p-1">
          <button
            v-for="preset in reminderPresets"
            :key="preset.value"
            type="button"
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs hover:bg-muted/50 transition-colors"
            :class="selectedReminder === preset.value ? 'bg-muted/50' : ''"
            @click="
              () => {
                selectedReminder = preset.value
                reminderOpen = false
              }
            ">
            <div class="flex items-center gap-1.5">
              <span>{{ preset.label }}</span>
              <span v-if="preset.time && preset.value !== 'custom'" class="text-muted-foreground text-[10px]">
                ({{ preset.time }})
              </span>
            </div>
            <Icon v-if="selectedReminder === preset.value" name="lucide:check" class="h-3 w-3 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>
      <!-- Custom reminder inline form -->
      <div v-if="selectedReminder === 'custom'" class="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-2">
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] text-muted-foreground shrink-0">Remind</span>
          <UiInput
            v-model.number="reminderCustom.daysInAdvance"
            type="number"
            min="0"
            class="w-11 h-6 text-[10px] text-center" />
          <span class="text-[10px] text-muted-foreground shrink-0">day(s) before</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] text-muted-foreground shrink-0">At</span>
          <input
            v-model="reminderCustom.time"
            type="time"
            class="h-6 flex-1 rounded-md border border-border bg-transparent text-[10px] px-1.5 outline-none" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Calendar styles removed with mini calendar */
</style>
