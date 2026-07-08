<script setup lang="ts">
  import type { IntegrationDefinition, IntegrationCategory, IntegrationConnectionStatus } from '~/types/database'
  import { startIntegrationOAuth } from '~/lib/integration-oauth'

  definePageMeta({
    layout: 'default',
  })

  const route = useRoute()
  const router = useRouter()
  const { user } = useInstantAuth()
  const { $toast } = useNuxtApp()

  const {
    definitionsByCategory,
    getConnection,
    getConnections,
    connectedCount,
    deleteConnection,
    categoryMeta,
    categories,
    loading,
  } = useIntegrations()

  const { disconnect: disconnectGmail } = useGmail()

  const activeCategory = ref<IntegrationCategory>('communication')
  const configuringDef = ref<IntegrationDefinition | null>(null)

  const currentCategoryIntegrations = computed(() => definitionsByCategory.value[activeCategory.value] || [])

  function integrationSlug(def: IntegrationDefinition): string {
    return def.id.replace('integration-def-', '')
  }

  function getConnectionStatus(integrationId: string): IntegrationConnectionStatus | undefined {
    const slug = integrationId.replace('integration-def-', '')
    return getConnections(slug).find((c) => c.connectionStatus === 'connected')?.connectionStatus
  }

  function startOAuth(slug: string) {
    startIntegrationOAuth(slug, {
      userId: user.value?.id,
      returnTo: route.fullPath,
    })
  }

  function handleConfigure(def: IntegrationDefinition) {
    if (def.authType === 'oauth') {
      startOAuth(integrationSlug(def))
      return
    }
    configuringDef.value = def
  }

  async function handleDisconnect(def: IntegrationDefinition) {
    const slug = integrationSlug(def)
    const conn = getConnection(slug)
    if (!conn) return

    // Prefer integration-specific revoke routes when available
    if (slug === 'gmail') {
      try {
        await disconnectGmail(conn.id)
      } catch (err) {
        console.error('[settings/integrations] Gmail disconnect failed:', err)
      }
      return
    }

    try {
      await deleteConnection(conn.id)
    } catch (err) {
      console.error('[settings/integrations] Disconnect failed:', err)
    }
  }

  function handleOAuthToast() {
    const connected = route.query.connected
    const error = route.query.error
    if (typeof connected === 'string' && connected) {
      $toast?.success(`${connected.charAt(0).toUpperCase()}${connected.slice(1)} connected`)
    } else if (typeof error === 'string' && error) {
      $toast?.error(`Connection failed: ${error.replace(/_/g, ' ')}`)
    }
    if (connected || error) {
      const { connected: _c, error: _e, ...rest } = route.query
      router.replace({ path: route.path, query: rest })
    }
  }

  onMounted(handleOAuthToast)
  watch(() => route.query.connected, handleOAuthToast)
</script>

<template>
  <Page
    variant="settings"
    subtitle="Settings"
    title="Integrations"
    description="Connect third-party services to sync data into your graph.">
    <div v-if="loading" class="flex items-center justify-center py-16 text-muted-foreground">
      <Icon name="lucide:loader-2" class="w-5 h-5 animate-spin mr-2" />
      Loading integrations…
    </div>

    <div v-else class="flex gap-6 min-h-[480px]">
      <!-- Category sidebar -->
      <nav class="w-52 shrink-0 space-y-1">
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors"
          :class="activeCategory === cat ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
          @click="activeCategory = cat">
          <Icon :name="categoryMeta[cat].icon" class="w-4 h-4 shrink-0" />
          <span class="font-medium">{{ categoryMeta[cat].label }}</span>
        </button>
      </nav>

      <!-- Integration grid -->
      <div class="flex-1 min-w-0">
        <div class="mb-4 flex items-baseline justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold">{{ categoryMeta[activeCategory].label }}</h2>
            <p class="text-sm text-muted-foreground">{{ categoryMeta[activeCategory].description }}</p>
          </div>
          <p class="text-xs text-muted-foreground shrink-0">{{ connectedCount }} connected</p>
        </div>

        <div v-if="currentCategoryIntegrations.length === 0" class="text-center py-12 text-muted-foreground">
          <Icon name="lucide:puzzle" class="w-10 h-10 mx-auto mb-3 opacity-50" />
          No integrations in this category
        </div>

        <div v-else class="grid gap-4 sm:grid-cols-2">
          <IntegrationCard
            v-for="def in currentCategoryIntegrations"
            :key="def.id"
            :integration="def"
            :status="getConnectionStatus(def.id)"
            @configure="handleConfigure"
            @disconnect="handleDisconnect" />
        </div>
      </div>
    </div>
  </Page>
</template>
