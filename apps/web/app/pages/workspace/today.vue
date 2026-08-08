<script setup lang="ts">
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import DashboardPulse from '~/components/dashboard/DashboardPulse.vue'
  import DashboardTimeline from '~/components/dashboard/DashboardTimeline.vue'
  import DashboardInsightCard from '~/components/dashboard/DashboardInsightCard.vue'
  import DashboardNextUp from '~/components/dashboard/DashboardNextUp.vue'
  import type { Entity, EntityType, TaskItem } from '~/types/entity'
  import { createDefaultItem, ENTITY_TYPE_OPTIONS } from '~/types/entity'
  import type { DashboardInsight, TimelineDay } from '~/composables/useDashboardInsights'
  import { useDialogUrl } from '~/composables/useDialogUrl'
  import { useHashDialogRestore } from '~/composables/useHashDialogRestore'

  definePageMeta({ layout: 'default' })
  useHead({ title: 'Today | Personal' })

  // ---------------------------------------------------------------------------
  // Dashboard insights (anomaly-driven, not data-out)
  // ---------------------------------------------------------------------------

  const {
    greeting,
    greetingIcon,
    liveClock,
    liveDate,
    insights,
    hasInsights,
    pulseState,
    pulseMessage,
    timeline,
    todayIndex,
    nextUp,
    nextUpLabel,
    formatTime,
    allItems,
  } = useDashboardInsights()

  const { create, update, remove } = useEntities()

  // ---------------------------------------------------------------------------
  // Quick Capture
  // ---------------------------------------------------------------------------

  const quickTitle = ref('')
  const quickType = ref<EntityType>('task')

  async function quickCapture() {
    const title = quickTitle.value.trim()
    if (!title) return
    const item = createDefaultItem(quickType.value)
    await create({ ...item, title, type: quickType.value } as Entity)
    quickTitle.value = ''
  }

  function captureTypeIcon(type: string) {
    return ENTITY_TYPE_OPTIONS.find((t) => t.value === type)?.icon ?? 'lucide:circle'
  }

  function captureTypeLabel(type: string) {
    return ENTITY_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type
  }

  // ---------------------------------------------------------------------------
  // Dialog
  // ---------------------------------------------------------------------------

  const viewOpen = ref(false)
  const _viewingItemId = ref<string | null>(null)
  const _pendingNewItem = ref<Entity | null>(null)
  const viewingItem = computed<Entity | null>(() => {
    if (!_viewingItemId.value) return null
    return allItems.value.find((i) => i.id === _viewingItemId.value)
      ?? _pendingNewItem.value
      ?? null
  })
  const taskOwners = [{ id: 'you', name: 'You' }]

  function openDetail(itemId: string) {
    const item = allItems.value.find((i) => i.id === itemId)
    if (item) {
      _viewingItemId.value = item.id
      viewOpen.value = true
      const { setOriginHash } = useDialogUrl()
      setOriginHash(item.id)
    }
  }

  function handleToggleComplete(itemId: string) {
    const item = allItems.value.find((i) => i.id === itemId) as TaskItem | undefined
    if (!item) return
    const newStatus = item.taskStatus === 'completed' ? 'pending' : 'completed'
    void update({ ...item, taskStatus: newStatus })
  }

  async function handleNewItem() {
    const defaults = createDefaultItem('task')
    const newId = await create({ ...defaults, type: 'task', title: '' } as Entity)
    _pendingNewItem.value = { ...defaults, id: newId } as Entity
    _viewingItemId.value = newId
    viewOpen.value = true
    const { setOriginHash } = useDialogUrl()
    setOriginHash(newId)
  }

  useHashDialogRestore(allItems, (entityId, item) => {
    _viewingItemId.value = entityId
    _pendingNewItem.value = item
    viewOpen.value = true
  })

  watch(viewOpen, (open) => {
    if (!open) {
      const { clearHash } = useDialogUrl()
      clearHash()
      _viewingItemId.value = null
      _pendingNewItem.value = null
    }
  })

  async function handleUpdate(item: Entity) {
    await update(item)
    viewOpen.value = false
    const { clearHash } = useDialogUrl()
    clearHash()
  }

  async function handleDelete(item: Entity) {
    await remove(item.id)
    viewOpen.value = false
    const { clearHash } = useDialogUrl()
    clearHash()
  }

  // ---------------------------------------------------------------------------
  // Timeline interaction
  // ---------------------------------------------------------------------------

  function handleDayClick(day: TimelineDay) {
    // If the day has items, could filter nextUp or open a popover.
    // For now, this is a placeholder for deeper interaction.
    if (day.items.length === 1) {
      openDetail(day.items[0]!.id)
    }
  }

  function handleInsightItemClick(id: string) {
    openDetail(id)
  }

  function handleViewAllInsight(_insight: DashboardInsight) {
    // Future: open a filtered view of these items
  }
</script>

<template>
  <Page
    variant="default"
    :hide-header="true"
    :fill-height="true">

    <div class="pb-16 max-w-2xl mx-auto space-y-8 mt-12">

      <!-- ═══════════════════ Greeting + Clock + Quick Capture ═══════════════════ -->
      <div class="pt-8 space-y-5">
        <div class="flex items-start justify-between gap-6">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2.5">
              <Icon :name="greetingIcon" class="size-6 text-muted-foreground/60" />
              <h2 class="text-2xl font-semibold tracking-tight">{{ greeting }}</h2>
            </div>
            <div class="flex items-center gap-2 text-sm text-muted-foreground/50">
              <span class="tabular-nums font-mono tracking-wider">{{ liveClock }}</span>
              <span class="text-muted-foreground/20">&middot;</span>
              <span>{{ liveDate }}</span>
            </div>
            <DashboardWeather />
          </div>
        </div>

        <!-- Ambient pulse -->
        <DashboardPulse :state="pulseState" :message="pulseMessage" />
      </div>

      <!-- ═══════════════════ Timeline Ribbon ═══════════════════ -->
      <div class="space-y-2">
        <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40 px-1">
          Two-week view
        </p>
        <DashboardTimeline
          :days="timeline"
          :today-index="todayIndex"
          @day-click="handleDayClick" />
      </div>

      <!-- ═══════════════════ Anomaly Cards ═══════════════════ -->
      <TransitionGroup
        v-if="hasInsights"
        tag="div"
        class="space-y-3"
        enter-active-class="transition-all duration-500 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-300 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 -translate-y-1">
        <DashboardInsightCard
          v-for="insight in insights"
          :key="insight.id"
          :insight="insight"
          @item-click="handleInsightItemClick"
          @view-all="handleViewAllInsight" />
      </TransitionGroup>

      <!-- ═══════════════════ Next Up ═══════════════════ -->
      <div class="space-y-2">
        <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40 px-1">
          Next up
        </p>
        <DashboardNextUp
          :items="nextUp"
          :label="nextUpLabel"
          :format-time="formatTime"
          @item-click="openDetail"
          @toggle-complete="handleToggleComplete" />
      </div>

    </div>

    <!-- View/Edit Dialog -->
    <EntityDialog
      v-model:open="viewOpen"
      mode="edit"
      :item="viewingItem"
      :owners="taskOwners"
      @save="handleUpdate"
      @delete="handleDelete"
      @close="viewOpen = false" />

  </Page>
</template>
