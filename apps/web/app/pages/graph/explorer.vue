<script setup lang="ts">
  import { useBrowse } from '~/composables/useBrowse'

  interface GraphEntity {
    '@id': string
    '@type': string
    title?: string
    [key: string]: unknown
  }

  const graph = useTrellisGraph()

  const entities = ref<GraphEntity[]>([])
  const loading = ref(true)
  const selectedEntity = ref<GraphEntity | null>(null)
  const entityTypes = ref<string[]>([])

  const { browseState } = useBrowse<GraphEntity>({
    items: entities,
    searchFields: ['@id', 'title', '@type'],
    defaultViewMode: 'list',
    sortOptions: [
      { value: 'title', label: 'Title' },
      { value: '@type', label: 'Type' },
      { value: '@id', label: 'ID' },
    ],
  })

  const fetchEntities = async () => {
    loading.value = true
    try {
      const result = await graph.queryOnce('FIND calendaritem AS ?e')
      const ids = result.data.map((row) => String((row as any)['?e']))

      if (ids.length > 0) {
        const nodes = await graph.fetchNodes(ids)
        entities.value = nodes as GraphEntity[]

        const types = new Set<string>()
        for (const node of nodes) {
          if (node['@type']) types.add(String(node['@type']))
        }
        entityTypes.value = Array.from(types).sort()
      }
    } catch (err) {
      console.error('[graph/explorer] fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  const selectEntity = (entity: GraphEntity) => {
    selectedEntity.value = selectedEntity.value?.['@id'] === entity['@id'] ? null : entity
  }

  const deleteEntity = async (entityId: string) => {
    if (!confirm(`Delete ${entityId}?`)) return
    try {
      await graph.mutate({ action: 'deleteNode', entityId })
      selectedEntity.value = null
      await fetchEntities()
    } catch (err) {
      console.error('[graph/explorer] delete error:', err)
    }
  }

  onMounted(fetchEntities)
</script>

<template>
  <Page
    variant="browse"
    title="Entity Explorer"
    subtitle="Developer"
    description="Browse, search, and inspect graph entities."
    icon="lucide:search"
    :browse="browseState"
    :total-count="entities.length"
    :filtered-count="browseState.filteredItems.value.length"
    count-label="entities"
    :show-view-switcher="false"
    :is-loading="loading"
    empty-title="No entities found"
    empty-description="The graph has no entities yet."
    empty-icon="lucide:database">
    <template #toolbarActions>
      <UiButton variant="outline" size="sm" class="gap-2" @click="fetchEntities">
        <Icon name="lucide:refresh-cw" class="h-4 w-4" />
        <span>Refresh</span>
      </UiButton>
    </template>

    <div class="flex gap-4">
      <!-- Entity List -->
      <div class="flex-1 min-w-0">
        <UiCard>
          <UiCardContent class="p-0">
            <div v-if="browseState.filteredItems.value.length === 0" class="px-4 py-12 text-center text-sm text-muted-foreground">
              No entities match your search
            </div>
            <div v-else class="divide-y divide-border max-h-[600px] overflow-y-auto">
              <button
                v-for="entity in browseState.filteredItems.value"
                :key="entity['@id']"
                class="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                :class="{ 'bg-muted/80': selectedEntity?.['@id'] === entity['@id'] }"
                @click="selectEntity(entity)">
                <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {{ entity['@type'] }}
                </span>
                <span class="flex-1 truncate text-sm font-medium">{{ entity.title || entity['@id'] }}</span>
                <span class="font-mono text-[10px] text-muted-foreground truncate max-w-[180px]">{{ entity['@id'] }}</span>
              </button>
            </div>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Detail Panel -->
      <div v-if="selectedEntity" class="w-[400px] shrink-0">
        <UiCard>
          <UiCardContent class="p-0">
            <div class="border-b border-border px-4 py-3 flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold">{{ selectedEntity.title || 'Untitled' }}</h3>
                <p class="font-mono text-[10px] text-muted-foreground">{{ selectedEntity['@id'] }}</p>
              </div>
              <UiButton variant="ghost" size="icon-sm" @click="deleteEntity(selectedEntity['@id'])">
                <Icon name="lucide:trash-2" class="size-3.5 text-destructive" />
              </UiButton>
            </div>
            <div class="divide-y divide-border max-h-[500px] overflow-y-auto">
              <div v-for="(value, key) in selectedEntity" :key="String(key)" class="flex items-start gap-2 px-4 py-2">
                <span class="font-mono text-[10px] text-muted-foreground min-w-[80px] pt-0.5">{{ key }}</span>
                <span class="text-sm break-all">
                  <template v-if="Array.isArray(value)">
                    <span v-for="(v, i) in value" :key="i" class="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] mr-1 mb-1">{{ v }}</span>
                  </template>
                  <template v-else-if="typeof value === 'boolean'">
                    <span :class="value ? 'text-emerald-500' : 'text-muted-foreground'">{{ value }}</span>
                  </template>
                  <template v-else>{{ value }}</template>
                </span>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </div>
  </Page>
</template>
