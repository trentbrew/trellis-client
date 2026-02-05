<script lang="ts" setup>
  const commandDialog = useCommandDialog()
  const routes = useRoutes()
  const { user } = useInstantAuth()
  const isAuthenticated = computed(() => !!user.value)
  const sidebarCollapse = useSidebarCollapse()
  const nuxtApp = useNuxtApp()

  // Admin UI controls
  const { showBuilderUI, canCreateRoutes } = useAdminUI()

  // Create new route (stub - will open route builder in future)
  const handleCreateRoute = () => {
    // TODO: Open route creation dialog
    ;(nuxtApp as any).$toast?.info('Route builder coming soon! This will let you add new navigation items.')
  }

  const primaryRailItems = computed(() =>
    (routes.primaryRailRoutes.value || []).filter((r) => {
      if (!r?.path) return false
      if (r.requiresAuth === false) return true
      return isAuthenticated.value
    }),
  )

  const secondaryRailItems = computed(() =>
    (routes.secondaryRailRoutes.value || []).filter((r) => {
      if (!r?.path) return false
      if (r.requiresAuth === false) return true
      return isAuthenticated.value
    }),
  )
</script>

<template>
  <!-- Icon Rail: Navigation shell (matches app header) -->
  <nav
    class="border-rail-border flex w-16 flex-col items-center gap-3 border-r bg-rail text-rail-foreground px-2 py-0 pb-2"
    aria-label="Icon rail">
    <!-- Logo area -->
    <div class="flex h-16 w-16 items-center justify-center shrink-0 border-b border-white/10">
      <AppNavLink to="/" class="flex h-9 w-9 items-center justify-center text-sidebar-foreground">
        <AppLogo :size="30" />
      </AppNavLink>
    </div>

    <!-- Primary nav items -->
    <div class="flex flex-col gap-1">
      <!-- Search (collapsed only) -->
      <UiTooltip v-if="sidebarCollapse.isCollapsed.value">
        <UiTooltipTrigger as-child>
          <button
            type="button"
            class="group text-rail-foreground/70 hover:bg-white/10 hover:text-rail-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
            @click="commandDialog.open()">
            <Icon name="lucide:search" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">Search (⌘K)</UiTooltipContent>
      </UiTooltip>

      <UiTooltip v-for="item in primaryRailItems" :key="item.path">
        <UiTooltipTrigger as-child>
          <AppNavLink
            :to="item.path"
            class="group text-rail-foreground/70 hover:bg-white/10 hover:text-rail-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
            :class="{
              'bg-white/10 text-rail-foreground': routes.isRouteActive(item.path),
            }"
            :aria-label="item.label">
            <Icon :name="item.icon" class="h-4 w-4" />
          </AppNavLink>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">{{ item.label }}</UiTooltipContent>
      </UiTooltip>
    </div>

    <!-- Divider -->
    <div class="w-8 border-t border-white/10" />

    <!-- Secondary items (Settings/Admin/Help) -->
    <div class="flex flex-col gap-1">
      <UiTooltip v-for="item in secondaryRailItems" :key="item.path">
        <UiTooltipTrigger as-child>
          <AppNavLink
            :to="item.path"
            class="group text-rail-foreground/70 hover:bg-white/10 hover:text-rail-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
            :class="{
              'bg-white/10 text-rail-foreground': routes.isRouteActive(item.path),
            }"
            :aria-label="item.label">
            <Icon :name="item.icon" class="h-4 w-4" />
          </AppNavLink>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">{{ item.label }}</UiTooltipContent>
      </UiTooltip>
    </div>

    <!-- Bottom section: Sign in + Sidebar toggle -->
    <div class="mt-auto flex flex-col gap-2 py-0">
      <ClientOnly>
        <!-- Sign in button for unauthenticated users -->
        <UiTooltip v-if="!isAuthenticated">
          <UiTooltipTrigger as-child>
            <AppNavLink
              to="/auth/login"
              class="group text-rail-foreground/70 hover:bg-white/10 hover:text-rail-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
              aria-label="Sign in">
              <Icon name="lucide:log-in" class="h-5 w-5" />
            </AppNavLink>
          </UiTooltipTrigger>
          <UiTooltipContent side="right">Sign in</UiTooltipContent>
        </UiTooltip>
      </ClientOnly>

      <!-- User Avatar -->
      <div class="pb-2">
        <AppUserAvatar collapsed />
      </div>
    </div>
  </nav>
</template>
