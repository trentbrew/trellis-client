<script lang="ts" setup>
  import type { IconRailPosition } from '~/composables/useLayoutPreferences'

  const props = withDefaults(defineProps<{ position?: IconRailPosition }>(), { position: 'left' })

  const isBottom = computed(() => props.position === 'bottom')

  // Admin UI controls
  const { isInEditMode } = useAdminUI()

  // Navigation routes
  const routes = useRoutes()

  const tooltipSide = computed(() => (isBottom.value ? 'top' : 'right'))

  const { isRightSidebarOpen, toggleRightSidebar } = useRightSidebarWidth()
</script>

<template>
  <!-- Navigation Rail: Always visible with primary navigation routes -->
  <nav
    data-slot="icon-rail"
    :class="[
      'flex items-center relative transition-all duration-300',
      isBottom
        ? 'flex-row w-full h-12 px-6 py-0 border-t bg-card/60 backdrop-blur-xl z-50'
        : 'flex-col w-16 px-2 py-0 pb-2 border-r-none',
    ]"
    aria-label="Navigation rail">
    <!-- Navigation Items (Centered in bottom mode) -->
    <div :class="['flex items-center', isBottom ? 'gap-0' : 'flex-col gap-1.5 pt-3']">
      <!-- Primary Navigation Routes -->
      <div :class="['flex gap-1.5', isBottom ? 'flex-row items-center' : 'flex-col']">
        <template v-for="route in routes.primaryRailRoutes.value" :key="route.path">
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <AppNavLink
                :to="route.path"
                class="group flex items-center justify-center rounded-full transition-all duration-200 ease-out overflow-hidden"
                :class="[
                  isBottom && routes.isRouteActive(route.path) ? 'h-9 px-4 gap-2' : 'h-9 w-9',
                  routes.isRouteActive(route.path)
                    ? isInEditMode
                      ? 'bg-accent-foreground/10 text-accent-foreground/80'
                      : 'bg-rail-foreground/10 text-foreground'
                    : isInEditMode
                      ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                      : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
                ]">
                <Icon :name="route.icon" class="h-4.5 w-4.5 opacity-60 shrink-0" />
                <Transition
                  enter-active-class="transition-all duration-200 ease-out"
                  enter-from-class="opacity-0 max-w-0"
                  enter-to-class="opacity-100 max-w-24"
                  leave-active-class="transition-all duration-150 ease-in"
                  leave-from-class="opacity-100 max-w-24"
                  leave-to-class="opacity-0 max-w-0">
                  <span
                    v-if="isBottom && routes.isRouteActive(route.path)"
                    class="text-xs font-bold tracking-tight whitespace-nowrap overflow-hidden">
                    {{ route.label }}
                  </span>
                </Transition>
              </AppNavLink>
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
        :class="['flex gap-1.5', isBottom ? 'flex-row px-1' : 'flex-col pb-2']">
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

    <!-- Right side group: Actions (Bottom mode) or Quick Capture (Vertical mode) -->
    <div :class="['flex items-center', isBottom ? 'flex-1 justify-end gap-3' : 'flex-col pb-1 mt-auto']">
      <QuickCapturePopover :position="props.position" />

      <!-- AI Assistant Toggle (Bottom Right next to Quick Capture) -->
      <UiTooltip v-if="isBottom">
        <UiTooltipTrigger as-child>
          <UiButton
            variant="default"
            size="icon-sm"
            class="h-8 w-8 shrink-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all active:scale-95"
            :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-background': isRightSidebarOpen }"
            @click="toggleRightSidebar">
            <Icon name="lucide:bot" class="h-5 w-5" />
          </UiButton>
        </UiTooltipTrigger>
        <UiTooltipContent side="top" :side-offset="12" align="center">AI Assistant</UiTooltipContent>
      </UiTooltip>
    </div>
  </nav>
</template>
