<script lang="ts" setup>
  export interface PermitData {
    id: string
    permitType: string
    applicationType: string
    status: string
    submitted: string | null
    agency: string
    deadline: string
    description?: string
    notes?: string
  }

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'create' | 'edit'
      permit: PermitData | null
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
    save: [permit: PermitData]
    delete: [permit: PermitData]
    navigatePrev: []
    navigateNext: []
  }>()

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
    { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'in-review', label: 'In Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { value: 'additional-info', label: 'Additional Info Requested', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    { value: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { value: 'denied', label: 'Denied', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  ]

  const applicationTypeOptions = [
    { value: 'New Permit', label: 'New Permit' },
    { value: 'Renewal', label: 'Renewal' },
    { value: 'Modification', label: 'Modification' },
    { value: 'Amendment', label: 'Amendment' },
  ]

  const getToday = () => new Date().toISOString().split('T')[0] ?? ''

  const defaultPermit: PermitData = {
    id: '',
    permitType: '',
    applicationType: 'New Permit',
    status: 'draft',
    submitted: null,
    agency: '',
    deadline: getToday(),
    description: '',
    notes: '',
  }

  const editablePermit = reactive<PermitData>({ ...defaultPermit })

  watch(
    () => props.permit,
    (newPermit) => {
      if (newPermit) {
        Object.assign(editablePermit, { ...defaultPermit, ...newPermit })
      } else if (props.mode === 'create') {
        Object.assign(editablePermit, { ...defaultPermit, id: `permit-${Date.now()}` })
      }
    },
    { immediate: true, deep: true },
  )

  const statusOpen = ref(false)
  const appTypeOpen = ref(false)

  const currentStatus = computed(() => statusOptions.find((s) => s.value === editablePermit.status))
  const currentAppType = computed(() => applicationTypeOptions.find((a) => a.value === editablePermit.applicationType))

  const isFormValid = computed(() => editablePermit.permitType?.trim() && editablePermit.agency?.trim())

  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }

  const handleSave = () => {
    emit('save', { ...editablePermit })
    closeDialog()
  }

  const handleDelete = () => {
    emit('delete', { ...editablePermit })
    closeDialog()
  }
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :hide-close="true"
      class="w-[min(700px,calc(100vw-4rem))]! max-w-[min(700px,calc(100vw-4rem))]! p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col gap-0">
      <UiDialogTitle class="sr-only">{{ mode === 'create' ? 'New Permit Application' : editablePermit.permitType || 'Permit' }}</UiDialogTitle>
      <UiDialogDescription class="sr-only">{{ mode === 'create' ? 'Submit a new permit application.' : 'View and edit permit application details.' }}</UiDialogDescription>

      <!-- Header -->
      <div class="shrink-0 border-b border-border">
        <div class="px-4 pt-4 pb-3">
          <div class="flex items-center justify-between gap-3 mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <span
                v-if="currentStatus"
                :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', currentStatus.color]">
                {{ currentStatus.label }}
              </span>
              <p class="text-xs text-muted-foreground truncate">
                {{ mode === 'create' ? 'Submit a new permit application.' : `${editablePermit.applicationType} · ${editablePermit.agency}` }}
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
            v-model="editablePermit.permitType"
            type="text"
            placeholder="Permit type (e.g. Air Quality - Title V)..."
            class="w-full text-xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0 -mx-1 transition-all" />
        </div>
      </div>

      <!-- Properties Row -->
      <div class="sticky top-0 z-10 bg-card px-4 py-2.5 border-b border-border">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Properties</p>
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <!-- Status Picker -->
          <UiPopover v-model:open="statusOpen">
            <UiPopoverTrigger as-child>
              <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Icon name="lucide:circle-dot" class="h-3.5 w-3.5" />
                <span>{{ currentStatus?.label || 'Status' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-52 p-1">
              <button
                v-for="opt in statusOptions"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="editablePermit.status = opt.value; statusOpen = false">
                <span :class="['inline-flex h-2.5 w-2.5 rounded-full', opt.color.split(' ')[0]]" />
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editablePermit.status === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Application Type Picker -->
          <UiPopover v-model:open="appTypeOpen">
            <UiPopoverTrigger as-child>
              <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <Icon name="lucide:file-badge" class="h-3.5 w-3.5" />
                <span>{{ currentAppType?.label || 'Type' }}</span>
              </button>
            </UiPopoverTrigger>
            <UiPopoverContent align="start" class="w-44 p-1">
              <button
                v-for="opt in applicationTypeOptions"
                :key="opt.value"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="editablePermit.applicationType = opt.value; appTypeOpen = false">
                <span class="flex-1">{{ opt.label }}</span>
                <Icon v-if="editablePermit.applicationType === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </UiPopoverContent>
          </UiPopover>

          <!-- Deadline -->
          <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50">
            <Icon name="lucide:calendar" class="h-3.5 w-3.5" />
            <span class="text-muted-foreground">Deadline</span>
            <input
              v-model="editablePermit.deadline"
              type="date"
              class="bg-transparent border-none outline-none text-xs w-28" />
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-4 space-y-4">
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agency</p>
            <UiInput
              v-model="editablePermit.agency"
              placeholder="e.g. State EPA, Regional DEQ"
              class="text-sm" />
          </div>
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
            <UiTextarea
              v-model="editablePermit.description"
              placeholder="Describe the permit application details..."
              :rows="3"
              class="text-sm" />
          </div>
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
            <UiTextarea
              v-model="editablePermit.notes"
              placeholder="Internal notes..."
              :rows="2"
              class="text-sm" />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between">
        <div class="flex items-center gap-2 rounded-lg px-3 py-1.5" :class="isFormValid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'">
          <Icon :name="isFormValid ? 'lucide:check-circle' : 'lucide:alert-circle'" class="h-3.5 w-3.5" />
          <span class="text-xs font-medium">{{ isFormValid ? 'Ready' : 'Permit type & agency required' }}</span>
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
