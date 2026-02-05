<script lang="ts" setup>
  const commandDialog = useCommandDialog()
  const routes = useRoutes()
  const { user } = useInstantAuth()
  const isAuthenticated = computed(() => !!user.value)
  const sidebarCollapse = useSidebarCollapse()
  const nuxtApp = useNuxtApp()

  // Admin UI controls
  const { showBuilderUI } = useAdminUI()

  // Dashboard Builder dialog state
  const dashboardBuilderOpen = ref(false)

  // Integration Manager dialog state
  const integrationManagerOpen = ref(false)

  // Branding Manager dialog state
  const brandingManagerOpen = ref(false)

  // Ontology Marketplace dialog state
  const ontologyMarketplaceOpen = ref(false)

  // Route Builder dialog state
  const routeBuilderOpen = ref(false)

  // Open route builder
  const handleCreateRoute = () => {
    routeBuilderOpen.value = true
  }

  // Handle route save
  const handleRouteSave = (route: any) => {
    // TODO: Save route to app-config.jsonld
    ;(nuxtApp as any).$toast?.success(`Route "${route.label}" created! Refresh to see it in navigation.`)
    routeBuilderOpen.value = false
  }

  // Handle dashboard save
  const handleDashboardSave = (dashboard: any) => {
    // TODO: Save dashboard to database
    ;(nuxtApp as any).$toast?.success(`Dashboard "${dashboard.title}" created!`)
    dashboardBuilderOpen.value = false
  }

  // Handle branding save
  const handleBrandingSave = (_config: any) => {
    // TODO: Save brand config to database
    ;(nuxtApp as any).$toast?.success('Brand settings saved!')
    brandingManagerOpen.value = false
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

    <!-- Edit Mode Builder Buttons -->
    <div v-if="showBuilderUI" class="flex flex-col gap-1">
      <!-- Add Route Button -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            type="button"
            class="group text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-500 flex h-10 w-10 items-center justify-center rounded-xl transition border border-dashed border-amber-500/30"
            @click="handleCreateRoute">
            <Icon name="lucide:plus" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">
          <div class="flex items-center gap-2">
            <span>Add Route</span>
            <span class="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Edit Mode</span>
          </div>
        </UiTooltipContent>
      </UiTooltip>

      <!-- Dashboard Builder Button -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            type="button"
            class="group text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-500 flex h-10 w-10 items-center justify-center rounded-xl transition border border-dashed border-amber-500/30"
            @click="dashboardBuilderOpen = true">
            <Icon name="lucide:layout-dashboard" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">
          <div class="flex items-center gap-2">
            <span>New Dashboard</span>
            <span class="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Edit Mode</span>
          </div>
        </UiTooltipContent>
      </UiTooltip>

      <!-- Integrations Button -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            type="button"
            class="group text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-500 flex h-10 w-10 items-center justify-center rounded-xl transition border border-dashed border-amber-500/30"
            @click="integrationManagerOpen = true">
            <Icon name="lucide:plug" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">
          <div class="flex items-center gap-2">
            <span>Integrations</span>
            <span class="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Edit Mode</span>
          </div>
        </UiTooltipContent>
      </UiTooltip>

      <!-- Branding Button -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            type="button"
            class="group text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-500 flex h-10 w-10 items-center justify-center rounded-xl transition border border-dashed border-amber-500/30"
            @click="brandingManagerOpen = true">
            <Icon name="lucide:palette" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">
          <div class="flex items-center gap-2">
            <span>Branding</span>
            <span class="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Edit Mode</span>
          </div>
        </UiTooltipContent>
      </UiTooltip>

      <!-- Ontology Marketplace Button -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            type="button"
            class="group text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-500 flex h-10 w-10 items-center justify-center rounded-xl transition border border-dashed border-amber-500/30"
            @click="ontologyMarketplaceOpen = true">
            <Icon name="lucide:store" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">
          <div class="flex items-center gap-2">
            <span>Marketplace</span>
            <span class="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Edit Mode</span>
          </div>
        </UiTooltipContent>
      </UiTooltip>
    </div>

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

    <!-- Dashboard Builder Dialog -->
    <DashboardBuilder
      :open="dashboardBuilderOpen"
      @update:open="dashboardBuilderOpen = $event"
      @save="handleDashboardSave" />

    <!-- Integration Manager Dialog -->
    <IntegrationManager
      :open="integrationManagerOpen"
      @update:open="integrationManagerOpen = $event" />

    <!-- Branding Manager Dialog -->
    <BrandingManager
      :open="brandingManagerOpen"
      @update:open="brandingManagerOpen = $event"
      @save="handleBrandingSave" />

    <!-- Ontology Marketplace Dialog -->
    <OntologyMarketplace
      :open="ontologyMarketplaceOpen"
      @update:open="ontologyMarketplaceOpen = $event" />

    <!-- Route Builder Dialog -->
    <RouteBuilder
      :open="routeBuilderOpen"
      @update:open="routeBuilderOpen = $event"
      @save="handleRouteSave" />
  </nav>
</template>
