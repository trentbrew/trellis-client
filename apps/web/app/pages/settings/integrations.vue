<script setup lang="ts">
  import type {
    IntegrationDefinition,
    ConnectedIntegration,
    IntegrationCategory,
  } from '~/composables/useIntegrations'

  const { integrationsByCategory, categoryMeta, createConnectedIntegration } = useIntegrations()

  // UI state
  const activeCategory = ref<IntegrationCategory>('data')
  const configuringIntegration = ref<IntegrationDefinition | null>(null)
  const connectedIntegrations = ref<ConnectedIntegration[]>([])

  const categories: IntegrationCategory[] = ['data', 'auth', 'communication', 'storage', 'automation', 'analytics']

  const currentCategoryIntegrations = computed(() => {
    return integrationsByCategory.value[activeCategory.value] || []
  })

  const getIntegrationStatus = (integrationId: string) => {
    const connected = connectedIntegrations.value.find((c) => c.integrationId === integrationId)
    return connected?.status
  }

  const handleConfigure = (integration: IntegrationDefinition) => {
    configuringIntegration.value = integration
  }

  const handleDisconnect = (integration: IntegrationDefinition) => {
    connectedIntegrations.value = connectedIntegrations.value.filter(
      (c) => c.integrationId !== integration.id,
    )
  }

  const handleSaveConfig = (config: Record<string, any>) => {
    if (!configuringIntegration.value) return

    const existing = connectedIntegrations.value.find(
      (c) => c.integrationId === configuringIntegration.value!.id,
    )

    if (existing) {
      existing.config = config
      existing.status = 'connected'
      existing.updatedAt = Date.now()
    } else {
      const newConnection = createConnectedIntegration(configuringIntegration.value.id)
      newConnection.config = config
      newConnection.status = 'connected'
      connectedIntegrations.value.push(newConnection)
    }

    configuringIntegration.value = null
  }

  const handleCancelConfig = () => {
    configuringIntegration.value = null
  }

  const handleStartOAuth = () => {
    // TODO: Implement OAuth flow
    console.log('Starting OAuth flow for', configuringIntegration.value?.name)
  }

  const connectedCount = computed(() => {
    return connectedIntegrations.value.filter((c) => c.status === 'connected').length
  })
</script>

<template>
  <Page
    variant="settings"
    subtitle="Settings"
    title="Integrations"
    description="Connect third-party services and manage API integrations.">
    <div class="space-y-6">
      <!-- Status -->
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Connected Services</UiCardTitle>
          <UiCardDescription>{{ connectedCount }} integration(s) connected.</UiCardDescription>
        </UiCardHeader>
      </UiCard>

      <!-- Category Tabs -->
      <div class="flex gap-1 flex-wrap">
        <button
          v-for="cat in categories"
          :key="cat"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          :class="activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'"
          @click="activeCategory = cat">
          <Icon :name="categoryMeta[cat].icon" class="w-4 h-4" />
          {{ categoryMeta[cat].label }}
          <span
            class="text-xs px-1.5 py-0.5 rounded-full"
            :class="
              activeCategory === cat ? 'bg-primary-foreground/20' : 'bg-background'
            ">
            {{ integrationsByCategory[cat]?.length || 0 }}
          </span>
        </button>
      </div>

      <!-- Config Form -->
      <UiCard v-if="configuringIntegration">
        <UiCardHeader>
          <div class="flex items-center gap-3">
            <button
              class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              @click="handleCancelConfig">
              <Icon name="lucide:arrow-left" class="w-4 h-4" />
              Back
            </button>
          </div>
        </UiCardHeader>
        <UiCardContent>
          <div class="flex items-center gap-3 mb-6">
            <div class="p-3 rounded-lg bg-muted">
              <Icon :name="configuringIntegration.icon" class="w-8 h-8" />
            </div>
            <div>
              <h3 class="text-lg font-semibold">{{ configuringIntegration.name }}</h3>
              <p class="text-sm text-muted-foreground">{{ configuringIntegration.description }}</p>
            </div>
          </div>

          <IntegrationConfigForm
            :integration="configuringIntegration"
            @save="handleSaveConfig"
            @cancel="handleCancelConfig"
            @start-o-auth="handleStartOAuth" />
        </UiCardContent>
      </UiCard>

      <!-- Integration List -->
      <template v-else>
        <UiCard>
          <UiCardHeader>
            <UiCardTitle>{{ categoryMeta[activeCategory].label }}</UiCardTitle>
            <UiCardDescription>{{ categoryMeta[activeCategory].description }}</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <div v-if="currentCategoryIntegrations.length === 0" class="text-center py-12">
              <Icon name="lucide:puzzle" class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p class="text-muted-foreground">No integrations available in this category</p>
            </div>

            <div v-else class="grid gap-4">
              <IntegrationCard
                v-for="integration in currentCategoryIntegrations"
                :key="integration.id"
                :integration="integration"
                :status="getIntegrationStatus(integration.id)"
                @configure="handleConfigure"
                @disconnect="handleDisconnect" />
            </div>
          </UiCardContent>
        </UiCard>
      </template>
    </div>
  </Page>
</template>
