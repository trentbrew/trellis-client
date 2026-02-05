<script setup lang="ts">
import type { DashboardWidget, WidgetTypeDefinition, WidgetSize } from '~/composables/useDashboardBuilder'

const props = defineProps<{
  widget: DashboardWidget
  widgetType?: WidgetTypeDefinition
}>()

const emit = defineEmits<{
  update: [widget: DashboardWidget]
  delete: []
}>()

const { allWidgetTypes } = useDashboardBuilder()

const widgetTypeDef = computed(() => {
  return props.widgetType || allWidgetTypes.value.find((t) => t.type === props.widget.type)
})

const localConfig = ref({ ...props.widget.config })
const localTitle = ref(props.widget.title)
const localSize = ref<WidgetSize>(props.widget.size)

watch(
  () => props.widget,
  (newWidget) => {
    localConfig.value = { ...newWidget.config }
    localTitle.value = newWidget.title
    localSize.value = newWidget.size
  },
  { deep: true }
)

const updateConfig = (key: string, value: any) => {
  localConfig.value[key] = value
  emit('update', { ...props.widget, config: { ...localConfig.value } })
}

const updateTitle = (title: string) => {
  localTitle.value = title
  emit('update', { ...props.widget, title })
}

const updateSize = (size: WidgetSize) => {
  localSize.value = size
  emit('update', { ...props.widget, size })
}

const sizeOptions: { value: WidgetSize; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'X-Large' },
  { value: 'full', label: 'Full Width' },
]

const categoryColors: Record<string, string> = {
  metrics: 'border-l-emerald-500',
  charts: 'border-l-blue-500',
  lists: 'border-l-purple-500',
  activity: 'border-l-orange-500',
  custom: 'border-l-gray-500',
}

const borderColor = computed(() => categoryColors[props.widget.category] || 'border-l-gray-500')
</script>

<template>
  <div class="group relative bg-card border rounded-lg overflow-hidden border-l-4" :class="borderColor">
    <!-- Widget Header -->
    <div class="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
      <Icon v-if="widgetTypeDef" :name="widgetTypeDef.icon" class="w-4 h-4 text-muted-foreground" />
      <span class="text-sm font-medium flex-1 truncate">{{ widget.title }}</span>
      <UiButton
        variant="ghost"
        size="icon-xs"
        class="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
        @click="emit('delete')">
        <Icon name="lucide:trash-2" class="w-3.5 h-3.5" />
      </UiButton>
    </div>

    <!-- Widget Config -->
    <div class="p-3 space-y-3">
      <!-- Title -->
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">Title</label>
        <UiInput :model-value="localTitle" placeholder="Widget title" @update:model-value="updateTitle" />
      </div>

      <!-- Size -->
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground">Size</label>
        <UiSelect :model-value="localSize" @update:model-value="updateSize($event as WidgetSize)">
          <UiSelectTrigger class="w-full">
            <UiSelectValue placeholder="Select size" />
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem v-for="opt in sizeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>
      </div>

      <!-- Dynamic config fields based on configSchema -->
      <template v-if="widgetTypeDef?.configSchema?.fields">
        <div
          v-for="field in widgetTypeDef.configSchema.fields.filter((f) => f.key !== 'title')"
          :key="field.key"
          class="space-y-1.5">
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
            <UiSwitch :checked="localConfig[field.key] || false" @update:checked="updateConfig(field.key, $event)" />
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

          <!-- Field picker (placeholder) -->
          <UiInput
            v-else-if="field.type === 'field'"
            :model-value="localConfig[field.key] || ''"
            placeholder="Field name"
            @update:model-value="updateConfig(field.key, $event)" />
        </div>
      </template>
    </div>
  </div>
</template>
