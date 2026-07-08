<script lang="ts" setup>
  import type { OntologyFormSpec } from '~/lib/ontology-form-spec'
  import OntologyFormField from './OntologyFormField.vue'

  const props = defineProps<{
    spec: OntologyFormSpec
    values: Record<string, unknown>
    errors?: Record<string, string>
    readonly?: boolean
  }>()

  const emit = defineEmits<{
    'update:values': [values: Record<string, unknown>]
  }>()

  function updateField(name: string, value: unknown) {
    emit('update:values', { ...props.values, [name]: value })
  }
</script>

<template>
  <div class="space-y-5">
    <OntologyFormField
      v-for="fieldSpec in spec.fields"
      :key="fieldSpec.field.name"
      :field="fieldSpec.field"
      :model-value="values[fieldSpec.field.name]"
      :readonly="readonly || spec.mode === 'view'"
      variant="stacked"
      :error="errors?.[fieldSpec.field.name]"
      @update:model-value="updateField(fieldSpec.field.name, $event)" />
  </div>
</template>
