<script setup lang="ts">
  /**
   * /ontologies/[type] — schema editor for a single entity type.
   *
   * Focuses on the *definition* (fields, meta, icon), not the records.
   * Records live at /collections/[type] or workspace pages.
   */
  import { useOntologyRegistry, type DynamicEntityTypeConfig } from '~/composables/useOntologyRegistry'
  import SchemaEditor from '~/components/ontology/SchemaEditor.vue'

  definePageMeta({
    title: 'Schema Editor',
    icon: 'lucide:shapes',
    middleware: ['auth'],
  })

  const route = useRoute()
  const typeSlug = computed(() => (route.params.type as string) || '')

  const { getEntityConfig } = useOntologyRegistry()
  const { items: allItems } = useEntities()

  const config = computed<DynamicEntityTypeConfig | null>(() => {
    const result = getEntityConfig(typeSlug.value)
    // getEntityConfig may return a static EntityTypeConfig; we only render if
    // it's a dynamic/server-sourced one (has `fields` + `schemaId`).
    if (result && 'schemaId' in result) return result as DynamicEntityTypeConfig
    return null
  })

  const recordCount = computed(() => {
    const slug = typeSlug.value.toLowerCase()
    return allItems.value.filter((i) => (i.type || '').toLowerCase() === slug).length
  })

  // user-tier schemas are editable; system/core are read-only in the UI.
  const isReadonly = computed(() => {
    const tier = config.value?.tier
    return tier !== 'user'
  })
</script>

<template>
  <Page
    variant="canvas"
    :title="config?.label || typeSlug"
    subtitle="Ontologies"
    :icon="config?.icon || 'lucide:shapes'"
    :fill-height="true">
    <!-- Not found -->
    <div v-if="!config" class="flex h-full flex-col items-center justify-center">
      <Icon name="lucide:shapes" class="text-muted-foreground mb-4 h-12 w-12" />
      <h2 class="text-lg font-semibold">Schema not found</h2>
      <p class="text-muted-foreground text-sm mt-1">
        No ontology matching "{{ typeSlug }}" was found in the registry.
      </p>
      <NuxtLink to="/ontologies" class="mt-4">
        <UiButton variant="outline" size="sm">
          <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
          Back to Ontologies
        </UiButton>
      </NuxtLink>
    </div>

    <!-- Editor -->
    <div v-else class="h-full overflow-y-auto">
      <div class="p-6 max-w-4xl mx-auto">
        <!-- Breadcrumb back -->
        <NuxtLink
          to="/ontologies"
          class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <Icon name="lucide:arrow-left" class="h-3.5 w-3.5" />
          All ontologies
        </NuxtLink>

        <SchemaEditor :config="config" :record-count="recordCount" :readonly="isReadonly" />
      </div>
    </div>
  </Page>
</template>
