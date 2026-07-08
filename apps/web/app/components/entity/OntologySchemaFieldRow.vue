<script lang="ts" setup>
  import type { OntologySchemaField } from '~/lib/ontology-registry/schemas-to-server-types'
  import { fieldDisplayIcon, titleCaseFieldName } from '~/lib/ontology-sidebar-fields'
  import OntologyFormField from '~/components/forms/ontology/OntologyFormField.vue'

  const props = defineProps<{
    field: OntologySchemaField
    modelValue: unknown
    isViewMode: boolean
    owners?: { id: string; name: string }[]
  }>()

  defineEmits<{
    'update:modelValue': [value: unknown]
  }>()

  const label = computed(() => titleCaseFieldName(props.field.name))
  const icon = computed(() => fieldDisplayIcon(props.field))
</script>

<template>
  <div class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
    <Icon :name="icon" class="h-3.5 w-3.5 text-muted-foreground" />
    <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">{{ label }}</span>
    <OntologyFormField
      :field="field"
      :model-value="modelValue"
      :readonly="isViewMode"
      variant="pill"
      :owners="owners"
      @update:model-value="$emit('update:modelValue', $event)" />
  </div>
</template>
