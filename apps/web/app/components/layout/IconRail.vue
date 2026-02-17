<script lang="ts" setup>
  // Admin UI controls
  const { isInEditMode } = useAdminUI()

  // Navigation routes
  const routes = useRoutes()
</script>

<template>
  <!-- Navigation Rail: Always visible with primary navigation routes -->
  <nav
    class="flex w-16 flex-col items-center border-r px-2 py-0 pb-2 bg-transparent"
    aria-label="Navigation rail">
    <!-- Logo / Home -->
    <div class="flex h-16 w-16 items-center justify-center shrink-0 border-b bg-transparent">
      <AppNavLink
        to="/"
        class="flex h-9 w-9 items-center justify-center rounded-lg transition bg-transparent hover:bg-transparent"
        :class="isInEditMode ? 'bg-accent-foreground/10 hover:bg-accent-foreground/20' : 'bg-rail-foreground/10 hover:bg-rail-foreground/20'">
        <AppLogo />
      </AppNavLink>
    </div>

    <!-- Primary Navigation Routes -->
    <div class="flex flex-col gap-1 pt-3">
      <template v-for="route in routes.primaryRailRoutes.value" :key="route.path">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <AppNavLink
              :to="route.path"
              class="group flex h-10 w-10 items-center justify-center rounded-xl transition"
              :class="[
                routes.isRouteActive(route.path)
                  ? isInEditMode
                    ? 'bg-accent-foreground/10 text-accent-foreground/80'
                    : 'bg-rail-foreground/10 text-foreground'
                  : isInEditMode
                    ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                    : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
              ]">
              <Icon :name="route.icon" class="h-4 w-4 opacity-50" />
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent side="right">{{ route.label }}</UiTooltipContent>
        </UiTooltip>
      </template>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Secondary Navigation Routes -->
    <div v-if="routes.secondaryRailRoutes.value?.length > 0" class="flex flex-col gap-1 pb-2">
      <template v-for="route in routes.secondaryRailRoutes.value" :key="route.path">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <AppNavLink
              :to="route.path"
              class="group flex h-10 w-10 items-center justify-center rounded-xl transition"
              :class="[
                routes.isRouteActive(route.path)
                  ? isInEditMode
                    ? 'bg-accent-foreground/10 text-accent-foreground/80'
                    : 'bg-rail-foreground/10 text-foreground'
                  : isInEditMode
                    ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                    : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
              ]">
              <Icon :name="route.icon" class="h-4 w-4 opacity-50" />
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent side="right">{{ route.label }}</UiTooltipContent>
        </UiTooltip>
      </template>
    </div>
  </nav>
</template>
