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
  const handleCreatePage = async () => {
    const id = `page-${Date.now()}`
    // TODO: Register route in app-config.jsonld and persist
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
  <!-- Edit Mode Dock: App configuration tools (only visible in edit mode) -->
  <nav
    v-if="isInEditMode"
    class="border-accent/20 flex w-16 flex-col items-center gap-3 border-r bg-accent text-accent-foreground px-2 py-0 pb-2"
    aria-label="Edit mode dock">
    <!-- Edit mode indicator -->
    <div class="flex h-16 w-16 items-center justify-center shrink-0 border-b border-accent-foreground/10">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-foreground/10">
        <Icon name="lucide:pencil" class="h-4 w-4 text-accent-foreground" />
      </div>
    </div>

    <!-- Builder Tools -->
    <div class="flex flex-col gap-1">
      <!-- Add Page Button (Notion-style instant creation) -->
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

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Settings shortcut -->
    <div class="flex flex-col gap-1 pb-2">
      <UiTooltip>
        <UiTooltipTrigger as-child>
          <AppNavLink
            to="/settings"
            class="group text-accent-foreground/70 hover:bg-accent-foreground/10 hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-xl transition">
            <Icon name="lucide:settings" class="h-4 w-4" />
          </AppNavLink>
        </UiTooltipTrigger>
        <UiTooltipContent side="right">Settings</UiTooltipContent>
      </UiTooltip>
    </div>

    <!-- Dialogs -->
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
  </nav>
</template>
