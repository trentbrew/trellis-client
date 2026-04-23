<script setup lang="ts">
  import type { Collection, DatabaseSchema, DatabaseField } from '~/types/database'

  interface TemplateOption {
    id: string
    name: string
    description: string
    icon: string
    fields: Array<{ name: string; type: DatabaseField['type']; required?: boolean }>
  }

  const props = defineProps<{
    open: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    created: [collection: Collection]
  }>()

  const CLEAR_TEMPLATE_ID = '__clear__'

  const selectedTemplateId = ref<string>('')
  const selectedSchema = ref<Partial<DatabaseSchema> | null>(null)

  const templateOptions: TemplateOption[] = [
    {
      id: 'project-management',
      name: 'Project Management',
      description: 'Track projects, tasks, and milestones',
      icon: 'lucide:briefcase',
      fields: [
        { name: 'Title', type: 'text', required: true },
        { name: 'Status', type: 'select' },
        { name: 'Priority', type: 'select' },
        { name: 'Due Date', type: 'date' },
        { name: 'Assignee', type: 'text' },
      ],
    },
    {
      id: 'personal-finance',
      name: 'Personal Finance',
      description: 'Budget tracking and expense management',
      icon: 'lucide:wallet',
      fields: [
        { name: 'Category', type: 'select', required: true },
        { name: 'Amount', type: 'number', required: true },
        { name: 'Date', type: 'date', required: true },
        { name: 'Type', type: 'select' },
        { name: 'Notes', type: 'text' },
      ],
    },
    {
      id: 'content-calendar',
      name: 'Content Calendar',
      description: 'Plan and schedule content',
      icon: 'lucide:calendar',
      fields: [
        { name: 'Title', type: 'text', required: true },
        { name: 'Platform', type: 'select' },
        { name: 'Publish Date', type: 'date' },
        { name: 'Status', type: 'select' },
      ],
    },
    {
      id: 'crm',
      name: 'CRM / Contacts',
      description: 'Manage contacts and relationships',
      icon: 'lucide:users',
      fields: [
        { name: 'Name', type: 'text', required: true },
        { name: 'Email', type: 'email' },
        { name: 'Company', type: 'text' },
        { name: 'Status', type: 'select' },
      ],
    },
    {
      id: 'inventory',
      name: 'Inventory',
      description: 'Track products and stock',
      icon: 'lucide:package',
      fields: [
        { name: 'SKU', type: 'text', required: true },
        { name: 'Name', type: 'text', required: true },
        { name: 'Quantity', type: 'number' },
        { name: 'Price', type: 'number' },
      ],
    },
    {
      id: 'knowledge-base',
      name: 'Knowledge Base',
      description: 'Organize documentation',
      icon: 'lucide:book-open',
      fields: [
        { name: 'Title', type: 'text', required: true },
        { name: 'Category', type: 'select' },
        { name: 'Content', type: 'text' },
      ],
    },
    {
      id: 'slide-deck',
      name: 'Slide Deck',
      description: 'Presentation slides — edit as data, present as slides',
      icon: 'lucide:presentation',
      fields: [
        { name: 'order', type: 'number', required: true },
        { name: 'title', type: 'text' },
        { name: 'subtitle', type: 'text' },
        { name: 'body', type: 'text' },
        { name: 'layout', type: 'select', required: true },
        { name: 'background', type: 'text' },
        { name: 'media', type: 'url' },
        { name: 'speakerNotes', type: 'text' },
      ],
    },
  ]

  const selectedTemplate = computed(() => templateOptions.find((t) => t.id === selectedTemplateId.value) || null)

  const onTemplateSelect = (v: unknown) => {
    const next = String(v ?? '')
    selectedTemplateId.value = next === CLEAR_TEMPLATE_ID ? '' : next
  }

  watch(selectedTemplateId, (id) => {
    const template = templateOptions.find((t) => t.id === id)
    if (template) {
      selectedSchema.value = {
        id: crypto.randomUUID(),
        fields: template.fields.map((field, index) => ({
          id: crypto.randomUUID(),
          name: field.name,
          type: field.type,
          required: field.required || false,
          order: index,
        })),
      }
      // Only auto-fill if title is empty
      if (!form.value.title) {
        form.value.title = template.name
        form.value.description = template.description
        form.value.icon = template.icon
      }
    } else {
      selectedSchema.value = null
    }
  })

  const { createCollection, collections, currentApp } = useInstantData()
  const nuxtApp = useNuxtApp()

  const form = ref({
    title: '',
    description: '',
    icon: 'lucide:file-text',
    type: 'database' as Collection['type'],
    slug: '',
    isPublished: false,
  })

  const pageTypes = [
    { value: 'database', label: 'Database', icon: 'lucide:table', description: 'Structured data with custom fields' },
    {
      value: 'document',
      label: 'Document',
      icon: 'lucide:file-text',
      description: 'Rich text document',
    },
    { value: 'board', label: 'Board', icon: 'lucide:layout-grid', description: 'Kanban-style board' },
    { value: 'calendar', label: 'Calendar', icon: 'lucide:calendar', description: 'Calendar view' },
    { value: 'gallery', label: 'Gallery', icon: 'lucide:image', description: 'Image gallery' },
  ]

  const popularIcons = [
    'lucide:file-text',
    'lucide:table',
    'lucide:layout-grid',
    'lucide:calendar',
    'lucide:image',
    'lucide:folder',
    'lucide:star',
    'lucide:heart',
    'lucide:bookmark',
    'lucide:tag',
    'lucide:users',
    'lucide:settings',
  ]

  const isCreating = ref(false)

  const slugify = (input: string) => {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  watch(
    () => form.value.title,
    (title) => {
      if (title) {
        form.value.slug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      }
    },
  )

  const createNewCollection = async () => {
    if (!currentApp.value) {
      ;(nuxtApp as any).$toast?.error('No active app. Please finish onboarding and try again.')
      return
    }
    if (!form.value.title) return

    const baseSlug = slugify(form.value.slug || form.value.title)
    const slug = collections.value.some((c) => c.slug === baseSlug) ? `${baseSlug}-${Date.now()}` : baseSlug

    isCreating.value = true
    try {
      const collectionId = await createCollection({
        appId: currentApp.value.id,
        title: form.value.title,
        description: form.value.description,
        icon: form.value.icon,
        type: form.value.type,
        slug,
        order: collections.value.length,
        isPublished: form.value.isPublished,
        createdBy: 'current-user',
      })

      // Find the newly created collection from reactive data
      const collection = collections.value.find((c) => c.id === collectionId)
      if (collection) {
        emit('created', collection)
        // Navigate to the new collection
        await navigateTo(`/collections/${collection.slug}`)
      }

      form.value = {
        title: '',
        description: '',
        icon: 'lucide:file-text',
        type: 'database',
        slug: '',
        isPublished: false,
      }
      selectedTemplateId.value = ''
      selectedSchema.value = null

      emit('update:open', false)
    } finally {
      isCreating.value = false
    }
  }
</script>

<template>
  <UiSheet :open="props.open" @update:open="emit('update:open', $event)">
    <UiSheetContent side="right" class="max-w-2xl overflow-y-auto">
      <UiSheetHeader>
        <UiSheetTitle>Create New Collection</UiSheetTitle>
        <UiSheetDescription>Add a new collection to your application</UiSheetDescription>
      </UiSheetHeader>

      <div class="space-y-6 py-6 px-6">
        <!-- Template Selection Dropdown -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Template (optional)</label>
          <UiSelect :model-value="selectedTemplateId" @update:model-value="onTemplateSelect">
            <UiSelectTrigger>
              <UiSelectValue placeholder="Start from scratch..." />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem :value="CLEAR_TEMPLATE_ID">Start from scratch</UiSelectItem>
              <UiSelectSeparator />
              <UiSelectItem v-for="t in templateOptions" :key="t.id" :value="t.id">
                <div class="flex items-center gap-2">
                  <Icon :name="t.icon" class="h-4 w-4 text-muted-foreground" />
                  <span>{{ t.name }}</span>
                </div>
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
          <p v-if="selectedTemplate" class="text-xs text-muted-foreground">
            {{ selectedTemplate.description }}
          </p>
        </div>

        <!-- Title -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Title</label>
          <UiInput v-model="form.title" placeholder="Collection title" />
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Description</label>
          <UiTextarea v-model="form.description" placeholder="Describe what this collection is for..." :rows="3" />
        </div>

        <!-- Slug -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Slug</label>
          <UiInput v-model="form.slug" placeholder="collection-slug" />
          <p class="text-muted-foreground text-xs">URL-friendly identifier</p>
        </div>

        <!-- Page Type -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Collection Type</label>
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="type in pageTypes"
              :key="type.value"
              type="button"
              class="border-border hover:bg-accent flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors"
              :class="{ 'border-primary bg-accent': form.type === type.value }"
              @click="form.type = type.value as Collection['type']">
              <div class="flex items-center gap-2">
                <Icon :name="type.icon" class="h-4 w-4" />
                <span class="text-sm font-medium">{{ type.label }}</span>
              </div>
              <p class="text-muted-foreground text-xs">{{ type.description }}</p>
            </button>
          </div>
        </div>

        <!-- Icon Picker -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Icon</label>
          <div class="grid grid-cols-8 gap-2">
            <button
              v-for="icon in popularIcons"
              :key="icon"
              type="button"
              class="hover:bg-accent flex h-10 w-10 items-center justify-center rounded-md border transition-colors"
              :class="{ 'border-primary bg-accent': form.icon === icon }"
              @click="form.icon = icon">
              <Icon :name="icon" class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Published -->
        <div class="flex items-center justify-between">
          <div class="space-y-0.5">
            <label class="text-sm font-medium">Published</label>
            <p class="text-muted-foreground text-xs">Make this page visible to others</p>
          </div>
          <UiSwitch v-model:checked="form.isPublished" />
        </div>
      </div>

      <UiSheetFooter>
        <UiButton variant="outline" @click="emit('update:open', false)">Cancel</UiButton>
        <UiButton :disabled="!form.title || isCreating" @click="createNewCollection">
          <Icon v-if="isCreating" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
          Create Collection
        </UiButton>
      </UiSheetFooter>
    </UiSheetContent>
  </UiSheet>
</template>
