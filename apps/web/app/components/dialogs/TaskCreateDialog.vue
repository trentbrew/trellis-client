<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'
  import type { TrackedStatus } from '~/types/ecms/common'

  export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'custom'
  export type Category =
    | 'Air'
    | 'Water'
    | 'Waste'
    | 'SPCC'
    | 'EPCRA'
    | 'Fire Safety'
    | 'General Safety'
    | 'Industrial Hygiene'
    | 'Machine Guarding'
    | 'Lockout/Tagout'
    | 'Emergency Preparedness'
    | 'Respiratory Protection'
    | 'Personal Protective Equipment'
    | 'Vehicle Safety'
    | 'Corp'

  export interface TaskTemplate {
    id: string
    name: string
    description: string
    category: Category
    frequency: Frequency
    tracked: TrackedStatus
  }

  export interface Owner {
    id: string
    name: string
    email?: string
    avatar?: string
    role?: string
  }

  export interface StandardTask {
    id: string
    name: string
  }

  export type CustomFieldType = 'text' | 'textarea' | 'image' | 'task-completion-lock' | 'repeating-task-lock'

  export interface CustomFieldDefinition {
    id: string
    fieldType: CustomFieldType
    fieldName: string
    fieldHelpText: string
  }

  export interface TaskFormData {
    title: string
    description: string
    frequency: Frequency
    nextDue: string
    customIntervalDays: string
    owner: string
    category: string
    tracked: TrackedStatus
    permitRef: string
    involved: string[]
    standardTaskId: string
    folder: string
    reminderTiming: string[]
    reminderMethods: string[]
    customFields: CustomFieldDefinition[]
  }

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'create' | 'edit'
      isRecurring?: boolean
      initialData?: Partial<TaskFormData>
      overlayClass?: HTMLAttributes['class']
      templates?: TaskTemplate[]
      categories?: Category[]
      owners?: Owner[]
      folders?: string[]
      standardTasks?: StandardTask[]
    }>(),
    {
      mode: 'create',
      isRecurring: true,
      overlayClass: undefined,
      templates: () => [],
      categories: () => ['Air', 'Water', 'Waste', 'SPCC', 'EPCRA', 'Fire Safety', 'General Safety', 'Corp'],
      owners: () => [],
      folders: () => [],
      standardTasks: () => [],
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    save: [data: TaskFormData]
  }>()

  const getToday = () => new Date().toISOString().split('T')[0] ?? ''

  const selectedTemplate = ref<string | null>(null)
  const templateSearchQuery = ref('')
  const involvedSearchQuery = ref('')
  const templateComboboxOpen = ref(false)
  const showInvolvedDropdown = ref(false)

  const form = reactive<TaskFormData>({
    title: '',
    description: '',
    frequency: 'monthly',
    nextDue: getToday(),
    customIntervalDays: '',
    owner: '',
    category: 'General Safety',
    tracked: true,
    permitRef: '',
    involved: [],
    standardTaskId: '',
    folder: '',
    reminderTiming: [],
    reminderMethods: [],
    customFields: [],
  })

  const frequencyOptions: { value: Frequency; label: string; description: string }[] = [
    { value: 'daily', label: 'Daily', description: 'Every day' },
    { value: 'weekly', label: 'Weekly', description: 'Once per week' },
    { value: 'monthly', label: 'Monthly', description: 'Once per month' },
    { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
    { value: 'annually', label: 'Annually', description: 'Once per year' },
    { value: 'custom', label: 'Custom', description: 'Define custom schedule' },
  ]

  const reminderTimingOptions = ['1 day before', '3 days before', '1 week before', '2 weeks before']

  const reminderMethodOptions = [
    { value: 'email', label: 'Email', icon: 'lucide:mail' },
    { value: 'in-app', label: 'In-app notification', icon: 'lucide:bell' },
    { value: 'sms', label: 'SMS', icon: 'lucide:message-square' },
  ]

  const trackingOptions: {
    value: TrackedStatus
    label: string
    description: string
    icon: string
    color: 'blue' | 'emerald' | 'slate'
  }[] = [
    {
      value: true,
      label: 'Tracked (corporate)',
      description: 'Escalates to corporate if overdue',
      icon: 'lucide:building-2',
      color: 'blue',
    },
    {
      value: 'facility',
      label: 'Tracked (facility)',
      description: 'Escalates within facility only',
      icon: 'lucide:factory',
      color: 'emerald',
    },
    {
      value: false,
      label: 'Untracked',
      description: 'No escalation notifications',
      icon: 'lucide:eye-off',
      color: 'slate',
    },
  ]

  const frequencyStyles: Record<Frequency, { bg: string; color: string }> = {
    daily: { bg: 'bg-rose-500/10', color: 'text-rose-500' },
    weekly: { bg: 'bg-blue-500/10', color: 'text-blue-500' },
    monthly: { bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
    quarterly: { bg: 'bg-amber-500/10', color: 'text-amber-500' },
    annually: { bg: 'bg-violet-500/10', color: 'text-violet-500' },
    custom: { bg: 'bg-slate-500/10', color: 'text-slate-500' },
  }

  const filteredTemplates = computed(() => {
    if (!templateSearchQuery.value) return props.templates
    const query = templateSearchQuery.value.toLowerCase()
    return props.templates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query),
    )
  })

  const filteredOwners = computed(() => {
    if (!involvedSearchQuery.value) return props.owners
    const query = involvedSearchQuery.value.toLowerCase()
    return props.owners.filter((owner) => owner.name.toLowerCase().includes(query))
  })

  const isFormValid = computed(() => {
    return form.title.trim().length > 0 && form.owner.trim().length > 0 && form.nextDue
  })

  const detailsTabHasMissingRequired = computed(() => {
    return !form.owner.trim()
  })

  const sidebarHasMissingRequired = computed(() => {
    return !form.nextDue
  })

  const resetForm = () => {
    form.title = ''
    form.description = ''
    form.frequency = 'monthly'
    form.nextDue = getToday()
    form.customIntervalDays = ''
    form.owner = ''
    form.category = 'General Safety'
    form.tracked = true
    form.permitRef = ''
    form.involved = []
    form.standardTaskId = ''
    form.folder = ''
    form.reminderTiming = []
    form.reminderMethods = []
    form.customFields = []
    selectedTemplate.value = null
    templateSearchQuery.value = ''
    involvedSearchQuery.value = ''
  }

  const applyInitialData = () => {
    if (props.initialData) {
      Object.assign(form, props.initialData)
    }
  }

  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen) {
        resetForm()
        applyInitialData()
      }
    },
  )

  const applyTemplate = (templateId: string) => {
    const template = props.templates.find((t) => t.id === templateId)
    if (template) {
      selectedTemplate.value = templateId
      form.title = template.name
      form.description = template.description
      form.category = template.category
      form.frequency = template.frequency
      form.tracked = template.tracked
    }
  }

  const clearTemplate = () => {
    selectedTemplate.value = null
  }

  const toggleInvolved = (name: string) => {
    const index = form.involved.indexOf(name)
    if (index === -1) {
      form.involved.push(name)
    } else {
      form.involved.splice(index, 1)
    }
  }

  const handleInvolvedBlur = () => {
    setTimeout(() => {
      showInvolvedDropdown.value = false
    }, 200)
  }

  const toggleArrayValue = (arr: string[], value: string, checked: boolean) => {
    const index = arr.indexOf(value)
    if (checked && index === -1) {
      arr.push(value)
    } else if (!checked && index !== -1) {
      arr.splice(index, 1)
    }
  }

  const customFieldTypeOptions: { value: CustomFieldType; label: string; icon: string }[] = [
    { value: 'text', label: 'text', icon: 'lucide:type' },
    { value: 'textarea', label: 'long text', icon: 'lucide:align-left' },
    { value: 'image', label: 'file upload', icon: 'lucide:image' },
    { value: 'task-completion-lock', label: 'task completion lock', icon: 'lucide:lock' },
    { value: 'repeating-task-lock', label: 'repeating task lock', icon: 'lucide:repeat' },
  ]

  const addCustomField = () => {
    form.customFields.push({
      id: crypto.randomUUID(),
      fieldType: 'text',
      fieldName: '',
      fieldHelpText: '',
    })
  }

  const removeCustomField = (index: number) => {
    form.customFields.splice(index, 1)
  }

  const handleSave = () => {
    emit('save', { ...form })
  }

  const handleCancel = () => {
    emit('update:open', false)
    emit('close')
  }
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :overlay-class="overlayClass"
      class="w-[min(1200px,calc(100vw-6rem))]! max-w-[min(1200px,calc(100vw-6rem))]! h-[min(800px,calc(100vh-6rem))] max-h-[min(800px,calc(100vh-6rem))] p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col">
      <div class="flex flex-1 min-h-0">
        <!-- Main Form Area -->
        <div class="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <!-- Linear-style Editable Header -->
          <div class="border-b border-border px-6 py-5 shrink-0 bg-muted/20">
            <div class="flex items-center gap-3 mb-4">
              <UiPopover v-if="templates.length > 0" v-model:open="templateComboboxOpen">
                <UiPopoverTrigger as-child>
                  <UiButton variant="outline" size="sm" class="h-7 gap-1.5 text-xs">
                    <Icon name="lucide:layout-template" class="h-3.5 w-3.5" />
                    <span v-if="selectedTemplate" class="text-primary">
                      {{ templates.find((t) => t.id === selectedTemplate)?.name }}
                    </span>
                    <span v-else class="text-muted-foreground">Start with a template</span>
                    <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-50" />
                  </UiButton>
                </UiPopoverTrigger>
                <UiPopoverContent class="w-80 p-0" align="start">
                  <UiCommand>
                    <UiCommandInput v-model="templateSearchQuery" placeholder="Search templates..." />
                    <UiCommandList>
                      <UiCommandEmpty>No templates found.</UiCommandEmpty>
                      <UiCommandGroup>
                        <UiCommandItem
                          v-for="template in filteredTemplates"
                          :key="template.id"
                          :value="template.name"
                          class="flex items-center gap-3 py-2"
                          @select="() => { applyTemplate(template.id); templateComboboxOpen = false }">
                          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                            <Icon name="lucide:file-text" class="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium truncate">{{ template.name }}</p>
                            <div class="flex items-center gap-2 mt-0.5">
                              <span
                                class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                                :class="[frequencyStyles[template.frequency].bg, frequencyStyles[template.frequency].color]">
                                {{ template.frequency }}
                              </span>
                              <span class="text-[10px] text-muted-foreground">{{ template.category }}</span>
                            </div>
                          </div>
                          <Icon
                            v-if="selectedTemplate === template.id"
                            name="lucide:check"
                            class="h-4 w-4 text-primary shrink-0" />
                        </UiCommandItem>
                      </UiCommandGroup>
                      <UiCommandSeparator v-if="selectedTemplate" />
                      <UiCommandGroup v-if="selectedTemplate">
                        <UiCommandItem
                          value="clear-template"
                          class="text-muted-foreground"
                          @select="() => { clearTemplate(); templateComboboxOpen = false }">
                          <Icon name="lucide:x" class="mr-2 h-4 w-4" />
                          Clear template
                        </UiCommandItem>
                      </UiCommandGroup>
                    </UiCommandList>
                  </UiCommand>
                </UiPopoverContent>
              </UiPopover>
              <UiBadge v-if="isRecurring" variant="outline" class="text-[10px] font-semibold uppercase tracking-wider">
                <Icon name="lucide:repeat" class="mr-1 h-3 w-3" />
                Recurring
              </UiBadge>
              <UiBadge v-else variant="outline" class="text-[10px] font-semibold uppercase tracking-wider">
                <Icon name="lucide:check-square" class="mr-1 h-3 w-3" />
                One-time
              </UiBadge>
            </div>
            <input
              v-model="form.title"
              type="text"
              :placeholder="isRecurring ? 'Schedule name' : 'Task name'"
              class="w-full text-2xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:outline-none" />
            <textarea
              v-model="form.description"
              placeholder="Add a description..."
              rows="1"
              class="w-full mt-2 text-sm text-muted-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/40 focus:outline-none" />
          </div>

          <!-- Properties Bar (horizontal summary) -->
          <div class="border-b border-border px-6 py-3 bg-muted/10 shrink-0">
            <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div v-if="isRecurring" class="flex items-center gap-2">
                <span class="text-muted-foreground text-xs">Frequency</span>
                <span
                  class="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  :class="[frequencyStyles[form.frequency].bg, frequencyStyles[form.frequency].color]">
                  {{ frequencyOptions.find((opt) => opt.value === form.frequency)?.label }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground text-xs">Due</span>
                <span class="font-medium text-xs">{{ form.nextDue || '—' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground text-xs">Owner</span>
                <span class="font-medium text-xs">{{ form.owner || '—' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground text-xs">Category</span>
                <span class="font-medium text-xs">{{ form.category || '—' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground text-xs">Folder</span>
                <span class="font-medium text-xs">{{ form.folder === 'none' ? '—' : form.folder || '—' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <Icon
                  :name="form.tracked === true ? 'lucide:building-2' : form.tracked === 'facility' ? 'lucide:factory' : 'lucide:eye-off'"
                  class="h-3.5 w-3.5"
                  :class="form.tracked === true ? 'text-blue-600' : form.tracked === 'facility' ? 'text-emerald-600' : 'text-muted-foreground'" />
                <span class="text-xs" :class="form.tracked === true ? 'text-blue-600' : form.tracked === 'facility' ? 'text-emerald-600' : 'text-muted-foreground'">
                  {{ form.tracked === true ? 'Tracked (corporate)' : form.tracked === 'facility' ? 'Tracked (facility)' : 'Untracked' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Details Section -->
          <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div class="border-b border-border px-6 py-3 shrink-0">
              <div class="flex items-center gap-2 text-sm font-medium">
                <Icon name="lucide:info" class="h-4 w-4 text-muted-foreground" />
                Details
                <span
                  v-if="detailsTabHasMissingRequired"
                  class="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                  !
                </span>
              </div>
            </div>

            <!-- Details Content -->
            <div class="flex-1 overflow-y-auto">
              <div class="grid gap-6 px-6 py-6 md:grid-cols-2">
                <div class="space-y-4">
                  <div v-if="standardTasks.length > 0" class="space-y-2">
                    <UiLabel>Standard task ID</UiLabel>
                    <UiSelect v-model="form.standardTaskId">
                      <UiSelectTrigger>
                        <UiSelectValue placeholder="Select standard task" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem value="none">None</UiSelectItem>
                        <UiSelectItem v-for="task in standardTasks" :key="task.id" :value="task.id">
                          {{ task.id }} - {{ task.name }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <div v-if="folders.length > 0" class="space-y-2">
                    <UiLabel>Folder</UiLabel>
                    <UiSelect v-model="form.folder">
                      <UiSelectTrigger>
                        <UiSelectValue placeholder="Assign folder" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem value="none">No folder</UiSelectItem>
                        <UiSelectItem v-for="folder in folders" :key="folder" :value="folder">
                          {{ folder }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <div class="space-y-2">
                    <UiLabel>Category</UiLabel>
                    <UiSelect v-model="form.category">
                      <UiSelectTrigger>
                        <UiSelectValue placeholder="Select category" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem v-for="category in categories" :key="category" :value="category">
                          {{ category }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                  <div class="space-y-2">
                    <UiLabel class="flex items-center gap-1">
                      Owner
                      <span class="text-destructive">*</span>
                    </UiLabel>
                    <UiSelect v-model="form.owner">
                      <UiSelectTrigger>
                        <UiSelectValue placeholder="Select owner" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem v-for="owner in owners" :key="owner.id" :value="owner.name">
                          {{ owner.name }}
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                  </div>
                </div>
                <div class="space-y-4">
                  <div v-if="owners.length > 0" class="space-y-2">
                    <UiLabel>Involved parties</UiLabel>
                    <div v-if="form.involved.length" class="flex flex-wrap gap-2 mb-2">
                      <UiBadge
                        v-for="person in form.involved"
                        :key="person"
                        variant="outline"
                        class="flex items-center gap-1">
                        <Icon name="lucide:user" class="h-3 w-3" />
                        {{ person }}
                        <button type="button" class="ml-1 text-muted-foreground" @click="toggleInvolved(person)">
                          <Icon name="lucide:x" class="h-3 w-3" />
                        </button>
                      </UiBadge>
                    </div>
                    <div class="relative">
                      <UiInput
                        v-model="involvedSearchQuery"
                        placeholder="Search and select people"
                        @focus="showInvolvedDropdown = true"
                        @blur="handleInvolvedBlur" />
                      <div
                        v-if="showInvolvedDropdown && filteredOwners.length"
                        class="absolute z-20 mt-2 w-full rounded-lg border border-border bg-card shadow-lg">
                        <button
                          v-for="owner in filteredOwners"
                          :key="owner.id"
                          type="button"
                          class="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted/40"
                          @click="toggleInvolved(owner.name)">
                          <span class="flex items-center gap-2">
                            <img
                              v-if="owner.avatar"
                              :src="owner.avatar"
                              :alt="owner.name"
                              class="h-5 w-5 rounded-full" />
                            <Icon v-else name="lucide:user" class="h-4 w-4 text-muted-foreground" />
                            <span>
                              <span class="font-medium">{{ owner.name }}</span>
                              <span v-if="owner.role" class="ml-1 text-xs text-muted-foreground">{{ owner.role }}</span>
                            </span>
                          </span>
                          <Icon
                            v-if="form.involved.includes(owner.name)"
                            name="lucide:check"
                            class="h-4 w-4 text-primary" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <UiLabel>Permit reference (optional)</UiLabel>
                    <UiInput v-model="form.permitRef" placeholder="Title V #2024-001" />
                  </div>
                  <div class="space-y-2">
                    <UiLabel>Custom fields</UiLabel>
                    <div class="space-y-3">
                      <div
                        v-for="(field, index) in form.customFields"
                        :key="field.id"
                        class="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                        <div class="flex items-start justify-between gap-2">
                          <div class="flex-1 grid gap-3 sm:grid-cols-2">
                            <div class="space-y-1.5">
                              <UiLabel class="text-xs text-muted-foreground">Field type</UiLabel>
                              <UiSelect v-model="field.fieldType">
                                <UiSelectTrigger class="h-8 text-xs">
                                  <UiSelectValue placeholder="Select type" />
                                </UiSelectTrigger>
                                <UiSelectContent>
                                  <UiSelectItem
                                    v-for="opt in customFieldTypeOptions"
                                    :key="opt.value"
                                    :value="opt.value"
                                    class="text-xs">
                                    <div class="flex items-center gap-2">
                                      <Icon :name="opt.icon" class="h-3.5 w-3.5" />
                                      {{ opt.label }}
                                    </div>
                                  </UiSelectItem>
                                </UiSelectContent>
                              </UiSelect>
                            </div>
                            <div class="space-y-1.5">
                              <UiLabel class="text-xs text-muted-foreground">Field name</UiLabel>
                              <UiInput v-model="field.fieldName" placeholder="e.g., Inspector Notes" class="h-8 text-xs" />
                            </div>
                          </div>
                          <UiButton variant="ghost" size="icon" class="h-8 w-8 shrink-0" @click="removeCustomField(index)">
                            <Icon name="lucide:trash-2" class="h-4 w-4 text-muted-foreground" />
                          </UiButton>
                        </div>
                        <div class="space-y-1.5">
                          <UiLabel class="text-xs text-muted-foreground">Field help text</UiLabel>
                          <UiTextarea
                            v-model="field.fieldHelpText"
                            placeholder="Describe what information should be entered..."
                            :rows="2"
                            class="text-xs resize-none" />
                        </div>
                      </div>
                      <UiButton variant="outline" size="sm" class="w-full" @click="addCustomField">
                        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
                        Add custom field
                      </UiButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Schedule Configuration Sidebar -->
        <aside class="w-96 shrink-0 border-l border-border bg-muted/5 flex flex-col min-h-0">
          <div class="px-5 py-4 border-b border-border bg-muted/20 shrink-0">
            <h3 class="text-sm font-semibold flex items-center gap-2">
              <Icon name="lucide:calendar" class="h-4 w-4 text-muted-foreground" />
              {{ isRecurring ? 'Schedule Configuration' : 'Task Configuration' }}
              <span
                v-if="sidebarHasMissingRequired"
                class="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                !
              </span>
            </h3>
          </div>
          <div class="flex-1 overflow-y-auto p-5 space-y-6">
            <!-- Frequency (only for recurring) -->
            <div v-if="isRecurring" class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Frequency</p>
              <div class="grid gap-2 grid-cols-2">
                <button
                  v-for="option in frequencyOptions"
                  :key="option.value"
                  type="button"
                  class="rounded-lg border p-2.5 text-left transition"
                  :class="
                    form.frequency === option.value
                      ? 'border-primary/60 bg-primary/5 shadow-sm'
                      : 'border-border/60 bg-muted/20 hover:bg-muted/30'
                  "
                  @click="form.frequency = option.value">
                  <span
                    class="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                    :class="[frequencyStyles[option.value].bg, frequencyStyles[option.value].color]">
                    {{ option.label }}
                  </span>
                  <p class="mt-1.5 text-[10px] text-muted-foreground leading-tight">{{ option.description }}</p>
                </button>
              </div>
            </div>

            <!-- Due Date -->
            <div class="space-y-2">
              <UiLabel class="text-xs flex items-center gap-1">
                {{ isRecurring ? 'Next due date' : 'Due date' }}
                <span class="text-destructive">*</span>
              </UiLabel>
              <UiInput v-model="form.nextDue" type="date" class="text-sm" />
            </div>

            <!-- Custom Interval -->
            <div v-if="isRecurring && form.frequency === 'custom'" class="space-y-2">
              <UiLabel class="text-xs">Custom interval (days)</UiLabel>
              <UiInput v-model="form.customIntervalDays" type="number" placeholder="180" class="text-sm" />
              <p class="text-[10px] text-muted-foreground">Number of days between occurrences.</p>
            </div>

            <!-- Reminder Timing -->
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reminder timing</p>
              <div class="grid gap-1.5 grid-cols-2">
                <label
                  v-for="timing in reminderTimingOptions"
                  :key="timing"
                  class="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs cursor-pointer hover:bg-muted/30">
                  <UiCheckbox
                    :checked="form.reminderTiming.includes(timing)"
                    @update:checked="toggleArrayValue(form.reminderTiming, timing, $event)" />
                  <span>{{ timing }}</span>
                </label>
              </div>
            </div>

            <!-- Reminder Methods -->
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reminder methods</p>
              <div class="space-y-1.5">
                <label
                  v-for="method in reminderMethodOptions"
                  :key="method.value"
                  class="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs cursor-pointer hover:bg-muted/30">
                  <UiCheckbox
                    :checked="form.reminderMethods.includes(method.value)"
                    @update:checked="toggleArrayValue(form.reminderMethods, method.value, $event)" />
                  <Icon :name="method.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{{ method.label }}</span>
                </label>
              </div>
            </div>

            <!-- Tracking & Escalation -->
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tracking & escalation</p>
              <div class="space-y-2">
                <button
                  v-for="option in trackingOptions"
                  :key="String(option.value)"
                  type="button"
                  class="w-full rounded-lg border p-3 text-left transition"
                  :class="
                    form.tracked === option.value
                      ? option.color === 'blue'
                        ? 'border-blue-500 bg-blue-50/60'
                        : option.color === 'emerald'
                          ? 'border-emerald-500 bg-emerald-50/60'
                          : 'border-slate-400 bg-slate-100'
                      : 'border-border/60 bg-muted/20 hover:bg-muted/30'
                  "
                  @click="form.tracked = option.value">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
                      :class="
                        form.tracked === option.value
                          ? option.color === 'blue'
                            ? 'bg-blue-500 text-white'
                            : option.color === 'emerald'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      ">
                      <Icon :name="option.icon" class="h-4 w-4" />
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-semibold">{{ option.label }}</p>
                      <p class="text-[10px] text-muted-foreground leading-tight">{{ option.description }}</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- Fixed Footer -->
      <UiDialogFooter class="border-t border-border bg-muted/20 px-6 py-4 shrink-0 flex items-center justify-between">
        <div
          class="flex items-center gap-2 rounded-lg px-3 py-2"
          :class="isFormValid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
          <Icon
            :name="isFormValid ? 'lucide:check-circle' : 'lucide:alert-circle'"
            class="h-4 w-4"
            :class="isFormValid ? 'text-emerald-600' : 'text-amber-600'" />
          <span class="text-xs font-medium">
            {{ isFormValid ? 'Ready to create' : 'Missing required fields: name, owner, due date' }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <UiButton variant="outline" @click="handleCancel">Cancel</UiButton>
          <UiButton :disabled="!isFormValid" @click="handleSave">
            {{ mode === 'create' ? (isRecurring ? 'Create schedule' : 'Create task') : 'Save changes' }}
          </UiButton>
        </div>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
