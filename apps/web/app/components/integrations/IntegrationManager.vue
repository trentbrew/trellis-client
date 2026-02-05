<script setup lang="ts">
import type { IntegrationDefinition, ConnectedIntegration, IntegrationCategory } from '~/composables/useIntegrations'

const _props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

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

// Handlers
const handleConfigure = (integration: IntegrationDefinition) => {
  configuringIntegration.value = integration
}

const handleDisconnect = (integration: IntegrationDefinition) => {
  connectedIntegrations.value = connectedIntegrations.value.filter(
    (c) => c.integrationId !== integration.id
  )
}

const handleSaveConfig = (config: Record<string, any>) => {
  if (!configuringIntegration.value) return

  const existing = connectedIntegrations.value.find(
    (c) => c.integrationId === configuringIntegration.value!.id
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
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="w-[90vw]! max-w-[1400px]! h-[90vh]! flex flex-col p-0!">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div class="flex items-center gap-3">
          <Icon name="lucide:plug" class="w-5 h-5 text-primary" />
          <div>
            <h2 class="text-lg font-semibold">Integrations</h2>
            <p class="text-sm text-muted-foreground">
              {{ connectedCount }} connected · Connect third-party services
            </p>
          </div>
        </div>
        <UiButton variant="ghost" size="icon" @click="emit('update:open', false)">
          <Icon name="lucide:x" class="w-4 h-4" />
        </UiButton>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Category Sidebar -->
        <div class="w-56 border-r bg-muted/20 p-3 overflow-y-auto">
          <nav class="space-y-1">
            <button
              v-for="cat in categories"
              :key="cat"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
              :class="activeCategory === cat ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
              @click="activeCategory = cat">
              <Icon :name="categoryMeta[cat].icon" class="w-4 h-4" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium">{{ categoryMeta[cat].label }}</div>
                <div
                  class="text-xs truncate"
                  :class="activeCategory === cat ? 'text-primary-foreground/70' : 'text-muted-foreground'">
                  {{ integrationsByCategory[cat]?.length || 0 }} available
                </div>
              </div>
            </button>
          </nav>
        </div>

        <!-- Integration List / Config Form -->
        <div class="flex-1 overflow-y-auto p-6">
          <!-- Config Form (when configuring) -->
          <div v-if="configuringIntegration">
            <button
              class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
              @click="handleCancelConfig">
              <Icon name="lucide:arrow-left" class="w-4 h-4" />
              Back to integrations
            </button>

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
          </div>

          <!-- Integration List -->
          <div v-else>
            <div class="mb-4">
              <h3 class="text-lg font-semibold">{{ categoryMeta[activeCategory].label }}</h3>
              <p class="text-sm text-muted-foreground">{{ categoryMeta[activeCategory].description }}</p>
            </div>

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
          </div>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
