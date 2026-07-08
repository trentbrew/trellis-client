<script setup lang="ts">
  import GraphView from '~/components/views/GraphView.vue'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import { entityQuery } from '~/lib/tql-namespace'
  import { getRecurringSeriesKey } from '~/utils/recurrence'
  import { useGraphTypesSidebar } from '~/composables/useGraphTypesSidebar'
  import { ENTITY_NAVIGATE_KEY } from '~/composables/useDialogStack'
  import type { Entity } from '~/types/entity'

  const graph = useTrellisGraph()
  const graphTypesSidebar = useGraphTypesSidebar()
  const { items: allEntities } = useTrellisEntities()

  const graphEntities = shallowRef<Entity[]>([])
  const loading = ref(true)
  const hasLoadedOnce = ref(false)

  const selectedEntityId = ref<string | null>(null)
  const dialogOpen = ref(false)
  const { setOriginHash, clearHash } = useDialogUrl()

  function hydrateEntityFromNode(raw: Record<string, unknown>): Entity | null {
    const id = String(raw['@id'] || raw.id || '')
    if (!id) return null

    const type = String(raw['@type'] || raw.type || 'entity')
    const links = raw._links as { outgoing?: Array<{ relation: string; target: string }> } | undefined
    const references = (links?.outgoing ?? []).map((link) => ({
      kind: 'entity' as const,
      direction: 'outgoing' as const,
      entityId: link.target,
      id: `ref-${link.relation}-${link.target.replace(/[^a-zA-Z0-9-]/g, '-')}`,
    }))

    const { '@id': _id, '@type': _type, _links: _l } = raw

    return {
      id,
      type,
      title: String(raw.title || id),
      status: raw.status ? String(raw.status) : undefined,
      references,
    } as Entity
  }

  const typesInGraph = computed(() => {
    const counts = new Map<string, number>()
    for (const entity of graphEntities.value) {
      if (!entity.type) continue
      counts.set(entity.type, (counts.get(entity.type) || 0) + 1)
    }
    const entries: Array<{ type: string; count: number; color: string; icon: string; label: string }> = []
    for (const [type, count] of counts) {
      const cfg = graphTypesSidebar.resolveConfig(type)
      entries.push({ type, count, color: cfg.color, icon: cfg.icon, label: cfg.label })
    }
    return entries.sort((a, b) => b.count - a.count)
  })

  watch(
    typesInGraph,
    (entries) => {
      graphTypesSidebar.setEntries(
        entries.map((e) => ({
          type: e.type,
          count: e.count,
          color: e.color,
          icon: e.icon,
          label: e.label,
        })),
      )
    },
    { immediate: true },
  )

  const totalNodeCount = computed(() => graphEntities.value.length)

  const dialogItem = computed(() => {
    if (!selectedEntityId.value) return null
    const found = allEntities.value.find((e) => e.id === selectedEntityId.value)
    if (found) return found
    return graphEntities.value.find((e) => e.id === selectedEntityId.value) ?? null
  })

  watch(dialogOpen, (open) => {
    if (!open) {
      selectedEntityId.value = null
      clearHash()
    }
  })

  function openNodeDialog(entity: Entity) {
    selectedEntityId.value = entity.id
    dialogOpen.value = true
    setOriginHash(entity.id)
  }

  provide(ENTITY_NAVIGATE_KEY, (id: string): boolean => {
    const exists = graphEntities.value.some((e) => e.id === id)
    if (!exists) return false
    selectedEntityId.value = id
    setOriginHash(id)
    return true
  })

  const fetchGraphData = async () => {
    if (!hasLoadedOnce.value) loading.value = true
    try {
      const result = await graph.queryOnce(entityQuery('?e'))
      const ids = result.data.map((row) => String((row as Record<string, unknown>)['?e']))

      if (ids.length === 0) {
        graphEntities.value = []
        return
      }

      const batchResult = await $fetch<{ nodes: Array<Record<string, unknown>> }>('/api/graph/nodes', {
        method: 'POST',
        body: { ids },
      })

      const seenSeriesKeys = new Set<string>()
      const deduplicatedNodes = (batchResult.nodes || []).filter((raw) => {
        const key = getRecurringSeriesKey(raw as Record<string, unknown>)
        if (!key) return true
        if (seenSeriesKeys.has(key)) return false
        seenSeriesKeys.add(key)
        return true
      })

      graphEntities.value = deduplicatedNodes
        .map((raw) => hydrateEntityFromNode(raw))
        .filter((entity): entity is Entity => entity != null)
    } catch (err) {
      console.error('[graph/visualization] fetch error:', err)
    } finally {
      loading.value = false
      hasLoadedOnce.value = true
    }
  }

  let lastTopologyFingerprint = ''
  function topologyFingerprint(): string {
    const ids = graphEntities.value
      .map((e) => e.id)
      .sort()
      .join('|')
    return ids
  }

  onMounted(async () => {
    graphTypesSidebar.activate()
    await fetchGraphData()
    lastTopologyFingerprint = topologyFingerprint()
  })

  watch(
    () => graph.graphVersion.value,
    async () => {
      await fetchGraphData()
      lastTopologyFingerprint = topologyFingerprint()
    },
  )

  onBeforeUnmount(() => {
    graphTypesSidebar.deactivate()
  })
</script>

<template>
  <div class="relative h-full w-full overflow-hidden">
    <div v-if="loading" class="flex h-full items-center justify-center text-muted-foreground">
      <Icon name="lucide:loader-circle" class="h-8 w-8 animate-spin" />
    </div>

    <div
      v-else-if="totalNodeCount === 0"
      class="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Icon name="lucide:network" class="h-12 w-12 opacity-30" />
      <p class="text-sm">No entities in the graph yet.</p>
    </div>

    <GraphView
      v-else
      :entities="graphEntities"
      hide-type-legend
      @open-entity="openNodeDialog" />

    <EntityDialog
      v-if="dialogItem"
      v-model:open="dialogOpen"
      variant="inset"
      mode="edit"
      :item="dialogItem"
      @close="dialogOpen = false" />
  </div>
</template>
