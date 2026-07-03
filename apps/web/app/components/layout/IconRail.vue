<script lang="ts" setup>
  import type { IconRailPosition } from '~/composables/useLayoutPreferences'

  const props = withDefaults(defineProps<{ position?: IconRailPosition }>(), { position: 'left' })

  const isBottom = computed(() => props.position === 'bottom')

  // Admin UI controls
  const { isInEditMode } = useAdminUI()

  // Navigation routes
  const routes = useRoutes()
  const { isCloud } = useAdapterStatus()

  const tooltipSide = computed(() => (isBottom.value ? 'top' : 'right'))

  const { isRightSidebarOpen: _isRightSidebarOpen, toggleRightSidebar: _toggleRightSidebar } = useRightSidebarWidth()

  // Split routes: Graph + Chat on the left, everything else centered
  const cloudGraphRoute = { path: '/graph', label: 'Graph', icon: 'lucide:brain' }
  const cloudChatRoute = { path: '/home', label: 'Chat', icon: 'lucide:bot' }

  const isGraphRoute = (route: { path?: string; label?: string }) => route.label?.toLowerCase() === 'graph'
  const isChatRoute = (route: { path?: string; label?: string }) =>
    route.path === '/home' || ['home', 'chat'].includes(route.label?.toLowerCase() ?? '')

  const graphRoute = computed(() => {
    const route = routes.primaryRailRoutes.value?.find(isGraphRoute)
    return route || (isCloud.value ? cloudGraphRoute : undefined)
  })

  const chatRoute = computed(() => {
    const route = routes.primaryRailRoutes.value?.find(isChatRoute)
    return route || cloudChatRoute
  })

  const otherPrimaryRoutes = computed(() =>
    routes.primaryRailRoutes.value?.filter((r) => !isGraphRoute(r) && !isChatRoute(r)),
  )

  // Reactive badges keyed by route path — SSE-driven via notification graph.
  // We compute once per icon, not per render, so consumers stay cheap.
  const graphBadge = useRouteBadge(() => graphRoute.value?.path || '')
  const chatBadge = useRouteBadge(() => chatRoute.value?.path || '')
</script>

<template>
  <!-- Navigation Rail: Always visible with primary navigation routes -->
  <nav
    data-slot="icon-rail"
    :class="[
      'flex relative transition-all duration-300',
      isBottom
        ? 'flex-row w-full h-12 px-4 py-0 border-t bg-card/60 backdrop-blur-xl z-50 items-center'
        : 'flex-col w-16 px-2 py-2 border-r-none items-stretch',
    ]"
    aria-label="Navigation rail">
    <!-- Left: Chat -->
    <div :class="['flex shrink-0 gap-1.5', isBottom ? 'items-center' : 'flex-col pt-2']">
      <template v-if="chatRoute">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <AppNavLink
              :to="chatRoute.path"
              class="group relative flex items-center justify-center rounded-full transition-all duration-200 ease-out overflow-visible"
              :class="[
                isBottom && routes.isRouteActive(chatRoute.path) ? 'h-9 px-4 gap-2' : 'h-9 w-9',
                routes.isRouteActive(chatRoute.path)
                  ? isInEditMode
                    ? 'bg-accent-foreground/10 text-accent-foreground/80'
                    : 'bg-rail-foreground/10 text-foreground'
                  : isInEditMode
                    ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                    : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
              ]">
              <Icon :name="chatRoute.icon" class="h-4.5 w-4.5 opacity-60 shrink-0" />
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 max-w-0"
                enter-to-class="opacity-100 max-w-24"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 max-w-24"
                leave-to-class="opacity-0 max-w-0">
                <span
                  v-if="isBottom && routes.isRouteActive(chatRoute.path)"
                  class="text-xs font-bold tracking-tight whitespace-nowrap overflow-hidden">
                  {{ chatRoute.label }}
                </span>
              </Transition>
              <RailBadge :badge="chatBadge" />
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent
            :side="tooltipSide"
            :side-offset="8"
            align="center"
            :align-offset="0"
            :avoid-collisions="false">
            {{ chatRoute.label }}
          </UiTooltipContent>
        </UiTooltip>
      </template>
    </div>

    <!-- Center: Graph + other primary icons (Collections, etc.) -->
    <div :class="['flex flex-1 items-center', isBottom ? 'gap-1 justify-center' : 'flex-col gap-1.5 justify-center']">
      <!-- Graph — first in center group, left of Collections -->
      <div v-if="graphRoute" :class="['flex gap-1.5', isBottom ? 'flex-row items-center' : 'flex-col']">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <AppNavLink
              :to="graphRoute.path"
              class="group relative flex items-center justify-center rounded-full transition-all duration-200 ease-out overflow-visible"
              :class="[
                isBottom && routes.isRouteActive(graphRoute.path) ? 'h-9 px-4 gap-2' : 'h-9 w-9',
                routes.isRouteActive(graphRoute.path)
                  ? isInEditMode
                    ? 'bg-accent-foreground/10 text-accent-foreground/80'
                    : 'bg-rail-foreground/10 text-foreground'
                  : isInEditMode
                    ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                    : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
              ]">
              <Icon :name="graphRoute.icon" class="h-4.5 w-4.5 opacity-60 shrink-0" />
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 max-w-0"
                enter-to-class="opacity-100 max-w-24"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 max-w-24"
                leave-to-class="opacity-0 max-w-0">
                <span
                  v-if="isBottom && routes.isRouteActive(graphRoute.path)"
                  class="text-xs font-bold tracking-tight whitespace-nowrap overflow-hidden">
                  {{ graphRoute.label }}
                </span>
              </Transition>
              <RailBadge :badge="graphBadge" />
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent
            :side="tooltipSide"
            :side-offset="8"
            align="center"
            :align-offset="0"
            :avoid-collisions="false">
            {{ graphRoute.label }}
          </UiTooltipContent>
        </UiTooltip>
      </div>

      <!-- Primary Navigation Routes (excluding Graph) -->
      <div :class="['flex gap-1.5', isBottom ? 'flex-row items-center' : 'flex-col']">
        <template v-for="route in otherPrimaryRoutes" :key="route.path">
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <RailNavItem
                :route="route"
                :is-active="routes.isRouteActive(route.path)"
                :is-bottom="isBottom"
                :is-in-edit-mode="isInEditMode" />
            </UiTooltipTrigger>
            <UiTooltipContent
              :side="tooltipSide"
              :side-offset="8"
              align="center"
              :align-offset="0"
              :avoid-collisions="false">
              {{ route.label }}
            </UiTooltipContent>
          </UiTooltip>
        </template>
      </div>

      <!-- Secondary Navigation Routes -->
      <div
        v-if="routes.secondaryRailRoutes.value?.length > 0"
        :class="['flex gap-1.5', isBottom ? 'flex-row px-1' : 'flex-col']">
        <template v-for="route in routes.secondaryRailRoutes.value" :key="route.path">
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <NuxtLink
                :to="route.path"
                class="group flex h-9 w-9 items-center justify-center rounded-xl transition"
                :class="[
                  routes.isRouteActive(route.path)
                    ? 'bg-rail-foreground/10 text-foreground'
                    : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
                ]">
                <Icon :name="route.icon" class="h-4.5 w-4.5 opacity-60" />
              </NuxtLink>
            </UiTooltipTrigger>
            <UiTooltipContent
              :side="tooltipSide"
              :side-offset="8"
              align="center"
              :align-offset="0"
              :avoid-collisions="false">
              {{ route.label }}
            </UiTooltipContent>
          </UiTooltip>
        </template>
      </div>
    </div>

    <!-- Right: Quick Capture -->
    <div :class="['flex shrink-0', isBottom ? 'items-center' : 'flex-col justify-end pb-2']">
      <QuickCapturePopover :position="props.position" />
    </div>
  </nav>
</template>
