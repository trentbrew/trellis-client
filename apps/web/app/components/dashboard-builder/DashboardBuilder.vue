<script setup lang="ts">
import type { DashboardDefinition, DashboardWidget, WidgetTypeDefinition } from '~/composables/useDashboardBuilder'

const props = defineProps<{
  open: boolean
  dashboard?: DashboardDefinition
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  save: [dashboard: DashboardDefinition]
}>()

const { widgetTypesByCategory, createWidgetFromType, createDefaultDashboard, getWidgetSpan } = useDashboardBuilder()

// Local copy of dashboard for editing
const localDashboard = ref<DashboardDefinition>(
  props.dashboard ? { ...props.dashboard, widgets: [...props.dashboard.widgets] } : createDefaultDashboard()
)

// Sync when props change
watch(
  () => props.dashboard,
  (newDashboard) => {
    if (newDashboard) {
      localDashboard.value = { ...newDashboard, widgets: [...newDashboard.widgets] }
    } else {
      localDashboard.value = createDefaultDashboard()
    }
  },
  { deep: true }
)

// UI state
const showWidgetPicker = ref(false)
const activeCategory = ref<string>('metrics')
const selectedWidgetId = ref<string | null>(null)

const categories = [
  { id: 'metrics', label: 'Metrics', icon: 'lucide:hash' },
  { id: 'charts', label: 'Charts', icon: 'lucide:bar-chart-2' },
  { id: 'lists', label: 'Lists', icon: 'lucide:list' },
  { id: 'activity', label: 'Activity', icon: 'lucide:activity' },
  { id: 'custom', label: 'Custom', icon: 'lucide:puzzle' },
]

const currentCategoryWidgets = computed(() => {
  return widgetTypesByCategory.value[activeCategory.value] || []
})

const selectedWidget = computed(() => {
  if (!selectedWidgetId.value) return null
  return localDashboard.value.widgets.find((w) => w.id === selectedWidgetId.value) || null
})

// Widget operations
const addWidget = (typeDef: WidgetTypeDefinition) => {
  const newWidget = createWidgetFromType(typeDef)
  localDashboard.value.widgets.push(newWidget)
  showWidgetPicker.value = false
  selectedWidgetId.value = newWidget.id
}

const updateWidget = (widget: DashboardWidget) => {
  const index = localDashboard.value.widgets.findIndex((w) => w.id === widget.id)
  if (index !== -1) {
    localDashboard.value.widgets[index] = widget
  }
}

const deleteWidget = (widgetId: string) => {
  localDashboard.value.widgets = localDashboard.value.widgets.filter((w) => w.id !== widgetId)
  if (selectedWidgetId.value === widgetId) {
    selectedWidgetId.value = null
  }
}

// Save handler
const handleSave = () => {
  localDashboard.value.updatedAt = Date.now()
  emit('save', localDashboard.value)
  emit('update:open', false)
}

const handleCancel = () => {
  emit('update:open', false)
}

// Grid column classes based on widget size
const getGridColClass = (size: DashboardWidget['size']) => {
  const span = getWidgetSpan(size)
  return `col-span-${span}`
}
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="max-w-6xl h-[90vh] flex flex-col p-0">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div class="flex items-center gap-3">
          <Icon name="lucide:layout-dashboard" class="w-5 h-5 text-primary" />
          <div>
            <h2 class="text-lg font-semibold">Dashboard Builder</h2>
            <p class="text-sm text-muted-foreground">Add widgets to build your dashboard</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UiButton variant="outline" @click="handleCancel">Cancel</UiButton>
          <UiButton @click="handleSave">
            <Icon name="lucide:save" class="w-4 h-4 mr-2" />
            Save Dashboard
          </UiButton>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Left Panel: Dashboard Settings & Widget List -->
        <div class="w-72 border-r flex flex-col overflow-hidden">
          <!-- Dashboard Settings -->
          <div class="p-4 border-b space-y-3">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-muted-foreground">Dashboard Title</label>
              <UiInput v-model="localDashboard.title" placeholder="Dashboard title" />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-muted-foreground">Columns</label>
              <UiSelect
                :model-value="String(localDashboard.settings.columns)"
                @update:model-value="localDashboard.settings.columns = Number($event) as 4 | 6 | 12">
                <UiSelectTrigger class="w-full">
                  <UiSelectValue />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="4">4 Columns</UiSelectItem>
                  <UiSelectItem value="6">6 Columns</UiSelectItem>
                  <UiSelectItem value="12">12 Columns</UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
          </div>

          <!-- Widget List -->
          <div class="flex-1 overflow-y-auto p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium">Widgets</span>
              <UiButton variant="outline" size="sm" @click="showWidgetPicker = true">
                <Icon name="lucide:plus" class="w-3.5 h-3.5 mr-1" />
                Add
              </UiButton>
            </div>

            <div v-if="localDashboard.widgets.length === 0" class="text-center py-8">
              <Icon name="lucide:layout-dashboard" class="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p class="text-sm text-muted-foreground">No widgets yet</p>
              <UiButton variant="outline" size="sm" class="mt-3" @click="showWidgetPicker = true">
                Add your first widget
              </UiButton>
            </div>

            <div v-else class="space-y-2">
              <button
                v-for="widget in localDashboard.widgets"
                :key="widget.id"
                class="w-full text-left p-2 rounded-lg border transition-colors"
                :class="selectedWidgetId === widget.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'"
                @click="selectedWidgetId = widget.id">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:grip-vertical" class="w-3.5 h-3.5 text-muted-foreground" />
                  <span class="text-sm truncate flex-1">{{ widget.title }}</span>
                  <span class="text-xs text-muted-foreground">{{ widget.size }}</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Selected Widget Editor -->
          <div v-if="selectedWidget" class="border-t p-4 max-h-80 overflow-y-auto">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium">Edit Widget</span>
              <UiButton
                variant="ghost"
                size="icon-xs"
                class="text-destructive hover:text-destructive"
                @click="deleteWidget(selectedWidget.id)">
                <Icon name="lucide:trash-2" class="w-3.5 h-3.5" />
              </UiButton>
            </div>
            <DashboardBuilderWidgetEditor :widget="selectedWidget" @update="updateWidget" @delete="deleteWidget(selectedWidget.id)" />
          </div>
        </div>

        <!-- Right Panel: Preview -->
        <div class="flex-1 overflow-y-auto bg-muted/30 p-6">
          <div class="mx-auto max-w-5xl">
            <!-- Dashboard Title Preview -->
            <div class="mb-6">
              <h1 class="text-2xl font-bold">{{ localDashboard.title || 'Untitled Dashboard' }}</h1>
            </div>

            <!-- Widgets Grid Preview -->
            <div v-if="localDashboard.widgets.length === 0" class="text-center py-16 border-2 border-dashed rounded-lg bg-background">
              <Icon name="lucide:mouse-pointer-click" class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p class="text-muted-foreground">Add widgets to see preview</p>
            </div>

            <div
              v-else
              class="grid gap-4"
              :class="{
                'grid-cols-4': localDashboard.settings.columns === 4,
                'grid-cols-6': localDashboard.settings.columns === 6,
                'grid-cols-12': localDashboard.settings.columns === 12,
              }">
              <div
                v-for="widget in localDashboard.widgets"
                :key="widget.id"
                class="transition-all"
                :class="[
                  getGridColClass(widget.size),
                  selectedWidgetId === widget.id ? 'ring-2 ring-primary ring-offset-2' : '',
                ]"
                :style="{
                  gridColumn: `span ${getWidgetSpan(widget.size)} / span ${getWidgetSpan(widget.size)}`,
                }"
                @click="selectedWidgetId = widget.id">
                <DashboardBuilderWidgetRenderer :widget="widget" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Widget Picker Dialog -->
      <UiDialog :open="showWidgetPicker" @update:open="showWidgetPicker = $event">
        <UiDialogContent class="max-w-2xl">
          <UiDialogHeader>
            <UiDialogTitle>Add Widget</UiDialogTitle>
            <UiDialogDescription>Choose a widget type to add to your dashboard</UiDialogDescription>
          </UiDialogHeader>

          <!-- Category Tabs -->
          <div class="flex gap-1 border-b pb-2">
            <button
              v-for="cat in categories"
              :key="cat.id"
              class="px-3 py-1.5 text-sm rounded-md transition-colors"
              :class="activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
              @click="activeCategory = cat.id">
              <Icon :name="cat.icon" class="w-4 h-4 mr-1.5 inline-block" />
              {{ cat.label }}
            </button>
          </div>

          <!-- Widget Type Grid -->
          <div class="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto py-2">
            <DashboardBuilderWidgetTypeCard
              v-for="widgetType in currentCategoryWidgets"
              :key="widgetType.type"
              :widget-type="widgetType"
              @select="addWidget" />
          </div>
        </UiDialogContent>
      </UiDialog>
    </UiDialogContent>
  </UiDialog>
</template>
