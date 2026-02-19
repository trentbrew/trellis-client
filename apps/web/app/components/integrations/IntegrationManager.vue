<script setup lang="ts">
import type { IntegrationDefinition, IntegrationCategory, IntegrationConnectionStatus } from '~/types/database'

const _props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const {
  definitionsByCategory,
  getConnection,
  connectedCount,
  deleteConnection,
  categoryMeta,
  categories,
} = useIntegrations()

// UI state
const activeCategory = ref<IntegrationCategory>('data')
const configuringDef = ref<IntegrationDefinition | null>(null)

const currentCategoryIntegrations = computed(() => {
  return definitionsByCategory.value[activeCategory.value] || []
})

function getConnectionStatus(integrationId: string): IntegrationConnectionStatus | undefined {
  return getConnection(integrationId)?.connectionStatus
}

function handleConfigure(def: IntegrationDefinition) {
  if (def.authType === 'oauth') {
    const slug = def.id.replace('integration-def-', '')
    window.location.href = `/api/integrations/${slug}/auth`
    return
  }
  configuringDef.value = def
}

async function handleDisconnect(def: IntegrationDefinition) {
  const conn = getConnection(def.id.replace('integration-def-', ''))
  if (!conn) return
  try { await deleteConnection(conn.id) }
  catch (err) { console.error('[IntegrationManager] Disconnect failed:', err) }
}

function handleCancelConfig() {
  configuringDef.value = null
}

function handleStartOAuth() {
  if (!configuringDef.value) return
  const slug = configuringDef.value.id.replace('integration-def-', '')
  window.location.href = `/api/integrations/${slug}/auth`
}
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="w-[90vw]! max-w-[1400px]! h-[90vh]! flex flex-col p-0! ring-4 ring-accent">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-accent/20 bg-accent/5 shrink-0">
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
                  {{ definitionsByCategory[cat]?.length || 0 }} available
                </div>
              </div>
            </button>
          </nav>
        </div>

        <!-- Integration List / Config Form -->
        <div class="flex-1 overflow-y-auto p-6">
          <!-- Config Form -->
          <div v-if="configuringDef">
            <button
              class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
              @click="handleCancelConfig">
              <Icon name="lucide:arrow-left" class="w-4 h-4" />
              Back to integrations
            </button>

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
                v-for="def in currentCategoryIntegrations"
                :key="def.id"
                :integration="def"
                :status="getConnectionStatus(def.id.replace('integration-def-', ''))"
                @configure="handleConfigure"
                @disconnect="handleDisconnect" />
            </div>
          </div>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
