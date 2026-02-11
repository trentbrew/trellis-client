<script setup lang="ts">
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem, CalendarItemType, TaskItem } from '~/types/calendarItem'
  import { CALENDAR_ITEM_TYPES } from '~/types/calendarItem'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Feed | Personal' })

  // ---------------------------------------------------------------------------
  // Live data from instant-local
  // ---------------------------------------------------------------------------

  const { items: allItems, update, remove } = useCalendarItems()

  // ---------------------------------------------------------------------------
  // Source definitions (integration-aware)
  // ---------------------------------------------------------------------------

  interface FeedSource {
    id: string
    label: string
    icon: string
    color: string
  }

  const sources: FeedSource[] = [
    { id: 'manual', label: 'Manual', icon: 'lucide:pen-line', color: 'text-foreground' },
    { id: 'email', label: 'Email', icon: 'lucide:mail', color: 'text-blue-500' },
    { id: 'slack', label: 'Slack', icon: 'simple-icons:slack', color: 'text-purple-500' },
    { id: 'notion', label: 'Notion', icon: 'simple-icons:notion', color: 'text-foreground' },
    { id: 'github', label: 'GitHub', icon: 'simple-icons:github', color: 'text-foreground' },
    { id: 'calendar', label: 'Calendar Sync', icon: 'lucide:calendar-sync', color: 'text-emerald-500' },
    { id: 'webhook', label: 'Webhook', icon: 'lucide:webhook', color: 'text-orange-500' },
  ]

  const selectedSources = ref<Set<string>>(new Set())
  const isAllSources = computed(() => selectedSources.value.size === 0)

  function toggleSource(sourceId: string) {
    const next = new Set(selectedSources.value)
    if (next.has(sourceId)) {
      next.delete(sourceId)
    } else {
      next.add(sourceId)
    }
    selectedSources.value = next
  }

  function clearSourceFilter() {
    selectedSources.value = new Set()
  }

  // Items resolve their source (stub: everything is 'manual' until integrations land)
  function itemSource(_item: CalendarItem): string {
    return 'manual'
  }

  // Resolve the best timestamp for an item (createdAt → startDate → 0)
  function itemTimestamp(item: CalendarItem): number {
    if (item.createdAt) return Number(item.createdAt)
    if (item.startDate) return new Date(item.startDate + 'T00:00:00').getTime()
    return 0
  }

  // Source-filtered items
  const sourceFilteredItems = computed(() => {
    if (isAllSources.value) return allItems.value
    return allItems.value.filter((i) => selectedSources.value.has(itemSource(i)))
  })

  // Feed shows source-filtered items sorted by timestamp descending (newest first)
  const feedItems = computed(() =>
    [...sourceFilteredItems.value].sort((a, b) => itemTimestamp(b) - itemTimestamp(a)),
  )

  // Source counts (for pills)
  const sourceCounts = computed(() => {
    const counts: Record<string, number> = {}
    for (const item of allItems.value) {
      const src = itemSource(item)
      counts[src] = (counts[src] || 0) + 1
    }
    return counts
  })

  // Time-based buckets
  const now = Date.now()
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  const startOfWeek = startOfToday - new Date().getDay() * 86400000

  const todayItems = computed(() => feedItems.value.filter((i) => itemTimestamp(i) >= startOfToday))
  const thisWeekItems = computed(() =>
    feedItems.value.filter((i) => {
      const ts = itemTimestamp(i)
      return ts >= startOfWeek && ts < startOfToday
    }),
  )
  const olderItems = computed(() => feedItems.value.filter((i) => itemTimestamp(i) < startOfWeek))

  const unreadCount = computed(() => todayItems.value.length)

  // ---------------------------------------------------------------------------
  // Browse state
  // ---------------------------------------------------------------------------

  const { browseState, filteredItems: browseFilteredItems } = useBrowse({
    items: feedItems,
    searchFields: ['title', 'description', 'type', 'category'] as any,
    sortOptions: [
      { value: 'createdAt', label: 'Newest First' },
      { value: 'priority', label: 'Priority' },
      { value: 'type', label: 'Type' },
    ],
    filters: [
      {
        id: 'type',
        label: 'Type',
        icon: 'lucide:shapes',
        options: [
          { value: 'all', label: 'All Types' },
          ...CALENDAR_ITEM_TYPES.filter((t) => t.value !== 'trip').map((t) => ({
            value: t.value,
            label: t.label,
          })),
        ],
        fn: (item: CalendarItem, val: string) => item.type === val,
      },
    ],
    defaultViewMode: 'list',
  })

  // ---------------------------------------------------------------------------
  // Dialog state
  // ---------------------------------------------------------------------------

  const viewOpen = ref(false)
  const viewingItem = ref<CalendarItem | null>(null)

  function openDetail(item: CalendarItem) {
    viewingItem.value = item
    viewOpen.value = true
  }

  async function handleUpdate(item: CalendarItem) {
    await update(item)
    viewOpen.value = false
  }

  async function handleDelete(item: CalendarItem) {
    await remove(item.id)
    viewOpen.value = false
  }

  // ---------------------------------------------------------------------------
  // Navigation within dialog
  // ---------------------------------------------------------------------------

  const filteredItems = computed(() => browseFilteredItems.value as CalendarItem[])
  const viewingIndex = computed(() =>
    viewingItem.value ? filteredItems.value.findIndex((i) => i.id === viewingItem.value?.id) : -1,
  )
  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < filteredItems.value.length - 1)
  function navPrev() {
    if (canPrev.value) viewingItem.value = filteredItems.value[viewingIndex.value - 1]!
  }
  function navNext() {
    if (canNext.value) viewingItem.value = filteredItems.value[viewingIndex.value + 1]!
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function typeIcon(type: CalendarItemType) {
    return CALENDAR_ITEM_TYPES.find((t) => t.value === type)?.icon ?? 'lucide:circle'
  }

  function typeLabel(type: CalendarItemType) {
    return CALENDAR_ITEM_TYPES.find((t) => t.value === type)?.label ?? type
  }

  function sourceIcon(item: CalendarItem) {
    const src = itemSource(item)
    return sources.find((s) => s.id === src)?.icon ?? 'lucide:circle'
  }

  function sourceLabel(item: CalendarItem) {
    const src = itemSource(item)
    return sources.find((s) => s.id === src)?.label ?? src
  }

  function sourceColor(item: CalendarItem) {
    const src = itemSource(item)
    return sources.find((s) => s.id === src)?.color ?? 'text-muted-foreground'
  }

  function relativeDate(item: CalendarItem) {
    const ts = itemTimestamp(item)
    if (!ts) return ''
    const diff = now - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }

  function formatTimestamp(item: CalendarItem) {
    const ts = itemTimestamp(item)
    if (!ts) return ''
    const d = new Date(ts)
    const h = d.getHours()
    const m = d.getMinutes()
    if (h === 0 && m === 0) {
      // Midnight = came from startDate with no real time — show short date instead
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
  }

  function formatDateLabel(item: CalendarItem) {
    const ts = itemTimestamp(item)
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const priorityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
  }

  const statusBadge = (item: CalendarItem) => {
    if (item.type === 'task') {
      const status = (item as TaskItem).taskStatus
      if (status === 'completed') return { label: 'Done', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }
      if (status === 'in-progress') return { label: 'In Progress', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
    }
    return null
  }
</script>

<template>
  <Page
    variant="feed"
    title="Feed"
    subtitle="Personal"
    description="Incoming items from integrations and connected services."
    icon="lucide:rss"
    icon-class="text-sky-300"
    :browse="browseState"
    :total-count="feedItems.length"
    :filtered-count="filteredItems.length"
    count-label="items"
    search-placeholder="Search feed..."
    :fill-height="true"
    :stats="[
      { label: 'Unread', value: unreadCount, icon: 'lucide:circle-dot', color: 'text-sky-500' },
      { label: 'Today', value: todayItems.length, icon: 'lucide:calendar', color: 'text-amber-500' },
      { label: 'This Week', value: thisWeekItems.length, icon: 'lucide:calendar-range', color: 'text-blue-500' },
      { label: 'Total', value: feedItems.length, icon: 'lucide:rss', color: 'text-muted-foreground' },
    ]">
    <!-- Source Filter Ribbon -->
    <template #sourceBar>
      <div class="flex items-center gap-1.5 py-2 overflow-x-auto">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0"
          :class="isAllSources ? 'bg-foreground text-background' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'"
          @click="clearSourceFilter">
          All
          <span class="text-[10px] opacity-70">{{ allItems.length }}</span>
        </button>
        <template v-for="source in sources" :key="source.id">
          <button
            v-if="sourceCounts[source.id]"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0"
            :class="selectedSources.has(source.id)
              ? 'bg-foreground text-background'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'"
            @click="toggleSource(source.id)">
            <Icon :name="source.icon" class="h-3.5 w-3.5" :class="selectedSources.has(source.id) ? '' : source.color" />
            {{ source.label }}
            <span class="text-[10px] opacity-70">{{ sourceCounts[source.id] }}</span>
          </button>
        </template>
        <NuxtLink
          to="/settings/integrations"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-colors shrink-0 border border-dashed border-border/50">
          <Icon name="lucide:plus" class="h-3 w-3" />
          Add Source
        </NuxtLink>
      </div>
    </template>

    <!-- Changelog Timeline -->
    <div class="relative pl-6">
      <!-- Vertical timeline line -->
      <div class="absolute left-[7px] top-0 bottom-0 w-px bg-border" />

      <!-- ─── Today ─────────────────────────────────────────────── -->
      <template v-if="todayItems.length && !browseState.hasSearch.value">
        <div class="relative flex items-center gap-3 pb-4">
          <div class="absolute left-[-24px] z-10 h-3.5 w-3.5 rounded-full bg-sky-500 ring-4 ring-background" />
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</h3>
          <span class="text-[10px] bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 rounded-full px-2 py-0.5 font-medium">
            {{ todayItems.length }}
          </span>
        </div>
        <div
          v-for="item in todayItems"
          :key="item.id"
          class="relative group cursor-pointer pb-1 mb-1"
          @click="openDetail(item)">
          <div class="absolute left-[-21px] top-[10px] z-10 h-2 w-2 rounded-full bg-border group-hover:bg-foreground transition-colors" />
          <div class="rounded-lg px-3 py-2.5 -ml-1 hover:bg-muted/40 transition-colors">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono text-muted-foreground/70 tabular-nums shrink-0">{{ formatTimestamp(item) }}</span>
              <span class="text-muted-foreground/30">·</span>
              <span :class="['inline-flex items-center gap-1 text-[11px] font-medium', sourceColor(item)]">
                <Icon :name="sourceIcon(item)" class="h-3 w-3" />
                {{ sourceLabel(item) }}
              </span>
              <span class="text-muted-foreground/30">·</span>
              <span class="text-[11px] text-muted-foreground/50">{{ relativeDate(item) }}</span>
            </div>
            <div class="flex items-start gap-2 min-w-0">
              <Icon :name="typeIcon(item.type)" class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium leading-snug truncate">{{ item.title }}</p>
                <p v-if="item.description" class="text-xs text-muted-foreground/60 truncate mt-0.5">{{ item.description }}</p>
              </div>
              <div class="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <span v-if="statusBadge(item)" :class="['text-[10px] px-1.5 py-0.5 rounded-md font-medium', statusBadge(item)!.class]">
                  {{ statusBadge(item)!.label }}
                </span>
                <span :class="['text-[10px] px-1.5 py-0.5 rounded-md font-medium', priorityColors[item.priority] || priorityColors.low]">
                  {{ item.priority }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 mt-1.5 ml-6">
              <span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground font-medium">
                {{ typeLabel(item.type) }}
              </span>
              <span v-if="item.category" class="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground font-medium">
                {{ item.category }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- ─── This Week ─────────────────────────────────────────── -->
      <template v-if="thisWeekItems.length && !browseState.hasSearch.value">
        <div class="relative flex items-center gap-3 pb-4 mt-4">
          <div class="absolute left-[-24px] z-10 h-3.5 w-3.5 rounded-full bg-blue-500 ring-4 ring-background" />
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This Week</h3>
          <span class="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full px-2 py-0.5 font-medium">
            {{ thisWeekItems.length }}
          </span>
        </div>
        <div
          v-for="item in thisWeekItems"
          :key="item.id"
          class="relative group cursor-pointer pb-1 mb-1"
          @click="openDetail(item)">
          <div class="absolute left-[-21px] top-[10px] z-10 h-2 w-2 rounded-full bg-border group-hover:bg-foreground transition-colors" />
          <div class="rounded-lg px-3 py-2.5 -ml-1 hover:bg-muted/40 transition-colors">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono text-muted-foreground/70 tabular-nums shrink-0">{{ formatDateLabel(item) }}</span>
              <span class="text-muted-foreground/30">·</span>
              <span :class="['inline-flex items-center gap-1 text-[11px] font-medium', sourceColor(item)]">
                <Icon :name="sourceIcon(item)" class="h-3 w-3" />
                {{ sourceLabel(item) }}
              </span>
              <span class="text-muted-foreground/30">·</span>
              <span class="text-[11px] text-muted-foreground/50">{{ relativeDate(item) }}</span>
            </div>
            <div class="flex items-start gap-2 min-w-0">
              <Icon :name="typeIcon(item.type)" class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium leading-snug truncate">{{ item.title }}</p>
                <p v-if="item.description" class="text-xs text-muted-foreground/60 truncate mt-0.5">{{ item.description }}</p>
              </div>
              <div class="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <span v-if="statusBadge(item)" :class="['text-[10px] px-1.5 py-0.5 rounded-md font-medium', statusBadge(item)!.class]">
                  {{ statusBadge(item)!.label }}
                </span>
                <span :class="['text-[10px] px-1.5 py-0.5 rounded-md font-medium', priorityColors[item.priority] || priorityColors.low]">
                  {{ item.priority }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 mt-1.5 ml-6">
              <span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground font-medium">
                {{ typeLabel(item.type) }}
              </span>
              <span v-if="item.category" class="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground font-medium">
                {{ item.category }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- ─── Older ─────────────────────────────────────────────── -->
      <template v-if="olderItems.length && !browseState.hasSearch.value">
        <div class="relative flex items-center gap-3 pb-4 mt-4">
          <div class="absolute left-[-24px] z-10 h-3.5 w-3.5 rounded-full bg-muted-foreground/30 ring-4 ring-background" />
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Older</h3>
        </div>
        <div
          v-for="item in olderItems"
          :key="item.id"
          class="relative group cursor-pointer pb-1 mb-1"
          @click="openDetail(item)">
          <div class="absolute left-[-21px] top-[10px] z-10 h-2 w-2 rounded-full bg-border group-hover:bg-foreground transition-colors" />
          <div class="rounded-lg px-3 py-2.5 -ml-1 hover:bg-muted/40 transition-colors">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono text-muted-foreground/70 tabular-nums shrink-0">{{ formatDateLabel(item) }}</span>
              <span class="text-muted-foreground/30">·</span>
              <span :class="['inline-flex items-center gap-1 text-[11px] font-medium', sourceColor(item)]">
                <Icon :name="sourceIcon(item)" class="h-3 w-3" />
                {{ sourceLabel(item) }}
              </span>
            </div>
            <div class="flex items-start gap-2 min-w-0">
              <Icon :name="typeIcon(item.type)" class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium leading-snug truncate">{{ item.title }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ─── Search results (flat timeline, no buckets) ────────── -->
      <template v-if="browseState.hasSearch.value">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="relative group cursor-pointer pb-1 mb-1"
          @click="openDetail(item)">
          <div class="absolute left-[-21px] top-[10px] z-10 h-2 w-2 rounded-full bg-border group-hover:bg-foreground transition-colors" />
          <div class="rounded-lg px-3 py-2.5 -ml-1 hover:bg-muted/40 transition-colors">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono text-muted-foreground/70 tabular-nums shrink-0">{{ formatTimestamp(item) }}</span>
              <span class="text-muted-foreground/30">·</span>
              <span :class="['inline-flex items-center gap-1 text-[11px] font-medium', sourceColor(item)]">
                <Icon :name="sourceIcon(item)" class="h-3 w-3" />
                {{ sourceLabel(item) }}
              </span>
              <span class="text-muted-foreground/30">·</span>
              <span class="text-[11px] text-muted-foreground/50">{{ relativeDate(item) }}</span>
            </div>
            <div class="flex items-start gap-2 min-w-0">
              <Icon :name="typeIcon(item.type)" class="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium leading-snug truncate">{{ item.title }}</p>
                <p v-if="item.description" class="text-xs text-muted-foreground/60 truncate mt-0.5">{{ item.description }}</p>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted/50 text-muted-foreground font-medium">
                  {{ typeLabel(item.type) }}
                </span>
                <span :class="['text-[10px] px-1.5 py-0.5 rounded-md font-medium', priorityColors[item.priority] || priorityColors.low]">
                  {{ item.priority }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-if="feedItems.length === 0" class="flex flex-col items-center justify-center py-20 text-center pl-4">
        <div class="rounded-full bg-muted/50 p-5 mb-5">
          <Icon name="lucide:rss" class="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h3 class="text-lg font-medium text-foreground mb-2">No items in your feed</h3>
        <p class="text-sm text-muted-foreground max-w-sm mb-6">
          Connect an integration to start receiving data, or create items from the Today page.
        </p>
        <div class="flex items-center gap-3">
          <NuxtLink to="/settings/integrations">
            <UiButton variant="outline" size="sm" class="gap-2">
              <Icon name="lucide:plug" class="h-4 w-4" />
              Connect Integration
            </UiButton>
          </NuxtLink>
          <NuxtLink to="/workspace/today">
            <UiButton variant="ghost" size="sm" class="gap-2">
              <Icon name="lucide:arrow-left" class="h-4 w-4" />
              Go to Today
            </UiButton>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- View/Edit Dialog -->
    <CalendarItemDialog
      v-model:open="viewOpen"
      mode="edit"
      :item="viewingItem ?? undefined"
      :can-navigate-prev="canPrev"
      :can-navigate-next="canNext"
      @save="handleUpdate"
      @delete="handleDelete"
      @navigate-prev="navPrev"
      @navigate-next="navNext" />
  </Page>
</template>
