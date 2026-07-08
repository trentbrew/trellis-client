<script setup lang="ts">
  import type { FormPresentation } from '~/lib/ontology-form-spec'
  import type { OntologySchemaDefinition } from '~/lib/ontology-registry/schemas-to-server-types'
  import OntologyFormRenderer from '~/components/forms/ontology/OntologyFormRenderer.vue'

  definePageMeta({
    title: 'Ontology Form Playground',
    middleware: ['auth'],
  })

  const demoSchema: OntologySchemaDefinition = {
    '@id': 'trellis:schema/playground-feedback',
    '@type': 'trellis:Schema',
    version: '1.0.0',
    label: 'Product Feedback',
    formPresentation: 'stacked',
    fields: [
      { name: 'title', valueType: 'title', required: true, description: 'Short summary of your feedback' },
      {
        name: 'rating',
        valueType: 'select',
        required: true,
        selectOptions: [
          { name: 'Excellent', color: '#22c55e' },
          { name: 'Good', color: '#84cc16' },
          { name: 'Needs work', color: '#f59e0b' },
        ],
      },
      { name: 'comments', valueType: 'rich_text', group: 'details', description: 'Tell us more' },
      { name: 'wouldRecommend', valueType: 'checkbox', group: 'details' },
      { name: 'contactEmail', valueType: 'email', group: 'details' },
    ],
  }

  const layouts: { id: FormPresentation; label: string }[] = [
    { id: 'stacked', label: 'Stacked (inline labels)' },
    { id: 'survey', label: 'Survey (one question per step)' },
    { id: 'wizard', label: 'Wizard (grouped steps)' },
    { id: 'entity-dialog', label: 'Dialog (modal)' },
  ]

  const activeLayout = ref<FormPresentation>('stacked')
  const formValues = ref<Record<string, unknown>>({})
  const dialogOpen = ref(false)
  const lastSubmit = ref<Record<string, unknown> | null>(null)

  watch(activeLayout, (layout) => {
    if (layout === 'entity-dialog') dialogOpen.value = true
  })

  function handleSubmit(values: Record<string, unknown>) {
    lastSubmit.value = values
    dialogOpen.value = false
  }
</script>

<template>
  <Page :full-width="true">
    <div class="container max-w-2xl py-8 space-y-8">
      <header>
        <p class="text-xs uppercase tracking-widest text-muted-foreground">Playground · ontology forms</p>
        <h1 class="text-2xl font-semibold">Ontology-driven form generation</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Renders input affordances from a TQL ontology schema — switch layouts to preview dialog, stacked, survey, and
          wizard modes.
        </p>
      </header>

      <div class="flex flex-wrap gap-2">
        <UiButton
          v-for="layout in layouts"
          :key="layout.id"
          size="sm"
          :variant="activeLayout === layout.id ? 'default' : 'outline'"
          @click="activeLayout = layout.id">
          {{ layout.label }}
        </UiButton>
      </div>

      <div class="rounded-xl border border-border bg-card p-6">
        <div v-if="activeLayout === 'entity-dialog' && !dialogOpen" class="text-center py-8 space-y-4">
          <p class="text-sm text-muted-foreground">Dialog layout opens in a modal shell.</p>
          <UiButton @click="dialogOpen = true">Open dialog form</UiButton>
        </div>
        <OntologyFormRenderer
          v-else
          v-model="formValues"
          :schema="demoSchema"
          :layout="activeLayout"
          mode="create"
          :open="dialogOpen"
          @update:open="dialogOpen = $event"
          @submit="handleSubmit" />
      </div>

      <div v-if="lastSubmit" class="rounded-lg border border-border bg-muted/30 p-4">
        <p class="text-xs uppercase tracking-wide text-muted-foreground mb-2">Last submit payload</p>
        <pre class="text-xs overflow-auto">{{ JSON.stringify(lastSubmit, null, 2) }}</pre>
      </div>
    </div>
  </Page>
</template>
