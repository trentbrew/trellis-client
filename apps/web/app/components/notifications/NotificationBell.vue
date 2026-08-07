<script setup lang="ts">
import type { IconRailPosition } from '~/composables/useLayoutPreferences'
import { useTrellisNotifications } from '~/composables/useTrellisNotifications'
import { resolveNotificationDelivery } from '~/types/notification'

const props = withDefaults(
  defineProps<{
    placement?: 'header' | 'rail'
    railPosition?: IconRailPosition
  }>(),
  { placement: 'header', railPosition: 'bottom' },
)

type ActivityTab = 'status' | 'alerts'

const { unreadCount, notifications, markAllAsRead } = useTrellisNotifications()

const sheetOpen = useState('activity-sheet:open', () => false)

const isRail = computed(() => props.placement === 'rail')

const tooltipSide = computed(() => {
  if (!isRail.value) return 'bottom'
  return props.railPosition === 'bottom' ? 'top' : 'right'
})

const bellAriaLabel = computed(() => {
  const base = 'Lobby — notifications'
  return unreadCount.value > 0
    ? `${base}, ${unreadCount.value} action required`
    : `${base}, no action required`
})

const tooltipLabel = computed(() => {
  const base = 'Lobby — notifications'
  return unreadCount.value > 0 ? `${base} (${unreadCount.value} action required)` : base
})

const activeTab = ref<ActivityTab>('status')

function selectTab(tab: ActivityTab) {
  activeTab.value = tab
}

// Default to Alerts when there are unread interrupts; otherwise Status
watch(sheetOpen, (open) => {
  if (!open) return
  const hasUnreadInterrupt = notifications.value.some(
    (n) => n.status === 'unread' && resolveNotificationDelivery(n) === 'interrupt',
  )
  activeTab.value = hasUnreadInterrupt ? 'alerts' : 'status'
})
</script>

<template>
  <UiSheet v-model:open="sheetOpen">
    <UiTooltip v-if="isRail">
      <UiTooltipTrigger as-child>
        <UiSheetTrigger as-child>
          <button type="button"
            class="rail-resident-btn relative flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-card text-rail-foreground/70 transition-all hover:bg-rail-foreground/10 hover:text-rail-foreground active:scale-95"
            :aria-label="bellAriaLabel">
            <Icon name="lucide:bell" class="h-4 w-4" />
            <span v-if="unreadCount > 0"
              class="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card"
              aria-hidden="true" />
          </button>
        </UiSheetTrigger>
      </UiTooltipTrigger>
      <UiTooltipContent :side="tooltipSide" :side-offset="8">{{ tooltipLabel }}</UiTooltipContent>
    </UiTooltip>

    <UiSheetTrigger v-else as-child>
      <UiButton variant="outline" size="icon-sm"
        class="relative mr-1 rounded-full! bg-transparent! text-muted-foreground transition-transform hover:text-foreground active:scale-95"
        :aria-label="bellAriaLabel">
        <Icon name="lucide:bell" class="h-4 w-4" />
        <span v-if="unreadCount > 0"
          class="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" aria-hidden="true" />
      </UiButton>
    </UiSheetTrigger>

    <UiSheetContent side="right" :default-width="28" :min-width="22" :max-width="40" class="sm:max-w-none"
      data-testid="activity-sheet">
      <template #header>
        <UiSheetHeader class="border-b border-border/50 px-4 py-4">
          <div class="flex items-start justify-between gap-3 pr-6">
            <div>
              <UiSheetTitle class="text-base font-semibold tracking-tight">Activity</UiSheetTitle>
              <UiSheetDescription class="mt-1 text-xs text-muted-foreground">
                Status and alerts — open entities without leaving this page.
              </UiSheetDescription>
            </div>
            <UiButton v-if="unreadCount > 0" variant="ghost" size="xs"
              class="h-7 shrink-0 px-3 text-[10px] font-semibold hover:bg-primary/10 hover:text-primary"
              @click="markAllAsRead">
              Mark all read
            </UiButton>
          </div>

          <div class="mt-3 flex gap-1" role="tablist" aria-label="Activity feed tabs">
            <button type="button" role="tab" class="rounded-full px-3 py-1 text-[11px] font-semibold transition-colors"
              :class="activeTab === 'status'
                  ? 'border border-border bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                " :aria-selected="activeTab === 'status'" data-testid="activity-sheet-tab-status"
              @click="selectTab('status')">
              Status
            </button>
            <button type="button" role="tab" class="rounded-full px-3 py-1 text-[11px] font-semibold transition-colors"
              :class="activeTab === 'alerts'
                  ? 'border border-border bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                " :aria-selected="activeTab === 'alerts'" data-testid="activity-sheet-tab-alerts"
              @click="selectTab('alerts')">
              Alerts history
            </button>
          </div>
        </UiSheetHeader>
      </template>

      <div class="px-1">
        <ActivityFeed :tab="activeTab" />
      </div>

      <template #footer>
        <UiSheetFooter class="border-t border-border/50 px-4 py-3">
          <NuxtLink to="/lobby/activity" data-testid="activity-sheet-full-page"
            class="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
            @click="sheetOpen = false">
            Open full activity page
          </NuxtLink>
        </UiSheetFooter>
      </template>
    </UiSheetContent>
  </UiSheet>
</template>
