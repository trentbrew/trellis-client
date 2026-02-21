<script setup lang="ts">
  import type { EntityType } from '~/types/entity'
  import { getTypesForClass, typeHasField } from '~/config/entityRegistry'

  const route = useRoute()
  const { currentDate, calendarViewMode, selectedTypes, hiddenGcalAccounts, today, eventDateIndex } = useCalendarSidebarState()

  // ── Entity data for mini calendar dots ─────────────────────────────
  const { items } = useEntities()

  // ── GCal integration ────────────────────────────────────────────────
  const {
    isConnected: _gcalConnected,
    activeConnections: gcalAccounts,
    connect: gcalConnect,
  } = useGoogleCalendar()

  function handleGcalConnect() {
    gcalConnect({ returnTo: route.fullPath })
  }

  function toggleGcalAccount(connId: string) {
    const next = new Set(hiddenGcalAccounts.value)
    if (next.has(connId)) next.delete(connId)
    else next.add(connId)
    hiddenGcalAccounts.value = next
  }

  function gcalEventCount(connId: string) {
    const conn = gcalAccounts.value.find((c) => c.id === connId)
    return conn?.syncedEntityCount ?? 0
  }

  // ── Type filter state ────────────────────────────────────────────────
  const availableFilterTypes = computed(() => {
    const allTypes = [
      ...getTypesForClass('temporal'),
      ...getTypesForClass('document'),
      ...getTypesForClass('actor'),
      ...getTypesForClass('container'),
    ]
    return allTypes
      .filter(t => typeHasField(t.type, 'startDate') || typeHasField(t.type, 'endDate') || typeHasField(t.type, 'targetDate'))
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  watch(availableFilterTypes, (types) => {
    if (selectedTypes.value.size === 0 && types.length > 0) {
      selectedTypes.value = new Set(types.map(t => t.type as EntityType))
    }
  }, { immediate: true })

  function toggleType(type: EntityType) {
    const next = new Set(selectedTypes.value)
    if (next.has(type)) next.delete(type)
    else next.add(type)
    selectedTypes.value = next
  }

  const allSelected = computed(() =>
    availableFilterTypes.value.length > 0
    && selectedTypes.value.size === availableFilterTypes.value.length,
  )

  function toggleAll() {
    if (allSelected.value) {
      selectedTypes.value = new Set()
    } else {
      selectedTypes.value = new Set(availableFilterTypes.value.map(t => t.type as EntityType))
    }
  }

  const typeCount = (type: EntityType) => items.value.filter(i => i.type === type).length

  // ── Attention required ───────────────────────────────────────────────
  const overdueItems = computed(() =>
    items.value.filter(i => {
      const date = (i as any).endDate || (i as any).startDate
      if (!date) return false
      const d = new Date(date)
      return d < today.value && (i as any).taskStatus !== 'completed' && (i as any).taskStatus !== 'done'
    }),
  )

  const dueSoonItems = computed(() => {
    const in3days = new Date(today.value)
    in3days.setDate(in3days.getDate() + 3)
    return items.value.filter(i => {
      const date = (i as any).endDate || (i as any).startDate
      if (!date) return false
      const d = new Date(date)
      return d >= today.value && d <= in3days && (i as any).taskStatus !== 'completed'
    })
  })

  // ── Mini calendar ────────────────────────────────────────────────────
  const currentYear = computed(() => currentDate.value.getFullYear())
  const currentMonth = computed(() => currentDate.value.getMonth())

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  const hasEventsOnDate = (date: Date): boolean => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return eventDateIndex.value.has(dateStr)
  }

  const miniCalendarDays = computed(() => {
    const year = currentYear.value
    const month = currentMonth.value
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const todayDate = today.value

    const days: Array<{
      day: number
      date: Date
      isCurrentMonth: boolean
      isToday: boolean
      hasEvents: boolean
    }> = []

    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i)
      days.push({ day: prevMonthLastDay - i, date, isCurrentMonth: false, isToday: isSameDay(date, todayDate), hasEvents: hasEventsOnDate(date) })
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i)
      days.push({ day: i, date, isCurrentMonth: true, isToday: isSameDay(date, todayDate), hasEvents: hasEventsOnDate(date) })
    }

    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ day: i, date, isCurrentMonth: false, isToday: isSameDay(date, todayDate), hasEvents: hasEventsOnDate(date) })
    }

    return days
  })

  function navigateMiniMonth(delta: number) {
    currentDate.value = new Date(currentYear.value, currentMonth.value + delta, 1)
  }

  function selectDay(dayObj: { date: Date; isCurrentMonth: boolean }) {
    currentDate.value = dayObj.date
    calendarViewMode.value = 'day'
  }
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
    <!-- Mini Calendar -->
    <div class="shrink-0 p-4 pb-0">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold pl-9">
          {{ new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate) }}
        </h3>
        <div class="flex gap-1">
          <button
            class="p-1 rounded hover:bg-muted transition-colors"
            @click="navigateMiniMonth(-1)">
            <Icon name="lucide:chevron-left" class="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            class="p-1 rounded hover:bg-muted transition-colors"
            @click="navigateMiniMonth(1)">
            <Icon name="lucide:chevron-right" class="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-7 gap-0.5 text-center">
        <div
          v-for="day in ['S', 'M', 'T', 'W', 'T', 'F', 'S']"
          :key="day"
          class="text-[10px] font-medium text-muted-foreground py-1">
          {{ day }}
        </div>
        <button
          v-for="(dayObj, idx) in miniCalendarDays"
          :key="idx"
          :class="[
            'relative w-7 h-7 text-xs rounded-md transition-all duration-150',
            dayObj.isToday
              ? 'bg-primary text-primary-foreground font-semibold'
              : dayObj.isCurrentMonth
                ? 'text-foreground hover:bg-muted'
                : 'text-muted-foreground/40',
            dayObj.hasEvents && !dayObj.isToday ? 'font-medium' : '',
          ]"
          @click="selectDay(dayObj)">
          {{ dayObj.day }}
          <span
            v-if="dayObj.hasEvents && dayObj.isCurrentMonth"
            :class="[
              'absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
              dayObj.isToday ? 'bg-primary-foreground' : 'bg-primary',
            ]" />
        </button>
      </div>
    </div>

    <!-- Accordion Sections -->
    <div class="flex-1 flex flex-col min-h-0 border-t border-border mt-4 overflow-auto">
      <UiAccordion type="multiple" :default-value="['sources', 'filter', 'attention']" class="px-4">

        <!-- Sources Section -->
        <UiAccordionItem value="sources" class="border-b border-border/30">
          <UiAccordionHeader class="py-0">
            <UiAccordionTrigger class="py-3 text-xs hover:no-underline">
              <span class="font-semibold text-muted-foreground uppercase tracking-wide">Sources</span>
            </UiAccordionTrigger>
          </UiAccordionHeader>
          <UiAccordionContent class="pb-3 pt-0">
            <!-- Connected GCal accounts -->
            <div v-if="gcalAccounts.length > 0" class="flex flex-col gap-0.5">
              <label
                v-for="conn in gcalAccounts"
                :key="conn.id"
                class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer group"
                :class="[
                  !hiddenGcalAccounts.has(conn.id)
                    ? 'text-foreground hover:bg-muted/50'
                    : 'text-muted-foreground/50 hover:bg-muted/30',
                ]">
                <span
                  class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors"
                  :class="!hiddenGcalAccounts.has(conn.id) ? 'bg-blue-500 border-blue-500' : 'border-muted-foreground/30'"
                  @click.prevent="toggleGcalAccount(conn.id)">
                  <Icon v-if="!hiddenGcalAccounts.has(conn.id)" name="lucide:check" class="h-2.5 w-2.5 text-white" />
                </span>
                <Icon name="simple-icons:googlecalendar" class="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span class="flex-1 truncate" @click.prevent="toggleGcalAccount(conn.id)">
                  {{ conn.accountEmail || 'Google Calendar' }}
                </span>
                <span class="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full min-w-[20px] text-center bg-muted text-muted-foreground">
                  {{ gcalEventCount(conn.id) }}
                </span>
              </label>
              <button
                type="button"
                class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                @click="handleGcalConnect">
                <Icon name="lucide:plus" class="h-3.5 w-3.5 shrink-0" />
                <span>Add account</span>
              </button>
            </div>

            <!-- No accounts: invite to connect -->
            <div v-else class="px-2">
              <div class="flex items-start gap-2.5 py-2">
                <Icon name="simple-icons:googlecalendar" class="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-foreground">Google Calendar</p>
                  <p class="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    Import events from your Google account
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors mt-1"
                @click="handleGcalConnect">
                <Icon name="lucide:link" class="h-3 w-3" />
                Connect
              </button>
            </div>
          </UiAccordionContent>
        </UiAccordionItem>

        <!-- Filter Section -->
        <UiAccordionItem value="filter" class="border-b border-border/30">
          <UiAccordionHeader class="py-0">
            <UiAccordionTrigger class="py-3 text-xs hover:no-underline">
              <span class="font-semibold text-muted-foreground uppercase tracking-wide">Filter</span>
            </UiAccordionTrigger>
          </UiAccordionHeader>
          <UiAccordionContent class="pb-3 pt-0">
            <div class="flex items-center justify-end mb-2">
              <button
                type="button"
                class="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                @click="toggleAll">
                {{ allSelected ? 'None' : 'All' }}
              </button>
            </div>
            <div class="flex flex-col gap-0.5">
              <label
                v-for="tc in availableFilterTypes"
                :key="tc.type"
                class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                :class="[
                  selectedTypes.has(tc.type as EntityType)
                    ? 'text-foreground hover:bg-muted/50'
                    : 'text-muted-foreground/50 hover:bg-muted/30 hover:text-muted-foreground',
                ]">
                <span
                  class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors"
                  :class="[
                    selectedTypes.has(tc.type as EntityType)
                      ? `bg-${tc.color}-500 border-${tc.color}-500`
                      : 'border-muted-foreground/30',
                  ]"
                  @click.prevent="toggleType(tc.type as EntityType)">
                  <Icon v-if="selectedTypes.has(tc.type as EntityType)" name="lucide:check" class="h-2.5 w-2.5 text-white" />
                </span>
                <Icon :name="tc.icon" :class="['h-3.5 w-3.5 shrink-0', `text-${tc.color}-500`]" />
                <span class="flex-1" @click.prevent="toggleType(tc.type as EntityType)">{{ tc.labelPlural }}</span>
                <span class="text-[10px] tabular-nums px-1.5 py-0.5 rounded-full min-w-[20px] text-center bg-muted text-muted-foreground">
                  {{ typeCount(tc.type as EntityType) }}
                </span>
              </label>
            </div>
          </UiAccordionContent>
        </UiAccordionItem>

        <!-- Attention Required -->
        <UiAccordionItem value="attention" class="border-none">
          <UiAccordionHeader class="py-0">
            <UiAccordionTrigger class="py-3 text-xs hover:no-underline">
              <span class="font-semibold text-muted-foreground uppercase tracking-wide">Attention Required</span>
            </UiAccordionTrigger>
          </UiAccordionHeader>
          <UiAccordionContent class="pb-3 pt-0">
            <div v-if="overdueItems.length > 0 || dueSoonItems.length > 0" class="space-y-2">
              <!-- Overdue -->
              <div v-if="overdueItems.length > 0">
                <div class="flex items-center gap-2 mb-1.5 py-1">
                  <span class="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span class="text-xs font-semibold text-rose-600 dark:text-rose-400">Overdue</span>
                  <span class="text-xs text-muted-foreground">({{ overdueItems.length }})</span>
                </div>
                <div class="space-y-1">
                  <div
                    v-for="item in overdueItems.slice(0, 5)"
                    :key="item.id"
                    class="flex items-start gap-2 p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 text-xs">
                    <Icon name="lucide:circle-alert" class="h-3.5 w-3.5 mt-0.5 shrink-0 text-rose-500" />
                    <span class="truncate font-medium">{{ item.title || 'Untitled' }}</span>
                  </div>
                  <div v-if="overdueItems.length > 5" class="text-[10px] text-muted-foreground px-2">
                    +{{ overdueItems.length - 5 }} more
                  </div>
                </div>
              </div>
              <!-- Due Soon -->
              <div v-if="dueSoonItems.length > 0">
                <div class="flex items-center gap-2 mb-1.5 py-1">
                  <span class="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span class="text-xs font-semibold text-amber-600 dark:text-amber-400">Due Soon</span>
                  <span class="text-xs text-muted-foreground">({{ dueSoonItems.length }})</span>
                </div>
                <div class="space-y-1">
                  <div
                    v-for="item in dueSoonItems.slice(0, 5)"
                    :key="item.id"
                    class="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 text-xs">
                    <Icon name="lucide:clock" class="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                    <span class="truncate font-medium">{{ item.title || 'Untitled' }}</span>
                  </div>
                  <div v-if="dueSoonItems.length > 5" class="text-[10px] text-muted-foreground px-2">
                    +{{ dueSoonItems.length - 5 }} more
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="text-xs text-muted-foreground px-2 py-1">
              Nothing requires attention right now.
            </p>
          </UiAccordionContent>
        </UiAccordionItem>

      </UiAccordion>
    </div>
  </div>
</template>
