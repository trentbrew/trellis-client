<script setup lang="ts">
import type { IntegrationDefinition, ConnectedIntegration } from '~/composables/useIntegrations'

const props = defineProps<{
  integration: IntegrationDefinition
  connectedIntegration?: ConnectedIntegration
}>()

const emit = defineEmits<{
  save: [config: Record<string, any>]
  cancel: []
  startOAuth: []
}>()

const localConfig = ref<Record<string, any>>(props.connectedIntegration?.config || {})

watch(
  () => props.connectedIntegration?.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = { ...newConfig }
    }
  },
  { deep: true }
)

const updateField = (key: string, value: any) => {
  localConfig.value[key] = value
}

const handleSave = () => {
  emit('save', { ...localConfig.value })
}

const isOAuthFlow = computed(() => props.integration.authType === 'oauth')
</script>

<template>
  <div class="space-y-4">
    <!-- OAuth Flow -->
    <div v-if="isOAuthFlow" class="text-center py-6">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <Icon :name="integration.icon" class="w-8 h-8" />
      </div>
      <h3 class="font-medium mb-2">Connect to {{ integration.name }}</h3>
      <p class="text-sm text-muted-foreground mb-4">
        Click the button below to authorize access to your {{ integration.name }} account.
      </p>
      <UiButton @click="emit('startOAuth')">
        <Icon name="lucide:external-link" class="w-4 h-4 mr-2" />
        Connect with {{ integration.provider }}
      </UiButton>
    </div>

    <!-- Config Fields -->
    <template v-else-if="integration.configFields?.length">
      <div v-for="field in integration.configFields" :key="field.key" class="space-y-1.5">
        <label class="text-sm font-medium">
          {{ field.label }}
          <span v-if="field.required" class="text-destructive">*</span>
        </label>

        <!-- Text / Password / URL input -->
        <UiInput
          v-if="field.type === 'text' || field.type === 'password' || field.type === 'url'"
          :type="field.type === 'password' ? 'password' : 'text'"
          :model-value="localConfig[field.key] || ''"
          :placeholder="field.placeholder || field.label"
          @update:model-value="updateField(field.key, $event)" />

        <!-- Select -->
        <UiSelect
          v-else-if="field.type === 'select'"
          :model-value="localConfig[field.key] || ''"
          @update:model-value="updateField(field.key, $event)">
          <UiSelectTrigger class="w-full">
            <UiSelectValue :placeholder="`Select ${field.label}`" />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem v-for="opt in field.options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>

        <!-- Boolean -->
        <div v-else-if="field.type === 'boolean'" class="flex items-center gap-2">
          <UiSwitch :checked="localConfig[field.key] || false" @update:checked="updateField(field.key, $event)" />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-2 pt-4 border-t">
        <UiButton variant="outline" @click="emit('cancel')">Cancel</UiButton>
        <UiButton @click="handleSave">
          <Icon name="lucide:check" class="w-4 h-4 mr-2" />
          Save Configuration
        </UiButton>
      </div>
    </template>

    <!-- Webhook Setup -->
    <div v-else-if="integration.authType === 'webhook'" class="space-y-4">
      <div class="p-4 bg-muted rounded-lg">
        <div class="flex items-start gap-3">
          <Icon name="lucide:webhook" class="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 class="font-medium text-sm">Webhook URL</h4>
            <p class="text-xs text-muted-foreground mt-1">
              Copy this URL to your {{ integration.name }} settings to receive events.
            </p>
            <div class="mt-2 flex items-center gap-2">
              <code class="text-xs bg-background px-2 py-1 rounded border flex-1 truncate">
                https://your-app.com/api/webhooks/{{ integration.id }}
              </code>
              <UiButton variant="ghost" size="icon-sm">
                <Icon name="lucide:copy" class="w-4 h-4" />
              </UiButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-2 pt-4 border-t">
        <UiButton variant="outline" @click="emit('cancel')">Cancel</UiButton>
        <UiButton @click="handleSave">
          <Icon name="lucide:check" class="w-4 h-4 mr-2" />
          Complete Setup
        </UiButton>
      </div>
    </div>

    <!-- No config needed -->
    <div v-else class="text-center py-6">
      <Icon name="lucide:check-circle" class="w-12 h-12 text-green-500 mx-auto mb-3" />
      <h3 class="font-medium mb-2">Ready to Connect</h3>
      <p class="text-sm text-muted-foreground mb-4">
        This integration doesn't require additional configuration.
      </p>
      <div class="flex items-center justify-center gap-2">
        <UiButton variant="outline" @click="emit('cancel')">Cancel</UiButton>
        <UiButton @click="handleSave">Enable Integration</UiButton>
      </div>
    </div>
  </div>
</template>
