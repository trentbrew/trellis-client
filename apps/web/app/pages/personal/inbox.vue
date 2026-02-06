<script setup lang="ts">
  import CalendarItemDialog from '~/components/dialogs/CalendarItemDialog.vue'
  import type { CalendarItem, CalendarItemType, TaskItem } from '~/types/calendarItem'
  import { createDefaultItem, CALENDAR_ITEM_TYPES } from '~/types/calendarItem'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Inbox | Personal' })

  // ---------------------------------------------------------------------------
  // Live data from instant-local
  // ---------------------------------------------------------------------------

  const { items: allItems, create, update, remove } = useCalendarItems()

  // Inbox shows unsorted / recently created items (no folder, created in last 30 days)
  const inboxItems = computed(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return allItems.value
      .filter((i) => !i.folder && (i.createdAt ?? 0) > cutoff)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  })

  const pendingItems = computed(() => inboxItems.value.filter((i) => {
    if (i.type === 'task') return (i as TaskItem).taskStatus !== 'completed'
    return true
  }))

  const completedItems = computed(() => inboxItems.value.filter((i) => {
    if (i.type === 'task') return (i as TaskItem).taskStatus === 'completed'
    return false
  }))

  // ---------------------------------------------------------------------------
  // Quick capture
  // ---------------------------------------------------------------------------

  const quickTitle = ref('')
  const quickType = ref<CalendarItemType>('task')

  async function quickCapture() {
    const title = quickTitle.value.trim()
    if (!title) return

    const item = createDefaultItem(quickType.value)
    await create({ ...item, title, type: quickType.value })
    quickTitle.value = ''
  }

  // ---------------------------------------------------------------------------
  // Dialog state
  // ---------------------------------------------------------------------------

  const createOpen = ref(false)
  const viewOpen = ref(false)
  const viewingItem = ref<CalendarItem | null>(null)
  const createType = ref<CalendarItemType>('task')

  function openDetail(item: CalendarItem) {
    viewingItem.value = item
    viewOpen.value = true
  }

  function openCreate(type: CalendarItemType = 'task') {
    createType.value = type
    createOpen.value = true
  }

  async function handleCreate(item: CalendarItem) {
    await create(item)
    createOpen.value = false
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

  const viewingIndex = computed(() =>
    viewingItem.value ? pendingItems.value.findIndex((i) => i.id === viewingItem.value?.id) : -1,
  )
  const canPrev = computed(() => viewingIndex.value > 0)
  const canNext = computed(() => viewingIndex.value < pendingItems.value.length - 1)
  function navPrev() { if (canPrev.value) viewingItem.value = pendingItems.value[viewingIndex.value - 1]! }
  function navNext() { if (canNext.value) viewingItem.value = pendingItems.value[viewingIndex.value + 1]! }

  // ---------------------------------------------------------------------------
  // Type icon helper
  // ---------------------------------------------------------------------------

  function typeIcon(type: CalendarItemType) {
    return CALENDAR_ITEM_TYPES.find((t) => t.value === type)?.icon ?? 'lucide:circle'
  }

  function typeLabel(type: CalendarItemType) {
    return CALENDAR_ITEM_TYPES.find((t) => t.value === type)?.label ?? type
  }

  // ---------------------------------------------------------------------------
  // Relative date helper
  // ---------------------------------------------------------------------------

  function relativeDate(ts?: number) {
    if (!ts) return ''
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }
</script>

<template>
  <Page
    variant="default"
    title="Inbox"
    subtitle="Personal"
    description="Quick capture and triage — items land here before being organized."
    header-icon="lucide:inbox"
    :stats="[
      { label: 'Pending', value: pendingItems.length, icon: 'lucide:circle-dot' },
      { label: 'Captured', value: inboxItems.length, icon: 'lucide:inbox' },
      { label: 'Completed', value: completedItems.length, icon: 'lucide:check-circle' },
    ]">
    <div class="p-8 pt-6 max-w-3xl mx-auto space-y-8">
      <!-- Quick Capture Bar -->
      <div class="flex items-center gap-3">
        <div class="relative flex-1">
          <Icon name="lucide:plus" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            v-model="quickTitle"
            type="text"
            placeholder="Capture something quickly..."
            class="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            @keydown.enter="quickCapture"
            @keydown.meta.enter="quickCapture" />
        </div>
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="outline" size="sm" class="gap-2 shrink-0">
              <Icon :name="typeIcon(quickType)" class="h-4 w-4" />
              <span class="text-xs">{{ typeLabel(quickType) }}</span>
              <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-50" />
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end">
            <UiDropdownMenuItem
              v-for="t in CALENDAR_ITEM_TYPES.filter((t) => t.value !== 'trip')"
              :key="t.value"
              @click="quickType = t.value">
              <Icon :name="t.icon" class="h-4 w-4 mr-2" />
              {{ t.label }}
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>
        <UiButton size="sm" class="gap-2 shrink-0" @click="openCreate()">
          <Icon name="lucide:plus" class="h-4 w-4" />
          <span>New</span>
        </UiButton>
      </div>

      <!-- Pending Items -->
      <div v-if="pendingItems.length > 0">
        <div class="flex items-center gap-2 mb-3">
          <Icon name="lucide:circle-dot" class="h-4 w-4 text-muted-foreground" />
          <h3 class="text-sm font-medium text-muted-foreground">Pending</h3>
          <span class="text-xs text-muted-foreground/60">{{ pendingItems.length }}</span>
        </div>
        <div class="space-y-1">
          <div
            v-for="item in pendingItems"
            :key="item.id"
            class="group flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
            @click="openDetail(item)">
            <Icon :name="typeIcon(item.type)" class="h-4 w-4 shrink-0 opacity-50" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ item.title }}</p>
              <p v-if="item.description" class="text-xs text-muted-foreground truncate mt-0.5">
                {{ item.description }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-[10px] text-muted-foreground/60">{{ relativeDate(item.createdAt) }}</span>
              <span
                class="text-[10px] px-1.5 py-0.5 rounded-full"
                :class="
                  item.priority === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : item.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : item.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400'
                ">
                {{ item.priority }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Completed Items -->
      <div v-if="completedItems.length > 0">
        <div class="flex items-center gap-2 mb-3">
          <Icon name="lucide:check-circle" class="h-4 w-4 text-emerald-500" />
          <h3 class="text-sm font-medium text-muted-foreground">Completed</h3>
        </div>
        <div class="space-y-1">
          <div
            v-for="item in completedItems"
            :key="item.id"
            class="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors opacity-60"
            @click="openDetail(item)">
            <Icon name="lucide:check-circle" class="h-4 w-4 shrink-0 text-emerald-500" />
            <p class="text-sm line-through truncate">{{ item.title }}</p>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="inboxItems.length === 0" class="text-center py-16">
        <Icon name="lucide:inbox" class="h-10 w-10 mx-auto text-muted-foreground/30 mb-4" />
        <h3 class="text-sm font-medium text-muted-foreground mb-1">Inbox zero</h3>
        <p class="text-xs text-muted-foreground/60">Use the capture bar above to quickly add items.</p>
      </div>
    </div>

    <!-- Create Dialog -->
    <CalendarItemDialog
      v-model:open="createOpen"
      mode="create"
      :initial-type="createType"
      @create="handleCreate" />

    <!-- View/Edit Dialog -->
    <CalendarItemDialog
      v-model:open="viewOpen"
      mode="edit"
      :item="viewingItem ?? undefined"
      :can-navigate-prev="canPrev"
      :can-navigate-next="canNext"
      @update="handleUpdate"
      @delete="handleDelete"
      @navigate-prev="navPrev"
      @navigate-next="navNext" />
  </Page>
</template>
