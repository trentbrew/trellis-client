<script lang="ts" setup>
  export interface EventData {
    id: string
    title: string
    date: string
    type: string
    category: string
    description?: string
    location?: string
  }

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'create' | 'edit'
      event: EventData | null
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
    save: [event: EventData]
    delete: [event: EventData]
    navigatePrev: []
    navigateNext: []
  }>()

  const typeOptions = [
    { value: 'deadline', label: 'Deadline', icon: 'lucide:alert-circle', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    { value: 'inspection', label: 'Inspection', icon: 'lucide:clipboard-check', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'training', label: 'Training', icon: 'lucide:graduation-cap', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    { value: 'event', label: 'Event', icon: 'lucide:calendar', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { value: 'meeting', label: 'Meeting', icon: 'lucide:users', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  ]

  const categoryOptions = [
    { value: 'permits', label: 'Permits', icon: 'lucide:file-text' },
    { value: 'tasks', label: 'Tasks', icon: 'lucide:check-square' },
    { value: 'training', label: 'Training', icon: 'lucide:graduation-cap' },
    { value: 'waste', label: 'Waste', icon: 'lucide:trash-2' },
    { value: 'safety', label: 'Safety', icon: 'lucide:shield' },
  ]

  const getToday = () => new Date().toISOString().split('T')[0] ?? ''

  const defaultEvent: EventData = {
    id: '',
    title: '',
    date: getToday(),
    type: 'event',
    category: 'tasks',
    description: '',
    location: '',
  }

  const editableEvent = reactive<EventData>({ ...defaultEvent })

  watch(
    () => props.event,
    (newEvent) => {
      if (newEvent) {
        Object.assign(editableEvent, { ...defaultEvent, ...newEvent })
      } else if (props.mode === 'create') {
        Object.assign(editableEvent, { ...defaultEvent, id: `event-${Date.now()}` })
      }
    },
    { immediate: true, deep: true },
  )

  const typeOpen = ref(false)
  const categoryOpen = ref(false)

  const currentType = computed(() => typeOptions.find((t) => t.value === editableEvent.type))
  const currentCategory = computed(() => categoryOptions.find((c) => c.value === editableEvent.category))

  const isFormValid = computed(() => editableEvent.title?.trim() && editableEvent.date)

  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }

  const handleSave = () => {
    emit('save', { ...editableEvent })
    closeDialog()
  }

  const handleDelete = () => {
    emit('delete', { ...editableEvent })
    closeDialog()
  }
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :hide-close="true"
      class="w-[min(700px,calc(100vw-4rem))]! max-w-[min(700px,calc(100vw-4rem))]! p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col gap-0">
      <UiDialogTitle class="sr-only">{{ mode === 'create' ? 'New Event' : editableEvent.title || 'Event' }}</UiDialogTitle>
      <UiDialogDescription class="sr-only">{{ mode === 'create' ? 'Create a new calendar event.' : 'View and edit event details.' }}</UiDialogDescription>

      <!-- Header -->
      <div class="shrink-0 border-b border-border">
        <div class="px-4 pt-4 pb-3">
          <div class="flex items-center justify-between gap-3 mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <span
                v-if="currentType"
                :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', currentType.color]">
                {{ currentType.label }}
              </span>
              <p class="text-xs text-muted-foreground truncate">
                {{ mode === 'create' ? 'Create a new calendar event.' : 'View and edit event details.' }}
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
            v-model="editableEvent.title"
            type="text"
            placeholder="Event name..."
            class="w-full text-xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0 -mx-1 transition-all" />
        </div>
      </div>

      <!-- Properties Row -->
      <div class="sticky top-0 z-10 bg-card px-4 py-2.5 border-b border-border">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Properties</p>
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <!-- Date -->
          <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
            <Icon name="lucide:calendar" class="h-3.5 w-3.5" />
            <input
              v-model="editableEvent.date"
              type="date"
              class="bg-transparent border-none outline-none text-xs w-28" />
          </div>

          <!-- Type Picker -->
          <UiPopover v-model:open="typeOpen">
            <UiPopoverTrigger as-child>
              <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Icon :name="currentType?.icon || 'lucide:calendar'" class="h-3.5 w-3.5" />
                <span>{{ currentType?.label || 'Type' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in typeOptions"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="editableEvent.type = opt.value; typeOpen = false">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editableEvent.type === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Category Picker -->
          <UiPopover v-model:open="categoryOpen">
            <UiPopoverTrigger as-child>
              <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Icon :name="currentCategory?.icon || 'lucide:tag'" class="h-3.5 w-3.5" />
                <span>{{ currentCategory?.label || 'Category' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in categoryOptions"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="editableEvent.category = opt.value; categoryOpen = false">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editableEvent.category === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-4 space-y-4">
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
            <UiTextarea
              v-model="editableEvent.description"
              placeholder="Add event details, notes, or instructions..."
              :rows="4"
              class="text-sm" />
          </div>
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>
            <UiInput
              v-model="editableEvent.location"
              placeholder="e.g. Conference Room A, Building 3"
              class="text-sm" />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between">
        <div class="flex items-center gap-2 rounded-lg px-3 py-1.5" :class="isFormValid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'">
          <Icon :name="isFormValid ? 'lucide:check-circle' : 'lucide:alert-circle'" class="h-3.5 w-3.5" />
          <span class="text-xs font-medium">{{ isFormValid ? 'Ready' : 'Name & date required' }}</span>
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
