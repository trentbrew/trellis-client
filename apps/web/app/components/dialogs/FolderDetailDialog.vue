<script lang="ts" setup>
  export interface FolderData {
    id: string
    name: string
    icon: string
    color: string
    itemCount: number
    lastModified: string
    description?: string
  }

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'create' | 'edit'
      folder: FolderData | null
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
    }>(),
    {
      mode: 'edit',
      canNavigatePrev: false,
      canNavigateNext: false,
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    save: [folder: FolderData]
    delete: [folder: FolderData]
    navigatePrev: []
    navigateNext: []
  }>()

  const iconOptions = [
    { value: 'lucide:folder', label: 'Folder' },
    { value: 'lucide:wind', label: 'Air' },
    { value: 'lucide:cloud-rain', label: 'Rain' },
    { value: 'lucide:flask-conical', label: 'Flask' },
    { value: 'lucide:hard-hat', label: 'Safety' },
    { value: 'lucide:file-badge', label: 'Permits' },
    { value: 'lucide:clipboard-check', label: 'Inspect' },
    { value: 'lucide:siren', label: 'Emergency' },
    { value: 'lucide:droplets', label: 'Water' },
    { value: 'lucide:volume-2', label: 'Noise' },
    { value: 'lucide:alert-triangle', label: 'Spill' },
    { value: 'lucide:beaker', label: 'Chemical' },
    { value: 'lucide:file-text', label: 'Report' },
  ]

  const colorOptions = [
    { value: 'text-blue-500', label: 'Blue', dot: 'bg-blue-500' },
    { value: 'text-cyan-500', label: 'Cyan', dot: 'bg-cyan-500' },
    { value: 'text-amber-500', label: 'Amber', dot: 'bg-amber-500' },
    { value: 'text-emerald-500', label: 'Emerald', dot: 'bg-emerald-500' },
    { value: 'text-purple-500', label: 'Purple', dot: 'bg-purple-500' },
    { value: 'text-rose-500', label: 'Rose', dot: 'bg-rose-500' },
    { value: 'text-red-500', label: 'Red', dot: 'bg-red-500' },
    { value: 'text-indigo-500', label: 'Indigo', dot: 'bg-indigo-500' },
    { value: 'text-orange-500', label: 'Orange', dot: 'bg-orange-500' },
    { value: 'text-teal-500', label: 'Teal', dot: 'bg-teal-500' },
  ]

  const defaultFolder: FolderData = {
    id: '',
    name: '',
    icon: 'lucide:folder',
    color: 'text-blue-500',
    itemCount: 0,
    lastModified: new Date().toISOString().split('T')[0] ?? '',
    description: '',
  }

  const editableFolder = reactive<FolderData>({ ...defaultFolder })

  watch(
    () => props.folder,
    (newFolder) => {
      if (newFolder) {
        Object.assign(editableFolder, { ...defaultFolder, ...newFolder })
      } else if (props.mode === 'create') {
        Object.assign(editableFolder, { ...defaultFolder, id: `folder-${Date.now()}` })
      }
    },
    { immediate: true, deep: true },
  )

  const iconOpen = ref(false)
  const colorOpen = ref(false)

  const currentIcon = computed(() => iconOptions.find((i) => i.value === editableFolder.icon))
  const currentColor = computed(() => colorOptions.find((c) => c.value === editableFolder.color))

  const isFormValid = computed(() => editableFolder.name?.trim().length > 0)

  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }

  const handleSave = () => {
    emit('save', { ...editableFolder })
    closeDialog()
  }

  const handleDelete = () => {
    emit('delete', { ...editableFolder })
    closeDialog()
  }
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :hide-close="true"
      class="w-[min(600px,calc(100vw-4rem))]! max-w-[min(600px,calc(100vw-4rem))]! p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col gap-0">
      <UiDialogTitle class="sr-only">{{ mode === 'create' ? 'New Folder' : editableFolder.name || 'Folder' }}</UiDialogTitle>
      <UiDialogDescription class="sr-only">{{ mode === 'create' ? 'Create a new folder.' : 'View and edit folder details.' }}</UiDialogDescription>

      <!-- Header -->
      <div class="shrink-0 border-b border-border">
        <div class="px-4 pt-4 pb-3">
          <div class="flex items-center justify-between gap-3 mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Icon :name="editableFolder.icon || 'lucide:folder'" :class="['h-4 w-4', editableFolder.color]" />
              </div>
              <p class="text-xs text-muted-foreground truncate">
                {{ mode === 'create' ? 'Create a new folder.' : `${editableFolder.itemCount} items · Updated ${editableFolder.lastModified}` }}
              </p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <template v-if="mode === 'edit'">
                <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="!canNavigatePrev" @click="emit('navigatePrev')">
                  <Icon name="lucide:chevron-up" class="h-4 w-4" />
                </UiButton>
                <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="!canNavigateNext" @click="emit('navigateNext')">
                  <Icon name="lucide:chevron-down" class="h-4 w-4" />
                </UiButton>
              </template>
              <UiButton variant="ghost" size="icon" class="h-7 w-7" @click="closeDialog">
                <Icon name="lucide:x" class="h-4 w-4" />
              </UiButton>
            </div>
          </div>
          <input
            v-model="editableFolder.name"
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
          <UiPopover v-model:open="iconOpen">
            <UiPopoverTrigger as-child>
              <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Icon :name="editableFolder.icon || 'lucide:folder'" class="h-3.5 w-3.5" />
                <span>{{ currentIcon?.label || 'Icon' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-1">
              <div class="grid grid-cols-4 gap-1">
                <button
                  v-for="opt in iconOptions"
                  :key="opt.value"
                  class="flex flex-col items-center gap-1 rounded p-2 hover:bg-muted text-xs"
                  :class="editableFolder.icon === opt.value ? 'bg-muted ring-1 ring-primary' : ''"
                  @click="editableFolder.icon = opt.value; iconOpen = false">
                  <Icon :name="opt.value" class="h-4 w-4" />
                  <span class="text-[10px] text-muted-foreground truncate">{{ opt.label }}</span>
                </button>
              </div>
            </UiPopoverContent>
          </UiPopover>

          <!-- Color Picker -->
          <UiPopover v-model:open="colorOpen">
            <UiPopoverTrigger as-child>
              <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <span :class="['inline-flex h-3 w-3 rounded-full', currentColor?.dot || 'bg-blue-500']" />
                <span>{{ currentColor?.label || 'Color' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-48 p-1">
              <div class="grid grid-cols-5 gap-1">
                <button
                  v-for="opt in colorOptions"
                  :key="opt.value"
                  class="flex items-center justify-center rounded p-2 hover:bg-muted"
                  :class="editableFolder.color === opt.value ? 'ring-1 ring-primary bg-muted' : ''"
                  :title="opt.label"
                  @click="editableFolder.color = opt.value; colorOpen = false">
                  <span :class="['inline-flex h-4 w-4 rounded-full', opt.dot]" />
                </button>
              </div>
            </UiPopoverContent>
          </UiPopover>

          <!-- Item Count (read-only in edit mode) -->
          <div v-if="mode === 'edit'" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
            <Icon name="lucide:file" class="h-3.5 w-3.5" />
            <span>{{ editableFolder.itemCount }} items</span>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-4 space-y-4">
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
            <UiTextarea
              v-model="editableFolder.description"
              placeholder="Describe what this folder contains..."
              :rows="3"
              class="text-sm" />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between">
        <div class="flex items-center gap-2 rounded-lg px-3 py-1.5" :class="isFormValid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'">
          <Icon :name="isFormValid ? 'lucide:check-circle' : 'lucide:alert-circle'" class="h-3.5 w-3.5" />
          <span class="text-xs font-medium">{{ isFormValid ? 'Ready' : 'Folder name required' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UiButton
            v-if="mode === 'edit'"
            variant="outline"
            size="sm"
            class="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 dark:border-red-800 dark:hover:bg-red-900/20"
            @click="handleDelete">
            <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
            Delete
          </UiButton>
          <UiButton variant="outline" size="sm" @click="closeDialog">Cancel</UiButton>
          <UiButton size="sm" :disabled="!isFormValid" @click="handleSave">
            {{ mode === 'create' ? 'Create' : 'Save' }}
          </UiButton>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
