<script lang="ts" setup>
  import type { IconRailPosition } from '~/composables/useLayoutPreferences'

  const props = withDefaults(defineProps<{ position?: IconRailPosition }>(), { position: 'left' })

  const isBottom = computed(() => props.position === 'bottom')

  // Admin UI controls
  const { isInEditMode } = useAdminUI()

  // Navigation routes
  const routes = useRoutes()

  const tooltipSide = computed(() => (isBottom.value ? 'top' : 'right'))

</script>

<template>
  <!-- Navigation Rail: Always visible with primary navigation routes -->
  <nav
    data-slot="icon-rail"
    :class="[
      'flex items-center relative',
      isBottom
        ? 'flex-row w-full h-12 px-2 py-0 border-t-none'
        : 'flex-col w-16 px-2 py-0 pb-2 border-r-none',
    ]"
    aria-label="Navigation rail">

    <!-- Primary Navigation Routes -->
    <div :class="['flex gap-1.5', isBottom ? 'flex-row px-1 items-center' : 'flex-col pt-3']">
      <template v-for="route in routes.primaryRailRoutes.value" :key="route.path">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <AppNavLink
              :to="route.path"
              class="group flex items-center justify-center rounded-full transition-all duration-200 ease-out overflow-hidden"
              :class="[
                isBottom && routes.isRouteActive(route.path) ? 'h-8 px-3 gap-2' : 'h-8 w-8',
                routes.isRouteActive(route.path)
                  ? isInEditMode
                    ? 'bg-accent-foreground/10 text-accent-foreground/80'
                    : 'bg-rail-foreground/10 text-foreground'
                  : isInEditMode
                    ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                    : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
              ]">
              <Icon :name="route.icon" class="h-4 w-4 opacity-50 shrink-0" />
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 max-w-0"
                enter-to-class="opacity-100 max-w-24"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 max-w-24"
                leave-to-class="opacity-0 max-w-0">
                <span
                  v-if="isBottom && routes.isRouteActive(route.path)"
                  class="text-xs font-medium whitespace-nowrap overflow-hidden">
                  {{ route.label }}
                </span>
              </Transition>
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent :side="tooltipSide" :side-offset="8" :collision-padding="isBottom ? { bottom: 60 } : 0">{{ route.label }}</UiTooltipContent>
        </UiTooltip>
      </template>
    </div>

    <!-- Secondary Navigation Routes (left of spacer in bottom mode) -->
    <!-- Uses NuxtLink directly (not AppNavLink) so paths like /settings are not org-prefixed -->
    <div
      v-if="routes.secondaryRailRoutes.value?.length > 0"
      :class="['flex gap-1', isBottom ? 'flex-row px-1' : 'flex-col pb-2']">
      <template v-for="route in routes.secondaryRailRoutes.value" :key="route.path">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <NuxtLink
              :to="route.path"
              class="group flex h-10 w-10 items-center justify-center rounded-xl transition"
              :class="[
                routes.isRouteActive(route.path)
                  ? 'bg-rail-foreground/10 text-foreground'
                  : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
              ]">
              <Icon :name="route.icon" class="h-4 w-4 opacity-50" />
            </NuxtLink>
          </UiTooltipTrigger>
          <UiTooltipContent :side="tooltipSide" :side-offset="8" :collision-padding="isBottom ? { bottom: 60 } : 0">{{ route.label }}</UiTooltipContent>
        </UiTooltip>
      </template>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Quick Capture -->
    <div :class="['flex gap-1.5', isBottom ? 'flex-row px-1 items-center' : 'flex-col pb-1 items-center']">
      <QuickCapturePopover :position="props.position" />
    </div>

  </nav>
</template>
