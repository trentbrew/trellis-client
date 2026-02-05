<script lang="ts" setup>
  const nuxtApp = useNuxtApp()
  const router = useRouter()

  // Admin UI controls
  const { isInEditMode } = useAdminUI()

  // Dialog states
  const dashboardBuilderOpen = ref(false)
  const integrationManagerOpen = ref(false)
  const brandingManagerOpen = ref(false)
  const ontologyMarketplaceOpen = ref(false)

  // Notion-style: Instantly create blank page and navigate
  const handleCreatePage = () => {
    const id = `page-${Date.now()}`
    const path = `/pages/${id}`
    // TODO: Register route in app-config.jsonld
    ;(nuxtApp as any).$toast?.success('New page created!')
    router.push(path)
  }

  // Handle dashboard save
  const handleDashboardSave = (dashboard: any) => {
    ;(nuxtApp as any).$toast?.success(`Dashboard "${dashboard.title}" created!`)
    dashboardBuilderOpen.value = false
  }

  // Handle branding save
  const handleBrandingSave = (_config: any) => {
    ;(nuxtApp as any).$toast?.success('Brand settings saved!')
    brandingManagerOpen.value = false
  }
</script>

<template>
  <!-- Icon Rail: Edit mode dock for app configuration -->
  <nav
    v-if="isInEditMode"
    class="border-accent/20 flex w-16 flex-col items-center gap-3 border-r bg-accent text-accent-foreground px-2 py-0 pb-2"
    aria-label="Edit mode dock">
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
    <div class="flex flex-col gap-1">
      <!-- Add Page Button (Notion-style instant creation) -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            type="button"
            class="group text-accent-foreground/70 hover:bg-white/10 hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
            @click="handleCreatePage">
            <Icon name="lucide:plus" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">New Page</UiTooltipContent>
      </UiTooltip>

      <!-- Dashboard Builder Button -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            type="button"
            class="group text-accent-foreground/70 hover:bg-white/10 hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
            @click="dashboardBuilderOpen = true">
            <Icon name="lucide:layout-dashboard" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">Dashboard</UiTooltipContent>
      </UiTooltip>

      <!-- Integrations Button -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            type="button"
            class="group text-accent-foreground/70 hover:bg-white/10 hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
            @click="integrationManagerOpen = true">
            <Icon name="lucide:plug" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">Integrations</UiTooltipContent>
      </UiTooltip>

      <!-- Branding Button -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            type="button"
            class="group text-accent-foreground/70 hover:bg-white/10 hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
            @click="brandingManagerOpen = true">
            <Icon name="lucide:palette" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">Branding</UiTooltipContent>
      </UiTooltip>

      <!-- Ontology Marketplace Button -->
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <button
            type="button"
            class="group text-accent-foreground/70 hover:bg-white/10 hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
            @click="ontologyMarketplaceOpen = true">
            <Icon name="lucide:store" class="h-4 w-4" />
          </button>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">Marketplace</UiTooltipContent>
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

    </nav>
</template>
