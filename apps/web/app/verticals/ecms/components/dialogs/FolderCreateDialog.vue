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
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :hide-close="true"
      class="w-[min(700px,calc(100vw-4rem))]! max-w-[min(700px,calc(100vw-4rem))]! p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col gap-0">
      <UiDialogTitle class="sr-only">New Folder</UiDialogTitle>
      <UiDialogDescription class="sr-only">Create a folder to organize tasks and documents.</UiDialogDescription>

      <!-- Header -->
      <div class="shrink-0 border-b border-border">
        <div class="px-4 pt-4 pb-3">
          <div class="flex items-center justify-between gap-3 mb-2">
            <div class="flex items-center gap-2">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg" :class="form.color">
                <Icon :name="form.icon" class="h-4 w-4" />
              </div>
              <p class="text-xs text-muted-foreground">Create a folder to organize tasks and documents.</p>
            </div>
            <UiButton variant="ghost" size="icon" class="h-7 w-7 shrink-0" @click="handleClose">
              <Icon name="lucide:x" class="h-4 w-4" />
            </UiButton>
          </div>
          <input
            v-model="form.name"
            type="text"
            placeholder="Folder name..."
            class="w-full text-xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0 -mx-1 transition-all" />
        </div>
      </div>

      <!-- Properties Row -->
      <div class="sticky top-0 z-10 bg-card px-4 py-2.5 border-b border-border">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Properties</p>
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <!-- Icon Picker -->
          <UiPopover>
            <UiPopoverTrigger as-child>
              <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Icon :name="form.icon" class="h-3.5 w-3.5" />
                <span>{{ iconOptions.find((i) => i.value === form.icon)?.label || 'Icon' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in iconOptions"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="form.icon = opt.value">
                <Icon :name="opt.value" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="form.icon === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Color Picker -->
          <UiPopover>
            <UiPopoverTrigger as-child>
              <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <span :class="['inline-flex h-3 w-3 rounded-full', form.color.split(' ')[0]]" />
                <span>{{ colorOptions.find((c) => c.value === form.color)?.label || 'Color' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in colorOptions"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="form.color = opt.value">
                <span :class="['inline-flex h-3 w-3 rounded-full', opt.value.split(' ')[0]]" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="form.color === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-4 space-y-4">
          <!-- Description -->
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
            <UiTextarea v-model="form.description" placeholder="Optional description..." :rows="4" class="text-sm" />
          </div>

          <!-- Preview -->
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
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
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between">
        <div
          class="flex items-center gap-2 rounded-lg px-3 py-1.5"
          :class="isValid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'">
          <Icon
            :name="isValid ? 'lucide:check-circle' : 'lucide:alert-circle'"
            class="h-3.5 w-3.5" />
          <span class="text-xs font-medium">{{ isValid ? 'Ready to create' : 'Name is required' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UiButton variant="outline" size="sm" @click="handleClose">Cancel</UiButton>
          <UiButton size="sm" :disabled="!isValid" @click="handleSubmit">Create</UiButton>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
