<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'

  export interface TemplateFormData {
    name: string
    category: string
    status: 'Active' | 'Draft' | 'Archived'
    description: string
  }

  const props = withDefaults(
    defineProps<{
      open: boolean
      initialData?: Partial<TemplateFormData>
      overlayClass?: HTMLAttributes['class']
    }>(),
    {
      initialData: undefined,
      overlayClass: undefined,
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    save: [data: TemplateFormData]
  }>()

  const form = reactive<TemplateFormData>({
    name: '',
    category: 'Safety',
    status: 'Draft',
    description: '',
  })

  watch(
    () => props.open,
    (isOpen) => {
      if (!isOpen) return
      form.name = props.initialData?.name ?? ''
      form.category = props.initialData?.category ?? 'Safety'
      form.status = props.initialData?.status ?? 'Draft'
      form.description = props.initialData?.description ?? ''
    },
    { immediate: true },
  )

  const closeDialog = () => {
    emit('update:open', false)
    emit('close')
  }

  const handleSave = () => {
    emit('save', { ...form })
  }
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent :overlay-class="overlayClass" class="max-w-[720px] w-[95vw]">
      <UiDialogHeader>
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="lucide:layout-template" class="h-5 w-5 text-primary" />
          </div>
          <div>
            <UiDialogTitle>Edit Template</UiDialogTitle>
            <UiDialogDescription>Update the reusable task template.</UiDialogDescription>
          </div>
        </div>
      </UiDialogHeader>

      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <UiLabel class="flex items-center gap-1">
            Template Name
            <span class="text-destructive">*</span>
          </UiLabel>
          <UiInput v-model="form.name" placeholder="e.g., Monthly Emissions Report" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <UiLabel>Category</UiLabel>
            <UiSelect v-model="form.category">
              <UiSelectTrigger>
                <UiSelectValue placeholder="Select category" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem value="Safety">Safety</UiSelectItem>
                <UiSelectItem value="Permits">Permits</UiSelectItem>
                <UiSelectItem value="Water">Water</UiSelectItem>
                <UiSelectItem value="Air Quality">Air Quality</UiSelectItem>
                <UiSelectItem value="Training">Training</UiSelectItem>
                <UiSelectItem value="Spill Prevention">Spill Prevention</UiSelectItem>
              </UiSelectContent>
            </UiSelect>
          </div>

          <div class="space-y-2">
            <UiLabel>Status</UiLabel>
            <UiSelect v-model="form.status">
              <UiSelectTrigger>
                <UiSelectValue placeholder="Select status" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem value="Active">Active</UiSelectItem>
                <UiSelectItem value="Draft">Draft</UiSelectItem>
                <UiSelectItem value="Archived">Archived</UiSelectItem>
              </UiSelectContent>
            </UiSelect>
          </div>
        </div>

        <div class="space-y-2">
          <UiLabel>Description</UiLabel>
          <UiTextarea v-model="form.description" placeholder="Describe what this template is used for..." :rows="4" />
        </div>
      </div>

      <UiDialogFooter>
        <UiButton variant="outline" @click="closeDialog">Cancel</UiButton>
        <UiButton :disabled="!form.name.trim()" @click="handleSave">Save changes</UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
