<script lang="ts" setup>
  export interface FolderFormData {
    name: string
    description: string
    icon: string
    color: string
  }

  const props = withDefaults(
    defineProps<{
      open: boolean
      initialData?: Partial<FolderFormData>
    }>(),
    {
      initialData: undefined,
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    save: [data: FolderFormData]
  }>()

  const iconOptions = [
    { value: 'lucide:folder', label: 'Folder' },
    { value: 'lucide:folder-tree', label: 'Tree' },
    { value: 'lucide:wind', label: 'Air' },
    { value: 'lucide:droplet', label: 'Water' },
    { value: 'lucide:shield', label: 'Safety' },
    { value: 'lucide:file-badge', label: 'Permits' },
  ]

  const colorOptions = [
    {
      value: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
      label: 'Sky',
    },
    {
      value: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      label: 'Blue',
    },
    {
      value: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      label: 'Amber',
    },
    {
      value: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      label: 'Emerald',
    },
    {
      value: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      label: 'Purple',
    },
  ]

  const form = reactive<FolderFormData>({
    name: '',
    description: '',
    icon: 'lucide:folder',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  })

  const applyInitialData = () => {
    if (!props.initialData) return
    form.name = props.initialData.name ?? ''
    form.description = props.initialData.description ?? ''
    form.icon = props.initialData.icon ?? 'lucide:folder'
    form.color =
      props.initialData.color ?? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }

  const resetForm = () => {
    form.name = ''
    form.description = ''
    form.icon = 'lucide:folder'
    form.color = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (!isOpen) return
      resetForm()
      applyInitialData()
    },
    { immediate: true },
  )

  const isValid = computed(() => form.name.trim().length > 0)

  const handleClose = () => {
    emit('update:open', false)
    emit('close')
  }

  const handleSubmit = () => {
    if (!isValid.value) return
    emit('save', { ...form, name: form.name.trim() })
  }
</script>

<template>
  <DialogWrapper
    :open="open"
    title="New Folder"
    description="Create a folder to organize tasks and documents."
    size="md"
    submit-label="Create"
    cancel-label="Cancel"
    :validation-status="isValid ? 'valid' : 'invalid'"
    :validation-message="isValid ? 'Ready to create' : 'Missing required field: name'"
    @update:open="emit('update:open', $event)"
    @close="handleClose"
    @submit="handleSubmit">
    <div class="p-6 space-y-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <UiLabel class="flex items-center gap-1">
            Name
            <span class="text-destructive">*</span>
          </UiLabel>
          <UiInput v-model="form.name" placeholder="e.g., Air Quality" />
        </div>

        <div class="space-y-2">
          <UiLabel>Icon</UiLabel>
          <UiSelect v-model="form.icon">
            <UiSelectTrigger>
              <UiSelectValue placeholder="Choose icon" />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem v-for="opt in iconOptions" :key="opt.value" :value="opt.value">
                <div class="flex items-center gap-2">
                  <Icon :name="opt.value" class="h-4 w-4 text-muted-foreground" />
                  <span>{{ opt.label }}</span>
                </div>
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
        </div>
      </div>

      <div class="space-y-2">
        <UiLabel>Description</UiLabel>
        <UiTextarea v-model="form.description" placeholder="Optional description..." :rows="4" />
      </div>

      <div class="space-y-2">
        <UiLabel>Color</UiLabel>
        <UiSelect v-model="form.color">
          <UiSelectTrigger>
            <template #value>
              <div class="flex items-center gap-2">
                <span :class="['inline-flex h-4 w-4 rounded', form.color.split(' ')[0]]" />
                <span class="text-sm">{{ colorOptions.find((c) => c.value === form.color)?.label || 'Color' }}</span>
              </div>
            </template>
          </UiSelectTrigger>
          <UiSelectContent>
            <UiSelectItem v-for="opt in colorOptions" :key="opt.value" :value="opt.value">
              <div class="flex items-center gap-2">
                <span :class="['inline-flex h-4 w-4 rounded', opt.value.split(' ')[0]]" />
                <span>{{ opt.label }}</span>
              </div>
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>
      </div>

      <div class="rounded-lg border border-border bg-muted/10 p-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg" :class="form.color">
            <Icon :name="form.icon" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">{{ form.name || 'Folder preview' }}</p>
            <p class="text-xs text-muted-foreground truncate">{{ form.description || 'No description' }}</p>
          </div>
        </div>
      </div>
    </div>
  </DialogWrapper>
</template>
