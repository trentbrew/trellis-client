<script lang="ts" setup>
  import type { OntologyFormSpec } from '~/lib/ontology-form-spec'
  import { fieldsForStep } from '~/lib/ontology-form-spec'
  import OntologyFormField from './OntologyFormField.vue'

  const props = defineProps<{
    spec: OntologyFormSpec
    values: Record<string, unknown>
    errors?: Record<string, string>
    readonly?: boolean
  }>()

  const emit = defineEmits<{
    'update:values': [values: Record<string, unknown>]
    submit: []
  }>()

  const currentStep = ref(0)
  const isLastStep = computed(() => currentStep.value >= props.spec.stepCount - 1)
  const progress = computed(() =>
    props.spec.stepCount <= 1 ? 100 : Math.round(((currentStep.value + 1) / props.spec.stepCount) * 100),
  )

  const stepFields = computed(() => fieldsForStep(props.spec, currentStep.value))

  const stepErrors = computed(() => {
    const errors: Record<string, string> = {}
    for (const fieldSpec of stepFields.value) {
      const error = fieldSpec.validate(props.values[fieldSpec.field.name])
      if (error) errors[fieldSpec.field.name] = error
    }
    return errors
  })

  const canAdvance = computed(() => Object.keys(stepErrors.value).length === 0)

  function updateField(name: string, value: unknown) {
    emit('update:values', { ...props.values, [name]: value })
  }

  function goBack() {
    if (currentStep.value > 0) currentStep.value -= 1
  }

  function goNext() {
    if (!canAdvance.value) return
    if (isLastStep.value) {
      emit('submit')
      return
    }
    currentStep.value += 1
  }

  watch(
    () => props.spec.schemaId,
    () => {
      currentStep.value = 0
    },
  )
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs text-muted-foreground">
        <span aria-live="polite">Step {{ currentStep + 1 }} of {{ spec.stepCount }}</span>
        <span aria-hidden="true">{{ progress }}%</span>
      </div>
      <div
        class="h-1.5 rounded-full bg-muted overflow-hidden"
        role="progressbar"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Step ${currentStep + 1} of ${spec.stepCount}`">
        <div class="h-full bg-primary transition-all duration-300" :style="{ width: `${progress}%` }" />
      </div>
    </div>

    <div class="min-h-[200px] space-y-6">
      <OntologyFormField
        v-for="fieldSpec in stepFields"
        :key="fieldSpec.field.name"
        :field="fieldSpec.field"
        :model-value="values[fieldSpec.field.name]"
        :readonly="readonly || spec.mode === 'view'"
        :variant="spec.presentation === 'wizard' ? 'stacked' : 'survey'"
        :error="errors?.[fieldSpec.field.name] || stepErrors[fieldSpec.field.name]"
        @update:model-value="updateField(fieldSpec.field.name, $event)" />
    </div>

    <div class="flex items-center justify-between gap-3 pt-2 border-t border-border">
      <UiButton type="button" variant="ghost" :disabled="currentStep === 0" @click="goBack">
        Back
      </UiButton>
      <UiButton type="button" :disabled="!canAdvance" @click="goNext">
        {{ isLastStep ? 'Submit' : 'Next' }}
      </UiButton>
    </div>
  </div>
</template>
