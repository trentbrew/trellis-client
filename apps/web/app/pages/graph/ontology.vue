<script setup lang="ts">
  const ontologies = ref<Record<string, any>>({})
  const projections = ref<string[]>([])
  const catalog = ref<Record<string, any>>({})
  const loading = ref(true)

  const fetchData = async () => {
    loading.value = true
    try {
      const [ontData, projData, catData] = await Promise.all([
        $fetch<{ ontologies: Record<string, any> }>('/api/graph/ontologies'),
        $fetch<{ projections: string[] }>('/api/graph/projections'),
        $fetch<{ catalog: Record<string, any> }>('/api/graph/catalog'),
      ])
      ontologies.value = ontData.ontologies || {}
      projections.value = projData.projections || []
      catalog.value = catData.catalog || {}
    } catch (err) {
      console.error('[graph/ontology] fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  const ontologyEntries = computed(() => {
    return Object.entries(ontologies.value).map(([name, schema]) => ({
      name,
      schema,
      attributes: schema?.attributes || schema?.properties || {},
      types: schema?.types || [],
    }))
  })

  const catalogEntries = computed(() => {
    return Object.entries(catalog.value).map(([attr, info]) => ({
      attribute: attr,
      ...(typeof info === 'object' ? info : { count: info }),
    }))
  })

  onMounted(fetchData)
</script>

<template>
  <Page
    variant="settings"
    title="Ontology Viewer"
    subtitle="Developer"
    description="Schema definitions, named projections, and attribute catalog."
    icon="lucide:blocks">
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin text-muted-foreground" />
    </div>

    <div v-else class="space-y-6">
      <!-- Ontologies -->
      <UiCard>
        <UiCardContent class="p-0">
          <div class="border-b border-border px-4 py-3">
            <h3 class="text-sm font-semibold">Registered Ontologies</h3>
            <p class="text-xs text-muted-foreground">{{ ontologyEntries.length }} schema definitions loaded into the kernel</p>
          </div>
          <div v-if="ontologyEntries.length === 0" class="px-4 py-8 text-center text-sm text-muted-foreground">
            No ontologies registered
          </div>
          <div v-else class="divide-y divide-border">
            <details v-for="ont in ontologyEntries" :key="ont.name" class="group">
              <summary class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <Icon name="lucide:chevron-right" class="size-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
                <Icon name="lucide:blocks" class="size-4 text-amber-500" />
                <span class="text-sm font-medium font-mono">{{ ont.name }}</span>
                <span class="text-[10px] text-muted-foreground ml-auto">
                  {{ Object.keys(ont.attributes).length }} attributes
                </span>
              </summary>
              <div class="px-4 pb-3 ml-7">
                <pre class="text-[11px] font-mono text-muted-foreground bg-muted/50 rounded-md p-3 overflow-x-auto max-h-[400px] overflow-y-auto">{{ JSON.stringify(ont.schema, null, 2) }}</pre>
              </div>
            </details>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Projections -->
      <UiCard>
        <UiCardContent class="p-0">
          <div class="border-b border-border px-4 py-3">
            <h3 class="text-sm font-semibold">Named Projections</h3>
            <p class="text-xs text-muted-foreground">{{ projections.length }} registered projection queries</p>
          </div>
          <div v-if="projections.length === 0" class="px-4 py-8 text-center text-sm text-muted-foreground">
            No projections registered
          </div>
          <div v-else class="divide-y divide-border">
            <div v-for="proj in projections" :key="proj" class="flex items-center gap-3 px-4 py-2.5">
              <Icon name="lucide:terminal" class="size-4 text-violet-500" />
              <span class="text-sm font-mono">{{ proj }}</span>
              <NuxtLink :to="`/graph/query`" class="ml-auto text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                Run →
              </NuxtLink>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Attribute Catalog -->
      <UiCard>
        <UiCardContent class="p-0">
          <div class="border-b border-border px-4 py-3">
            <h3 class="text-sm font-semibold">Attribute Catalog</h3>
            <p class="text-xs text-muted-foreground">Auto-generated from EAV store — all attributes observed in the graph</p>
          </div>
          <div v-if="catalogEntries.length === 0" class="px-4 py-8 text-center text-sm text-muted-foreground">
            No attributes cataloged yet
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Attribute</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="entry in catalogEntries" :key="entry.attribute" class="hover:bg-muted/50">
                  <td class="px-4 py-2 font-mono text-xs">{{ entry.attribute }}</td>
                  <td class="px-4 py-2 text-xs text-muted-foreground">
                    <pre class="whitespace-pre-wrap">{{ JSON.stringify(entry, null, 2) }}</pre>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
