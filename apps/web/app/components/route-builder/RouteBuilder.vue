<script setup lang="ts">
import type { RouteDefinition, RouteCategory, RouteTemplate } from '~/composables/useRouteBuilder'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [route: RouteDefinition]
}>()

const {
  templatesByCategory,
  categories,
  categoryMeta,
  suggestedIcons,
  tintOptions,
  roleOptions,
  layoutOptions,
  createRouteFromTemplate,
  createBlankRoute,
  generatePathFromLabel,
  validateRoute,
  toJsonLd,
} = useRouteBuilder()

// Current step in the wizard
const currentStep = ref<'template' | 'configure' | 'preview'>('template')

// Selected template
const selectedTemplate = ref<RouteTemplate | null>(null)

// Route being built
const routeDefinition = ref<RouteDefinition>(createBlankRoute())

// Active category filter
const activeCategory = ref<RouteCategory>('page')

// Validation state
const validationErrors = ref<string[]>([])

// Auto-generate path from label
const autoGeneratePath = ref(true)

// Watch label changes to auto-generate path
watch(
  () => routeDefinition.value.label,
  (newLabel) => {
    if (autoGeneratePath.value && newLabel) {
      routeDefinition.value.path = generatePathFromLabel(newLabel, routeDefinition.value.parentPath)
      routeDefinition.value.meta.title = newLabel
    }
  },
)

// Computed templates for current category
const currentCategoryTemplates = computed(() => {
  return templatesByCategory.value[activeCategory.value] || []
})

// Handle template selection
const handleSelectTemplate = (template: RouteTemplate) => {
  selectedTemplate.value = template
  routeDefinition.value = createRouteFromTemplate(template.id)
  currentStep.value = 'configure'
}

// Handle back navigation
const handleBack = () => {
  if (currentStep.value === 'configure') {
    currentStep.value = 'template'
    selectedTemplate.value = null
  } else if (currentStep.value === 'preview') {
    currentStep.value = 'configure'
  }
}

// Handle continue to preview
const handleContinue = () => {
  const result = validateRoute(routeDefinition.value)
  validationErrors.value = result.errors

  if (result.valid) {
    currentStep.value = 'preview'
  }
}

// Handle save
const handleSave = () => {
  const result = validateRoute(routeDefinition.value)
  if (result.valid) {
    emit('save', routeDefinition.value)
    handleClose()
  }
}

// Handle close
const handleClose = () => {
  emit('update:open', false)
  // Reset state after animation
  setTimeout(() => {
    currentStep.value = 'template'
    selectedTemplate.value = null
    routeDefinition.value = createBlankRoute()
    validationErrors.value = []
    autoGeneratePath.value = true
  }, 200)
}

// JSON-LD preview
const jsonLdPreview = computed(() => {
  return JSON.stringify(toJsonLd(routeDefinition.value), null, 2)
})

// Search keywords input as comma-separated string
const searchKeywordsInput = computed({
  get: () => routeDefinition.value.searchKeywords.join(', '),
  set: (value: string) => {
    routeDefinition.value.searchKeywords = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  },
})
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="w-[90vw]! max-w-[1400px]! h-[90vh]! flex flex-col p-0!">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div class="flex items-center gap-3">
          <Icon name="lucide:route" class="w-5 h-5 text-primary" />
          <div>
            <h2 class="text-lg font-semibold">Route Builder</h2>
            <p class="text-sm text-muted-foreground">
              {{ currentStep === 'template' ? 'Choose a template to get started' : currentStep === 'configure' ? 'Configure your new route' : 'Review and create' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UiButton v-if="currentStep !== 'template'" variant="ghost" @click="handleBack">
            <Icon name="lucide:arrow-left" class="w-4 h-4 mr-2" />
            Back
          </UiButton>
          <UiButton v-if="currentStep === 'configure'" @click="handleContinue">
            Preview
            <Icon name="lucide:arrow-right" class="w-4 h-4 ml-2" />
          </UiButton>
          <UiButton v-if="currentStep === 'preview'" @click="handleSave">
            <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
            Create Route
          </UiButton>
          <UiButton variant="ghost" size="icon" @click="handleClose">
            <Icon name="lucide:x" class="w-4 h-4" />
          </UiButton>
        </div>
      </div>

      <!-- Step Indicator -->
      <div class="px-6 py-3 border-b bg-muted/30 shrink-0">
        <div class="flex items-center gap-2 max-w-2xl mx-auto">
          <div
            class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors"
            :class="currentStep === 'template' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'">
            <span class="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">1</span>
            Template
          </div>
          <Icon name="lucide:chevron-right" class="w-4 h-4 text-muted-foreground" />
          <div
            class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors"
            :class="currentStep === 'configure' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'">
            <span class="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">2</span>
            Configure
          </div>
          <Icon name="lucide:chevron-right" class="w-4 h-4 text-muted-foreground" />
          <div
            class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors"
            :class="currentStep === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'">
            <span class="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">3</span>
            Preview
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 overflow-hidden flex">
        <!-- Step 1: Template Selection -->
        <div v-if="currentStep === 'template'" class="flex-1 flex overflow-hidden">
          <!-- Category Sidebar -->
          <div class="w-56 border-r bg-muted/20 p-3 overflow-y-auto shrink-0">
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
                    {{ templatesByCategory[cat]?.length || 0 }} templates
                  </div>
                </div>
              </button>
            </nav>
          </div>

          <!-- Template Grid -->
          <div class="flex-1 overflow-y-auto p-6">
            <div class="mb-4">
              <h3 class="text-lg font-semibold">{{ categoryMeta[activeCategory].label }}</h3>
              <p class="text-sm text-muted-foreground">{{ categoryMeta[activeCategory].description }}</p>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                v-for="template in currentCategoryTemplates"
                :key="template.id"
                class="group p-4 rounded-xl border bg-card hover:border-primary hover:shadow-md transition-all text-left"
                @click="handleSelectTemplate(template)">
                <div class="flex items-start gap-3">
                  <div class="p-2.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <Icon :name="template.icon" class="w-5 h-5" :class="categoryMeta[activeCategory].color" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-medium group-hover:text-primary transition-colors">{{ template.name }}</h4>
                    <p class="text-sm text-muted-foreground mt-0.5">{{ template.description }}</p>
                  </div>
                </div>
                <div class="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span class="flex items-center gap-1">
                    <Icon :name="template.defaults.icon || 'lucide:file'" class="w-3.5 h-3.5" />
                    {{ template.defaults.layoutType || 'default' }}
                  </span>
                  <span v-if="template.defaults.inRail" class="flex items-center gap-1">
                    <Icon name="lucide:sidebar" class="w-3.5 h-3.5" />
                    In Rail
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Step 2: Configuration -->
        <div v-else-if="currentStep === 'configure'" class="flex-1 flex overflow-hidden">
          <!-- Config Form -->
          <div class="flex-1 overflow-y-auto p-6">
            <div class="max-w-2xl mx-auto space-y-6">
              <!-- Validation Errors -->
              <div v-if="validationErrors.length > 0" class="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div class="flex items-start gap-2">
                  <Icon name="lucide:alert-circle" class="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p class="font-medium text-destructive">Please fix the following errors:</p>
                    <ul class="mt-1 text-sm text-destructive/80 list-disc list-inside">
                      <li v-for="error in validationErrors" :key="error">{{ error }}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Basic Info -->
              <div class="space-y-4">
                <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Basic Information</h3>

                <div class="grid gap-4">
                  <div>
                    <label class="text-sm font-medium mb-1.5 block">Label *</label>
                    <UiInput v-model="routeDefinition.label" placeholder="My New Page" />
                    <p class="text-xs text-muted-foreground mt-1">Display name in navigation</p>
                  </div>

                  <div>
                    <div class="flex items-center justify-between mb-1.5">
                      <label class="text-sm font-medium">Path *</label>
                      <label class="flex items-center gap-2 text-xs text-muted-foreground">
                        <input v-model="autoGeneratePath" type="checkbox" class="rounded" />
                        Auto-generate
                      </label>
                    </div>
                    <UiInput v-model="routeDefinition.path" placeholder="/my-new-page" :disabled="autoGeneratePath" />
                    <p class="text-xs text-muted-foreground mt-1">URL path (must start with /)</p>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="text-sm font-medium mb-1.5 block">Icon *</label>
                      <UiSelect v-model="routeDefinition.icon">
                        <UiSelectTrigger>
                          <UiSelectValue placeholder="Select icon">
                            <div class="flex items-center gap-2">
                              <Icon :name="routeDefinition.icon" class="w-4 h-4" />
                              <span>{{ routeDefinition.icon.replace('lucide:', '') }}</span>
                            </div>
                          </UiSelectValue>
                        </UiSelectTrigger>
                        <UiSelectContent>
                          <UiSelectItem v-for="icon in suggestedIcons" :key="icon" :value="icon">
                            <div class="flex items-center gap-2">
                              <Icon :name="icon" class="w-4 h-4" />
                              <span>{{ icon.replace('lucide:', '') }}</span>
                            </div>
                          </UiSelectItem>
                        </UiSelectContent>
                      </UiSelect>
                    </div>

                    <div>
                      <label class="text-sm font-medium mb-1.5 block">Color Tint</label>
                      <UiSelect v-model="routeDefinition.tint">
                        <UiSelectTrigger>
                          <UiSelectValue placeholder="None">
                            <div class="flex items-center gap-2">
                              <div
                                class="w-3 h-3 rounded-full"
                                :class="routeDefinition.tint || 'bg-muted-foreground'" />
                              <span>{{ tintOptions.find((t) => t.value === routeDefinition.tint)?.label || 'None' }}</span>
                            </div>
                          </UiSelectValue>
                        </UiSelectTrigger>
                        <UiSelectContent>
                          <UiSelectItem v-for="tint in tintOptions" :key="tint.value" :value="tint.value">
                            <div class="flex items-center gap-2">
                              <div class="w-3 h-3 rounded-full" :class="tint.value || 'bg-muted-foreground'" />
                              <span>{{ tint.label }}</span>
                            </div>
                          </UiSelectItem>
                        </UiSelectContent>
                      </UiSelect>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Page Metadata -->
              <div class="space-y-4">
                <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Page Metadata</h3>

                <div class="grid gap-4">
                  <div>
                    <label class="text-sm font-medium mb-1.5 block">Page Title *</label>
                    <UiInput v-model="routeDefinition.meta.title" placeholder="My New Page" />
                  </div>

                  <div>
                    <label class="text-sm font-medium mb-1.5 block">Description</label>
                    <UiTextarea v-model="routeDefinition.meta.description" placeholder="A brief description of this page" :rows="2" />
                  </div>

                  <div>
                    <label class="text-sm font-medium mb-1.5 block">Subtitle</label>
                    <UiInput v-model="routeDefinition.meta.subtitle" placeholder="Optional subtitle" />
                  </div>

                  <div>
                    <label class="text-sm font-medium mb-1.5 block">Search Keywords</label>
                    <UiInput v-model="searchKeywordsInput" placeholder="keyword1, keyword2, keyword3" />
                    <p class="text-xs text-muted-foreground mt-1">Comma-separated keywords for command palette search</p>
                  </div>
                </div>
              </div>

              <!-- Navigation & Layout -->
              <div class="space-y-4">
                <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Navigation & Layout</h3>

                <div class="grid gap-4">
                  <div>
                    <label class="text-sm font-medium mb-1.5 block">Layout Type</label>
                    <UiSelect v-model="routeDefinition.layoutType">
                      <UiSelectTrigger>
                        <UiSelectValue placeholder="Select layout" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem v-for="layout in layoutOptions" :key="layout.value" :value="layout.value">
                          <div>
                            <div>{{ layout.label }}</div>
                            <div class="text-xs text-muted-foreground">{{ layout.description }}</div>
                          </div>
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="text-sm font-medium mb-1.5 block">Display Order</label>
                      <UiInput v-model.number="routeDefinition.order" type="number" placeholder="0" />
                      <p class="text-xs text-muted-foreground mt-1">Lower numbers appear first</p>
                    </div>

                    <div>
                      <label class="text-sm font-medium mb-1.5 block">Rail Position</label>
                      <UiSelect v-model="routeDefinition.railPosition">
                        <UiSelectTrigger>
                          <UiSelectValue placeholder="Select position" />
                        </UiSelectTrigger>
                        <UiSelectContent>
                          <UiSelectItem value="primary">Primary (Top)</UiSelectItem>
                          <UiSelectItem value="secondary">Secondary (Bottom)</UiSelectItem>
                        </UiSelectContent>
                      </UiSelect>
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <UiSwitch v-model:checked="routeDefinition.inRail" />
                      <span class="text-sm">Show in Rail</span>
                    </label>

                    <label class="flex items-center gap-2 cursor-pointer">
                      <UiSwitch v-model:checked="routeDefinition.inCommandPalette" />
                      <span class="text-sm">Show in Command Palette</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Permissions -->
              <div class="space-y-4">
                <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Permissions</h3>

                <div class="grid gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <UiSwitch v-model:checked="routeDefinition.requiresAuth" />
                    <span class="text-sm">Requires Authentication</span>
                  </label>

                  <div v-if="routeDefinition.requiresAuth">
                    <label class="text-sm font-medium mb-1.5 block">Minimum Role</label>
                    <UiSelect v-model="routeDefinition.minRole">
                      <UiSelectTrigger>
                        <UiSelectValue placeholder="Any authenticated user" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem value="">Any authenticated user</UiSelectItem>
                        <UiSelectItem v-for="role in roleOptions" :key="role.value" :value="role.value">
                          {{ role.label }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Preview Sidebar -->
          <div class="w-80 border-l bg-muted/20 p-4 overflow-y-auto shrink-0">
            <h3 class="text-sm font-medium mb-4">Preview</h3>

            <!-- Navigation Preview -->
            <div class="p-3 rounded-lg bg-background border mb-4">
              <div class="text-xs text-muted-foreground mb-2">Rail Item</div>
              <div class="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div class="p-2 rounded-lg bg-muted">
                  <Icon :name="routeDefinition.icon" class="w-5 h-5" :class="routeDefinition.tint" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate">{{ routeDefinition.label || 'Untitled' }}</div>
                  <div class="text-xs text-muted-foreground truncate">{{ routeDefinition.path || '/path' }}</div>
                </div>
              </div>
            </div>

            <!-- Page Header Preview -->
            <div class="p-3 rounded-lg bg-background border">
              <div class="text-xs text-muted-foreground mb-2">Page Header</div>
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <Icon :name="routeDefinition.icon" class="w-4 h-4" :class="routeDefinition.tint" />
                  <span v-if="routeDefinition.meta.subtitle" class="text-xs text-muted-foreground">
                    {{ routeDefinition.meta.subtitle }}
                  </span>
                </div>
                <h4 class="font-semibold">{{ routeDefinition.meta.title || 'Untitled' }}</h4>
                <p v-if="routeDefinition.meta.description" class="text-sm text-muted-foreground">
                  {{ routeDefinition.meta.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: Preview -->
        <div v-else-if="currentStep === 'preview'" class="flex-1 flex overflow-hidden">
          <!-- Summary -->
          <div class="flex-1 overflow-y-auto p-6">
            <div class="max-w-3xl mx-auto space-y-6">
              <div class="text-center mb-8">
                <div class="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
                  <Icon :name="routeDefinition.icon" class="w-10 h-10 text-primary" />
                </div>
                <h2 class="text-2xl font-bold">{{ routeDefinition.label }}</h2>
                <p class="text-muted-foreground">{{ routeDefinition.path }}</p>
              </div>

              <!-- Summary Cards -->
              <div class="grid grid-cols-2 gap-4">
                <div class="p-4 rounded-xl border bg-card">
                  <div class="text-sm text-muted-foreground mb-1">Layout</div>
                  <div class="font-medium capitalize">{{ routeDefinition.layoutType }}</div>
                </div>
                <div class="p-4 rounded-xl border bg-card">
                  <div class="text-sm text-muted-foreground mb-1">Visibility</div>
                  <div class="font-medium">
                    {{ routeDefinition.inRail ? 'In Rail' : 'Hidden from Rail' }}
                  </div>
                </div>
                <div class="p-4 rounded-xl border bg-card">
                  <div class="text-sm text-muted-foreground mb-1">Authentication</div>
                  <div class="font-medium">
                    {{ routeDefinition.requiresAuth ? 'Required' : 'Public' }}
                  </div>
                </div>
                <div class="p-4 rounded-xl border bg-card">
                  <div class="text-sm text-muted-foreground mb-1">Minimum Role</div>
                  <div class="font-medium capitalize">
                    {{ routeDefinition.minRole?.replace('_', ' ') || 'Any' }}
                  </div>
                </div>
              </div>

              <!-- What Happens Next -->
              <div class="p-4 rounded-xl border bg-muted/30">
                <h3 class="font-medium mb-2 flex items-center gap-2">
                  <Icon name="lucide:info" class="w-4 h-4 text-primary" />
                  What happens next?
                </h3>
                <ul class="text-sm text-muted-foreground space-y-1.5">
                  <li class="flex items-start gap-2">
                    <Icon name="lucide:check" class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    Route definition will be added to your app configuration
                  </li>
                  <li class="flex items-start gap-2">
                    <Icon name="lucide:check" class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    A placeholder page will be created at <code class="px-1 py-0.5 rounded bg-muted text-xs">{{ routeDefinition.path }}</code>
                  </li>
                  <li class="flex items-start gap-2">
                    <Icon name="lucide:check" class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    The route will appear in navigation after page refresh
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- JSON-LD Preview -->
          <div class="w-96 border-l bg-muted/20 p-4 overflow-y-auto shrink-0">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium">JSON-LD Output</h3>
              <UiButton variant="ghost" size="sm" @click="window.navigator.clipboard.writeText(jsonLdPreview)">
                <Icon name="lucide:copy" class="w-3.5 h-3.5 mr-1.5" />
                Copy
              </UiButton>
            </div>
            <pre class="p-3 rounded-lg bg-background border text-xs overflow-x-auto"><code>{{ jsonLdPreview }}</code></pre>
          </div>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
