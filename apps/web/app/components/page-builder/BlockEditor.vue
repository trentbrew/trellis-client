<script setup lang="ts">
import type { PageBlock, BlockTypeDefinition } from '~/composables/usePageBuilder'

const props = defineProps<{
  block: PageBlock
  blockType?: BlockTypeDefinition
  index: number
  isFirst: boolean
  isLast: boolean
}>()

const emit = defineEmits<{
  update: [block: PageBlock]
  delete: []
  moveUp: []
  moveDown: []
}>()

const { allBlockTypes } = usePageBuilder()

const blockTypeDef = computed(() => {
  return props.blockType || allBlockTypes.value.find((t) => t.type === props.block.type)
})

const localConfig = ref({ ...props.block.config })

watch(
  () => props.block.config,
  (newConfig) => {
    localConfig.value = { ...newConfig }
  },
  { deep: true }
)

const updateConfig = (key: string, value: any) => {
  localConfig.value[key] = value
  emit('update', { ...props.block, config: { ...localConfig.value } })
}

const categoryColors: Record<string, string> = {
  content: 'border-l-blue-500',
  data: 'border-l-purple-500',
  embed: 'border-l-orange-500',
  layout: 'border-l-green-500',
  widget: 'border-l-pink-500',
}

const borderColor = computed(() => categoryColors[props.block.category] || 'border-l-gray-500')
</script>

<template>
  <div class="group relative bg-card border rounded-lg overflow-hidden" :class="borderColor">
    <!-- Block Header -->
    <div class="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
      <Icon v-if="blockTypeDef" :name="blockTypeDef.icon" class="w-4 h-4 text-muted-foreground" />
      <span class="text-sm font-medium flex-1">{{ blockTypeDef?.label || block.type }}</span>

      <!-- Controls -->
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <UiButton variant="ghost" size="icon-xs" :disabled="isFirst" @click="emit('moveUp')">
          <Icon name="lucide:chevron-up" class="w-3.5 h-3.5" />
        </UiButton>
        <UiButton variant="ghost" size="icon-xs" :disabled="isLast" @click="emit('moveDown')">
          <Icon name="lucide:chevron-down" class="w-3.5 h-3.5" />
        </UiButton>
        <UiButton variant="ghost" size="icon-xs" class="text-destructive hover:text-destructive" @click="emit('delete')">
          <Icon name="lucide:trash-2" class="w-3.5 h-3.5" />
        </UiButton>
      </div>
    </div>

    <!-- Block Config -->
    <div class="p-3 space-y-3">
      <!-- Dynamic config fields based on configSchema -->
      <template v-if="blockTypeDef?.configSchema?.fields">
        <div v-for="field in blockTypeDef.configSchema.fields" :key="field.key" class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground">{{ field.label }}</label>

          <!-- Text input -->
          <UiInput
            v-if="field.type === 'text'"
            :model-value="localConfig[field.key] || ''"
            :placeholder="field.label"
            @update:model-value="updateConfig(field.key, $event)" />

          <!-- Number input -->
          <UiInput
            v-else-if="field.type === 'number'"
            type="number"
            :model-value="localConfig[field.key] || field.default || 0"
            @update:model-value="updateConfig(field.key, Number($event))" />

          <!-- Boolean toggle -->
          <div v-else-if="field.type === 'boolean'" class="flex items-center gap-2">
            <UiSwitch
              :checked="localConfig[field.key] || false"
              @update:checked="updateConfig(field.key, $event)" />
            <span class="text-sm">{{ localConfig[field.key] ? 'Yes' : 'No' }}</span>
          </div>

          <!-- Select -->
          <UiSelect
            v-else-if="field.type === 'select'"
            :model-value="String(localConfig[field.key] || '')"
            @update:model-value="updateConfig(field.key, $event)">
            <UiSelectTrigger class="w-full">
              <UiSelectValue :placeholder="`Select ${field.label}`" />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem v-for="opt in field.options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>

          <!-- Collection picker (placeholder) -->
          <UiInput
            v-else-if="field.type === 'collection'"
            :model-value="localConfig[field.key] || ''"
            placeholder="Collection ID"
            @update:model-value="updateConfig(field.key, $event)" />
        </div>
      </template>

      <!-- Fallback for blocks without configSchema -->
      <div v-else class="text-xs text-muted-foreground italic">
        No configuration options
      </div>
    </div>
  </div>
</template>
