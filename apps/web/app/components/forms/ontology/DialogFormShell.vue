<script lang="ts" setup>
  import type { OntologyFormSpec } from '~/lib/ontology-form-spec'
  import InlineFormShell from './InlineFormShell.vue'

  const props = defineProps<{
    open: boolean
    spec: OntologyFormSpec
    values: Record<string, unknown>
    errors?: Record<string, string>
    readonly?: boolean
    submitting?: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    'update:values': [values: Record<string, unknown>]
    submit: []
    cancel: []
  }>()

  const isViewMode = computed(() => props.readonly || props.spec.mode === 'view')

  function handleSubmit() {
    emit('submit')
  }
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="sm:max-w-lg">
      <UiDialogHeader>
        <UiDialogTitle>{{ spec.label }}</UiDialogTitle>
        <UiDialogDescription v-if="!isViewMode">
          Fill in the fields below to {{ spec.mode === 'create' ? 'create' : 'update' }} this record.
        </UiDialogDescription>
      </UiDialogHeader>

      <InlineFormShell
        :spec="spec"
        :values="values"
        :errors="errors"
        :readonly="readonly"
        @update:values="emit('update:values', $event)" />

      <UiDialogFooter v-if="!isViewMode" class="gap-2 sm:gap-0">
        <UiButton type="button" variant="outline" @click="emit('cancel')">Cancel</UiButton>
        <UiButton type="button" :disabled="submitting" @click="handleSubmit">
          {{ spec.mode === 'create' ? 'Create' : 'Save' }}
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
