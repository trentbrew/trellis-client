<script lang="ts" setup>
  // Admin UI controls
  const { isInEditMode } = useAdminUI()

  // Navigation routes
  const routes = useRoutes()

  const secondaryRoutes = computed(() => {
    return routes.secondaryRailRoutes.value || []
  })
</script>

<template>
  <!-- Navigation Rail: Always visible with primary navigation routes -->
  <nav
    class="flex w-16 flex-col items-center border-r px-2 py-0 pb-2 bg-black/15"
    aria-label="Navigation rail">
    <!-- Logo / Home -->
    <div class="flex h-16 w-16 items-center justify-center shrink-0 border-b bg-card/15">
      <AppNavLink
        to="/"
        class="flex h-9 w-9 items-center justify-center rounded-lg transition bg-transparent hover:bg-transparent"
        :class="isInEditMode ? 'bg-accent-foreground/10 hover:bg-accent-foreground/20' : 'bg-rail-foreground/10 hover:bg-rail-foreground/20'">
        <img src="https://trentbrew.pockethost.io/api/files/swvnum16u65or8w/75p6fv4xnwa3mq7/a_g_ciBq3Onk8f.svg?token=" alt="Logo" class="h-5 w-5" />
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
                    ? 'bg-accent-foreground/20 text-accent-foreground'
                    : 'bg-rail-foreground/15 text-rail-foreground'
                  : isInEditMode
                    ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                    : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
              ]">
              <Icon :name="route.icon" class="h-4 w-4" />
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent side="right">{{ route.label }}</UiTooltipContent>
        </UiTooltip>
      </template>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Secondary Navigation Routes -->
    <div v-if="secondaryRoutes.length > 0" class="flex flex-col gap-1 pb-2">
      <template v-for="route in secondaryRoutes" :key="route.path">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <AppNavLink
              :to="route.path"
              class="group flex h-10 w-10 items-center justify-center rounded-xl transition"
              :class="[
                routes.isRouteActive(route.path)
                  ? isInEditMode
                    ? 'bg-accent-foreground/10 text-accent-foreground'
                    : 'bg-rail-foreground/15 text-rail-foreground'
                  : isInEditMode
                    ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                    : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
              ]">
              <Icon :name="route.icon" class="h-4 w-4" />
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent side="right">{{ route.label }}</UiTooltipContent>
        </UiTooltip>
      </template>
    </div>
  </nav>
</template>
