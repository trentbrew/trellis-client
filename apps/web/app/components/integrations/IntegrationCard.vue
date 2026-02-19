<script setup lang="ts">
import type { IntegrationDefinition, IntegrationConnectionStatus } from '~/types/database'

const props = defineProps<{
  integration: IntegrationDefinition
  status?: IntegrationConnectionStatus
  compact?: boolean
}>()

const emit = defineEmits<{
  configure: [integration: IntegrationDefinition]
  disconnect: [integration: IntegrationDefinition]
}>()

const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  data: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600' },
  auth: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-600' },
  communication: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600' },
  storage: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600' },
  automation: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-600' },
  analytics: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-600' },
}

const defaultColors = { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-600' }
const colors = computed(() => categoryColors[props.integration.category] ?? defaultColors)

const statusConfig: Record<IntegrationConnectionStatus, { label: string; color: string; icon: string }> = {
  connected: { label: 'Connected', color: 'text-green-500', icon: 'lucide:check-circle' },
  error: { label: 'Error', color: 'text-red-500', icon: 'lucide:alert-circle' },
  configuring: { label: 'Configuring', color: 'text-amber-500', icon: 'lucide:settings' },
  disconnected: { label: 'Disconnected', color: 'text-muted-foreground', icon: 'lucide:circle' },
}

const currentStatus = computed(() => props.status ? statusConfig[props.status] : null)
</script>

<template>
  <div
    class="group relative bg-card border rounded-lg overflow-hidden transition-all hover:shadow-md"
    :class="[colors.border, status === 'connected' ? 'ring-2 ring-green-500/20' : '']">
    <!-- Card Header -->
    <div class="p-4">
      <div class="flex items-start gap-3">
        <!-- Icon -->
        <div class="shrink-0 p-2.5 rounded-lg" :class="colors.bg">
          <Icon :name="integration.icon || 'lucide:plug'" class="w-6 h-6" :class="colors.text" />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="font-medium text-foreground">{{ integration.title }}</h3>
            <span v-if="currentStatus" class="flex items-center gap-1 text-xs" :class="currentStatus.color">
              <Icon :name="currentStatus.icon" class="w-3 h-3" />
              {{ currentStatus.label }}
            </span>
          </div>
          <p class="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {{ integration.description }}
          </p>
        </div>
      </div>

      <!-- Features (not compact) -->
      <div v-if="!compact && (integration.features?.length ?? 0) > 0" class="mt-3 flex flex-wrap gap-1.5">
        <span
          v-for="feature in (integration.features || []).slice(0, 4)"
          :key="feature"
          class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {{ feature }}
        </span>
        <span v-if="(integration.features?.length ?? 0) > 4" class="text-xs px-2 py-0.5 text-muted-foreground">
          +{{ (integration.features?.length ?? 0) - 4 }} more
        </span>
      </div>
    </div>

    <!-- Card Footer -->
    <div class="px-4 py-3 border-t bg-muted/20 flex items-center justify-between">
      <div class="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{{ integration.provider }}</span>
        <span v-if="integration.authType !== 'none'" class="flex items-center gap-1">
          <Icon name="lucide:key" class="w-3 h-3" />
          {{ integration.authType === 'oauth' ? 'OAuth' : integration.authType === 'api_key' ? 'API Key' : 'Webhook' }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <a
          v-if="integration.docsUrl"
          :href="integration.docsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Icon name="lucide:external-link" class="w-3.5 h-3.5" />
        </a>

        <UiButton
          v-if="status === 'connected'"
          variant="ghost"
          size="sm"
          class="text-destructive hover:text-destructive"
          @click="emit('disconnect', integration)">
          Disconnect
        </UiButton>
        <UiButton v-else variant="outline" size="sm" @click="emit('configure', integration)">
          {{ status === 'configuring' ? 'Continue Setup' : 'Connect' }}
        </UiButton>
      </div>
    </div>
  </div>
</template>
