<script lang="ts" setup>
  import { ENTITY_CLASSES, getEntityTypeConfig, getAllEntityTypeIds } from '~/config/entityRegistry'
  import type { EntityType, EntityClass } from '~/types/entity'
  import { APP_TEMPLATES, type AppTemplate } from '~/lib/appTemplates'

  const props = defineProps<{
    open: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    created: [appId: string]
  }>()

  const { createApplication, currentOrg, currentApp } = useInstantData()
  const { dynamicTypes } = useOntologyRegistry()

  // Default entity types for new apps — the productivity trio
  const DEFAULT_ENABLED_TYPES = ['task', 'note', 'project']

  // ── Template selection ──────────────────────────────────────────────
  const selectedTemplate = ref<AppTemplate | null>(null)
  const showTemplates = ref(true)

  const applyTemplate = (template: AppTemplate) => {
    selectedTemplate.value = template
    form.value.name = template.name
    form.value.slug = slugify(template.name)
    form.value.description = template.description
    form.value.icon = template.icon
    form.value.color = template.color
    form.value.ontologies = [...template.ontologies]
    slugManuallyEdited.value = false
    showTemplates.value = false
  }

  const clearTemplate = () => {
    selectedTemplate.value = null
    showTemplates.value = true
  }

  const form = ref({
    name: '',
    slug: '',
    description: '',
    icon: 'lucide:layout-grid',
    color: '#6366f1',
    isPublic: false,
    ontologies: [...DEFAULT_ENABLED_TYPES] as string[],
  })

  const isCreating = ref(false)
  const slugManuallyEdited = ref(false)

  const slugify = (input: string) =>
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  watch(
    () => form.value.name,
    (name) => {
      if (!slugManuallyEdited.value) {
        form.value.slug = slugify(name)
      }
    },
  )

  const handleSlugInput = () => {
    slugManuallyEdited.value = true
  }

  const isFormValid = computed(() => !!form.value.name.trim() && !!form.value.slug.trim() && !!currentOrg.value)

  // Build grouped entity type options: static + dynamic, grouped by class
  interface TypeOption {
    slug: string
    label: string
    icon: string
    color: string
    class: string
    dynamic: boolean
  }

  const CLASS_ORDER: EntityClass[] = ['temporal', 'document', 'actor', 'container']

  const groupedTypes = computed(() => {
    const groups: { class: EntityClass; label: string; icon: string; types: TypeOption[] }[] = []

    for (const cls of CLASS_ORDER) {
      const classConfig = ENTITY_CLASSES[cls]
      const types: TypeOption[] = []

      // Add static types for this class
      for (const typeId of getAllEntityTypeIds()) {
        const config = getEntityTypeConfig(typeId as EntityType)
        if (config.class === cls) {
          types.push({
            slug: config.type,
            label: config.label,
            icon: config.icon,
            color: config.color,
            class: cls,
            dynamic: false,
          })
        }
      }

      // Add dynamic types for this class
      for (const dt of (dynamicTypes.value || [])) {
        if (dt.class === cls) {
          types.push({
            slug: dt.type,
            label: dt.label,
            icon: dt.icon,
            color: dt.color,
            class: cls,
            dynamic: true,
          })
        }
      }

      if (types.length > 0) {
        groups.push({
          class: cls,
          label: classConfig.label,
          icon: classConfig.icon,
          types,
        })
      }
    }

    return groups
  })

  const allTypeOptions = computed(() => groupedTypes.value.flatMap((g) => g.types))

  const toggleType = (slug: string) => {
    const idx = form.value.ontologies.indexOf(slug)
    if (idx >= 0) {
      form.value.ontologies.splice(idx, 1)
    } else {
      form.value.ontologies.push(slug)
    }
  }

  const selectAll = () => {
    form.value.ontologies = allTypeOptions.value.map((t) => t.slug)
  }

  const selectNone = () => {
    form.value.ontologies = []
  }

  // Icon options
  const iconOptions = [
    'lucide:layout-grid',
    'lucide:briefcase',
    'lucide:shopping-cart',
    'lucide:heart',
    'lucide:book-open',
    'lucide:code',
    'lucide:music',
    'lucide:camera',
    'lucide:globe',
    'lucide:zap',
    'lucide:rocket',
    'lucide:building-2',
    'lucide:users',
    'lucide:target',
    'lucide:star',
    'lucide:palette',
  ]

  // Color options
  const colorOptions = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#6b7280', // gray
    '#1e293b', // slate
  ]

  const handleCreate = async () => {
    if (!isFormValid.value || isCreating.value || !currentOrg.value) return

    isCreating.value = true
    try {
      const appId = await createApplication({
        orgId: currentOrg.value.id,
        name: form.value.name.trim(),
        slug: slugify(form.value.slug || form.value.name),
        icon: form.value.icon,
        color: form.value.color,
        description: form.value.description.trim() || undefined,
        isPublic: form.value.isPublic,
        ontologies: form.value.ontologies,
      })

      // Auto-select the newly created app after a tick for reactive subscription
      await nextTick()
      setTimeout(() => {
        const { applications } = useInstantData()
        const newApp = applications.value.find((a) => a.id === appId)
        if (newApp) {
          currentApp.value = newApp
        }
      }, 100)

      emit('created', appId)
      emit('update:open', false)

      // Reset form
      form.value = {
        name: '',
        slug: '',
        description: '',
        icon: 'lucide:layout-grid',
        color: '#6366f1',
        isPublic: false,
        ontologies: [...DEFAULT_ENABLED_TYPES],
      }
      slugManuallyEdited.value = false
    } catch (e) {
      console.error('[CreateAppDialog] Failed to create application:', e)
    } finally {
      isCreating.value = false
    }
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen) {
        form.value = {
          name: '',
          slug: '',
          description: '',
          icon: 'lucide:layout-grid',
          color: '#6366f1',
          isPublic: false,
          ontologies: [...DEFAULT_ENABLED_TYPES],
        }
        slugManuallyEdited.value = false
        selectedTemplate.value = null
        showTemplates.value = true
      }
    },
  )
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="sm:max-w-lg">
      <UiDialogHeader>
        <UiDialogTitle class="flex items-center gap-2">
          <Icon name="lucide:app-window" class="h-5 w-5 text-muted-foreground" />
          New Application
        </UiDialogTitle>
        <UiDialogDescription>
          Create a new app within {{ currentOrg?.name || 'your organization' }}.
        </UiDialogDescription>
      </UiDialogHeader>

      <!-- Template Picker -->
      <div v-if="showTemplates" class="py-2 space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-muted-foreground">Start from a template</p>
          <button
            type="button"
            class="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            @click="showTemplates = false">
            Skip — start blank
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
          <button
            v-for="tmpl in APP_TEMPLATES"
            :key="tmpl.id"
            type="button"
            class="flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all hover:shadow-sm"
            :class="selectedTemplate?.id === tmpl.id
              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
              : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'"
            @click="applyTemplate(tmpl)">
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              :style="{ backgroundColor: tmpl.color + '20', color: tmpl.color }">
              <Icon :name="tmpl.icon" class="h-4 w-4" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-medium truncate">{{ tmpl.name }}</p>
              <p class="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{{ tmpl.description }}</p>
              <p class="text-[9px] text-muted-foreground/60 mt-1">{{ tmpl.ontologies.length }} types</p>
            </div>
          </button>
        </div>
      </div>

      <form v-else class="space-y-4 py-2" @submit.prevent="handleCreate">
        <!-- Template indicator -->
        <div v-if="selectedTemplate" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
          <div
            class="w-6 h-6 rounded flex items-center justify-center shrink-0"
            :style="{ backgroundColor: selectedTemplate.color + '20', color: selectedTemplate.color }">
            <Icon :name="selectedTemplate.icon" class="h-3.5 w-3.5" />
          </div>
          <span class="text-xs font-medium flex-1">{{ selectedTemplate.name }} template</span>
          <button type="button" class="text-[10px] text-muted-foreground hover:text-foreground" @click="clearTemplate">Change</button>
        </div>

        <!-- Name -->
        <div class="space-y-1.5">
          <label for="app-name" class="text-sm font-medium">Name</label>
          <UiInput
            id="app-name"
            v-model="form.name"
            placeholder="My App"
            autofocus />
        </div>

        <!-- Slug -->
        <div class="space-y-1.5">
          <label for="app-slug" class="text-sm font-medium">Slug</label>
          <UiInput
            id="app-slug"
            v-model="form.slug"
            placeholder="my-app"
            @input="handleSlugInput" />
          <p class="text-xs text-muted-foreground">URL-friendly identifier</p>
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <label for="app-desc" class="text-sm font-medium">Description <span class="text-muted-foreground font-normal">(optional)</span></label>
          <UiInput
            id="app-desc"
            v-model="form.description"
            placeholder="What is this app for?" />
        </div>

        <!-- Icon & Color -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Icon picker -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium">Icon</label>
            <div class="grid grid-cols-4 gap-1.5">
              <button
                v-for="icon in iconOptions"
                :key="icon"
                type="button"
                class="h-8 w-8 flex items-center justify-center rounded-md border transition-colors"
                :class="form.icon === icon ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'"
                @click="form.icon = icon">
                <Icon :name="icon" class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Color picker -->
          <div class="space-y-1.5">
            <label class="text-sm font-medium">Color</label>
            <div class="grid grid-cols-4 gap-1.5">
              <button
                v-for="color in colorOptions"
                :key="color"
                type="button"
                class="h-8 w-8 rounded-md border-2 transition-all"
                :class="form.color === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'"
                :style="{ backgroundColor: color }"
                @click="form.color = color" />
            </div>
          </div>
        </div>

        <!-- Public toggle -->
        <div class="flex items-center justify-between py-1">
          <div>
            <label class="text-sm font-medium">Public</label>
            <p class="text-xs text-muted-foreground">Make this app publicly accessible</p>
          </div>
          <UiSwitch v-model:checked="form.isPublic" />
        </div>

        <!-- Entity Types -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">Entity Types</label>
            <div class="flex items-center gap-1.5">
              <button type="button" class="text-[10px] text-muted-foreground hover:text-foreground transition-colors" @click="selectAll">All</button>
              <span class="text-muted-foreground/40 text-[10px]">/</span>
              <button type="button" class="text-[10px] text-muted-foreground hover:text-foreground transition-colors" @click="selectNone">None</button>
            </div>
          </div>
          <p class="text-xs text-muted-foreground">Choose which entity types are available in this app.</p>
          <div class="space-y-3 mt-1 max-h-[200px] overflow-y-auto pr-1">
            <div v-for="group in groupedTypes" :key="group.class">
              <div class="flex items-center gap-1.5 mb-1">
                <Icon :name="group.icon" class="h-3 w-3 text-muted-foreground/60" />
                <span class="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{{ group.label }}</span>
              </div>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="t in group.types"
                  :key="t.slug"
                  type="button"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors"
                  :class="form.ontologies.includes(t.slug)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'"
                  @click="toggleType(t.slug)">
                  <Icon :name="t.icon" class="h-3 w-3" />
                  {{ t.label }}
                  <Icon
                    v-if="form.ontologies.includes(t.slug)"
                    name="lucide:check"
                    class="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- Footer (inside form for submit-on-enter) -->
        <div class="flex justify-end gap-2 pt-2">
          <UiButton type="button" variant="outline" @click="emit('update:open', false)">Cancel</UiButton>
          <UiButton type="submit" :disabled="!isFormValid || isCreating">
            <Icon v-if="isCreating" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
            Create App
          </UiButton>
        </div>
      </form>
    </UiDialogContent>
  </UiDialog>
</template>
