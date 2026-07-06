<script setup lang="ts">
  import type { IconRailPosition } from '~/composables/useLayoutPreferences'
  import { useTrellisNotifications } from '~/composables/useTrellisNotifications'

  const props = withDefaults(
    defineProps<{
      placement?: 'header' | 'rail'
      railPosition?: IconRailPosition
    }>(),
    { placement: 'header', railPosition: 'bottom' },
  )

  const { unreadCount } = useTrellisNotifications()

  const isRail = computed(() => props.placement === 'rail')

  const menuSide = computed(() => {
    if (!isRail.value) return 'bottom'
    return props.railPosition === 'bottom' ? 'top' : 'right'
  })

  const tooltipSide = computed(() => {
    if (!isRail.value) return 'bottom'
    return props.railPosition === 'bottom' ? 'top' : 'right'
  })

  const bellAriaLabel = computed(() => {
    const base = 'Lobby notifications'
    return unreadCount.value > 0
      ? `${base}, ${unreadCount.value} action required`
      : `${base}, no action required`
  })

  const tooltipLabel = computed(() => {
    const base = 'Lobby — notifications'
    return unreadCount.value > 0 ? `${base} (${unreadCount.value} action required)` : base
  })
</script>

<template>
  <UiDropdownMenu>
    <UiTooltip v-if="isRail">
      <UiTooltipTrigger as-child>
        <UiDropdownMenuTrigger as-child>
          <button
            type="button"
            class="rail-resident-btn relative flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-card text-rail-foreground/70 transition-all hover:bg-rail-foreground/10 hover:text-rail-foreground active:scale-95"
            :aria-label="bellAriaLabel">
            <Icon name="lucide:bell" class="h-4 w-4" />
            <span
              v-if="unreadCount > 0"
              class="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card"
              aria-hidden="true" />
          </button>
        </UiDropdownMenuTrigger>
      </UiTooltipTrigger>
      <UiTooltipContent :side="tooltipSide" :side-offset="8">{{ tooltipLabel }}</UiTooltipContent>
    </UiTooltip>

    <UiDropdownMenuTrigger v-else as-child>
      <UiButton
        variant="outline"
        size="icon-sm"
        class="relative mr-1 rounded-full! bg-transparent! text-muted-foreground transition-transform hover:text-foreground active:scale-95"
        :aria-label="bellAriaLabel">
        <Icon name="lucide:bell" class="h-4 w-4" />
        <span
          v-if="unreadCount > 0"
          class="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card"
          aria-hidden="true" />
      </UiButton>
    </UiDropdownMenuTrigger>

    <UiDropdownMenuContent
      :side="menuSide"
      :side-offset="8"
      align="end"
      :collision-padding="12"
      class="flex w-[420px] max-h-[min(70dvh,520px)] flex-col overflow-hidden border-border/50 p-0 shadow-2xl">
      <AlarmPanel />
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
