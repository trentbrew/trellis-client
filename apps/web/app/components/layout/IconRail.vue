<script lang="ts" setup>
  const nuxtApp = useNuxtApp()

  // Admin UI controls
  const { isInEditMode } = useAdminUI()

  // Navigation routes
  const routes = useRoutes()

  // Dialog states
  const dashboardBuilderOpen = ref(false)
  const integrationManagerOpen = ref(false)
  const brandingManagerOpen = ref(false)
  const ontologyMarketplaceOpen = ref(false)

  // Notion-style: Instantly create blank page and navigate
  const handleCreatePage = async () => {
    const id = `page-${Date.now()}`
    // TODO: Persist to app-config.jsonld
    ;(nuxtApp as any).$toast?.success('New page created!')
    await navigateTo(`/pages/${id}`)
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
  <!-- Navigation Rail: Always visible with primary navigation routes -->
  <nav
    class="flex w-16 flex-col items-center border-r px-2 py-0 pb-2 bg-sidebar/60"
    aria-label="Navigation rail">
    <!-- Logo / Home -->
    <div class="flex h-16 w-16 items-center justify-center shrink-0 border-b">
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

    <!-- Builder Tools (Edit Mode Only) -->
    <template v-if="isInEditMode">
      <div class="w-8 border-t border-accent-foreground/10 my-3" />
      <div class="flex flex-col gap-1">
        <!-- Add Page Button -->
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <button
              type="button"
              class="group text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
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
              class="group text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
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
              class="group text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
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
              class="group text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
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
              class="group text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-xl transition"
              @click="ontologyMarketplaceOpen = true">
              <Icon name="lucide:store" class="h-4 w-4" />
            </button>
          </UiTooltipTrigger>
          <UiTooltipContent side="right">Marketplace</UiTooltipContent>
        </UiTooltip>
      </div>
    </template>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Secondary Navigation Routes -->
    <div v-if="routes.secondaryRailRoutes.value.length > 0" class="flex flex-col gap-1 pb-2">
      <template v-for="route in routes.secondaryRailRoutes.value" :key="route.path">
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

    <!-- Settings shortcut -->
    <div class="flex flex-col gap-1 pb-2">
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <AppNavLink
            to="/settings"
            class="group flex h-10 w-10 items-center justify-center rounded-xl transition"
            :class="[
              routes.isRouteActive('/settings')
                ? isInEditMode
                  ? 'bg-accent-foreground/20 text-accent-foreground'
                  : 'bg-rail-foreground/15 text-rail-foreground'
                : isInEditMode
                  ? 'text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground'
                  : 'text-rail-foreground/70 hover:bg-rail-foreground/10 hover:text-rail-foreground',
            ]">
            <Icon name="lucide:settings" class="h-4 w-4" />
          </AppNavLink>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">Settings</UiTooltipContent>
      </UiTooltip>
    </div>

    <!-- Dialogs (only rendered when in edit mode to avoid unnecessary DOM) -->
    <template v-if="isInEditMode">
      <DashboardBuilder
        :open="dashboardBuilderOpen"
        @update:open="dashboardBuilderOpen = $event"
        @save="handleDashboardSave" />

      <IntegrationManager
        :open="integrationManagerOpen"
        @update:open="integrationManagerOpen = $event" />

      <BrandingManager
        :open="brandingManagerOpen"
        @update:open="brandingManagerOpen = $event"
        @save="handleBrandingSave" />

      <OntologyMarketplace
        :open="ontologyMarketplaceOpen"
        @update:open="ontologyMarketplaceOpen = $event" />
    </template>
  </nav>
</template>
