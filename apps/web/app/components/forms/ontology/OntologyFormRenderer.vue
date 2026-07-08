<script lang="ts" setup>
  import type { OntologySchemaDefinition } from '~/lib/ontology-registry/schemas-to-server-types'
  import type { FormPresentation, FormMode, OntologyFormSpec } from '~/lib/ontology-form-spec'
  import { ontologyToFormSpec, validateFormValues } from '~/lib/ontology-form-spec'
  import InlineFormShell from './InlineFormShell.vue'
  import SurveyFormShell from './SurveyFormShell.vue'
  import DialogFormShell from './DialogFormShell.vue'

  const props = withDefaults(
    defineProps<{
      schema: Pick<OntologySchemaDefinition, '@id' | 'label' | 'fields' | 'formPresentation'>
      modelValue?: Record<string, unknown>
      layout?: FormPresentation
      mode?: FormMode
      readonly?: boolean
      /** Dialog open state — only used when layout is entity-dialog. */
      open?: boolean
      submitting?: boolean
      owners?: { id: string; name: string }[]
    }>(),
    {
      modelValue: () => ({}),
      mode: 'create',
      readonly: false,
      open: false,
      submitting: false,
      owners: () => [],
    },
  )

  const emit = defineEmits<{
    'update:modelValue': [values: Record<string, unknown>]
    'update:open': [value: boolean]
    submit: [values: Record<string, unknown>]
    cancel: []
  }>()

  const spec = computed<OntologyFormSpec>(() =>
    ontologyToFormSpec(props.schema, {
      layout: props.layout,
      mode: props.mode,
      includeTitle: props.layout === 'stacked' || props.layout === 'survey' || props.layout === 'wizard',
    }),
  )

  const presentation = computed(() => spec.value.presentation)

  const localValues = ref<Record<string, unknown>>({})

  watch(
    [() => props.modelValue, spec],
    () => {
      localValues.value = {
        ...spec.value.defaults,
        ...props.modelValue,
      }
    },
    { immediate: true, deep: true },
  )

  const validationErrors = computed(() => validateFormValues(spec.value, localValues.value))

  const isValid = computed(() => Object.keys(validationErrors.value).length === 0)

  function updateValues(values: Record<string, unknown>) {
    localValues.value = values
    emit('update:modelValue', values)
  }

  function handleSubmit() {
    const errors = validateFormValues(spec.value, localValues.value)
    if (Object.keys(errors).length > 0) return
    emit('submit', { ...localValues.value })
  }

  function handleCancel() {
    emit('cancel')
    emit('update:open', false)
  }

  defineExpose({ spec, isValid, validationErrors, handleSubmit })
</script>

<template>
  <DialogFormShell
    v-if="presentation === 'entity-dialog'"
    :open="open"
    :spec="spec"
    :values="localValues"
    :errors="validationErrors"
    :readonly="readonly"
    :submitting="submitting"
    @update:open="emit('update:open', $event)"
    @update:values="updateValues"
    @submit="handleSubmit"
    @cancel="handleCancel" />

  <SurveyFormShell
    v-else-if="presentation === 'survey' || presentation === 'wizard'"
    :spec="spec"
    :values="localValues"
    :errors="validationErrors"
    :readonly="readonly"
    @update:values="updateValues"
    @submit="handleSubmit" />

  <InlineFormShell
    v-else
    :spec="spec"
    :values="localValues"
    :errors="validationErrors"
    :readonly="readonly"
    @update:values="updateValues" />
</template>
