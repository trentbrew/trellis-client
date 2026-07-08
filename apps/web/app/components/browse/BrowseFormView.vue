<script lang="ts" setup>
  import type { DynamicEntityTypeConfig } from '~/composables/useOntologyRegistry'
  import { ontologyToFormSpec } from '~/lib/ontology-form-spec'
  import { createFormResponse, resolveFormLayout } from '~/lib/createFormResponse'
  import OntologyFormRenderer from '~/components/forms/ontology/OntologyFormRenderer.vue'
  import FormViewHeader from './FormViewHeader.vue'
  import FormSuccessPanel from './FormSuccessPanel.vue'

  const props = defineProps<{
    typeConfig: DynamicEntityTypeConfig
    responseCount: number
  }>()

  const emit = defineEmits<{
    submitted: [entityId: string]
    'view-responses': []
  }>()

  const { create: createItem } = useEntities()
  const { $toast } = useNuxtApp()

  const phase = ref<'idle' | 'success' | 'empty'>('idle')
  const submitting = ref(false)
  const formValues = ref<Record<string, unknown>>({})
  const formRendererRef = ref<InstanceType<typeof OntologyFormRenderer> | null>(null)
  const successPanelRef = ref<InstanceType<typeof FormSuccessPanel> | null>(null)

  const schema = computed(() => ({
    '@id': props.typeConfig.schemaId,
    label: props.typeConfig.label,
    fields: props.typeConfig.fields,
    formPresentation: props.typeConfig.formPresentation,
  }))

  const layout = computed(() => resolveFormLayout(props.typeConfig.formPresentation))

  const formSpec = computed(() =>
    ontologyToFormSpec(schema.value, { layout: layout.value, includeTitle: true, mode: 'create' }),
  )

  const isStacked = computed(() => layout.value === 'stacked')
  const isEmpty = computed(() => formSpec.value.fields.length === 0)

  watch(
    isEmpty,
    (empty) => {
      phase.value = empty ? 'empty' : 'idle'
    },
    { immediate: true },
  )

  function resetForm() {
    formValues.value = { ...formSpec.value.defaults }
    phase.value = 'idle'
  }

  async function onSubmit(values: Record<string, unknown>) {
    if (submitting.value) return
    submitting.value = true
    try {
      const id = await createFormResponse(props.typeConfig.type, schema.value, values, createItem)
      $toast?.success('Response recorded')
      phase.value = 'success'
      emit('submitted', id)
      await nextTick()
      successPanelRef.value?.focus()
    } catch (error: unknown) {
      console.error('[BrowseFormView] submit failed:', error)
      $toast?.error('Could not save response')
    } finally {
      submitting.value = false
    }
  }

  function triggerStackedSubmit() {
    formRendererRef.value?.handleSubmit()
  }

  function onSubmitAnother() {
    resetForm()
  }
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <FormViewHeader
      :response-count="responseCount"
      :form-presentation="typeConfig.formPresentation"
      :label="typeConfig.label" />

    <div v-if="phase === 'empty'" class="px-6 py-12 text-center">
      <Icon name="lucide:file-question" class="mx-auto h-10 w-10 text-muted-foreground/40" />
      <h3 class="mt-4 text-base font-medium">No fillable fields</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        Add fields to this ontology schema to collect responses here.
      </p>
      <UiButton class="mt-4" variant="outline" size="sm" :to="`/ontologies/${typeConfig.type}`">
        Edit schema
      </UiButton>
    </div>

    <FormSuccessPanel
      v-else-if="phase === 'success'"
      ref="successPanelRef"
      @submit-another="onSubmitAnother"
      @view-responses="emit('view-responses')" />

    <template v-else>
      <div class="px-6 py-6">
        <h2 class="mb-6 text-center text-xl font-semibold">{{ typeConfig.label }}</h2>
        <OntologyFormRenderer
          ref="formRendererRef"
          v-model="formValues"
          :schema="schema"
          :layout="layout"
          mode="create"
          :submitting="submitting"
          @submit="onSubmit" />
      </div>

      <div
        v-if="isStacked"
        class="flex justify-end border-t border-border bg-muted/20 px-6 py-4">
        <UiButton :disabled="submitting" @click="triggerStackedSubmit">
          {{ submitting ? 'Submitting…' : 'Submit' }}
        </UiButton>
      </div>
    </template>
  </div>
</template>
