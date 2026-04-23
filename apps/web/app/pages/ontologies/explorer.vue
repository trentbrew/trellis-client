<script setup lang="ts">
  /**
   * /ontologies/explorer — raw graph entity browser.
   * All entities regardless of type. Ported from /database/explorer.
   */
  import { useBrowse } from '~/composables/useBrowse'
  import { useGlobalDetailSheet } from '~/composables/useGlobalDetailSheet'
  import { entityQuery } from '~/lib/tql-namespace'

  definePageMeta({
    title: 'Entity Explorer',
    icon: 'lucide:search',
    middleware: ['auth'],
  })

  interface GraphEntity {
    '@id': string
    '@type': string
    title?: string
    [key: string]: unknown
  }

  const graph = useTrellisGraph()
  const detailSheet = useGlobalDetailSheet()

  const entities = ref<GraphEntity[]>([])
  const loading = ref(true)

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
      const result = await graph.queryOnce(entityQuery('?e'))
      const ids = result.data.map((row) => String((row as any)['?e']))

      if (ids.length > 0) {
        const nodes = await graph.fetchNodes(ids)
        entities.value = nodes as GraphEntity[]
      }
    } catch (err) {
      console.error('[ontologies/explorer] fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  const openEntity = (entity: GraphEntity) => {
    detailSheet.open(entity, { mode: 'view', variant: 'dialog' })
  }

  const handleDetailDelete = async (event: Event) => {
    const detail = (event as CustomEvent).detail
    const entityId = detail?.node?.['@id']
    if (!entityId) return
    try {
      await graph.mutate({ action: 'deleteNode', entityId })
      await fetchEntities()
    } catch (err) {
      console.error('[ontologies/explorer] delete error:', err)
    }
  }

  onMounted(() => {
    fetchEntities()
    window.addEventListener('global-detail-sheet:delete', handleDetailDelete)
  })

  onUnmounted(() => {
    window.removeEventListener('global-detail-sheet:delete', handleDetailDelete)
  })
</script>

<template>
  <Page
    variant="browse"
    title="Entity Explorer"
    subtitle="Ontologies"
    description="Browse, search, and inspect all graph entities across schemas."
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

    <UiCard>
      <UiCardContent class="p-0">
        <div
          v-if="browseState.filteredItems.value.length === 0"
          class="px-4 py-12 text-center text-sm text-muted-foreground">
          No entities match your search
        </div>
        <div v-else class="divide-y divide-border">
          <button
            v-for="entity in browseState.filteredItems.value"
            :key="entity['@id']"
            class="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
            @click="openEntity(entity)">
            <span
              class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {{ entity['@type'] }}
            </span>
            <span class="flex-1 truncate text-sm font-medium">{{ entity.title || entity['@id'] }}</span>
            <span class="font-mono text-[10px] text-muted-foreground truncate max-w-[180px]">{{ entity['@id'] }}</span>
            <Icon name="lucide:chevron-right" class="size-4 text-muted-foreground shrink-0" />
          </button>
        </div>
      </UiCardContent>
    </UiCard>
  </Page>
</template>
