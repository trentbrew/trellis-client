<script setup lang="ts">
  /**
   * OntologyCreateDialog — Create a new TQL ontology (custom type) via a friendly UI.
   *
   * Replaces CollectionCreateDialog for the /database page.
   * On submit: POST /api/graph/ontology → SSE → sidebar auto-updates.
   */

  const ONTOLOGY_VALUE_TYPES = [
    { value: 'title', label: 'Title', icon: 'lucide:type', description: 'Primary name field' },
    { value: 'rich_text', label: 'Rich Text', icon: 'lucide:align-left', description: 'Formatted text content' },
    { value: 'number', label: 'Number', icon: 'lucide:hash', description: 'Numeric value' },
    { value: 'select', label: 'Select', icon: 'lucide:chevrons-up-down', description: 'Single choice from options' },
    { value: 'multi_select', label: 'Multi Select', icon: 'lucide:list-checks', description: 'Multiple choices' },
    { value: 'status', label: 'Status', icon: 'lucide:circle-dot', description: 'Workflow status' },
    { value: 'date', label: 'Date', icon: 'lucide:calendar', description: 'Date or date range' },
    { value: 'checkbox', label: 'Checkbox', icon: 'lucide:check-square', description: 'True/false toggle' },
    { value: 'url', label: 'URL', icon: 'lucide:link', description: 'Web address' },
    { value: 'email', label: 'Email', icon: 'lucide:mail', description: 'Email address' },
    { value: 'phone_number', label: 'Phone', icon: 'lucide:phone', description: 'Phone number' },
    { value: 'people', label: 'People', icon: 'lucide:users', description: 'Person reference' },
    { value: 'files', label: 'Files', icon: 'lucide:paperclip', description: 'File attachments' },
    { value: 'relation', label: 'Relation', icon: 'lucide:git-branch', description: 'Link to another entity' },
  ] as const

  interface SchemaField {
    id: string
    name: string
    valueType: string
    required: boolean
    description: string
  }

  interface TemplateOption {
    id: string
    name: string
    description: string
    icon: string
    fields: Omit<SchemaField, 'id'>[]
  }

  const TEMPLATES: TemplateOption[] = [
    {
      id: 'project-management',
      name: 'Project Management',
      description: 'Track projects, tasks, and milestones',
      icon: 'lucide:briefcase',
      fields: [
        { name: 'title', valueType: 'title', required: true, description: '' },
        { name: 'status', valueType: 'status', required: false, description: '' },
        { name: 'priority', valueType: 'select', required: false, description: '' },
        { name: 'dueDate', valueType: 'date', required: false, description: '' },
        { name: 'assignee', valueType: 'people', required: false, description: '' },
      ],
    },
    {
      id: 'personal-finance',
      name: 'Personal Finance',
      description: 'Budget tracking and expense management',
      icon: 'lucide:wallet',
      fields: [
        { name: 'title', valueType: 'title', required: true, description: '' },
        { name: 'category', valueType: 'select', required: true, description: '' },
        { name: 'amount', valueType: 'number', required: true, description: '' },
        { name: 'date', valueType: 'date', required: true, description: '' },
        { name: 'notes', valueType: 'rich_text', required: false, description: '' },
      ],
    },
    {
      id: 'content-calendar',
      name: 'Content Calendar',
      description: 'Plan and schedule content',
      icon: 'lucide:calendar',
      fields: [
        { name: 'title', valueType: 'title', required: true, description: '' },
        { name: 'platform', valueType: 'select', required: false, description: '' },
        { name: 'publishDate', valueType: 'date', required: false, description: '' },
        { name: 'status', valueType: 'status', required: false, description: '' },
      ],
    },
    {
      id: 'crm',
      name: 'CRM / Contacts',
      description: 'Manage contacts and relationships',
      icon: 'lucide:users',
      fields: [
        { name: 'title', valueType: 'title', required: true, description: '' },
        { name: 'email', valueType: 'email', required: false, description: '' },
        { name: 'company', valueType: 'rich_text', required: false, description: '' },
        { name: 'status', valueType: 'status', required: false, description: '' },
      ],
    },
    {
      id: 'inventory',
      name: 'Inventory',
      description: 'Track products and stock',
      icon: 'lucide:package',
      fields: [
        { name: 'title', valueType: 'title', required: true, description: '' },
        { name: 'sku', valueType: 'rich_text', required: true, description: 'Stock keeping unit' },
        { name: 'quantity', valueType: 'number', required: false, description: '' },
        { name: 'price', valueType: 'number', required: false, description: '' },
      ],
    },
    {
      id: 'knowledge-base',
      name: 'Knowledge Base',
      description: 'Organize documentation',
      icon: 'lucide:book-open',
      fields: [
        { name: 'title', valueType: 'title', required: true, description: '' },
        { name: 'category', valueType: 'select', required: false, description: '' },
        { name: 'content', valueType: 'rich_text', required: false, description: '' },
      ],
    },
  ]

  const CLEAR_TEMPLATE_ID = '__clear__'

  const props = defineProps<{
    open: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    created: [ontologyId: string]
  }>()

  const nuxtApp = useNuxtApp()

  // ── Form state ──────────────────────────────────────────────────────

  const title = ref('')
  const description = ref('')
  const icon = ref('lucide:database')
  const selectedTemplateId = ref('')
  const fields = ref<SchemaField[]>([
    { id: crypto.randomUUID(), name: 'title', valueType: 'title', required: true, description: '' },
  ])
  const isCreating = ref(false)
  const step = ref<'info' | 'fields'>('info')

  // ── Derived ─────────────────────────────────────────────────────────

  const slug = computed(() =>
    title.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  )

  const schemaId = computed(() => (slug.value ? `trellis:schema/${slug.value}` : ''))

  const hasTitleField = computed(() => fields.value.some((f) => f.valueType === 'title'))

  const canCreate = computed(() => {
    return title.value.trim().length > 0 && slug.value.length > 0 && hasTitleField.value && fields.value.length > 0
  })

  // ── Template handling ───────────────────────────────────────────────

  const onTemplateSelect = (v: unknown) => {
    const next = String(v ?? '')
    selectedTemplateId.value = next === CLEAR_TEMPLATE_ID ? '' : next

    const template = TEMPLATES.find((t) => t.id === next)
    if (template) {
      fields.value = template.fields.map((f) => ({
        id: crypto.randomUUID(),
        ...f,
      }))
      if (!title.value) {
        title.value = template.name
        description.value = template.description
        icon.value = template.icon
      }
    }
  }

  // ── Field management ────────────────────────────────────────────────

  const addField = () => {
    fields.value.push({
      id: crypto.randomUUID(),
      name: '',
      valueType: 'rich_text',
      required: false,
      description: '',
    })
  }

  const removeField = (id: string) => {
    fields.value = fields.value.filter((f) => f.id !== id)
  }

  const moveField = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= fields.value.length) return
    const arr = [...fields.value]
    const tmp = arr[index]!
    arr[index] = arr[newIndex]!
    arr[newIndex] = tmp
    fields.value = arr
  }

  // ── Icon picker ─────────────────────────────────────────────────────

  const POPULAR_ICONS = [
    'lucide:database',
    'lucide:table',
    'lucide:file-text',
    'lucide:folder',
    'lucide:star',
    'lucide:heart',
    'lucide:bookmark',
    'lucide:tag',
    'lucide:users',
    'lucide:briefcase',
    'lucide:wallet',
    'lucide:package',
    'lucide:calendar',
    'lucide:book-open',
    'lucide:zap',
    'lucide:globe',
  ]

  // ── Create ──────────────────────────────────────────────────────────

  const createOntology = async () => {
    if (!canCreate.value || isCreating.value) return

    isCreating.value = true
    try {
      const schema = {
        '@id': schemaId.value,
        '@type': 'trellis:Schema',
        version: '1.0.0',
        label: title.value.trim(),
        description: description.value.trim() || undefined,
        icon: icon.value,
        tier: 'user',
        fields: fields.value
          .filter((f) => f.name.trim())
          .map((f) => ({
            name: f.name.trim(),
            valueType: f.valueType,
            required: f.required,
            description: f.description || undefined,
          })),
      }

      await $fetch('/api/graph/ontology', {
        method: 'POST',
        body: { schema, agentId: 'browser' },
      })
      ;(nuxtApp as any).$toast?.success(`"${title.value}" type created`)
      emit('created', schemaId.value)
      emit('update:open', false)

      // Navigate to the new type's schema editor
      await navigateTo(`/ontologies/${slug.value}`)

      // Reset form
      resetForm()
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to create ontology'
      ;(nuxtApp as any).$toast?.error(msg)
      console.error('[OntologyCreateDialog] Create failed:', err)
    } finally {
      isCreating.value = false
    }
  }

  const resetForm = () => {
    title.value = ''
    description.value = ''
    icon.value = 'lucide:database'
    selectedTemplateId.value = ''
    fields.value = [{ id: crypto.randomUUID(), name: 'title', valueType: 'title', required: true, description: '' }]
    step.value = 'info'
  }

  // Reset on close
  watch(
    () => props.open,
    (open) => {
      if (!open) {
        setTimeout(resetForm, 300)
      }
    },
  )

  const getValueTypeIcon = (vt: string) => {
    return ONTOLOGY_VALUE_TYPES.find((t) => t.value === vt)?.icon || 'lucide:circle'
  }

  const _getValueTypeLabel = (vt: string) => {
    return ONTOLOGY_VALUE_TYPES.find((t) => t.value === vt)?.label || vt
  }
</script>

<template>
  <UiSheet :open="props.open" @update:open="emit('update:open', $event)">
    <UiSheetContent side="right" class="max-w-2xl overflow-y-auto p-0">
      <UiSheetHeader class="px-6 pt-6 pb-4">
        <UiSheetTitle>Create New Type</UiSheetTitle>
        <UiSheetDescription>Define a custom entity type with its own schema and fields.</UiSheetDescription>
      </UiSheetHeader>

      <!-- Step indicator -->
      <div class="px-6 pb-4">
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            :class="
              step === 'info'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            "
            @click="step = 'info'">
            <Icon name="lucide:info" class="h-3.5 w-3.5" />
            Details
          </button>
          <Icon name="lucide:chevron-right" class="h-3.5 w-3.5 text-muted-foreground/50" />
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            :class="
              step === 'fields'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            "
            @click="step = 'fields'">
            <Icon name="lucide:list" class="h-3.5 w-3.5" />
            Fields
            <span class="ml-1 text-[10px] opacity-70">({{ fields.length }})</span>
          </button>
        </div>
      </div>

      <!-- Step 1: Info -->
      <div v-if="step === 'info'" class="space-y-5 px-6 pb-6">
        <!-- Template -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Template (optional)</label>
          <UiSelect :model-value="selectedTemplateId" @update:model-value="onTemplateSelect">
            <UiSelectTrigger>
              <UiSelectValue placeholder="Start from scratch..." />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem :value="CLEAR_TEMPLATE_ID">Start from scratch</UiSelectItem>
              <UiSelectSeparator />
              <UiSelectItem v-for="t in TEMPLATES" :key="t.id" :value="t.id">
                <div class="flex items-center gap-2">
                  <Icon :name="t.icon" class="h-4 w-4 text-muted-foreground" />
                  <span>{{ t.name }}</span>
                </div>
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
          <p v-if="TEMPLATES.find((t) => t.id === selectedTemplateId)" class="text-xs text-muted-foreground">
            {{ TEMPLATES.find((t) => t.id === selectedTemplateId)?.description }}
          </p>
        </div>

        <!-- Title -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Name</label>
          <UiInput v-model="title" placeholder="e.g. Invoice, Recipe, Habit..." />
          <p v-if="slug" class="text-xs text-muted-foreground">
            ID:
            <code class="bg-muted/50 px-1 py-0.5 rounded text-[11px]">{{ schemaId }}</code>
          </p>
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Description</label>
          <UiTextarea v-model="description" placeholder="What is this type for?" :rows="2" />
        </div>

        <!-- Icon -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Icon</label>
          <div class="grid grid-cols-8 gap-2">
            <button
              v-for="ic in POPULAR_ICONS"
              :key="ic"
              type="button"
              class="hover:bg-accent flex h-10 w-10 items-center justify-center rounded-md border transition-colors"
              :class="{ 'border-primary bg-accent': icon === ic }"
              @click="icon = ic">
              <Icon :name="ic" class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Next button -->
        <div class="flex justify-end pt-2">
          <UiButton :disabled="!title.trim()" @click="step = 'fields'">
            Next: Define Fields
            <Icon name="lucide:arrow-right" class="ml-2 h-4 w-4" />
          </UiButton>
        </div>
      </div>

      <!-- Step 2: Fields -->
      <div v-else-if="step === 'fields'" class="px-6 pb-6 space-y-4">
        <!-- Preview header -->
        <div class="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50">
            <Icon :name="icon" class="h-4 w-4" />
          </div>
          <div>
            <div class="text-sm font-medium">{{ title || 'Untitled' }}</div>
            <div class="text-[11px] text-muted-foreground">
              {{ fields.length }} field{{ fields.length === 1 ? '' : 's' }}
            </div>
          </div>
        </div>

        <!-- Field list -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">Fields</label>
            <UiButton variant="ghost" size="sm" @click="addField">
              <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
              Add Field
            </UiButton>
          </div>

          <div class="rounded-lg border border-border divide-y divide-border">
            <div v-for="(field, index) in fields" :key="field.id" class="flex items-center gap-2 px-3 py-2 group">
              <!-- Reorder -->
              <div class="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  class="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  :disabled="index === 0"
                  @click="moveField(index, -1)">
                  <Icon name="lucide:chevron-up" class="h-3 w-3" />
                </button>
                <button
                  class="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  :disabled="index === fields.length - 1"
                  @click="moveField(index, 1)">
                  <Icon name="lucide:chevron-down" class="h-3 w-3" />
                </button>
              </div>

              <!-- Type icon -->
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted/30">
                <Icon :name="getValueTypeIcon(field.valueType)" class="h-3.5 w-3.5 text-muted-foreground" />
              </div>

              <!-- Name input -->
              <input
                v-model="field.name"
                type="text"
                placeholder="Field name"
                class="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                :class="{ 'text-muted-foreground': field.valueType === 'title' }" />

              <!-- Type selector -->
              <UiSelect v-model="field.valueType">
                <UiSelectTrigger class="w-[130px] h-7 text-xs">
                  <UiSelectValue />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem v-for="vt in ONTOLOGY_VALUE_TYPES" :key="vt.value" :value="vt.value">
                    <div class="flex items-center gap-2">
                      <Icon :name="vt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{{ vt.label }}</span>
                    </div>
                  </UiSelectItem>
                </UiSelectContent>
              </UiSelect>

              <!-- Required toggle -->
              <button
                class="shrink-0 text-xs px-1.5 py-0.5 rounded transition-colors"
                :class="
                  field.required
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'text-muted-foreground/40 hover:text-muted-foreground'
                "
                :title="field.required ? 'Required' : 'Optional'"
                @click="field.required = !field.required">
                <Icon name="lucide:asterisk" class="h-3 w-3" />
              </button>

              <!-- Remove -->
              <button
                class="shrink-0 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                :disabled="fields.length <= 1"
                @click="removeField(field.id)">
                <Icon name="lucide:x" class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <!-- Validation hint -->
          <p v-if="!hasTitleField" class="text-xs text-amber-500 flex items-center gap-1">
            <Icon name="lucide:alert-triangle" class="h-3 w-3" />
            A "title" field is required. Add one or change an existing field's type to Title.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 border-t border-border bg-background px-6 py-4 flex items-center justify-between">
        <UiButton v-if="step === 'fields'" variant="ghost" size="sm" @click="step = 'info'">
          <Icon name="lucide:arrow-left" class="mr-1.5 h-3.5 w-3.5" />
          Back
        </UiButton>
        <div v-else />

        <div class="flex items-center gap-2">
          <UiButton variant="outline" @click="emit('update:open', false)">Cancel</UiButton>
          <UiButton v-if="step === 'fields'" :disabled="!canCreate || isCreating" @click="createOntology">
            <Icon v-if="isCreating" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
            <Icon v-else name="lucide:plus" class="mr-2 h-4 w-4" />
            Create Type
          </UiButton>
        </div>
      </div>
    </UiSheetContent>
  </UiSheet>
</template>
