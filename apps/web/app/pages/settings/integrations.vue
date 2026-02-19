<script setup lang="ts">
  import type { IntegrationDefinition, IntegrationCategory, IntegrationConnectionStatus } from '~/types/database'

  const {
    definitions,
    definitionsByCategory,
    getConnection,
    connectedCount,
    deleteConnection,
    categoryMeta,
    categories,
    loading,
  } = useIntegrations()
  const { user } = useInstantAuth()

  // UI state
  type ViewMode = 'all' | 'installed'
  const viewMode = ref<ViewMode>('all')
  const activeCategory = ref<IntegrationCategory>('data')
  const configuringDef = ref<IntegrationDefinition | null>(null)
  const requestText = ref('')
  const requestSubmitted = ref(false)

  const installedDefinitions = computed(() => {
    return definitions.value.filter((def) => {
      const slug = def.id.replace('integration-def-', '')
      const conn = getConnection(slug)
      return conn?.connectionStatus === 'connected'
    })
  })

  const currentCategoryIntegrations = computed(() => {
    const pool = viewMode.value === 'installed'
      ? installedDefinitions.value
      : (definitionsByCategory.value[activeCategory.value] || [])
    return pool
  })

  function getConnectionStatus(integrationId: string): IntegrationConnectionStatus | undefined {
    return getConnection(integrationId)?.connectionStatus
  }

  function buildAuthUrl(slug: string): string {
    const url = `/api/integrations/${slug}/auth`
    const userId = user.value?.id
    return userId ? `${url}?userId=${encodeURIComponent(userId)}` : url
  }

  function handleConfigure(def: IntegrationDefinition) {
    if (def.authType === 'oauth') {
      const slug = def.id.replace('integration-def-', '')
      window.location.href = buildAuthUrl(slug)
      return
    }
    configuringDef.value = def
  }

  async function handleDisconnect(def: IntegrationDefinition) {
    const conn = getConnection(def.id.replace('integration-def-', ''))
    if (!conn) return
    try {
      await deleteConnection(conn.id)
    } catch (err) {
      console.error('[integrations] Failed to disconnect:', err)
    }
  }

  function handleCancelConfig() {
    configuringDef.value = null
  }

  function handleStartOAuth() {
    if (!configuringDef.value) return
    const slug = configuringDef.value.id.replace('integration-def-', '')
    window.location.href = buildAuthUrl(slug)
  }

  function handleRequestSubmit() {
    if (!requestText.value.trim()) return
    // TODO: Persist integration requests as entities when ontology exists
    console.log('[integrations] Integration request:', requestText.value)
    requestSubmitted.value = true
    setTimeout(() => {
      requestText.value = ''
      requestSubmitted.value = false
    }, 3000)
  }
</script>

<template>
  <Page
    variant="settings"
    subtitle="Settings"
    title="Integrations"
    description="Connect third-party services and manage API integrations.">
    <div class="space-y-6">
      <!-- Status + View Mode Toggle -->
      <UiCard>
        <UiCardHeader>
          <div class="flex items-center justify-between">
            <div>
              <UiCardTitle>Connected Services</UiCardTitle>
              <UiCardDescription>
                <template v-if="loading">Loading integrations…</template>
                <template v-else>{{ connectedCount }} integration(s) connected · {{ definitions.length }} available</template>
              </UiCardDescription>
            </div>
            <div class="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <button
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                :class="viewMode === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                @click="viewMode = 'all'">
                All
                <span class="ml-1 text-muted-foreground">{{ definitions.length }}</span>
              </button>
              <button
                class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                :class="viewMode === 'installed' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                @click="viewMode = 'installed'">
                Installed
                <span class="ml-1" :class="connectedCount > 0 ? 'text-green-500' : 'text-muted-foreground'">{{ connectedCount }}</span>
              </button>
            </div>
          </div>
        </UiCardHeader>
      </UiCard>

      <!-- Category Tabs (only in All mode) -->
      <div v-if="viewMode === 'all'" class="flex gap-1 flex-wrap">
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
            :class="activeCategory === cat ? 'bg-primary-foreground/20' : 'bg-background'">
            {{ definitionsByCategory[cat]?.length || 0 }}
          </span>
        </button>
      </div>

      <!-- Config Form (for non-OAuth integrations) -->
      <UiCard v-if="configuringDef">
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
              <Icon :name="configuringDef.icon || 'lucide:plug'" class="w-8 h-8" />
            </div>
            <div>
              <h3 class="text-lg font-semibold">{{ configuringDef.title }}</h3>
              <p class="text-sm text-muted-foreground">{{ configuringDef.description }}</p>
            </div>
          </div>

          <IntegrationConfigForm
            :integration="configuringDef"
            @cancel="handleCancelConfig"
            @start-o-auth="handleStartOAuth" />
        </UiCardContent>
      </UiCard>

      <!-- Integration List -->
      <template v-else>
        <UiCard>
          <UiCardHeader v-if="viewMode === 'all'">
            <UiCardTitle>{{ categoryMeta[activeCategory].label }}</UiCardTitle>
            <UiCardDescription>{{ categoryMeta[activeCategory].description }}</UiCardDescription>
          </UiCardHeader>
          <UiCardHeader v-else>
            <UiCardTitle>Installed Integrations</UiCardTitle>
            <UiCardDescription>Integrations you've connected to your workspace</UiCardDescription>
          </UiCardHeader>
          <UiCardContent>
            <!-- Loading -->
            <div v-if="loading" class="space-y-3 py-4">
              <div v-for="i in 3" :key="i" class="h-20 rounded-lg bg-muted/40 animate-pulse" />
            </div>

            <!-- Empty: Installed view -->
            <div v-else-if="viewMode === 'installed' && currentCategoryIntegrations.length === 0" class="text-center py-12">
              <Icon name="lucide:plug-zap" class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p class="text-foreground font-medium mb-1">No integrations installed</p>
              <p class="text-sm text-muted-foreground mb-4">Connect your first integration to get started</p>
              <UiButton variant="outline" size="sm" @click="viewMode = 'all'">
                <Icon name="lucide:search" class="w-3.5 h-3.5 mr-1.5" />
                Browse integrations
              </UiButton>
            </div>

            <!-- Empty: All view -->
            <div v-else-if="currentCategoryIntegrations.length === 0" class="text-center py-12">
              <Icon name="lucide:puzzle" class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p class="text-muted-foreground">No integrations available in this category</p>
            </div>

            <!-- Grid -->
            <div v-else class="grid gap-4">
              <IntegrationCard
                v-for="def in currentCategoryIntegrations"
                :key="def.id"
                :integration="def"
                :status="getConnectionStatus(def.id.replace('integration-def-', ''))"
                @configure="handleConfigure"
                @disconnect="handleDisconnect" />
            </div>
          </UiCardContent>
        </UiCard>
      </template>

      <!-- Request Integration -->
      <UiCard class="border-dashed">
        <UiCardContent class="py-5">
          <div class="flex items-start gap-4">
            <div class="shrink-0 p-2.5 rounded-lg bg-muted">
              <Icon name="lucide:message-square-plus" class="w-5 h-5 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-foreground mb-1">Request an Integration</h3>
              <p class="text-xs text-muted-foreground mb-3">
                Don't see what you need? Let us know which service you'd like to connect.
              </p>
              <div v-if="requestSubmitted" class="flex items-center gap-2 text-sm text-green-500">
                <Icon name="lucide:check-circle" class="w-4 h-4" />
                <span>Thanks! We'll review your request.</span>
              </div>
              <div v-else class="flex items-center gap-2">
                <input
                  v-model="requestText"
                  type="text"
                  placeholder="e.g. Gmail, Linear, Figma…"
                  class="flex-1 h-8 px-3 text-sm bg-muted border border-border rounded-md placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                  @keydown.enter="handleRequestSubmit" />
                <UiButton
                  size="sm"
                  variant="outline"
                  class="h-8 shrink-0"
                  :disabled="!requestText.trim()"
                  @click="handleRequestSubmit">
                  Submit
                </UiButton>
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
