<script lang="ts" setup>
  /**
   * DynamicEntityDialog — Schema-driven create/edit dialog for custom ontology entities.
   *
   * Renders fields dynamically from DynamicEntityTypeConfig.fields.
   * Uses EntityDialogShell for consistent dialog chrome.
   * CRUD via useEntities() (entities are Entities with type matching the ontology slug).
   */

  import type { Entity } from '~/types/entity'
  import { createDefaultItem } from '~/types/entity'
  import type { DynamicEntityTypeConfig } from '~/composables/useOntologyRegistry'

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'view' | 'create' | 'edit'
      item?: Entity | null
      typeConfig: DynamicEntityTypeConfig
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
    }>(),
    {
      mode: 'create',
      item: null,
      canNavigatePrev: false,
      canNavigateNext: false,
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    save: [item: Entity]
    delete: [item: Entity]
    navigatePrev: []
    navigateNext: []
  }>()

  const _nuxtApp = useNuxtApp()

  const mode = computed(() => props.mode)
  const isViewMode = computed(() => mode.value === 'view')
  const isCreateMode = computed(() => mode.value === 'create')

  // ── Editable item ──────────────────────────────────────────────────

  const editableItem: any = reactive(createDefaultItem(props.typeConfig.type as any))

  // Sync from props
  watch(
    () => props.item,
    (newItem) => {
      if (newItem) {
        Object.assign(editableItem, JSON.parse(JSON.stringify(newItem)))
      }
    },
    { immediate: true },
  )

  // Reset on create mode
  watch(
    () => props.open,
    (open) => {
      if (open && isCreateMode.value) {
        const defaults = createDefaultItem(props.typeConfig.type as any)
        Object.assign(editableItem, defaults)
        // Ensure type is set correctly
        editableItem.type = props.typeConfig.type
      }
    },
  )

  // ── Schema fields (non-title, non-description) ────────────────────

  interface RenderableField {
    name: string
    valueType: string
    required: boolean
    description: string
    icon: string
  }

  const VALUE_TYPE_ICONS: Record<string, string> = {
    title: 'lucide:type',
    rich_text: 'lucide:align-left',
    number: 'lucide:hash',
    select: 'lucide:chevrons-up-down',
    multi_select: 'lucide:list-checks',
    status: 'lucide:circle-dot',
    date: 'lucide:calendar',
    checkbox: 'lucide:check-square',
    url: 'lucide:link',
    email: 'lucide:mail',
    phone_number: 'lucide:phone',
    people: 'lucide:users',
    files: 'lucide:paperclip',
    relation: 'lucide:git-branch',
  }

  const contentFields = computed<RenderableField[]>(() => {
    if (!props.typeConfig?.fields) return []
    return props.typeConfig.fields
      .filter((f) => f.valueType !== 'title') // title is in the shell header
      .map((f) => ({
        name: f.name,
        valueType: f.valueType,
        required: f.required || false,
        description: f.description || '',
        icon: VALUE_TYPE_ICONS[f.valueType] || 'lucide:circle',
      }))
  })

  // Split into property fields (inline row) and content fields (main area)
  const PROPERTY_VALUE_TYPES = new Set(['select', 'multi_select', 'status', 'date', 'checkbox', 'people', 'number'])

  const propertyFields = computed(() =>
    contentFields.value.filter((f) => PROPERTY_VALUE_TYPES.has(f.valueType)),
  )

  const bodyFields = computed(() =>
    contentFields.value.filter((f) => !PROPERTY_VALUE_TYPES.has(f.valueType)),
  )

  // ── Title case helper ──────────────────────────────────────────────

  function titleCase(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
  }

  // ── Save / Delete ──────────────────────────────────────────────────

  const handleSave = () => {
    // Ensure type is set
    editableItem.type = props.typeConfig.type
    emit('save', { ...editableItem })
  }

  const handleDelete = () => {
    emit('delete', { ...editableItem })
  }

  const typeBadge = computed(() => ({
    icon: props.typeConfig.icon || 'lucide:database',
    label: props.typeConfig.label || props.typeConfig.type,
  }))
</script>

<template>
  <EntityDialogShell
    :open="props.open"
    :title="editableItem.title || ''"
    :description="editableItem.description || ''"
    :mode="mode"
    :type-badge="typeBadge"
    :title-placeholder="`New ${typeConfig.label}...`"
    :can-navigate-prev="canNavigatePrev"
    :can-navigate-next="canNavigateNext"
    @update:open="emit('update:open', $event)"
    @update:title="editableItem.title = $event"
    @update:description="editableItem.description = $event"
    @close="emit('close')"
    @navigate-prev="emit('navigatePrev')"
    @navigate-next="emit('navigateNext')">

    <!-- Properties row -->
    <template v-if="propertyFields.length > 0" #properties>
      <template v-for="field in propertyFields" :key="field.name">
        <!-- Status / Select -->
        <div v-if="field.valueType === 'status' || field.valueType === 'select'" class="inline-flex items-center gap-1.5">
          <Icon :name="field.icon" class="h-3.5 w-3.5 text-muted-foreground" />
          <input
            v-if="!isViewMode"
            v-model="editableItem[field.name]"
            type="text"
            :placeholder="titleCase(field.name)"
            class="bg-transparent text-xs outline-none w-20 placeholder:text-muted-foreground/50" />
          <span v-else-if="editableItem[field.name]" class="text-xs">{{ editableItem[field.name] }}</span>
          <span v-else class="text-xs text-muted-foreground/50">{{ titleCase(field.name) }}</span>
        </div>

        <!-- Date -->
        <div v-else-if="field.valueType === 'date'" class="inline-flex items-center gap-1.5">
          <Icon :name="field.icon" class="h-3.5 w-3.5 text-muted-foreground" />
          <input
            v-if="!isViewMode"
            v-model="editableItem[field.name]"
            type="date"
            class="bg-transparent text-xs outline-none placeholder:text-muted-foreground/50" />
          <span v-else-if="editableItem[field.name]" class="text-xs">{{ editableItem[field.name] }}</span>
          <span v-else class="text-xs text-muted-foreground/50">{{ titleCase(field.name) }}</span>
        </div>

        <!-- Number -->
        <div v-else-if="field.valueType === 'number'" class="inline-flex items-center gap-1.5">
          <Icon :name="field.icon" class="h-3.5 w-3.5 text-muted-foreground" />
          <input
            v-if="!isViewMode"
            v-model.number="editableItem[field.name]"
            type="number"
            :placeholder="titleCase(field.name)"
            class="bg-transparent text-xs outline-none w-20 placeholder:text-muted-foreground/50" />
          <span v-else-if="editableItem[field.name] != null" class="text-xs">{{ editableItem[field.name] }}</span>
          <span v-else class="text-xs text-muted-foreground/50">{{ titleCase(field.name) }}</span>
        </div>

        <!-- Checkbox -->
        <button
          v-else-if="field.valueType === 'checkbox'"
          class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs transition-colors"
          :class="editableItem[field.name] ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'"
          :disabled="isViewMode"
          @click="editableItem[field.name] = !editableItem[field.name]">
          <Icon :name="editableItem[field.name] ? 'lucide:check-square' : 'lucide:square'" class="h-3.5 w-3.5" />
          <span>{{ titleCase(field.name) }}</span>
        </button>

        <!-- People (text input fallback) -->
        <div v-else-if="field.valueType === 'people'" class="inline-flex items-center gap-1.5">
          <Icon :name="field.icon" class="h-3.5 w-3.5 text-muted-foreground" />
          <input
            v-if="!isViewMode"
            v-model="editableItem[field.name]"
            type="text"
            :placeholder="titleCase(field.name)"
            class="bg-transparent text-xs outline-none w-24 placeholder:text-muted-foreground/50" />
          <span v-else-if="editableItem[field.name]" class="text-xs">{{ editableItem[field.name] }}</span>
          <span v-else class="text-xs text-muted-foreground/50">{{ titleCase(field.name) }}</span>
        </div>
      </template>
    </template>

    <!-- Content area: body fields -->
    <div class="flex-1 overflow-y-auto">
      <div class="divide-y divide-border">
        <template v-for="field in bodyFields" :key="field.name">
          <!-- Rich text -->
          <div v-if="field.valueType === 'rich_text'" class="p-4">
            <label class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Icon :name="field.icon" class="h-3.5 w-3.5" />
              {{ titleCase(field.name) }}
            </label>
            <div class="mt-2">
              <UiRichTextEditor
                v-if="!isViewMode"
                v-model="editableItem[field.name]"
                :placeholder="`Add ${titleCase(field.name).toLowerCase()}...`" />
              <div v-else-if="editableItem[field.name]" class="prose prose-sm max-w-none" v-html="editableItem[field.name]" />
              <p v-else class="text-sm text-muted-foreground/50 italic">No content</p>
            </div>
          </div>

          <!-- URL -->
          <div v-else-if="field.valueType === 'url'" class="p-4">
            <label class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Icon :name="field.icon" class="h-3.5 w-3.5" />
              {{ titleCase(field.name) }}
            </label>
            <div class="mt-2">
              <input
                v-if="!isViewMode"
                v-model="editableItem[field.name]"
                type="url"
                :placeholder="`https://...`"
                class="w-full rounded-lg border border-border bg-transparent py-2 px-3 text-sm outline-none focus:ring-1 focus:ring-ring font-mono" />
              <a
                v-else-if="editableItem[field.name]"
                :href="editableItem[field.name]"
                target="_blank"
                class="text-sm text-primary hover:underline">
                {{ editableItem[field.name] }}
              </a>
              <p v-else class="text-sm text-muted-foreground/50 italic">No URL</p>
            </div>
          </div>

          <!-- Email -->
          <div v-else-if="field.valueType === 'email'" class="p-4">
            <label class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Icon :name="field.icon" class="h-3.5 w-3.5" />
              {{ titleCase(field.name) }}
            </label>
            <div class="mt-2">
              <input
                v-if="!isViewMode"
                v-model="editableItem[field.name]"
                type="email"
                placeholder="email@example.com"
                class="w-full rounded-lg border border-border bg-transparent py-2 px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
              <a
                v-else-if="editableItem[field.name]"
                :href="`mailto:${editableItem[field.name]}`"
                class="text-sm text-primary hover:underline">
                {{ editableItem[field.name] }}
              </a>
              <p v-else class="text-sm text-muted-foreground/50 italic">No email</p>
            </div>
          </div>

          <!-- Phone -->
          <div v-else-if="field.valueType === 'phone_number'" class="p-4">
            <label class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Icon :name="field.icon" class="h-3.5 w-3.5" />
              {{ titleCase(field.name) }}
            </label>
            <div class="mt-2">
              <input
                v-if="!isViewMode"
                v-model="editableItem[field.name]"
                type="tel"
                placeholder="+1 (555) 000-0000"
                class="w-full rounded-lg border border-border bg-transparent py-2 px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
              <a
                v-else-if="editableItem[field.name]"
                :href="`tel:${editableItem[field.name]}`"
                class="text-sm text-primary hover:underline">
                {{ editableItem[field.name] }}
              </a>
              <p v-else class="text-sm text-muted-foreground/50 italic">No phone</p>
            </div>
          </div>

          <!-- Fallback: generic text input -->
          <div v-else class="p-4">
            <label class="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Icon :name="field.icon" class="h-3.5 w-3.5" />
              {{ titleCase(field.name) }}
            </label>
            <div class="mt-2">
              <input
                v-if="!isViewMode"
                v-model="editableItem[field.name]"
                type="text"
                :placeholder="`Add ${titleCase(field.name).toLowerCase()}...`"
                class="w-full rounded-lg border border-border bg-transparent py-2 px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
              <p v-else-if="editableItem[field.name]" class="text-sm">{{ editableItem[field.name] }}</p>
              <p v-else class="text-sm text-muted-foreground/50 italic">Empty</p>
            </div>
          </div>
        </template>

        <!-- Empty state when no body fields -->
        <div v-if="bodyFields.length === 0" class="p-8 text-center">
          <p class="text-sm text-muted-foreground">All fields are shown in the properties row above.</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <template #footer-left>
      <span v-if="editableItem.createdAt" class="text-xs text-muted-foreground">
        Created {{ new Date(editableItem.createdAt).toLocaleDateString() }}
      </span>
    </template>

    <template #footer-right>
      <UiButton
        v-if="!isViewMode && !isCreateMode"
        variant="ghost"
        size="sm"
        class="text-destructive hover:text-destructive"
        @click="handleDelete">
        <Icon name="lucide:trash-2" class="mr-1.5 h-3.5 w-3.5" />
        Delete
      </UiButton>
      <UiButton v-if="!isViewMode" size="sm" @click="handleSave">
        <Icon name="lucide:check" class="mr-1.5 h-3.5 w-3.5" />
        {{ isCreateMode ? 'Create' : 'Save' }}
      </UiButton>
    </template>
  </EntityDialogShell>
</template>
