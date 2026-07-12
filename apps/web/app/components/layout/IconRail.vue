<script lang="ts" setup>
  import type { IconRailPosition } from '~/composables/useLayoutPreferences'
  import { groupRailRoutesByZone } from '~/lib/campus-zone-routes'

  const props = withDefaults(defineProps<{ position?: IconRailPosition }>(), { position: 'left' })

  const isBottom = computed(() => props.position === 'bottom')

  const { isInEditMode } = useAdminUI()

  const routes = useRoutes()
  const { isCloud } = useAdapterStatus()
  const { user } = useInstantAuth()

  const tooltipSide = computed(() => (isBottom.value ? 'top' : 'right'))

  const { isRightSidebarOpen: _isRightSidebarOpen, toggleRightSidebar: _toggleRightSidebar } = useRightSidebarWidth()

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

  const groupedPrimaryRoutes = computed(() => groupRailRoutesByZone(otherPrimaryRoutes.value ?? []))

  const graphBadge = useRouteBadge(() => graphRoute.value?.path || '')
  const chatBadge = useRouteBadge(() => chatRoute.value?.path || '')

  function railLinkActiveClass(isActive: boolean) {
    if (!isActive) {
      return isInEditMode.value
        ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
        : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground'
    }
    if (isInEditMode.value) {
      return 'bg-accent-foreground/10 text-accent-foreground/80'
    }
    return 'rail-nav-active-zone text-foreground'
  }
  const railShellClass = computed(() => [
    'flex relative transition-all duration-300 z-50 app-region-no-drag',
    'bg-transparent',
    isBottom.value
      ? 'flex-row w-full h-12 px-4 py-0 items-center rounded-xl'
      : 'flex-col w-16 min-h-0 px-2 py-3 items-center rounded-xl self-stretch',
  ])

  const iconRowClass = computed(() =>
    isBottom.value ? 'flex flex-row items-center gap-1.5' : 'flex w-full flex-col items-center gap-1.5',
  )

  const sectionClass = (edge: 'start' | 'center' | 'end') => {
    if (isBottom.value) {
      return edge === 'center'
        ? 'flex min-w-0 flex-1 overflow-hidden justify-center'
        : 'flex shrink-0 flex-row items-center gap-1.5'
    }
    return [
      'flex w-full flex-col items-center gap-1.5',
      edge === 'center' ? 'min-h-0 flex-1 overflow-hidden justify-center' : 'shrink-0',
      edge === 'end' ? 'pb-0.5' : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  const centerScrollClass = computed(() =>
    isBottom.value
      ? 'icon-rail-scroll flex min-w-0 items-center gap-1.5 overflow-x-auto'
      : 'icon-rail-scroll flex w-full min-h-0 flex-col items-center gap-1.5 overflow-y-auto',
  )
</script>

<template>
  <nav data-slot="icon-rail" :class="railShellClass" aria-label="Navigation rail">
    <!-- Start: Local badge + account avatar (bottom-left when dock) -->
    <div :class="sectionClass('start')">
      <AdapterModeBadge :rail-position="props.position" />
      <UserAccountMenu v-if="user" placement="rail" :rail-position="props.position" />
    </div>

    <!-- Center: Chat + Graph + zone-grouped primary icons -->
    <div :class="sectionClass('center')">
      <div :class="centerScrollClass">
        <div v-if="chatRoute" :class="iconRowClass">
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <AppNavLink
                :to="chatRoute.path"
                class="group relative flex items-center justify-center rounded-full transition-all duration-200 ease-out overflow-visible"
                :class="[
                  isBottom && routes.isRouteActive(chatRoute.path) ? 'h-9 px-4 gap-2' : 'h-9 w-9',
                  railLinkActiveClass(routes.isRouteActive(chatRoute.path)),
                ]"
                :data-campus-zone="
                  routes.isRouteActive(chatRoute.path) ? 'workshop' : undefined
                ">
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
        </div>

        <div v-if="graphRoute" :class="iconRowClass">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <AppNavLink
              :to="graphRoute.path"
              class="group relative flex items-center justify-center rounded-full transition-all duration-200 ease-out overflow-visible"
              :class="[
                isBottom && routes.isRouteActive(graphRoute.path) ? 'h-9 px-4 gap-2' : 'h-9 w-9',
                railLinkActiveClass(routes.isRouteActive(graphRoute.path)),
              ]"
              :data-campus-zone="
                routes.isRouteActive(graphRoute.path) ? 'workshop' : undefined
              ">
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

      <div :class="iconRowClass">
        <template v-for="(group, groupIndex) in groupedPrimaryRoutes" :key="group.kind">
          <RailZoneSeparator v-if="groupIndex > 0" :horizontal="!isBottom" />
          <template v-for="route in group.routes" :key="route.path">
            <UiTooltip>
              <UiTooltipTrigger as-child>
                <RailNavItem
                  :route="route"
                  :zone-kind="group.kind"
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
        </template>
      </div>

      <div v-if="routes.secondaryRailRoutes.value?.length > 0" :class="[iconRowClass, isBottom ? 'px-1' : '']">
        <template v-for="route in routes.secondaryRailRoutes.value" :key="route.path">
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <NuxtLink
                :to="route.path"
                class="group flex h-9 w-9 items-center justify-center rounded-xl transition"
                :class="[
                  routes.isRouteActive(route.path)
                    ? 'bg-card text-foreground'
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
    </div>

    <!-- End: Quick create (bottom-right when dock) -->
    <div :class="sectionClass('end')">
      <ClientOnly>
        <QuickCreateButton placement="rail" :rail-position="props.position" variant="primary" />
      </ClientOnly>
    </div>
  </nav>
</template>

<style scoped>
  .icon-rail-scroll {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .icon-rail-scroll::-webkit-scrollbar {
    display: none;
  }
</style>
